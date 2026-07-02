---
name: logbook-troubleshooting
description: Record a solved problem as a runbook in the project's logbook journal — Problem, Solution, Verification, Prevention — auto-numbered and indexed, so the same bug never costs you twice. Use when logbook mode is active and a non-trivial bug, build failure, or environment issue was just diagnosed and fixed (capture it before moving on), or when the user asks to record a fix. Obey the session's logbook mode. Also /logbook:logbook-troubleshooting.
---

# logbook: troubleshooting

Capture a solved problem as a reusable runbook entry.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:logbook-setup` and stop).
2. **Next number:** highest `NNNN` in `<dir>/troubleshooting/` + 1, zero-padded to 4. Short kebab-case slug.
3. **Gather content** from the recent conversation: the symptom, the root cause, the fix, how it was
   verified, and the lasting prevention. Pull the actual error text / command if available.
4. **Write** `<dir>/troubleshooting/NNNN-slug.md` from
   `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/troubleshooting.md`. Set Date (today; `date +%F`), Phase
   (if known), Status (usually `Solved`).
5. **Update the index** `<dir>/README.md`: add a bullet under **Troubleshooting** (`symptom · solution`).
6. **Prevention:** if the gotcha is durable, suggest adding a one-liner to a `## Gotchas` section in
   `CLAUDE.md` so it's seen before it bites again.

## Model-invocation etiquette (when auto-triggered by logbook mode)
- Obey the session's logbook mode (stated in the session-start digest): **auto** — write immediately,
  then report the path in one line; **suggest** — propose in one line and wait for a yes; **manual** —
  only act on an explicit `/logbook` command.
- **Dedupe before writing:** check `<dir>/troubleshooting/` for an existing entry on the same problem or
  same day — update it instead of creating a duplicate.
- Keep auto-recorded entries short; the user can expand later.
- Journal at natural pauses — never interrupt mid-task work to journal.
