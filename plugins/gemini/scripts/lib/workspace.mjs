/**
 * Workspace root resolution.
 * Finds the git root or falls back to cwd.
 */

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

let _cachedRoot = null;

export function getWorkspaceRoot() {
  if (_cachedRoot) return _cachedRoot;

  try {
    _cachedRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    _cachedRoot = process.cwd();
  }

  return _cachedRoot;
}

export function getProjectSlug() {
  const root = getWorkspaceRoot();
  const hash = crypto.createHash('sha256').update(root).digest('hex').slice(0, 12);
  const name = path.basename(root).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  return `${name}-${hash}`;
}
