---
name: logbook-audit
description: Health-check the logbook journal — flag a stale newest handoff, still-open troubleshooting items, blocked or never-closed phases, and an index that's out of sync with the files on disk. Returns an action list so the journal stays trustworthy. Invoke with /logbook:logbook-audit. Read-only.
disable-model-invocation: true
---

# logbook: audit the journal

Check the journal's health and report what needs attention. **Read-only — make no edits** (only suggest).

## Procedure

1. **Find the journal dir:** `./logbook/`, else `./workflow/`. If neither exists, say so and suggest
   `/logbook:logbook-setup`; stop.
2. **Run the checks:**
   - **Handoff freshness** — find the newest `<dir>/handoff/YYYY-MM-DD-*.md`. Compare its date to today
     (`date +%F`). Flag if older than ~14 days, or if there is no handoff at all.
   - **Open troubleshooting** — scan `<dir>/troubleshooting/*.md` for a Status of `Open` / `Workaround`
     (not `Resolved`). List each by file + title.
   - **Phases** — scan `<dir>/phases/*.md`: flag any `⛔ Blocked`, and any `⏳ In progress` whose newest
     related activity is old (possible stalled phase). Note phases with no closing Verification.
   - **Index drift** — compare files on disk against what `<dir>/README.md` lists. Flag files missing from
     the index and index entries pointing at files that no longer exist.
   - **Broken cross-links** — spot-check `[[NNNN-slug]]` / `[[phase-N-slug]]` references that don't
     resolve to an existing file.
3. **Report** a short "Logbook health" summary: a ✅/⚠️ line per check, then a concrete action list
   (e.g. "→ write a fresh `/logbook:logbook-handoff`", "→ resolve or close `0004-...`",
   "→ re-run `/logbook:logbook-setup` to rebuild the index" — note setup is idempotent and won't clobber).
4. If everything is healthy, say so in one line.

## Notes
- Suggest fixes; don't apply them. The user (or the relevant write-skill) makes the edits.
- Keep it fast — counts and one line per finding, not full file dumps.
