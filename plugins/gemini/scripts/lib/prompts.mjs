/**
 * Prompt loading and interpolation.
 */

import path from 'node:path';
import { readText } from './fs.mjs';

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  || path.resolve(new URL('.', import.meta.url).pathname, '..', '..');

/**
 * Load a prompt template from prompts/ directory.
 */
export function loadPrompt(name) {
  const promptPath = path.join(PLUGIN_ROOT, 'prompts', `${name}.md`);
  const content = readText(promptPath);
  if (!content) throw new Error(`Prompt not found: ${promptPath}`);
  return content;
}

/**
 * Interpolate variables in a prompt template.
 * Variables: {{var_name}}
 */
export function interpolate(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
  });
}

/**
 * Load and interpolate a prompt.
 */
export function buildPrompt(name, vars = {}) {
  const template = loadPrompt(name);
  return interpolate(template, vars);
}
