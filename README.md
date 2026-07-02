# logbook

**An always-on, file-based dev journal for any project — so the *why* survives context resets.**

logbook is a [Claude Code](https://claude.com/claude-code) plugin. It maintains a small, gitignored
journal in your repo that captures the decisions, dead-ends, and state that normally evaporate between
sessions — and from v0.6.0 it runs itself: every session in a journaled repo starts with an automatic
read-back, entries are recorded as work happens, and a compaction-safe checkpoint protects the story
when context runs out.

```
your-repo/logbook/            # gitignored by default
  README.md                   # live index
  decisions/0001-slug.md      # ADRs — one decision per file
  phases/phase-1-slug.md      # per-phase plan + outcome
  troubleshooting/0001-slug.md# problem → solution runbooks
  sessions/2026-06-27-topic.md# what happened in a session
  handoff/2026-06-27-topic.md # "start here next session" — newest wins
```

## Why

The model forgets. You forget. Six weeks later nobody remembers *why* the buffer math is geodesic, what
the three rejected alternatives were, or what the half-finished branch was supposed to do. A chat history
doesn't help — it's unsearchable and gone on the next `/clear`. logbook turns the durable parts into
flat files that live in the repo, outlast any single session, and read back fast — automatically.

## Always-on: what happens without you asking

Once a repo has a journal (`/logbook:logbook-setup`, once), the plugin's hooks take over the lifecycle:

- **Session start** — the newest handoff, in-progress phases, and open troubleshooting items are injected
  into context automatically. No command needed; you're caught up before the first prompt.
- **During work** — decisions, fixes, and phase boundaries are recorded as they happen (see *Tracking
  modes* below). A light, throttled reminder keeps the journal in the model's attention on long sessions.
- **Context compaction** — if Claude's context gets compacted mid-session, the next turn opens with a
  checkpoint instruction: save what would be lost (a brief session entry marked "checkpoint" + a fresh
  handoff), then resume the task.
- **Wrap-up** — saying "done for today" / "stop here" triggers the end-of-session summary and handoff.
- **Gap detection** — if a session ended without being recorded (crash, closed terminal), the next
  session start notices commits newer than the last session entry and offers a backfill from `git log`.
- **New projects** — in a repo with no journal, session start suggests `/logbook:logbook-setup` exactly
  once, then never mentions it again.

In repos without a journal the hooks stay silent (beyond that one-time suggestion). Requires `node` on
PATH; without it the hooks simply don't fire and every command still works manually.

### Tracking modes

| Mode | Behavior |
|---|---|
| `auto` *(default)* | Entries are written as they happen; you get a one-line report after. |
| `suggest` | Claude proposes ("Record this as an ADR?") and waits for a yes. |
| `manual` | Exactly the pre-0.6.0 behavior — the read-back digest still appears, but nothing is written except on explicit `/logbook` commands. |

Configure in `~/.config/logbook/config.json` (asked once during `logbook-setup`):

```json
{ "mode": "auto", "reminder": "throttled", "stopGuard": false, "suggestSetup": true }
```

- `reminder`: `throttled` (default: every ~5 turns / 20 min) · `every-turn` · `off`
- `stopGuard`: `true` blocks the first stop after substantial unjournaled work until a session entry is
  written (or Claude says in one line that it's skipping). Off by default; the compaction checkpoint +
  gap detection already cover the common failure modes without ever blocking.
- `suggestSetup`: `false` silences the one-time setup suggestion in un-journaled repos.
- Per-session env overrides: `LOGBOOK_MODE`, `LOGBOOK_REMINDER`, `LOGBOOK_STOP_GUARD`,
  `LOGBOOK_SUGGEST_SETUP`.

Hook state lives in `~/.claude/logbook/` (never inside your repo's journal, so committing the journal
never leaks machine-local state). Fully-manual recipe: set `"mode": "manual", "reminder": "off"` — or
just uninstall the hooks' plugin and keep using the commands from an older install.

## Install

```bash
# from the snowmen-plugins catalog — one marketplace for all my plugins
/plugin marketplace add the-snowmen/snowmen-plugins
/plugin install logbook@snowmen-plugins

# …or straight from this repo's own marketplace
/plugin marketplace add the-snowmen/logbook
/plugin install logbook
```

After installing or updating, **restart Claude Code** — hooks are registered at startup.

## Commands

"Auto" marks commands the model may invoke on its own when logbook mode is active; everything is always
available as an explicit slash command too.

| Command | Auto | What it does |
|---|---|---|
| `/logbook:logbook-setup` | on invitation | Scaffold `logbook/` (subdirs + index), gitignore it, ask your tracking mode. Detects an existing `workflow/` journal. Idempotent. |
| `/logbook:logbook-start` | — | **Deep read-back.** The session already opened with a digest; this reads everything in full (CLAUDE.md, handoff, all phases, index) plus an optional baseline check. Read-only. |
| `/logbook:logbook-decision` | ✓ | New ADR in `decisions/NNNN-slug.md` (Context / Decision / Rejected / Consequences), auto-numbered, indexed. |
| `/logbook:logbook-troubleshooting` | ✓ | New runbook in `troubleshooting/NNNN-slug.md` (Problem / Solution / Verification / Prevention). |
| `/logbook:logbook-mark-phase` | ✓ (closes confirmed) | Open or close a `phases/phase-N-slug.md` (Goals / Approach / Verification / Files / Next). |
| `/logbook:logbook-end-session` | ✓ | End-of-session summary in `sessions/YYYY-MM-DD-topic.md`; updates today's file if one exists. |
| `/logbook:logbook-handoff` | ✓ | The "start here next session" brief in `handoff/YYYY-MM-DD-topic.md` — the newest one wins. |
| `/logbook:logbook-search <kw>` | ✓ | Search the journal for a keyword across all entries, ranked. Read-only. |
| `/logbook:logbook-audit` | — | Health check: stale handoff, open items, blocked phases, index drift, unpromoted ADR rules. Read-only. |
| `/logbook:logbook-help` | — | Quick-reference card: every command, the always-on lifecycle, layout, conventions. |

## The loop (now mostly automatic)

1. **Start** — automatic. The session opens with the newest handoff, in-flight phases, and open items.
2. **During** — a real decision or a solved problem is recorded as it lands (per your tracking mode).
3. **End** — say you're wrapping up; the session summary and handoff are written. The newest handoff is
   what the next session's digest shows first.

Phase-driven work adds `/logbook:logbook-mark-phase` at each boundary (closing always confirmed with you).

## Conventions

- **One fact per file**, cross-linked with `[[name]]` wikilinks.
- **Numbering:** `decisions/` and `troubleshooting/` use zero-padded `NNNN-slug`; `sessions/` and
  `handoff/` use `YYYY-MM-DD-topic`; `phases/` use `phase-N-slug`.
- **Gitignored by default** — a local journal, not published. `/logbook:logbook-setup` adds `/logbook/` to
  `.gitignore`. Want to commit your ADRs instead? Remove that line; the format is commit-safe either way.
- **The index** (`logbook/README.md`) is kept current as entries are added.
- **Dedupe rule:** auto-recorded entries never duplicate — an existing entry on the same fact or day is
  updated, not re-created.

## Pairs well with

[fresh-eyes](https://github.com/the-snowmen/fresh-eyes) — external-user reviews of your app. A
fresh-eyes synthesis is a natural source for a `/logbook:logbook-decision` ("we're not fixing X, here's why").

## Credits

Built by [@the-snowmen](https://github.com/the-snowmen) with **Claude Code** as a pair-programming
contributor. The always-on hook pattern is modeled on
[caveman](https://github.com/JuliusBrussee/caveman)'s session hooks.

## License

MIT — see [LICENSE](LICENSE).
