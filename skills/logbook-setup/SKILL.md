---
name: logbook-setup
description: Scaffold a gitignored logbook/ dev journal in this repo — decisions, phases, troubleshooting, sessions, and handoff subdirs plus an index — and add it to .gitignore. Use ONLY when the user explicitly asks for a logbook or accepts the session-start suggestion — never uninvited. Idempotent; detects an existing workflow/ journal. Also /logbook:logbook-setup.
---

# logbook: init

Scaffold the dev journal for this repo. Full repo access. Idempotent — never clobber existing files.

## Procedure
1. **Pick the journal dir.**
   - If `./logbook/` exists, use it.
   - Else if `./workflow/` exists (an existing journal of this shape), tell the user and use `./workflow/`
     rather than making a second journal — the other commands work with either name.
   - Else create `./logbook/`.
2. **Create subdirs** (if missing): `decisions/`, `phases/`, `troubleshooting/`, `sessions/`, `handoff/`.
3. **Write the index** at `<dir>/README.md` from
   `${CLAUDE_PLUGIN_ROOT}/skills/logbook-setup/templates/index.md`, filling `{Project Name}` from `CLAUDE.md`,
   `package.json`, or the repo folder name. Do **not** overwrite an existing index.
4. **Gitignore it (default).** Ensure a `/<dir>/` line exists in `.gitignore` (create `.gitignore` if
   absent). Tell the user it's local-only by default, and that they can remove the line to commit their
   records instead (the format is commit-safe either way).
5. **Ask about tracking mode.** logbook is always-on by default: sessions in this repo now start with an
   automatic read-back digest, and entries are recorded as work happens. **The config is user-global**
   (`~/.config/logbook/config.json` governs every journaled repo on this machine) — read it first if it
   exists and mention its current values when asking. Ask which mode the user wants — **auto** (default:
   write entries as they happen, report after), **suggest** (propose first, wait for a yes), or
   **manual** (only on explicit `/logbook` commands) — plus whether to enable the optional stop-guard
   (blocks the first stop after substantial unjournaled work; default off). Write the file whenever the
   chosen answers differ from its current effective values (or from the defaults when no file exists),
   e.g.:
   ```json
   { "mode": "suggest", "reminder": "throttled", "stopGuard": false, "suggestSetup": true }
   ```
   Mention the env overrides (`LOGBOOK_MODE`, `LOGBOOK_REMINDER`, `LOGBOOK_STOP_GUARD`,
   `LOGBOOK_SUGGEST_SETUP`) for one-off sessions.
6. **Report** the tree created and what happens next: from the next session on, the journal is read back
   automatically at session start; during work, decisions and fixes are recorded per the chosen mode;
   `/logbook:logbook-help` shows the full reference.

Keep it minimal and safe: additive only.
