/**
 * Git utilities — diff, status, context gathering.
 */

import { run } from './process.mjs';

/**
 * Get the diff of staged + unstaged changes against a base ref.
 * @param {string} base - Base ref (default: HEAD)
 * @param {object} opts - { cwd, scope }
 */
export async function getDiff(base = 'HEAD', opts = {}) {
  const cwd = opts.cwd || process.cwd();

  // Staged changes
  const staged = await run('git', ['diff', '--cached', base], { cwd });

  // Unstaged changes
  const unstaged = await run('git', ['diff', base], { cwd });

  // Untracked files (names only)
  const untracked = await run('git', ['ls-files', '--others', '--exclude-standard'], { cwd });

  let diff = '';
  if (staged.stdout) diff += `### Staged changes\n\`\`\`diff\n${staged.stdout}\n\`\`\`\n\n`;
  if (unstaged.stdout) diff += `### Unstaged changes\n\`\`\`diff\n${unstaged.stdout}\n\`\`\`\n\n`;
  if (untracked.stdout) diff += `### Untracked files\n${untracked.stdout}\n\n`;

  // If no local changes, diff against base
  if (!diff) {
    const baseDiff = await run('git', ['diff', `${base}~1..${base}`], { cwd });
    if (baseDiff.stdout) {
      diff = `### Last commit changes (${base})\n\`\`\`diff\n${baseDiff.stdout}\n\`\`\`\n\n`;
    }
  }

  return diff || '(no changes detected)';
}

/**
 * Get current branch name.
 */
export async function getCurrentBranch(cwd) {
  const result = await run('git', ['branch', '--show-current'], { cwd });
  return result.stdout || 'detached HEAD';
}

/**
 * Get short log of recent commits.
 */
export async function getRecentCommits(cwd, count = 5) {
  const result = await run('git', ['log', `--oneline`, `-${count}`], { cwd });
  return result.stdout;
}

/**
 * Check if cwd is inside a git repo.
 */
export async function isGitRepo(cwd) {
  const result = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
  return result.exitCode === 0;
}

/**
 * Build context block for Gemini review.
 */
export async function buildGitContext(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const base = opts.base || 'HEAD';

  const [branch, diff, recentCommits] = await Promise.all([
    getCurrentBranch(cwd),
    getDiff(base, { cwd }),
    getRecentCommits(cwd),
  ]);

  return [
    `## Git context`,
    `Branch: ${branch}`,
    `Base: ${base}`,
    '',
    `## Recent commits`,
    recentCommits,
    '',
    `## Changes to review`,
    diff,
  ].join('\n');
}
