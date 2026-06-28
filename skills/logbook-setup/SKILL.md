---
name: logbook-setup
description: Scaffold a gitignored logbook/ dev journal in this repo — decisions, phases, troubleshooting, sessions, and handoff subdirs plus an index — and add it to .gitignore. Idempotent; detects an existing workflow/ journal. Invoke with /logbook:logbook-setup.
disable-model-invocation: true
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
5. **Report** the tree created and the next step: `/logbook:logbook-start` at the start of each session;
   `/logbook:logbook-decision` / `/logbook:logbook-handoff` etc. as you work.

Keep it minimal and safe: additive only.
