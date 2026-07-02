#!/usr/bin/env node
// logbook — Stop hook (optional stop guard; default OFF via config stopGuard).
//
// When enabled: if substantial work happened this session and no session
// summary or handoff has been written, block the first stop once with an
// instruction to journal (or to say in one line that the journal is being
// skipped). Fires at most once per session; manual writes satisfy it because
// the check reads file mtimes on disk. Always exits 0; fails open.

const fs = require('fs');
const lib = require('./logbook-lib.js');

const SIGNIFICANT_TURNS = 8;

function main() {
  const cfg = lib.getConfig();
  if (!cfg.stopGuard) return;

  const data = lib.readStdinJson();
  if (data.stop_hook_active) return; // required loop guard

  const paths = lib.statePaths(data.session_id);
  const state = lib.readJsonCapped(paths.sessionState);
  if (!state || !state.journal || !fs.existsSync(state.journal)) return;
  if (state.stopNagged) return;

  const startedMs = Date.parse(state.startedAt || '') || Date.now();
  let significant = (state.turnCount || 0) >= SIGNIFICANT_TURNS;
  if (!significant && state.project) {
    const commits = lib.commitsSinceTimestamp(state.project, state.startedAt);
    if (commits && commits > 0) significant = true;
    if (!significant && lib.isDirty(state.project) === true) significant = true;
  }
  if (!significant) return;

  if (lib.journaledSince(state.journal, startedMs)) return;

  // Mark BEFORE emitting so a crash can never cause a second nag.
  state.stopNagged = true;
  if (!lib.safeWriteJson(paths.sessionState, state)) return;

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'logbook stop-guard: substantial work happened this session but no session entry or ' +
      'handoff has been written. Either (1) write a brief logbook-end-session and logbook-handoff ' +
      'now, or (2) tell the user in one line that you are skipping the journal this time and stop. ' +
      'This guard fires only once per session.',
  }));
}

try {
  main();
} catch (e) {
  lib.debug(`stop failed: ${e.message}`);
}
process.exit(0);
