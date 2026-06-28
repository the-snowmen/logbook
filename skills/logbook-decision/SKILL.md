---
name: logbook-decision
description: Record an architectural decision (ADR) in the logbook journal — Context, Decision, Rejected alternatives, Consequences — auto-numbered and indexed. Invoke with /logbook:logbook-decision (optionally describe the decision).
disable-model-invocation: true
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
