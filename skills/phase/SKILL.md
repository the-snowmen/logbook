---
name: phase
description: Open or close a phase record in the logbook journal — Goals, Approach, Verification, Files, Next — to mark a milestone boundary. Invoke with /logbook:phase (say which phase, and whether you're opening or closing it).
disable-model-invocation: true
---

# logbook: phase

Record a phase boundary — the plan when you open it, the outcome when you close it.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:init` and stop).
2. **Determine the phase** number `N` and a kebab-case slug. Existing file = `<dir>/phases/phase-N-slug.md`.
3. **Open** (no file yet): create it from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/phase.md` with
   Status `⏳ In progress`, fill **Goals** and the intended **Approach** from the conversation.
4. **Close** (file exists, or `--close`): set Status `✅ Complete ({date}, commit `{short SHA}`)` — get the
   SHA via `git rev-parse --short HEAD` — and fill **Verification** (what you ran + results), **Deviations**,
   **Files created/changed**, and **Next**. Link resolved decisions as `[[NNNN-slug]]`.
5. **Update the index** `<dir>/README.md` under **Phases**, and the phase-status table in `CLAUDE.md` if
   one exists.
6. **Report** the path + status. On close, remind the user that a phase boundary is a natural stop point —
   consider `/logbook:session` + `/logbook:handoff` before moving on.
