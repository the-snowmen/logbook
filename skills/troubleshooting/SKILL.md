---
name: troubleshooting
description: Record a problem→solution runbook in the logbook journal — Problem, Solution, Verification, Prevention — auto-numbered and indexed, so the same bug never costs you twice. Invoke with /logbook:troubleshooting.
disable-model-invocation: true
---

# logbook: troubleshooting

Capture a solved problem as a reusable runbook entry.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:init` and stop).
2. **Next number:** highest `NNNN` in `<dir>/troubleshooting/` + 1, zero-padded to 4. Short kebab-case slug.
3. **Gather content** from the recent conversation: the symptom, the root cause, the fix, how it was
   verified, and the lasting prevention. Pull the actual error text / command if available.
4. **Write** `<dir>/troubleshooting/NNNN-slug.md` from
   `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/troubleshooting.md`. Set Date (today; `date +%F`), Phase
   (if known), Status (usually `Solved`).
5. **Update the index** `<dir>/README.md`: add a bullet under **Troubleshooting** (`symptom · solution`).
6. **Prevention:** if the gotcha is durable, suggest adding a one-liner to a `## Gotchas` section in
   `CLAUDE.md` so it's seen before it bites again.
