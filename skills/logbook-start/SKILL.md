---
name: logbook-start
description: Cold-start a session — read CLAUDE.md (if present) plus the newest handoff and the phase docs from the logbook journal, and summarize where you left off, what's in flight, and the open questions. Read-only; writes nothing. Invoke with /logbook:logbook-start.
disable-model-invocation: true
---

# logbook: start a session (read yourself back in)

Read yourself back into context at the start of a session. **Read-only — make no edits.**

## Procedure
1. **Find the journal dir:** `./logbook/`, else `./workflow/`. If neither exists, say so and suggest
   `/logbook:logbook-setup`; stop.
2. **Read, in this order:**
   - `CLAUDE.md` at the repo root (if present) — the locked rules/architecture.
   - The **newest** file in `<dir>/handoff/` (highest `YYYY-MM-DD` in the name) — the "start here" brief.
   - Every file in `<dir>/phases/` — for current status and what's in flight.
   - `<dir>/README.md` — the index, for the lay of the land.
   - Skim the most recent `<dir>/sessions/` entry and any `Open`/`Workaround` items in
     `<dir>/troubleshooting/`.
3. **Summarize for the user**, concisely:
   - **Where things stand** — completed phases, the current phase, last session's outcome.
   - **Start here** — the goal + working rules from the newest handoff.
   - **Open questions** the handoff says to resolve early (surface these prominently).
   - **Suggested next step.**
   - Note any unresolved troubleshooting items.
4. Point the user at the files you read (clickable paths) so they can dive in.

Do not modify anything. If the journal looks stale (newest handoff is old, or phases lag the code), say
so — it's a signal to write a fresh handoff at the end of this session.
