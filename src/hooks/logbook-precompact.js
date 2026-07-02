#!/usr/bin/env node
// logbook — PreCompact hook.
//
// PreCompact output is not reliably injected into model context, so this
// script deliberately relies on nothing from this channel: it only stamps
// session state. The user-visible checkpoint nudge is delivered by
// logbook-activate.js when SessionStart re-fires with source:"compact".
// Always exits 0.

const lib = require('./logbook-lib.js');

try {
  const data = lib.readStdinJson();
  const paths = lib.statePaths(data.session_id);
  const state = lib.readJsonCapped(paths.sessionState);
  if (state) {
    // Stamp only; the count is incremented once per completed compaction by
    // logbook-activate.js (source:"compact") — this channel is unreliable.
    state.compactedAt = new Date().toISOString();
    lib.safeWriteJson(paths.sessionState, state);
  }
} catch (e) {
  lib.debug(`precompact failed: ${e.message}`);
}
process.exit(0);
