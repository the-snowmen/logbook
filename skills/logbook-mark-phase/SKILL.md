---
name: logbook-mark-phase
description: Open or close a phase/milestone record in the project's logbook journal — Goals, Approach → Verification, Files, Next. Use when logbook mode is active and a milestone clearly begins or completes; ALWAYS confirm with the user before closing a phase. Also /logbook:logbook-mark-phase (say which phase, opening or closing).
---

# logbook: phase

Record a phase boundary — the plan when you open it, the outcome when you close it.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:logbook-setup` and stop).
2. **Determine the phase** number `N` and a kebab-case slug. Existing file = `<dir>/phases/phase-N-slug.md`.
3. **Open** (no file yet): create it from `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/phase.md` with
   Status `⏳ In progress`, fill **Goals** and the intended **Approach** from the conversation.
4. **Close** (file exists, or `--close`): set Status `✅ Complete ({date}, commit `{short SHA}`)` — get the
   SHA via `git rev-parse --short HEAD` — and fill **Verification** (what you ran + results), **Deviations**,
   **Files created/changed**, and **Next**. Scan `<dir>/decisions/` and `<dir>/troubleshooting/` for entries
   added since this phase opened (by date) and **link the ones this phase resolved** as `[[NNNN-slug]]` —
   ask the user which apply if unsure.
5. **Update the index** `<dir>/README.md` under **Phases**. If a `## Phases` table exists in `CLAUDE.md`,
   update this phase's row (status + completion date/commit); if not and the user wants project state
   centralized, offer to add one.
6. **Report** the path + status. On close, remind the user that a phase boundary is a natural stop point —
   consider `/logbook:logbook-end-session` + `/logbook:logbook-handoff` before moving on.

## Model-invocation etiquette (when auto-triggered by logbook mode)
- Closing a phase is a judgment call — **always confirm with the user first**, whatever the mode.
  Opening one in auto mode may proceed directly; report the path in one line.
- **Dedupe before writing:** check `<dir>/phases/` for an existing record of the same phase — update it
  instead of creating a duplicate.
- Journal at natural pauses — never interrupt mid-task work to journal.
