---
name: logbook-handoff
description: Write the "start here next session" brief in the logbook journal — state coming in, the goal, design references, open questions, working rules, and a verified starting state. The newest handoff is what /logbook:logbook-resume reads first. Invoke with /logbook:logbook-handoff.
disable-model-invocation: true
---

# logbook: handoff

Write the brief that reads the *next* session back into context. The newest handoff wins — it's the first
thing `/logbook:logbook-resume` reads.

## Procedure
1. **Find the journal dir** (`./logbook/`, else `./workflow/`; if neither, suggest `/logbook:logbook-setup` and stop).
2. **Filename:** `<dir>/handoff/YYYY-MM-DD-topic.md` (today's date via `date +%F`; short kebab-case topic).
3. **Fill** from `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/handoff.md`:
   - **State coming in** — where the project is right now (completed phases, key decisions).
   - **Goal** — what the next session should accomplish or decide.
   - **Design references** — the docs to read first (`CLAUDE.md` sections, ADRs via `[[NNNN-slug]]`).
   - **Open questions to resolve early** — the decisions blocking progress; phrase them for the user.
   - **Working rules** carried forward.
   - **Verified starting state** — actual commands that confirm the baseline (tests, `git status`, build);
     run them now and paste the real results so the next session trusts the starting point.
4. **Update the index** `<dir>/README.md` under **Handoff**, marking this one `← newest` and de-marking
   the previous.
5. **Report** the path and a one-line "next session will pick up at: …".
