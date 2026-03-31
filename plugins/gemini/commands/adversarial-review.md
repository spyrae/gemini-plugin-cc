---
description: "Adversarial challenge review via Gemini CLI"
argument-hint: "[focus text] [--base <ref>] [--background] [--model <model>]"
allowed-tools: Bash
disable-model-invocation: true
---

Run an adversarial code review using Gemini CLI. This is a deeper, more aggressive review that challenges design decisions and looks for edge cases.

Execute this command and show the output verbatim — do NOT summarize, rephrase, or interpret the review.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" adversarial-review $ARGUMENTS
```
