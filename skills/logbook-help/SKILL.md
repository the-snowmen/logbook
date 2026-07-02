---
name: logbook-help
description: Quick-reference card for the logbook plugin — every command, the always-on lifecycle (hooks, tracking modes, config), the journal layout, and conventions. One-shot display, not a workflow. Invoke with /logbook:logbook-help.
disable-model-invocation: true
---

# logbook — quick reference

Display this card (adapt lightly if the user asked about one command). Don't scaffold or write anything —
help only.

**logbook** is an always-on, gitignored, file-based dev journal: decisions (ADRs), phases, session
summaries, troubleshooting runbooks, and session-to-session handoffs. One fact per file, cross-linked.
Survives context resets.

## Always-on (hooks — active automatically in journaled repos)

| When | What happens |
|---|---|
| Session start | Newest handoff + in-progress phases + open troubleshooting injected automatically; gap detection offers a backfill if commits outpaced the last recorded session |
| During work | Decisions/fixes/phase changes recorded per the tracking mode; light throttled reminder |
| Context compaction | Next turn opens with a checkpoint instruction — save a brief session entry + handoff, then resume |
| Wrap-up phrases ("done for today") | End-session + handoff triggered |
| Session end | Hook state cleaned up |
| Repo with no journal | One-time `/logbook:logbook-setup` suggestion, then permanent silence |

**Tracking modes** (`~/.config/logbook/config.json`, asked at setup): `auto` (default — write, then
report in one line) · `suggest` (propose, wait for yes) · `manual` (explicit commands only).
Other keys: `reminder` (`throttled` default / `every-turn` / `off`), `stopGuard` (default `false`;
`true` blocks the first stop after substantial unjournaled work, once per session), `suggestSetup`
(default `true`). Env overrides: `LOGBOOK_MODE`, `LOGBOOK_REMINDER`, `LOGBOOK_STOP_GUARD`,
`LOGBOOK_SUGGEST_SETUP`. Fully manual: `{"mode":"manual","reminder":"off"}`.
Hook state lives in `~/.claude/logbook/` — never inside the repo's journal. Requires `node` on PATH;
hook changes require restarting Claude Code.

## Commands by lifecycle

"Auto ✓" = the model may invoke it on its own when logbook mode is active.

| When | Command | Auto | Records / does |
|---|---|---|---|
| **Once** | `/logbook:logbook-setup` | on invitation | Scaffold `logbook/` (subdirs + index), gitignore it, ask tracking mode |
| **Session start** | `/logbook:logbook-start` | — | Deep read-back beyond the automatic digest: CLAUDE.md → newest handoff → all phases → index (read-only) |
| During work | `/logbook:logbook-decision` | ✓ | An ADR: context, decision, **rejected alternatives**, consequences |
| During work | `/logbook:logbook-troubleshooting` | ✓ | A runbook: problem, solution, verification, prevention |
| At a milestone | `/logbook:logbook-mark-phase` | ✓ (closes confirmed) | Open or close a phase (goals/approach → verification/outcome) |
| **Session end** | `/logbook:logbook-end-session` | ✓ | Summary: what happened, decisions, what was built, gotchas, next — updates today's file if it exists |
| **Session end** | `/logbook:logbook-handoff` | ✓ | "Start here next session" brief — the newest one wins |
| Anytime | `/logbook:logbook-search <kw>` | ✓ | Search the journal for a keyword, ranked |
| Anytime | `/logbook:logbook-audit` | — | Health check: stale handoff, open items, index drift, unpromoted ADR rules |
| Anytime | `/logbook:logbook-help` | — | This card |

## Typical rhythm (mostly automatic now)

```
# first time in a repo
/logbook:logbook-setup                 # scaffold + pick tracking mode

# every session — no commands needed
[session opens with the digest: handoff, phases, open items]
  …work… → decisions and fixes recorded as they land (auto mode)
  at a milestone → phase opened/closed (closing confirmed with you)
"done for today" → session summary + handoff written  →  next session's digest reads it back
```

## Layout (gitignored by default)

```
logbook/
  README.md                       # index — live catalog of every entry
  decisions/0001-slug.md          # ADRs (auto-numbered NNNN)
  troubleshooting/0001-slug.md    # runbooks (auto-numbered NNNN)
  phases/phase-1-slug.md          # milestones
  sessions/2026-06-28-topic.md    # what happened (YYYY-MM-DD-topic)
  handoff/2026-06-28-topic.md     # next-session brief (newest wins)
```

## Conventions

- One fact per file. Cross-link with `[[NNNN-slug]]` / `[[phase-N-slug]]`.
- `decisions/` & `troubleshooting/` auto-number `NNNN`; `sessions/` & `handoff/` use `YYYY-MM-DD-topic`.
- The index (`logbook/README.md`) updates as you add entries.
- Auto-recorded entries dedupe: an existing entry on the same fact/day is updated, never duplicated.
- Gitignored by default — it's a local journal. Remove `/logbook/` from `.gitignore` to commit ADRs.
