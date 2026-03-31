# gemini-plugin-cc

**Use Gemini CLI from Claude Code** to review code or delegate tasks.

Works via Gemini CLI subscription — **no API keys needed**.

## Install

```bash
# From GitHub (once published)
/plugin marketplace add spyrae/gemini-plugin-cc
/plugin install gemini@spyrae-gemini
/reload-plugins

# For development
cd ~/.claude/plugins/
git clone https://github.com/spyrae/gemini-plugin-cc.git
```

### Prerequisites

- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and authenticated
- Node.js 18+
- Claude Code

```bash
# Install Gemini CLI
npm install -g @google/gemini-cli
gemini auth login
```

## Commands

| Command | Description |
|---------|-------------|
| `/gemini:review` | Read-only code review via Gemini |
| `/gemini:adversarial-review` | Aggressive challenge review |
| `/gemini:rescue` | Delegate a coding task to Gemini |
| `/gemini:status` | Show job status |
| `/gemini:result` | Show job output |
| `/gemini:cancel` | Cancel active job |
| `/gemini:setup` | Check CLI + manage review gate |

### Examples

```
/gemini:review
/gemini:review --base main --scope "auth changes only"
/gemini:adversarial-review security implications of the new API
/gemini:rescue "fix the failing test in src/utils.test.ts"
/gemini:rescue "add input validation to the create-user endpoint" --background
/gemini:setup --enable-review-gate
```

## How It Works

```
Claude Code session
    │
    ├─ /gemini:review ──── gemini-companion.mjs ──── gemini -p "..." -s
    │                      (read-only)               (sandbox mode)
    │
    ├─ /gemini:rescue ──── gemini-companion.mjs ──── gemini -p "..." -y
    │                      (write-capable)            (auto-approve)
    │
    └─ [Stop hook] ─────── stop-review-gate ────── gemini -p "..." -s
                           (optional gate)           (ALLOW / BLOCK)
```

### Review Gate

Optional safety net — Gemini reviews Claude's output before each stop:

```
/gemini:setup --enable-review-gate
```

Catches: auth bypasses, data loss risks, destructive commands, missing rollback safety.

## Architecture

```
plugins/gemini/
├── .claude-plugin/plugin.json     # Plugin manifest
├── commands/                      # Slash commands (markdown)
├── hooks/hooks.json               # Session + review gate hooks
├── prompts/                       # Prompt templates
├── schemas/                       # Output JSON schemas
├── scripts/
│   ├── gemini-companion.mjs       # Main CLI entry point
│   ├── session-lifecycle-hook.mjs # Session start/end
│   ├── stop-review-gate-hook.mjs  # Review gate
│   └── lib/
│       ├── gemini.mjs             # Gemini CLI wrapper
│       ├── state.mjs              # Persistent state
│       ├── git.mjs                # Git diff/context
│       ├── job-control.mjs        # Job lifecycle
│       └── ...                    # Utils
├── skills/                        # Internal skills
└── agents/                        # Rescue subagent
```

### Key design decisions

- **No App Server** — Unlike the Codex plugin, Gemini CLI is invoked directly via `-p` flag. Simpler, no broker process needed.
- **Subscription auth** — Uses `gemini auth login` (Google account), no API keys.
- **Sandbox by default** — Reviews run in `-s` (sandbox) mode. Tasks run in `-y` (auto-approve) mode.
- **Background jobs** — Long tasks spawn detached processes, tracked by PID in state files.

## Configuration

State is stored per-project in `$CLAUDE_PLUGIN_DATA/state/<project-hash>/`:
- `state.json` — config + job list
- `jobs/` — individual job results and logs

## License

Apache-2.0

## Author

**Roman Belov** — [GitHub](https://github.com/spyrae)
