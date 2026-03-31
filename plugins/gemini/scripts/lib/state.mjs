/**
 * Persistent state management.
 * Stores jobs, config, and session data per project.
 *
 * State dir: $CLAUDE_PLUGIN_DATA/state/<project-slug>/
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { readJSON, writeJSON, ensureDir, exists } from './fs.mjs';

const MAX_JOBS = 50;

function getPluginDataDir() {
  return process.env.CLAUDE_PLUGIN_DATA
    || path.join(process.env.HOME || '/tmp', '.gemini-plugin-cc');
}

function getProjectHash(cwd) {
  return crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12);
}

function getProjectSlug(cwd) {
  const name = path.basename(cwd).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  return `${name}-${getProjectHash(cwd)}`;
}

export function getStateDir(cwd) {
  const slug = getProjectSlug(cwd || process.cwd());
  return ensureDir(path.join(getPluginDataDir(), 'state', slug));
}

export function getJobsDir(cwd) {
  return ensureDir(path.join(getStateDir(cwd), 'jobs'));
}

// --- State file ---

function getStatePath(cwd) {
  return path.join(getStateDir(cwd), 'state.json');
}

function defaultState() {
  return {
    version: 1,
    config: {
      stopReviewGate: false,
    },
    jobs: [],
  };
}

export function loadState(cwd) {
  return readJSON(getStatePath(cwd)) || defaultState();
}

export function saveState(state, cwd) {
  writeJSON(getStatePath(cwd), state);
}

// --- Config ---

export function getConfig(cwd) {
  return loadState(cwd).config;
}

export function setConfig(key, value, cwd) {
  const state = loadState(cwd);
  state.config[key] = value;
  saveState(state, cwd);
}

// --- Jobs ---

export function addJob(job, cwd) {
  const state = loadState(cwd);
  state.jobs.unshift(job);
  // Keep only MAX_JOBS most recent
  if (state.jobs.length > MAX_JOBS) {
    state.jobs = state.jobs.slice(0, MAX_JOBS);
  }
  saveState(state, cwd);
}

export function updateJob(jobId, updates, cwd) {
  const state = loadState(cwd);
  const idx = state.jobs.findIndex((j) => j.id === jobId);
  if (idx !== -1) {
    state.jobs[idx] = { ...state.jobs[idx], ...updates };
    saveState(state, cwd);
  }
}

export function getJob(jobId, cwd) {
  const state = loadState(cwd);
  if (jobId) {
    return state.jobs.find((j) => j.id === jobId) || null;
  }
  // Return most recent
  return state.jobs[0] || null;
}

export function getJobs(cwd, { sessionOnly = false, sessionId } = {}) {
  const state = loadState(cwd);
  if (sessionOnly && sessionId) {
    return state.jobs.filter((j) => j.sessionId === sessionId);
  }
  return state.jobs;
}

export function getActiveJobs(cwd) {
  return loadState(cwd).jobs.filter(
    (j) => j.status === 'running' || j.status === 'pending'
  );
}

// --- Job result files ---

export function saveJobResult(jobId, result, cwd) {
  const filePath = path.join(getJobsDir(cwd), `${jobId}.json`);
  writeJSON(filePath, result);
}

export function loadJobResult(jobId, cwd) {
  const filePath = path.join(getJobsDir(cwd), `${jobId}.json`);
  return readJSON(filePath);
}

export function getJobLogPath(jobId, cwd) {
  return path.join(getJobsDir(cwd), `${jobId}.log`);
}
