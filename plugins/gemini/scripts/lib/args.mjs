/**
 * Minimal argument parser for gemini-companion.mjs.
 */

export function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: args[0] || 'help',
    flags: {},
    positional: [],
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result.flags[key] = next;
        i++;
      } else {
        result.flags[key] = true;
      }
    } else {
      result.positional.push(arg);
    }
  }

  return result;
}

/**
 * Build Gemini CLI args from parsed flags.
 */
export function buildGeminiArgs(flags) {
  const args = [];
  if (flags.model) args.push('-m', flags.model);
  if (flags.sandbox !== false) args.push('-s');
  return args;
}
