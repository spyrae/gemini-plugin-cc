---
description: "Check Gemini CLI availability and manage settings"
argument-hint: "[--enable-review-gate] [--disable-review-gate]"
allowed-tools: Bash
disable-model-invocation: true
---

Check if Gemini CLI is installed and configured. Manage the review gate setting.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" setup $ARGUMENTS
```
