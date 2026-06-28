# logbook

**A file-based dev journal for any project — so the *why* survives context resets.**

logbook is a [Claude Code](https://claude.com/claude-code) plugin. It scaffolds and maintains a small,
gitignored journal in your repo that captures the decisions, dead-ends, and state that normally evaporate
between sessions — and reads you back into context on demand.

```
your-repo/logbook/            # gitignored by default
  README.md                   # live index
  decisions/0001-slug.md      # ADRs — one decision per file
  phases/phase-1-slug.md      # per-phase plan + outcome
  troubleshooting/0001-slug.md# problem → solution runbooks
  sessions/2026-06-27-topic.md# what happened in a session
  handoff/2026-06-27-topic.md # "start here next session" — newest wins
```

Per-turn reasoning is ephemeral. Anything worth keeping — a real decision, a hard-won fix, where you left
off — lands in a small markdown file, cross-linked with `[[0001-slug]]` wikilinks. Next session you run
`/logbook:logbook-start` and you're back in context cold.

## Why

The model forgets. You forget. Six weeks later nobody remembers *why* the buffer math is geodesic, what
the three rejected alternatives were, or what the half-finished branch was supposed to do. A chat history
doesn't help — it's unsearchable and gone on the next `/clear`. logbook turns the durable parts into
flat files that live in the repo, outlast any single session, and read back fast.

## Install

```bash
# from the snowmen-plugins catalog — one marketplace for all my plugins
/plugin marketplace add the-snowmen/snowmen-plugins
/plugin install logbook@snowmen-plugins

# …or straight from this repo's own marketplace
/plugin marketplace add the-snowmen/logbook
/plugin install logbook
```

## Commands

| Command | What it does |
|---|---|
| `/logbook:logbook-setup` | Scaffold `logbook/` (subdirs + index), and gitignore it. Detects an existing `workflow/` and offers to use it. Idempotent. |
| `/logbook:logbook-start` | **Cold start.** Reads `CLAUDE.md` (if any) + the newest handoff + the phase docs + the index, and summarizes where you left off and what's open. Read-only. |
| `/logbook:logbook-decision` | New ADR in `decisions/NNNN-slug.md` (Context / Decision / Rejected / Consequences), auto-numbered, indexed. |
| `/logbook:logbook-troubleshooting` | New runbook in `troubleshooting/NNNN-slug.md` (Problem / Solution / Verification / Prevention). |
| `/logbook:logbook-mark-phase` | Open or close a `phases/phase-N-slug.md` (Goals / Approach / Verification / Files / Next). |
| `/logbook:logbook-end-session` | End-of-session summary in `sessions/YYYY-MM-DD-topic.md`. |
| `/logbook:logbook-handoff` | The "start here next session" brief in `handoff/YYYY-MM-DD-topic.md` — the newest one wins. |
| `/logbook:logbook-search <kw>` | Search the journal for a keyword across all entries, ranked. Read-only. |
| `/logbook:logbook-audit` | Health check: stale handoff, open troubleshooting items, blocked/stalled phases, index drift. Read-only. |
| `/logbook:logbook-help` | Quick-reference card: every command, lifecycle order, layout, conventions. |

## The loop

A simple session rhythm the commands support:

1. **Start** — `/logbook:logbook-start`. Reads `CLAUDE.md` → newest handoff → phases. You're caught up.
2. **During** — a real decision → `/logbook:logbook-decision`; a problem solved → `/logbook:logbook-troubleshooting`.
3. **End** — `/logbook:logbook-end-session` (what happened) + `/logbook:logbook-handoff` (what's next). Newest handoff wins.

Phase-driven work adds `/logbook:logbook-mark-phase` at each boundary.

## Conventions

- **One fact per file**, cross-linked with `[[name]]` wikilinks.
- **Numbering:** `decisions/` and `troubleshooting/` use zero-padded `NNNN-slug`; `sessions/` and
  `handoff/` use `YYYY-MM-DD-topic`; `phases/` use `phase-N-slug`.
- **Gitignored by default** — a local journal, not published. `/logbook:logbook-setup` adds `/logbook/` to
  `.gitignore`. Want to commit your ADRs instead? Remove that line; the format is commit-safe either way.
- **The index** (`logbook/README.md`) is kept current as entries are added.

## Pairs well with

[fresh-eyes](https://github.com/the-snowmen/fresh-eyes) — external-user reviews of your app. A
fresh-eyes synthesis is a natural source for a `/logbook:logbook-decision` ("we're not fixing X, here's why").

## Credits

Built by [@the-snowmen](https://github.com/the-snowmen) with **Claude Code** (Claude Opus 4.8) as a
pair-programming contributor.

## License

MIT — see [LICENSE](LICENSE).
