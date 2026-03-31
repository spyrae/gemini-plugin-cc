#!/usr/bin/env node

/**
 * gemini-companion.mjs — Main CLI entry point for the Gemini plugin.
 *
 * Called from slash commands:
 *   node ${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs <subcommand> [flags]
 *
 * Subcommands:
 *   setup                Check Gemini CLI availability, manage review gate
 *   review               Read-only code review via Gemini CLI
 *   adversarial-review   Aggressive challenge review
 *   task                 Delegate a coding task to Gemini (write-capable)
 *   status               List jobs
 *   result               Show job output
 *   cancel               Cancel a running job
 */

import { parseArgs } from './lib/args.mjs';
import { checkGemini, review as geminiReview, task as geminiTask } from './lib/gemini.mjs';
import { buildGitContext } from './lib/git.mjs';
import { buildPrompt } from './lib/prompts.mjs';
import {
  createJob, startJob, completeJob, failJob,
  cancelJob, getJobResult,
} from './lib/job-control.mjs';
import { getSessionJobs, getAllJobs, countActiveJobs } from './lib/tracked-jobs.mjs';
import { getConfig, setConfig } from './lib/state.mjs';
import {
  renderJobTable, renderReviewResult, renderTaskResult, renderSetupStatus,
} from './lib/render.mjs';
import { getWorkspaceRoot } from './lib/workspace.mjs';

const { command, flags, positional } = parseArgs(process.argv);

const cwd = getWorkspaceRoot();
const sessionId = process.env.SESSION_ID || '';

const handlers = {
  setup: handleSetup,
  review: handleReview,
  'adversarial-review': handleAdversarialReview,
  task: handleTask,
  status: handleStatus,
  result: handleResult,
  cancel: handleCancel,
  help: handleHelp,
};

const handler = handlers[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  handleHelp();
  process.exit(1);
}

try {
  await handler();
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

// ─── Handlers ─────────────────────────────────────────

async function handleSetup() {
  const gemini = await checkGemini();
  const config = getConfig(cwd);

  // Handle flags
  if (flags['enable-review-gate']) {
    setConfig('stopReviewGate', true, cwd);
    config.stopReviewGate = true;
    console.log('Review gate enabled. Gemini will review Claude\'s output before stopping.');
  }
  if (flags['disable-review-gate']) {
    setConfig('stopReviewGate', false, cwd);
    config.stopReviewGate = false;
    console.log('Review gate disabled.');
  }

  const output = renderSetupStatus({
    installed: gemini.installed,
    version: gemini.version,
    reviewGate: config.stopReviewGate,
    activeJobs: countActiveJobs(cwd),
  });

  console.log(output);

  if (!gemini.installed) {
    console.log('\n**To install Gemini CLI:**');
    console.log('```bash');
    console.log('npm install -g @anthropic-ai/gemini-cli');
    console.log('# or');
    console.log('brew install gemini-cli');
    console.log('```');
    console.log('Then run `gemini auth login` to authenticate.');
  }
}

async function handleReview() {
  const gemini = await checkGemini();
  if (!gemini.installed) {
    console.error('Gemini CLI not found. Run `/gemini:setup` for installation instructions.');
    process.exit(1);
  }

  const base = flags.base || 'HEAD';
  const gitContext = await buildGitContext({ cwd, base });

  const prompt = buildPrompt('review', {
    git_context: gitContext,
    scope: flags.scope || 'all changes',
  });

  const background = flags.background === true;

  if (background) {
    const job = createJob({ type: 'review', model: flags.model, cwd, sessionId });
    const { pid } = await geminiTask({
      prompt,
      cwd,
      model: flags.model,
      background: true,
      jobId: job.id,
    });
    startJob(job.id, pid, cwd);
    console.log(`Review started in background. Job ID: \`${job.id.slice(0, 8)}\``);
    console.log('Use `/gemini:status` to check progress, `/gemini:result` to see output.');
    return;
  }

  console.log('Running Gemini review...\n');
  const result = await geminiReview({ prompt, cwd, model: flags.model });

  if (!result.success) {
    console.error(`Review failed (exit ${result.exitCode}):\n${result.stderr}`);
    process.exit(1);
  }

  console.log(result.output);
}

async function handleAdversarialReview() {
  const gemini = await checkGemini();
  if (!gemini.installed) {
    console.error('Gemini CLI not found. Run `/gemini:setup` for installation instructions.');
    process.exit(1);
  }

  const base = flags.base || 'HEAD';
  const gitContext = await buildGitContext({ cwd, base });
  const focus = positional.join(' ') || '';

  const prompt = buildPrompt('adversarial-review', {
    git_context: gitContext,
    focus,
  });

  const background = flags.background === true;

  if (background) {
    const job = createJob({ type: 'adversarial-review', model: flags.model, cwd, sessionId });
    const { pid } = await geminiTask({
      prompt,
      cwd,
      model: flags.model,
      background: true,
      jobId: job.id,
    });
    startJob(job.id, pid, cwd);
    console.log(`Adversarial review started in background. Job ID: \`${job.id.slice(0, 8)}\``);
    return;
  }

  console.log('Running adversarial review...\n');
  const result = await geminiReview({ prompt, cwd, model: flags.model });

  if (!result.success) {
    console.error(`Review failed (exit ${result.exitCode}):\n${result.stderr}`);
    process.exit(1);
  }

  console.log(result.output);
}

async function handleTask() {
  const gemini = await checkGemini();
  if (!gemini.installed) {
    console.error('Gemini CLI not found. Run `/gemini:setup` for installation instructions.');
    process.exit(1);
  }

  const taskPrompt = positional.join(' ');
  if (!taskPrompt) {
    console.error('No task provided. Usage: gemini-companion task "your task description"');
    process.exit(1);
  }

  const background = flags.background !== false; // default: background
  const model = flags.model;

  const job = createJob({ type: 'task', model, cwd, sessionId });

  if (background) {
    const { pid } = await geminiTask({
      prompt: taskPrompt,
      cwd,
      model,
      background: true,
      jobId: job.id,
    });
    startJob(job.id, pid, cwd);
    console.log(`Task delegated to Gemini. Job ID: \`${job.id.slice(0, 8)}\``);
    console.log('Use `/gemini:status` to check progress, `/gemini:result` to see output.');
    return;
  }

  // Foreground
  startJob(job.id, null, cwd);
  const result = await geminiTask({ prompt: taskPrompt, cwd, model, background: false });

  if (result.success) {
    completeJob(job.id, result.output, cwd);
    console.log(result.output);
  } else {
    failJob(job.id, result.stderr || 'Task failed', cwd);
    console.error(`Task failed (exit ${result.exitCode}):\n${result.stderr}`);
    process.exit(1);
  }
}

async function handleStatus() {
  const jobId = positional[0];

  if (jobId) {
    const { job, result, partial } = getJobResult(jobId, cwd);
    if (!job) {
      console.error(`Job not found: ${jobId}`);
      process.exit(1);
    }
    console.log(`**Job ${job.id.slice(0, 8)}** — ${job.type} — ${job.status}`);
    if (partial) console.log('*(partial output — job still running)*\n');
    if (result) console.log(typeof result === 'string' ? result : renderTaskResult(result));
    return;
  }

  const jobs = flags.all ? getAllJobs(cwd) : getSessionJobs(cwd, sessionId);
  console.log(renderJobTable(jobs));
}

async function handleResult() {
  const jobId = positional[0];
  const { job, result, partial } = getJobResult(jobId, cwd);

  if (!job) {
    console.error(jobId ? `Job not found: ${jobId}` : 'No jobs found.');
    process.exit(1);
  }

  if (job.status === 'running') {
    console.log(`Job \`${job.id.slice(0, 8)}\` is still running.`);
    if (partial && result) {
      console.log('\n**Partial output:**\n');
      console.log(result);
    }
    return;
  }

  if (!result) {
    console.log(`Job \`${job.id.slice(0, 8)}\` — ${job.status}, no output.`);
    return;
  }

  console.log(typeof result === 'string' ? result : renderTaskResult(result));
}

async function handleCancel() {
  const jobId = positional[0];

  if (!jobId) {
    // Cancel most recent active job
    const active = getSessionJobs(cwd, sessionId).filter(
      (j) => j.status === 'running' || j.status === 'pending'
    );
    if (!active.length) {
      console.log('No active jobs to cancel.');
      return;
    }
    const target = active[0];
    const res = cancelJob(target.id, cwd);
    console.log(res.success
      ? `Cancelled job \`${target.id.slice(0, 8)}\` (${target.type})`
      : `Failed to cancel: ${res.error}`);
    return;
  }

  const res = cancelJob(jobId, cwd);
  console.log(res.success
    ? `Cancelled job \`${jobId.slice(0, 8)}\``
    : `Failed to cancel: ${res.error}`);
}

function handleHelp() {
  console.log(`
gemini-companion — Gemini CLI integration for Claude Code

Subcommands:
  setup                 Check Gemini CLI, manage review gate
  review                Read-only code review
  adversarial-review    Aggressive challenge review
  task "prompt"         Delegate a task to Gemini
  status [job-id]       List jobs or show job details
  result [job-id]       Show completed job output
  cancel [job-id]       Cancel a running job

Flags:
  --model <model>       Gemini model (default: auto)
  --base <ref>          Git base ref for diff (default: HEAD)
  --background          Run in background
  --wait                Wait for completion (foreground)
  --scope <scope>       Review scope description
  --all                 Show all jobs (not just current session)
  --enable-review-gate  Enable Stop hook review gate
  --disable-review-gate Disable Stop hook review gate
`.trim());
}
