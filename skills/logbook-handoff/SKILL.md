---
name: logbook-handoff
description: Write the "start here next session" brief in the project's logbook journal (handoff/YYYY-MM-DD-topic.md; newest wins) — state coming in, the goal, design references, open questions, working rules, and a verified starting state. Use immediately after an end-of-session summary, when the user is wrapping up, or when a logbook reminder says the handoff is missing or stale. The newest handoff is what the next session's read-back digest shows first. Also /logbook:logbook-handoff.
---

# logbook: handoff

Write the brief that reads the *next* session back into context. The newest handoff wins — it's the first
thing `/logbook:logbook-start` reads.

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

## Model-invocation etiquette (when auto-triggered by logbook mode)
- Obey the session's logbook mode (stated in the session-start digest): **auto** — write immediately,
  then report the path in one line; **suggest** — propose in one line and wait for a yes; **manual** —
  only act on an explicit `/logbook` command.
- **Dedupe before writing:** if a handoff for today already exists, update it (it stays the newest)
  instead of creating a second file for the same day.
- The "Verified starting state" commands may take a moment — in auto mode run only cheap ones
  (`git status`, a fast test target); note anything skipped.
