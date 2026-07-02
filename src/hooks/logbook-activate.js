#!/usr/bin/env node
// logbook — SessionStart hook.
//
// journal found + source startup/resume/clear → inject the read-back digest
//   (rules, newest handoff, in-progress phases, open troubleshooting, gap check)
// journal found + source compact             → inject a short checkpoint nudge
// no journal, git project, first time        → one-time /logbook-setup suggestion
// anything else                              → silence
//
// stdout becomes injected session context. Always exits 0.

const fs = require('fs');
const path = require('path');
const lib = require('./logbook-lib.js');

function main() {
  const data = lib.readStdinJson();
  const cfg = lib.getConfig();
  const found = lib.findJournal(data);
  const sessionId = data.session_id;
  const paths = lib.statePaths(sessionId);

  if (!found) {
    suggestSetupOnce(data, cfg, paths);
    return;
  }

  // Refresh session state, preserving turn/compact counters across
  // compact/resume/clear re-fires within the same session id.
  const prev = lib.readJsonCapped(paths.sessionState);
  const state = lib.freshSessionState(found, sessionId);
  if (prev && prev.journal === found.journalDir) {
    state.startedAt = prev.startedAt || state.startedAt;
    state.turnCount = prev.turnCount || 0;
    state.lastReminderTurn = prev.lastReminderTurn || 0;
    state.lastReminderAt = prev.lastReminderAt || 0;
    state.compactedAt = prev.compactedAt || null;
    state.compactCount = prev.compactCount || 0;
    state.stopNagged = !!prev.stopNagged;
  }
  lib.pruneSessionsDir(paths.sessionsDir);

  // Journal exists now — clear any stale setup-suggestion record.
  clearSetupRecord(found.projectDir, paths);

  if (data.source === 'compact') {
    state.compactedAt = new Date().toISOString();
    state.compactCount += 1;
    lib.safeWriteJson(paths.sessionState, state);
    process.stdout.write(compactNudge(found, cfg));
    return;
  }

  const digest = buildDigest(found, cfg, state);
  lib.safeWriteJson(paths.sessionState, state);
  process.stdout.write(lib.capBytes(digest, lib.TOTAL_CAP, 'digest truncated'));
}

function suggestSetupOnce(data, cfg, paths) {
  if (!cfg.suggestSetup) return;
  // Only in real projects (git repo at a candidate root) — never random dirs.
  const roots = [process.env.CLAUDE_PROJECT_DIR, data.cwd, process.cwd()].filter(Boolean);
  let projectDir = null;
  for (const r of roots) {
    try {
      const real = fs.realpathSync(r);
      if (lib.hasGit(real)) { projectDir = real; break; }
    } catch (e) { /* ignore */ }
  }
  if (!projectDir) return;

  const g = lib.readJsonCapped(paths.globalState, 65536) || { version: 1, projects: {} };
  if (!g.projects || typeof g.projects !== 'object') g.projects = {};
  const rec = g.projects[projectDir];
  if (rec && (rec.setupSuggestedAt || rec.declinedSetup)) return;

  // Mark BEFORE injecting so the suggestion can never repeat, even on a crash.
  g.projects[projectDir] = { setupSuggestedAt: new Date().toISOString() };
  if (!lib.safeWriteJson(paths.globalState, lib.pruneProjects(g))) return;

  process.stdout.write(
    'This project has no logbook journal. The logbook plugin can keep a gitignored dev journal ' +
    '(decisions, fixes, session summaries, handoffs) that survives context resets. ' +
    'If a natural moment comes up, mention ONCE that the user can run /logbook:logbook-setup to start one. ' +
    'If they decline or ignore it, never raise it again. (This suggestion is one-time per project.)'
  );
}

function clearSetupRecord(projectDir, paths) {
  try {
    const g = lib.readJsonCapped(paths.globalState, 65536);
    if (g && g.projects && g.projects[projectDir]) {
      delete g.projects[projectDir];
      lib.safeWriteJson(paths.globalState, g);
    }
  } catch (e) { /* best-effort */ }
}

function compactNudge(found, cfg) {
  if (cfg.mode === 'manual') {
    return 'LOGBOOK: context was just compacted mid-session. Mode is manual — if the user wants a ' +
      'checkpoint they can run /logbook:logbook-end-session and /logbook:logbook-handoff; do not ' +
      `write journal entries unprompted. Journal: ${found.journalDir}.`;
  }
  const verb = cfg.mode === 'suggest' ? 'propose writing' : 'write';
  return [
    'LOGBOOK: context was just compacted mid-session.',
    'CHECKPOINT NOW if significant work happened before compaction and ' +
    `${path.join(found.journalDir, 'sessions')} has no entry for today: ${verb} logbook-end-session ` +
    '(mark it "checkpoint") and a fresh logbook-handoff, THEN resume the task. ' +
    'If today\'s entry already exists, update it instead.',
    `Journal: ${found.journalDir}. Mode: ${cfg.mode}.`,
  ].join('\n');
}

function buildDigest(found, cfg, state) {
  const parts = [];
  parts.push(`LOGBOOK ACTIVE — journal: ${found.journalDir} (mode: ${cfg.mode})`);
  if (found.alsoFound) {
    parts.push('(Both logbook/ and workflow/ exist here — using logbook/.)');
  }

  const rules = readRules(cfg, found);
  if (rules) parts.push('', rules.trim());

  const handoffPath = lib.newestDatedFile(path.join(found.journalDir, 'handoff'));
  if (handoffPath) {
    state.injectedHandoff = path.basename(handoffPath);
    const r = lib.readCapped(handoffPath, lib.HANDOFF_CAP);
    if (r) {
      parts.push('', `## Start here (newest handoff — ${path.basename(handoffPath)})`,
        lib.capBytes(r.text, lib.HANDOFF_CAP,
          'handoff truncated — run /logbook:logbook-start for the full read-back'));
    }
  } else {
    parts.push('', 'No handoff yet — write one at session end (logbook-handoff).');
  }

  const phases = lib.activePhases(found.journalDir);
  if (phases.length) parts.push('', '## In-progress phases', phases.join('\n'));

  const troubles = lib.openTroubleshooting(found.journalDir);
  if (troubles.length) parts.push('', '## Open troubleshooting', troubles.join('\n'));

  const gap = gapLine(found);
  if (gap) parts.push('', gap);

  return parts.join('\n');
}

function readRules(cfg, found) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'logbook-rules.md'), 'utf8');
    return raw.replace(/\{MODE\}/g, cfg.mode).replace(/\{JOURNAL\}/g, found.journalDir);
  } catch (e) {
    // Minimal fallback if the rules file is missing.
    return `Record as you go (mode: ${cfg.mode}): decisions → logbook-decision, fixes → ` +
      'logbook-troubleshooting, milestones → logbook-mark-phase (confirm closes), wrap-up → ' +
      'logbook-end-session then logbook-handoff. Check for an existing entry before writing; ' +
      'update, don\'t duplicate.';
  }
}

function gapLine(found) {
  const last = lib.lastSessionDate(found.journalDir);
  if (!last) {
    // Journal has content but no recorded session yet?
    const hasContent = lib.newestDatedFile(path.join(found.journalDir, 'handoff')) ||
      lib.activePhases(found.journalDir).length;
    return hasContent
      ? 'No session has ever been recorded in this journal — suggest a first logbook-end-session today.'
      : null;
  }
  const n = lib.commitsSince(found.projectDir, last);
  if (n && n > 0) {
    return `Gap detected: ${n} commit(s) since the last recorded session (${last}). ` +
      'Offer ONCE to backfill a session entry from git log; if the user declines, drop it.';
  }
  return null;
}

try {
  main();
} catch (e) {
  lib.debug(`activate failed: ${e.message}`);
}
process.exit(0);
