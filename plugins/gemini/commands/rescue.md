---
description: "Delegate a task to Gemini CLI"
argument-hint: "<task description> [--model <model>] [--wait] [--background]"
allowed-tools: Bash, Agent
context: fork
---

Delegate a coding task to Gemini CLI. Use the `gemini:gemini-rescue` subagent to handle the delegation.

**IMPORTANT:** After Gemini completes the task, review the output carefully. Do NOT blindly apply Gemini's changes — verify they are correct and appropriate for this codebase.

Pass the full task description to the subagent. The subagent will:
1. Build the task prompt with workspace context
2. Run Gemini CLI with write access
3. Return the result

If `--background` is passed, the task runs in the background. Use `/gemini:status` to check progress.
