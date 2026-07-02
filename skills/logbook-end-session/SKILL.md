---
name: logbook-end-session
description: Write the end-of-session summary in the project's logbook journal (sessions/YYYY-MM-DD-topic.md) — what happened, decisions resolved, what was built, verification, gotchas, next steps. Use when the user is wrapping up or says they're done, or when a logbook reminder (post-compaction checkpoint or stop guard) says today's session is unrecorded — update today's file if it already exists. Also /logbook:logbook-end-session.
---

# logbook: session

Capture what this session actually did, before it evaporates.

## Procedure
0. **Check for today's entry first.** If `<dir>/sessions/<today>-*.md` already exists (e.g. a
   post-compaction checkpoint), **update that file** instead of creating a second — finalize a
   `(checkpoint)` entry into the real summary. Only start a new file with a different topic if it's
   genuinely a distinct session.
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:logbook-setup` and stop).
2. **Filename:** `<dir>/sessions/YYYY-MM-DD-topic.md` (today's date via `date +%F`; short kebab-case topic).
3. **Fill** from `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/session.md` using this session's actual work:
   what happened, decisions/questions resolved (link `[[NNNN-slug]]`), what was built (with paths),
   verification (commands + results), notes/gotchas, and the pointer to next steps.
4. **Update the index** `<dir>/README.md` under **Sessions**.
5. **Suggest follow-ups:** any real decision → `/logbook:logbook-decision`; any solved bug worth keeping →
   `/logbook:logbook-troubleshooting`; and a fresh `/logbook:logbook-handoff` so the next session starts clean.
6. **Report** the path.

## Model-invocation etiquette (when auto-triggered by logbook mode)
- Obey the session's logbook mode (stated in the session-start digest): **auto** — write immediately,
  then report the path in one line; **suggest** — propose in one line and wait for a yes; **manual** —
  only act on an explicit `/logbook` command.
- A post-compaction **checkpoint** is deliberately brief — capture what would be lost, mark the entry
  `(checkpoint)`, and return to the task; finalize it at real session end.
- Journal at natural pauses — never interrupt mid-task work to journal.
