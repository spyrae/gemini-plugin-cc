#!/usr/bin/env node

/**
 * Session lifecycle hook.
 * Handles SessionStart and SessionEnd events.
 *
 * SessionStart: writes SESSION_ID to CLAUDE_ENV_FILE.
 * SessionEnd: reconciles running jobs, marks orphaned ones as failed.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { reconcileJobs } from './lib/job-control.mjs';
import { getWorkspaceRoot } from './lib/workspace.mjs';
import { getActiveJobs, updateJob } from './lib/state.mjs';

const event = process.argv[2]; // "SessionStart" or "SessionEnd"

// Read hook input from stdin
let hookInput = {};
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf-8');
  hookInput = JSON.parse(raw);
} catch {
  // stdin may be empty or invalid
}

if (event === 'SessionStart') {
  handleStart();
} else if (event === 'SessionEnd') {
  handleEnd();
}

function handleStart() {
  const sessionId = crypto.randomBytes(8).toString('hex');

  // Write session ID to env file so other hooks/scripts can access it
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (envFile) {
    try {
      fs.appendFileSync(envFile, `SESSION_ID=${sessionId}\n`);
    } catch {
      // Non-critical
    }
  }

  // Output context for Claude
  const output = {
    hookSpecificOutput: {
      additionalContext: [
        'Gemini plugin active. Available commands:',
        '  /gemini:review — code review via Gemini CLI',
        '  /gemini:adversarial-review — challenge review',
        '  /gemini:rescue — delegate task to Gemini',
        '  /gemini:status — list jobs',
        '  /gemini:result — show job output',
        '  /gemini:cancel — cancel active job',
        '  /gemini:setup — check Gemini CLI / manage review gate',
      ].join('\n'),
    },
  };

  console.log(JSON.stringify(output));
}

function handleEnd() {
  const cwd = getWorkspaceRoot();

  // Reconcile — detect exited processes
  reconcileJobs(cwd);

  // Mark any remaining running jobs as failed (session is ending)
  const active = getActiveJobs(cwd);
  for (const job of active) {
    if (job.sessionId === process.env.SESSION_ID) {
      updateJob(job.id, {
        status: 'failed',
        error: 'Session ended while job was running',
        completedAt: new Date().toISOString(),
        pid: null,
      }, cwd);
    }
  }

  console.log('{}');
}
