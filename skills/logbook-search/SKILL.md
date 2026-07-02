---
name: logbook-search
description: Search the project's logbook journal for a keyword or phrase across decisions, troubleshooting runbooks, phases, sessions, and handoffs — ranked results with the matching context. Use when the project has a logbook/ (or workflow/) journal and the user asks why something was decided, whether a bug was seen before, or what a past session did — check the journal before re-deriving an answer. Read-only. Also /logbook:logbook-search <keyword>.
---

# logbook: search the journal

Find a past decision, runbook, phase, or session by keyword. **Read-only — make no edits.**

Query = `$ARGUMENTS` (the words after the command). If empty, ask the user what to search for and stop.

## Procedure

1. **Find the journal dir:** `./logbook/`, else `./workflow/`. If neither exists, say so and suggest
   `/logbook:logbook-setup`; stop.
2. **Search** every `*.md` under `<dir>/` (decisions, troubleshooting, phases, sessions, handoff, and the
   index). Use a case-insensitive search, e.g.:
   ```
   grep -rin --include='*.md' "<query>" <dir>/
   ```
   For a multi-word query, also try each significant term so a near-match isn't missed.
3. **Rank** results most-useful first:
   - title / first-heading match > body match,
   - `decisions/` and `troubleshooting/` (durable knowledge) above `sessions/` (ephemeral),
   - newer entries above older when otherwise equal.
4. **Report** a compact table — one row per matching file:
   `file (clickable path) · entry title · the matched line (trimmed) · category`.
   Group by category (Decisions / Troubleshooting / Phases / Sessions / Handoffs). Cap at ~15 rows; if
   more, say how many were omitted and how to narrow.
5. If nothing matches, say so and suggest the closest related entries (e.g. same area) by scanning the
   index, so the search still points somewhere useful.

## Notes
- Respect `[[NNNN-slug]]` cross-links: if a top hit references another entry, mention it as "related".
- Don't open or dump whole files — show the matched line + title; let the user click through.
