---
name: logbook-decision
description: Record an architectural or technical decision as an ADR in the project's logbook journal — Context, Decision, Rejected alternatives, Consequences — auto-numbered and indexed. Use when logbook mode is active and a real decision was just made or confirmed (a library/approach chosen, an alternative rejected, a constraint locked in), or when the user asks to record a decision. Obey the session's logbook mode. Also /logbook:logbook-decision.
---

# logbook: decision

Capture a real decision as an ADR so it isn't relitigated later.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:logbook-setup` and stop).
2. **Next number:** scan `<dir>/decisions/` for the highest `NNNN` prefix; use the next one, zero-padded
   to 4 (`0001`, `0002`, …). Pick a short kebab-case slug from the decision.
3. **Gather content** from the user's request and the recent conversation. The **"Rejected alternatives"
   section is mandatory** — an ADR with no rejected options is half an ADR. If you don't have at least one
   real alternative and the reason it lost, ask the user, and **do not write the file until you do.**
4. **Write** `<dir>/decisions/NNNN-slug.md` from
   `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/decision.md`. Set Status (usually `Accepted`) and today's
   date (run `date +%F` if unsure). Link related records with `[[NNNN-slug]]`.
5. **Update the index** `<dir>/README.md`: add a bullet under **Decisions (ADR)**.
6. **Report** the path and a one-line summary. If the decision implies a rule worth locking in, suggest
   adding it to `CLAUDE.md`.

## Model-invocation etiquette (when auto-triggered by logbook mode)
- Obey the session's logbook mode (stated in the session-start digest): **auto** — write immediately,
  then report the path in one line; **suggest** — propose in one line and wait for a yes; **manual** —
  only act on an explicit `/logbook` command.
- **Dedupe before writing:** check `<dir>/decisions/` for an existing entry on the same fact or same
  day — update it instead of creating a duplicate.
- In **auto** mode, don't block on the mandatory-alternatives gate: if the conversation contains no real
  rejected alternative, write the entry anyway with the Rejected section reading "None seriously
  considered — recorded automatically; add any that were." and flag that in the one-line report. Ask the
  user to fill it in at the next natural pause. (The hard gate in step 3 applies to explicit
  `/logbook` invocations.)
- Keep auto-recorded entries short; the user can expand later.
- Journal at natural pauses — never interrupt mid-task work to journal.
