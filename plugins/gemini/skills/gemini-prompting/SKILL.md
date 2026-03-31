---
name: gemini-prompting
description: Guidelines for composing effective prompts for Gemini CLI tasks
user-invocable: false
---

# Gemini Prompting Guide

When delegating tasks to Gemini via `/gemini:rescue`, structure the prompt effectively.

## Prompt structure

```
TASK: [One sentence — what to achieve]

CONTEXT:
- Project type: [language/framework]
- Relevant files: [list key files]
- Current state: [what's working, what's broken]

CONSTRAINTS:
- [Patterns to follow]
- [Things that must not change]
- [Dependencies available]

EXPECTED OUTPUT:
- [What files to create/modify]
- [What the result should look like]
- [How to verify success]
```

## Best practices

1. **Be specific about files.** Gemini doesn't know the codebase. Name the exact files and functions to modify.

2. **Include error context.** If debugging, paste the actual error message and stack trace.

3. **Specify the framework.** "Fix the Flutter test" is better than "fix the test". "Add a Riverpod provider" is better than "add state management".

4. **Define done.** What command should pass for the task to be complete? "Tests pass with `flutter test`" or "Build succeeds with `npm run build`".

5. **One task per prompt.** Don't combine "fix the bug AND refactor the module AND add tests". Split into separate rescue calls.

## Anti-patterns

- Vague prompts: "make it better" — better: "reduce the function from 80 lines to under 40 by extracting helpers"
- No context: "fix the auth" — better: "fix the JWT refresh in lib/auth.dart — it throws 401 on expired tokens"
- Too broad: "rewrite the app" — break into phases
