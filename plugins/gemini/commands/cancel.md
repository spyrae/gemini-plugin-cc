---
description: "Cancel an active Gemini job"
argument-hint: "[job-id]"
allowed-tools: Bash
disable-model-invocation: true
---

Cancel an active Gemini job. If no job ID given, cancels the most recent active job.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" cancel $ARGUMENTS
```
