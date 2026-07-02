#!/usr/bin/env node
// logbook — UserPromptSubmit hook.
//
// Counts turns (feeds the stop guard), detects wrap-up phrases, and emits a
// short throttled additionalContext reminder so "logbook active" survives
// attention decay. Silent in projects without a journal. Always exits 0.

const fs = require('fs');
const lib = require('./logbook-lib.js');

const WRAP_UP = new RegExp(
  '\\b(' +
  'wrap(ping)?\\s*(it\\s*)?up|' +
  'done for (today|now|the day|tonight)|' +
  'calling it (a (day|night)|quits)|' +
  'sign(ing)?\\s*off|' +
  'end (the |this )?session|' +
  'stop(ping)? (here|for today|for now)|' +
  "that'?s (all|it) for (today|now)" +
  ')\\b', 'i'
);

function main() {
  const data = lib.readStdinJson();
  const cfg = lib.getConfig();
  const paths = lib.statePaths(data.session_id);

  // Self-heal: hook enabled mid-session, or state pruned.
  let state = lib.readJsonCapped(paths.sessionState);
  if (!state) {
    const found = lib.findJournal(data);
    if (!found) return;
    state = lib.freshSessionState(found, data.session_id);
  }
  if (!state.journal || !fs.existsSync(state.journal)) return; // journal deleted mid-session

  state.turnCount = (state.turnCount || 0) + 1;

  const prompt = typeof data.prompt === 'string' ? data.prompt : '';
  const wrapUp = WRAP_UP.test(prompt);

  let msg = null;
  if (wrapUp && cfg.mode !== 'manual') {
    const verb = cfg.mode === 'suggest' ? 'propose writing' : 'write';
    msg = `logbook: user is wrapping up — ${verb} logbook-end-session then logbook-handoff ` +
      'before finishing (update today\'s entry if one exists).';
  } else if (cfg.reminder === 'every-turn') {
    msg = reminderText(cfg);
  } else if (cfg.reminder === 'throttled') {
    const turnsDue = state.turnCount - (state.lastReminderTurn || 0) >= lib.REMINDER_TURNS;
    const timeDue = Date.now() - (state.lastReminderAt || 0) > lib.REMINDER_MS;
    if (turnsDue || timeDue) msg = reminderText(cfg);
  }
  // cfg.reminder === 'off' → count turns silently (stop guard still needs them)

  if (msg) {
    state.lastReminderTurn = state.turnCount;
    state.lastReminderAt = Date.now();
  }
  lib.safeWriteJson(paths.sessionState, state);

  if (msg) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: msg,
      },
    }));
  }
}

function reminderText(cfg) {
  if (cfg.mode === 'manual') return null;
  return 'logbook active (' + cfg.mode + ') — record decisions/fixes/phase changes as they land; ' +
    'end-session + handoff before wrapping up.';
}

try {
  main();
} catch (e) {
  lib.debug(`tracker failed: ${e.message}`);
}
process.exit(0);
