---
name: session
description: Write an end-of-session summary in the logbook journal — what happened, decisions resolved, what was built, verification, gotchas, next steps. Invoke with /logbook:session.
disable-model-invocation: true
---

# logbook: session

Capture what this session actually did, before it evaporates.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:setup` and stop).
2. **Filename:** `<dir>/sessions/YYYY-MM-DD-topic.md` (today's date via `date +%F`; short kebab-case topic).
3. **Fill** from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/session.md` using this session's actual work:
   what happened, decisions/questions resolved (link `[[NNNN-slug]]`), what was built (with paths),
   verification (commands + results), notes/gotchas, and the pointer to next steps.
4. **Update the index** `<dir>/README.md` under **Sessions**.
5. **Suggest follow-ups:** any real decision → `/logbook:decision`; any solved bug worth keeping →
   `/logbook:troubleshooting`; and a fresh `/logbook:handoff` so the next session starts clean.
6. **Report** the path.
