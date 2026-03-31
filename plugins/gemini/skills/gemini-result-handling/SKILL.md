---
name: gemini-result-handling
description: Rules for presenting Gemini output to the user
user-invocable: false
---

# Gemini Result Handling

## Core rules

1. **Show reviews verbatim.** Do NOT summarize, rephrase, or add commentary to review output from `/gemini:review` or `/gemini:adversarial-review`. Show it exactly as Gemini produced it.

2. **Do NOT auto-apply fixes after review.** When Gemini identifies issues in a review, do NOT automatically start fixing them. Present the findings and wait for the user to decide what to do.

3. **Review task output before applying.** When `/gemini:rescue` returns code changes, examine them critically. Gemini may:
   - Use different patterns than the project's conventions
   - Miss project-specific constraints
   - Introduce dependencies not approved for the project
   - Make assumptions about the codebase that don't hold

4. **Report failures honestly.** If Gemini returns an error or empty output, report that clearly. Do NOT fabricate or guess what Gemini would have said.

5. **Background job status.** When a background job is running, inform the user of the job ID and how to check status. Do NOT poll or wait silently.

## After review

Present findings, then ask: "Would you like me to address any of these findings?"

## After rescue/task

Present Gemini's output, then: "Here's what Gemini produced. Should I review and apply these changes?"
