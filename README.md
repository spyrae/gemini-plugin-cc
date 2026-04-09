<div align="center">

# gemini-plugin-cc

### Official Claude Code Plugin

**Use Gemini CLI from Claude Code** to review code and delegate tasks.

Works via Gemini CLI subscription — **no API keys needed**.

[![Claude Code Plugin](https://img.shields.io/badge/Claude_Code-Official_Plugin-d97706?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01eiIvPjwvc3ZnPg==)](https://github.com/spyrae/gemini-plugin-cc)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

Published in the [Claude Code Plugin Marketplace](https://claude.ai/settings) — install directly from Claude Code.

</div>

---

## Install

```bash
# From Claude Code Plugin Marketplace (recommended)
/install spyrae/gemini-plugin-cc

# Or via CLI
/plugin marketplace add spyrae/gemini-plugin-cc
/plugin install gemini@spyrae-gemini
/reload-plugins
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

**Roman Belov** — [GitHub](https://github.com/spyrae) · [Blog](https://futurecraft.pro) · [LinkedIn](https://linkedin.com/in/romanblanc)
