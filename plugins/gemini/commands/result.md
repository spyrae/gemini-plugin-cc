---
description: "Show Gemini job result"
argument-hint: "[job-id]"
allowed-tools: Bash
disable-model-invocation: true
---

Show the output of a completed Gemini job. Execute and display verbatim — do NOT summarize or rephrase:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" result $ARGUMENTS
```
