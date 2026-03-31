---
description: "Code review via Gemini CLI"
argument-hint: "[--base <ref>] [--background] [--model <model>] [--scope <description>]"
allowed-tools: Bash
disable-model-invocation: true
---

Run a code review using Gemini CLI. Execute this command and show the output verbatim — do NOT summarize, rephrase, or interpret the review. Show it exactly as Gemini produced it.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" review $ARGUMENTS
```
