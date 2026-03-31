---
name: gemini-cli-runtime
description: Internal contract for calling Gemini CLI from Claude Code
user-invocable: false
---

# Gemini CLI Runtime Contract

## How to call Gemini

All Gemini CLI operations go through `gemini-companion.mjs`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" <subcommand> [args]
```

## Subcommands

| Command | Mode | Description |
|---------|------|-------------|
| `review` | read-only | Code review (sandbox mode) |
| `adversarial-review` | read-only | Challenge review (sandbox mode) |
| `task "prompt"` | write-capable | Delegate a coding task |
| `status [id]` | read-only | List jobs or show job details |
| `result [id]` | read-only | Show completed job output |
| `cancel [id]` | read-only | Cancel a running job |
| `setup` | read-only | Check CLI, manage review gate |

## Flags

- `--model <model>` — Override Gemini model
- `--base <ref>` — Git base ref for diff (default: HEAD)
- `--background` — Run as background job
- `--wait` — Wait for completion (foreground)
- `--scope <text>` — Review scope description

## Background jobs

When `--background` is passed, the companion script:
1. Creates a job entry in state
2. Spawns `gemini` as a detached process
3. Returns immediately with job ID
4. Output streams to a log file

Use `status` to check progress, `result` to read output, `cancel` to kill.

## Important

- NEVER run `gemini` directly — always go through `gemini-companion.mjs`
- Review outputs should be shown verbatim, never summarized
- Task outputs should be reviewed before applying to the codebase
