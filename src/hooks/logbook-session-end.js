#!/usr/bin/env node
// logbook — SessionEnd hook. Output is ignored by Claude Code; side effects
// only: delete this session's state file and prune stale siblings.
// Always exits 0.

const fs = require('fs');
const lib = require('./logbook-lib.js');

try {
  const data = lib.readStdinJson();
  const paths = lib.statePaths(data.session_id);
  try { fs.unlinkSync(paths.sessionState); } catch (e) { /* already gone */ }
  lib.pruneSessionsDir(paths.sessionsDir);
} catch (e) {
  lib.debug(`session-end failed: ${e.message}`);
}
process.exit(0);
