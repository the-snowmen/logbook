---
name: logbook-help
description: Quick-reference card for the logbook plugin — every command, what it records, the session lifecycle order, the journal layout, and conventions. One-shot display, not a workflow. Invoke with /logbook:logbook-help.
disable-model-invocation: true
---

# logbook — quick reference

Display this card (adapt lightly if the user asked about one command). Don't scaffold or write anything —
help only.

**logbook** is a gitignored, file-based dev journal: decisions (ADRs), phases, session summaries,
troubleshooting runbooks, and session-to-session handoffs. One fact per file, cross-linked. Survives
context resets.

## Commands by lifecycle

| When | Command | Records / does |
|---|---|---|
| **Once** | `/logbook:logbook-setup` | Scaffold `logbook/` (subdirs + index) and gitignore it |
| **Session start** | `/logbook:logbook-start` | Read you back in: CLAUDE.md → newest handoff → phases → index (read-only) |
| During work | `/logbook:logbook-decision` | An ADR: context, decision, **rejected alternatives**, consequences |
| During work | `/logbook:logbook-troubleshooting` | A runbook: problem, solution, verification, prevention |
| At a milestone | `/logbook:logbook-mark-phase` | Open or close a phase (goals/approach → verification/outcome) |
| **Session end** | `/logbook:logbook-end-session` | Summary: what happened, decisions, what was built, gotchas, next |
| **Session end** | `/logbook:logbook-handoff` | "Start here next session" brief — the newest one wins |
| Anytime | `/logbook:logbook-search <kw>` | Search the journal for a keyword, ranked |
| Anytime | `/logbook:logbook-audit` | Health check: stale handoff, open items, index drift |
| Anytime | `/logbook:logbook-help` | This card |

## Typical rhythm

```
# first time in a repo
/logbook:logbook-setup

# every session
/logbook:logbook-start                 # read yourself back in
  …work… → /logbook:logbook-decision, /logbook:logbook-troubleshooting as they come up
  at a milestone → /logbook:logbook-mark-phase
/logbook:logbook-end-session           # summarize the session
/logbook:logbook-handoff               # brief for next time  →  next /logbook:logbook-start reads this
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
- Gitignored by default — it's a local journal. Remove `/logbook/` from `.gitignore` to commit ADRs.
