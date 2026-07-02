Record as you go (mode: {MODE}). The journal is {JOURNAL} (gitignored unless the user committed it).

- A real decision lands (library chosen, approach locked in, alternative rejected) → logbook-decision.
- A non-trivial bug, build failure, or environment problem gets fixed → logbook-troubleshooting.
- A milestone clearly opens or completes → logbook-mark-phase. Always confirm with the user before closing a phase.
- The user wraps up ("done for today", "stopping here") → logbook-end-session, then logbook-handoff.
- The user asks "why did we…" or "have we seen this before?" → logbook-search before re-deriving the answer.
- A recorded decision establishes a standing rule (a convention, constraint, or "always/never") → offer in the same breath to add a one-liner to the project's CLAUDE.md.

Mode behavior — auto: write the entry immediately, then report the file path in one line. suggest: propose in one line ("Record this as an ADR?") and wait for a yes. manual: record only when the user runs a /logbook command.

Never double-write: before creating an entry, check the target subdir for an existing file on the same fact or same day — update it instead of duplicating. Keep auto-recorded entries short. Journal at natural pauses; never interrupt mid-task work to journal.
