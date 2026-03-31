/**
 * Job lifecycle management.
 * Creates, tracks, and resolves jobs.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  addJob, updateJob, getJob, getActiveJobs,
  saveJobResult, loadJobResult, getJobLogPath,
} from './state.mjs';
import { killProcess } from './process.mjs';

function generateJobId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create and register a new job.
 */
export function createJob({ type, model, cwd, sessionId }) {
  const job = {
    id: generateJobId(),
    type,
    status: 'pending',
    model: model || 'default',
    cwd,
    sessionId: sessionId || process.env.SESSION_ID || '',
    pid: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  addJob(job, cwd);
  return job;
}

/**
 * Mark a job as running with a PID.
 */
export function startJob(jobId, pid, cwd) {
  updateJob(jobId, { status: 'running', pid }, cwd);
}

/**
 * Mark a job as completed with a result.
 */
export function completeJob(jobId, result, cwd) {
  updateJob(jobId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    pid: null,
  }, cwd);
  saveJobResult(jobId, result, cwd);
}

/**
 * Mark a job as failed.
 */
export function failJob(jobId, error, cwd) {
  updateJob(jobId, {
    status: 'failed',
    completedAt: new Date().toISOString(),
    error: typeof error === 'string' ? error : error.message,
    pid: null,
  }, cwd);
}

/**
 * Cancel a running job.
 */
export function cancelJob(jobId, cwd) {
  const job = getJob(jobId, cwd);
  if (!job) return { success: false, error: 'Job not found' };

  if (job.status !== 'running' && job.status !== 'pending') {
    return { success: false, error: `Job is ${job.status}, cannot cancel` };
  }

  if (job.pid) {
    killProcess(job.pid);
  }

  updateJob(jobId, {
    status: 'cancelled',
    completedAt: new Date().toISOString(),
    pid: null,
  }, cwd);

  return { success: true };
}

/**
 * Get the result of a completed job.
 */
export function getJobResult(jobId, cwd) {
  const job = getJob(jobId, cwd);
  if (!job) return { error: 'Job not found' };

  // Try saved result first
  const result = loadJobResult(job.id, cwd);
  if (result) return { job, result };

  // If running, try reading the log file for partial output
  if (job.status === 'running') {
    const logPath = getJobLogPath(job.id, cwd);
    try {
      const log = fs.readFileSync(logPath, 'utf-8');
      return { job, result: log, partial: true };
    } catch {
      return { job, result: '(job is running, no output yet)', partial: true };
    }
  }

  return { job, result: job.error || '(no result)' };
}

/**
 * Check and update status of background jobs.
 * Detects processes that have exited.
 */
export function reconcileJobs(cwd) {
  const active = getActiveJobs(cwd);
  for (const job of active) {
    if (job.pid) {
      try {
        // Check if process is still alive (signal 0)
        process.kill(job.pid, 0);
      } catch {
        // Process has exited — read log and mark completed
        const logPath = getJobLogPath(job.id, cwd);
        try {
          const output = fs.readFileSync(logPath, 'utf-8');
          completeJob(job.id, output, cwd);
        } catch {
          failJob(job.id, 'Process exited, no output captured', cwd);
        }
      }
    }
  }
}
