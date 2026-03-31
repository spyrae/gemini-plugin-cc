/**
 * Process spawning utilities.
 */

import { spawn, execSync } from 'node:child_process';

/**
 * Run a command and collect output.
 * Returns { stdout, stderr, exitCode }.
 */
export function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || process.cwd(),
      env: { ...process.env, ...opts.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(opts.detached ? { detached: true } : {}),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    if (opts.stdin) {
      child.stdin.write(opts.stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    if (opts.timeout) {
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
      }, opts.timeout);
      child.on('close', () => clearTimeout(timer));
    }

    child.on('close', (exitCode) => {
      resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode: exitCode ?? 1 });
    });

    child.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 127 });
    });
  });
}

/**
 * Spawn a detached background process.
 * Returns the child PID.
 */
export function spawnBackground(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd || process.cwd(),
    env: { ...process.env, ...opts.env },
    stdio: ['pipe', opts.stdoutFd || 'pipe', opts.stderrFd || 'pipe'],
    detached: true,
  });

  child.stdin.end();
  child.unref();

  return child;
}

/**
 * Check if a binary is available in PATH.
 */
export function isInstalled(binary) {
  try {
    execSync(`which ${binary}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill a process by PID.
 */
export function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}
