/**
 * Gemini CLI wrapper.
 *
 * Runs `gemini` CLI in non-interactive mode (-p flag) for reviews and tasks.
 * No API key needed — uses Gemini CLI subscription auth (Google account).
 *
 * Key differences from Codex plugin's app-server approach:
 * - No persistent App Server / broker — each invocation spawns a fresh process
 * - Simpler architecture but no thread resume capability
 * - Uses -p for single-shot prompts, -s for sandbox, -y for auto-approve
 */

import fs from 'node:fs';
import path from 'node:path';
import { run, spawnBackground, isInstalled } from './process.mjs';
import { ensureDir } from './fs.mjs';
import { getJobLogPath } from './state.mjs';

const MAX_PROMPT_LENGTH = 200_000; // 200KB — safe for CLI arg + shell

/**
 * Check if Gemini CLI is installed and get version.
 */
export async function checkGemini() {
  if (!isInstalled('gemini')) {
    return { installed: false, version: null };
  }

  const result = await run('gemini', ['--version'], { timeout: 5000 });
  return {
    installed: true,
    version: result.stdout.trim() || 'unknown',
  };
}

/**
 * Truncate prompt if needed.
 */
function preparePrompt(prompt) {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;
  const truncated = prompt.slice(0, MAX_PROMPT_LENGTH);
  return truncated + '\n\n[... content truncated at 200KB ...]';
}

/**
 * Build CLI args for a Gemini invocation.
 */
function buildArgs({ prompt, model, sandbox, yolo }) {
  const args = [];

  // Non-interactive mode with prompt
  args.push('-p', preparePrompt(prompt));

  // Model selection
  if (model) args.push('-m', model);

  // Execution mode
  if (yolo) {
    args.push('-y'); // Auto-approve all tool calls
  } else if (sandbox) {
    args.push('-s'); // Sandbox mode (safe, restricted)
  }

  return args;
}

/**
 * Run Gemini synchronously — wait for completion, return output.
 * Used for reviews and short tasks.
 */
export async function runGemini({ prompt, cwd, model, sandbox = true, timeout = 300_000 }) {
  const args = buildArgs({ prompt, model, sandbox, yolo: false });

  const result = await run('gemini', args, {
    cwd,
    timeout,
    env: {
      // Disable interactive features
      GEMINI_NO_COLOR: '1',
      CI: 'true',
    },
  });

  return {
    output: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    success: result.exitCode === 0,
  };
}

/**
 * Run Gemini as a background job — for long tasks and rescue.
 * Output is streamed to a log file.
 * Returns { pid, logPath }.
 */
export function runGeminiBackground({ prompt, cwd, model, sandbox = false, yolo = false, jobId }) {
  const logPath = getJobLogPath(jobId, cwd);
  ensureDir(path.dirname(logPath));

  const args = buildArgs({ prompt, model, sandbox, yolo });

  // Open log file for writing
  const logFd = fs.openSync(logPath, 'w');

  const child = spawnBackground('gemini', args, {
    cwd,
    stdoutFd: logFd,
    stderrFd: logFd,
    env: {
      GEMINI_NO_COLOR: '1',
      CI: 'true',
    },
  });

  return {
    pid: child.pid,
    logPath,
  };
}

/**
 * Run a review (read-only, sandbox mode).
 */
export async function review({ prompt, cwd, model }) {
  return runGemini({
    prompt,
    cwd,
    model,
    sandbox: true,
    timeout: 600_000, // 10 min for review
  });
}

/**
 * Run a task (write-capable, auto-approve).
 */
export async function task({ prompt, cwd, model, background, jobId }) {
  if (background) {
    return runGeminiBackground({
      prompt,
      cwd,
      model,
      sandbox: false,
      yolo: true,
      jobId,
    });
  }

  return runGemini({
    prompt,
    cwd,
    model,
    sandbox: false,
    timeout: 600_000,
  });
}
