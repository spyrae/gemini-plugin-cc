/**
 * Tracked jobs — session-aware job listing.
 */

import { getJobs, getActiveJobs } from './state.mjs';
import { reconcileJobs } from './job-control.mjs';

/**
 * Get jobs for the current session, reconciling stale PIDs first.
 */
export function getSessionJobs(cwd, sessionId) {
  reconcileJobs(cwd);
  return getJobs(cwd, { sessionOnly: true, sessionId });
}

/**
 * Get all jobs, reconciling stale PIDs first.
 */
export function getAllJobs(cwd) {
  reconcileJobs(cwd);
  return getJobs(cwd);
}

/**
 * Count active (running/pending) jobs.
 */
export function countActiveJobs(cwd) {
  reconcileJobs(cwd);
  return getActiveJobs(cwd).length;
}
