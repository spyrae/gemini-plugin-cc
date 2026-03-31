#!/usr/bin/env node

/**
 * Stop review gate hook.
 *
 * When enabled (via /gemini:setup --enable-review-gate), this hook runs
 * before Claude Code stops responding. It sends Claude's last output to
 * Gemini for review. If Gemini finds issues, it blocks the stop.
 *
 * Input (stdin): { last_assistant_message, session_id, ... }
 * Output: {} (allow) or process.exit(2) with reason on stderr (block)
 */

import fs from 'node:fs';
import { getConfig } from './lib/state.mjs';
import { getWorkspaceRoot } from './lib/workspace.mjs';
import { checkGemini, runGemini } from './lib/gemini.mjs';
import { buildPrompt } from './lib/prompts.mjs';

// Read hook input
let hookInput = {};
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf-8');
  hookInput = JSON.parse(raw);
} catch {
  // No input — allow stop
  console.log('{}');
  process.exit(0);
}

const cwd = getWorkspaceRoot();
const config = getConfig(cwd);

// If review gate is disabled, allow stop
if (!config.stopReviewGate) {
  console.log('{}');
  process.exit(0);
}

// Check if Gemini is available
const gemini = await checkGemini();
if (!gemini.installed) {
  // Can't review without Gemini — allow stop
  console.log('{}');
  process.exit(0);
}

// Get the last assistant message
const lastMessage = hookInput.last_assistant_message || '';
if (!lastMessage || lastMessage.length < 50) {
  // Too short to be meaningful code change — allow stop
  console.log('{}');
  process.exit(0);
}

// Check if the message contains code changes (heuristic)
const hasCodeChanges = /```|diff|Edit|Write|file_path|modified|created|updated/i.test(lastMessage);
if (!hasCodeChanges) {
  console.log('{}');
  process.exit(0);
}

// Build the review gate prompt
const prompt = buildPrompt('stop-review-gate', {
  assistant_output: lastMessage.slice(0, 50_000), // Cap at 50KB
});

try {
  const result = await runGemini({
    prompt,
    cwd,
    sandbox: true,
    timeout: 120_000, // 2 min max for gate review
  });

  const output = result.output || '';

  // Parse verdict
  if (output.includes('BLOCK:')) {
    const reason = output.split('BLOCK:')[1]?.trim() || 'Gemini review found issues';
    process.stderr.write(`Gemini review gate: ${reason}`);
    process.exit(2); // Exit code 2 = block
  }

  // ALLOW or unparseable — let it through
  console.log('{}');
} catch (err) {
  // On error, don't block — allow stop
  console.log('{}');
}
