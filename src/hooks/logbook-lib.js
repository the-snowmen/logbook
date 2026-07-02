#!/usr/bin/env node
// logbook — shared hook library.
//
// Everything here is best-effort: any filesystem or git anomaly resolves to
// null/defaults, never a throw that escapes to the hook entrypoint. Hooks must
// never break a session.
//
// Set LOGBOOK_DEBUG=1 to emit stderr diagnostics.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const VALID_MODES = ['auto', 'suggest', 'manual'];
const VALID_REMINDERS = ['every-turn', 'throttled', 'off'];

const HANDOFF_CAP = 6000; // bytes of newest handoff injected
const LIST_ITEM_CAP = 10; // phases / troubleshooting one-liners
const TOTAL_CAP = 10000; // hard cap on any single injection
const STATE_READ_CAP = 16384; // bytes; state files beyond this are ignored
const SCAN_FILE_CAP = 200; // max dir entries opened per digest list
const REMINDER_TURNS = 5; // throttled: every Nth turn...
const REMINDER_MS = 20 * 60 * 1000; // ...or after this long
const SESSION_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // prune session files
const MAX_TRACKED_PROJECTS = 200;
const GIT_TIMEOUT_MS = 1500;

function debug(msg) {
  if (process.env.LOGBOOK_DEBUG === '1') {
    try { process.stderr.write(`[logbook] ${msg}\n`); } catch (e) { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Config: env overrides → ~/.config/logbook/config.json → defaults
// ---------------------------------------------------------------------------

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'logbook');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'logbook'
    );
  }
  return path.join(os.homedir(), '.config', 'logbook');
}

function parseBool(v, fallback) {
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return fallback;
}

function getConfig() {
  const cfg = { mode: 'auto', reminder: 'throttled', stopGuard: false, suggestSetup: true };
  try {
    const raw = fs.readFileSync(path.join(getConfigDir(), 'config.json'), 'utf8');
    const file = JSON.parse(raw);
    if (typeof file.mode === 'string' && VALID_MODES.includes(file.mode.toLowerCase())) {
      cfg.mode = file.mode.toLowerCase();
    }
    if (typeof file.reminder === 'string' && VALID_REMINDERS.includes(file.reminder.toLowerCase())) {
      cfg.reminder = file.reminder.toLowerCase();
    }
    cfg.stopGuard = parseBool(file.stopGuard, cfg.stopGuard);
    cfg.suggestSetup = parseBool(file.suggestSetup, cfg.suggestSetup);
  } catch (e) { /* missing/invalid config → defaults */ }

  const envMode = (process.env.LOGBOOK_MODE || '').toLowerCase();
  if (VALID_MODES.includes(envMode)) cfg.mode = envMode;
  const envReminder = (process.env.LOGBOOK_REMINDER || '').toLowerCase();
  if (VALID_REMINDERS.includes(envReminder)) cfg.reminder = envReminder;
  cfg.stopGuard = parseBool(process.env.LOGBOOK_STOP_GUARD, cfg.stopGuard);
  cfg.suggestSetup = parseBool(process.env.LOGBOOK_SUGGEST_SETUP, cfg.suggestSetup);
  return cfg;
}

// ---------------------------------------------------------------------------
// Journal discovery
// ---------------------------------------------------------------------------

const JOURNAL_SUBDIRS = ['decisions', 'phases', 'troubleshooting', 'sessions', 'handoff'];

function isRealDir(p) {
  try {
    const st = fs.lstatSync(p);
    return st.isDirectory() && !st.isSymbolicLink();
  } catch (e) { return false; }
}

// A directory qualifies as a journal only if it looks like one. `workflow/`
// is a common name for unrelated code, so it needs stronger evidence.
function journalMarkers(dir) {
  let markers = 0;
  try { if (fs.statSync(path.join(dir, 'README.md')).isFile()) markers += 2; } catch (e) { /* absent */ }
  for (const sub of JOURNAL_SUBDIRS) {
    if (isRealDir(path.join(dir, sub))) markers += 1;
  }
  return markers;
}

function qualifies(dir, name) {
  if (!isRealDir(dir)) return false;
  // A README alone must never qualify (it would adopt plugin/docs repos as
  // journals); setup always creates the five subdirs before the index.
  if (!JOURNAL_SUBDIRS.some((sub) => isRealDir(path.join(dir, sub)))) return false;
  const m = journalMarkers(dir);
  return name === 'logbook' ? m >= 1 : m >= 2;
}

// Find the journal for this session. Candidate roots in priority order, each
// walked upward (bounded) so a session started in a subdirectory still finds
// the repo-root journal. Nearest journal wins (monorepo: package-level journal
// beats the root one when started inside the package).
function findJournal(stdinData) {
  const candidates = [];
  const push = (p) => {
    if (!p) return;
    try {
      const real = fs.realpathSync(p);
      if (!candidates.includes(real)) candidates.push(real);
    } catch (e) { /* nonexistent path */ }
  };
  push(process.env.CLAUDE_PROJECT_DIR);
  push(stdinData && stdinData.cwd);
  push(process.cwd());

  // Candidates are realpathed above — canonicalize the home boundary the same
  // way, or the walk can escape past a symlinked $HOME.
  let home;
  try { home = fs.realpathSync(os.homedir()); } catch (e) { home = path.resolve(os.homedir()); }
  for (const start of candidates) {
    let dir = start;
    for (let depth = 0; depth < 8; depth++) {
      for (const name of ['logbook', 'workflow']) {
        const candidate = path.join(dir, name);
        if (qualifies(candidate, name)) {
          const alsoFound = name === 'logbook' && qualifies(path.join(dir, 'workflow'), 'workflow');
          return { journalDir: candidate, projectDir: dir, alsoFound };
        }
      }
      // Journal lives at or below repo root — stop after checking the root.
      const atGitRoot = isRealDir(path.join(dir, '.git')) ||
        (() => { try { return fs.statSync(path.join(dir, '.git')).isFile(); } catch (e) { return false; } })();
      const parent = path.dirname(dir);
      if (atGitRoot || parent === dir || dir === home) break;
      dir = parent;
    }
  }
  return null;
}

function hasGit(dir) {
  try {
    fs.statSync(path.join(dir, '.git'));
    return true;
  } catch (e) { return false; }
}

// ---------------------------------------------------------------------------
// State IO (ported from caveman's safeWriteFlag/readFlag pattern)
// ---------------------------------------------------------------------------

function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function sanitizeSessionId(id) {
  const s = String(id == null ? '' : id).replace(/[^A-Za-z0-9_-]/g, '');
  return s || 'unknown';
}

function statePaths(sessionId) {
  const base = path.join(claudeConfigDir(), 'logbook');
  return {
    globalState: path.join(base, 'state.json'),
    sessionsDir: path.join(base, 'sessions'),
    sessionState: path.join(base, 'sessions', `${sanitizeSessionId(sessionId)}.json`),
  };
}

// Resolve the directory a state file will land in, refusing anything that
// smells like an attacker-planted symlink (same rules as caveman).
function resolveSafeDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  // Whole-path realpath comparison: a symlink at ANY component (~/.claude
  // itself, not just the leaf) must pass the ownership check below.
  const real = fs.realpathSync(dir);
  if (real === path.resolve(dir)) return dir;
  const realStat = fs.statSync(real);
  if (!realStat.isDirectory()) return null;
  if (typeof process.getuid === 'function') {
    if (realStat.uid !== process.getuid()) return null;
  } else {
    const home = path.resolve(os.homedir()).toLowerCase();
    const normalized = path.resolve(real).toLowerCase();
    if (!normalized.startsWith(home + path.sep) && normalized !== home) return null;
  }
  return real;
}

function safeWriteJson(filePath, obj) {
  try {
    const dir = resolveSafeDir(path.dirname(filePath));
    if (!dir) return false;
    const target = path.join(dir, path.basename(filePath));
    try {
      if (fs.lstatSync(target).isSymbolicLink()) return false;
    } catch (e) {
      if (e.code !== 'ENOENT') return false;
    }
    const temp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(temp, flags, 0o600);
      fs.writeSync(fd, JSON.stringify(obj));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    fs.renameSync(temp, target);
    return true;
  } catch (e) {
    debug(`safeWriteJson failed: ${e.message}`);
    return false;
  }
}

// Size-capped, symlink-refusing JSON read. State drives logic only — its
// contents are never injected into model context.
function readJsonCapped(filePath, maxBytes) {
  const cap = maxBytes || STATE_READ_CAP;
  try {
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink() || !st.isFile() || st.size > cap) return null;
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    let fd;
    let raw;
    try {
      fd = fs.openSync(filePath, fs.constants.O_RDONLY | O_NOFOLLOW);
      raw = fs.readFileSync(fd, 'utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || obj.version !== 1) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function freshSessionState(found, sessionId) {
  return {
    version: 1,
    sessionId: sanitizeSessionId(sessionId),
    project: found ? found.projectDir : null,
    journal: found ? found.journalDir : null,
    startedAt: new Date().toISOString(),
    turnCount: 0,
    lastReminderTurn: 0,
    lastReminderAt: Date.now(), // digest just injected — first reminder comes later

    compactedAt: null,
    compactCount: 0,
    stopNagged: false,
    injectedHandoff: null,
  };
}

function pruneSessionsDir(sessionsDir) {
  try {
    const now = Date.now();
    for (const name of fs.readdirSync(sessionsDir)) {
      if (!name.endsWith('.json')) continue;
      const p = path.join(sessionsDir, name);
      try {
        if (now - fs.lstatSync(p).mtimeMs > SESSION_STATE_TTL_MS) fs.unlinkSync(p);
      } catch (e) { /* ignore per-file */ }
    }
  } catch (e) { /* ignore */ }
}

function pruneProjects(globalObj) {
  try {
    const entries = Object.entries(globalObj.projects || {});
    if (entries.length <= MAX_TRACKED_PROJECTS) return globalObj;
    entries.sort((a, b) =>
      String(b[1].setupSuggestedAt || '').localeCompare(String(a[1].setupSuggestedAt || '')));
    globalObj.projects = Object.fromEntries(entries.slice(0, MAX_TRACKED_PROJECTS));
  } catch (e) { /* ignore */ }
  return globalObj;
}

// ---------------------------------------------------------------------------
// Git helpers — null/0 in non-git dirs, never throw
// ---------------------------------------------------------------------------

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir].concat(args), {
      timeout: GIT_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 65536,
    }).toString('utf8').trim();
  } catch (e) {
    return null;
  }
}

function commitsSince(dir, isoDate) {
  const out = git(dir, ['rev-list', '--count', `--since=${isoDate}T23:59:59`, 'HEAD']);
  if (out === null) return null;
  const n = parseInt(out, 10);
  return Number.isFinite(n) ? n : null;
}

function commitsSinceTimestamp(dir, isoTimestamp) {
  const out = git(dir, ['rev-list', '--count', `--since=${isoTimestamp}`, 'HEAD']);
  if (out === null) return null;
  const n = parseInt(out, 10);
  return Number.isFinite(n) ? n : null;
}

function isDirty(dir) {
  const out = git(dir, ['status', '--porcelain']);
  return out === null ? null : out.length > 0;
}

// ---------------------------------------------------------------------------
// Journal readers (for the SessionStart digest)
// ---------------------------------------------------------------------------

function readCapped(filePath, maxBytes) {
  try {
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink() || !st.isFile()) return null;
    const fd = fs.openSync(filePath, fs.constants.O_RDONLY);
    try {
      const size = Math.min(st.size, maxBytes * 2);
      const buf = Buffer.alloc(size);
      if (st.size <= maxBytes * 2) {
        fs.readSync(fd, buf, 0, size, 0);
      } else {
        // True head + true tail, so capBytes presents the file's real ending
        // (Working rules / Verified starting state live at the bottom).
        fs.readSync(fd, buf, 0, maxBytes, 0);
        fs.readSync(fd, buf, maxBytes, maxBytes, st.size - maxBytes);
      }
      return { text: buf.toString('utf8'), truncated: st.size > size, size: st.size };
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    return null;
  }
}

function capBytes(str, max, note) {
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= max) return str;
  const head = buf.slice(0, Math.floor(max * 0.66)).toString('utf8');
  const tail = buf.slice(buf.length - Math.floor(max * 0.17)).toString('utf8');
  return `${head}\n\n[... truncated — ${note} ...]\n\n${tail}`;
}

// Newest YYYY-MM-DD-*.md in a dir by filename date (lexicographic == chrono),
// mtime as fallback for files that don't match the pattern.
function newestDatedFile(dir) {
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    if (!files.length) return null;
    const dated = files.filter((f) => /^\d{4}-\d{2}-\d{2}/.test(f)).sort();
    if (dated.length) return path.join(dir, dated[dated.length - 1]);
    let best = null;
    let bestM = -1;
    for (const f of files) {
      try {
        const m = fs.lstatSync(path.join(dir, f)).mtimeMs;
        if (m > bestM) { bestM = m; best = f; }
      } catch (e) { /* ignore */ }
    }
    return best ? path.join(dir, best) : null;
  } catch (e) {
    return null;
  }
}

// One-liners for phases that are in progress or blocked.
function activePhases(journalDir) {
  const out = [];
  try {
    const dir = path.join(journalDir, 'phases');
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort().slice(0, SCAN_FILE_CAP)) {
      const r = readCapped(path.join(dir, f), 2048);
      if (!r) continue;
      // Templates write "**Status:** value" (colon inside bold); tolerate both forms.
      const status = (r.text.match(/\*\*Status:?\*\*:?\s*([^\n]*)/i) || [])[1] || '';
      if (/⏳|⛔|in progress|blocked/i.test(status)) {
        const title = (r.text.match(/^#\s+(.+)$/m) || [])[1] || f;
        out.push(`- ${f}: ${title.trim()} — ${status.trim()}`.slice(0, 200));
      }
      if (out.length >= LIST_ITEM_CAP) break;
    }
  } catch (e) { /* no phases dir */ }
  return out;
}

// One-liners for troubleshooting entries still Open / Workaround.
function openTroubleshooting(journalDir) {
  const out = [];
  try {
    const dir = path.join(journalDir, 'troubleshooting');
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort().slice(0, SCAN_FILE_CAP)) {
      const r = readCapped(path.join(dir, f), 2048);
      if (!r) continue;
      // Bound the value at the next '·'/'*' so Tags like "open-dialog" on the
      // same line can't misclassify a Solved entry.
      const status = (r.text.match(/\*\*Status:?\*\*:?\s*([^\n·*]*)/i) || [])[1] || '';
      if (/\b(open|workaround)\b/i.test(status)) {
        const title = (r.text.match(/^#\s+(.+)$/m) || [])[1] || f;
        out.push(`- ${f}: ${title.trim()}`.slice(0, 200));
      }
      if (out.length >= LIST_ITEM_CAP) break;
    }
  } catch (e) { /* no troubleshooting dir */ }
  return out;
}

// Date (YYYY-MM-DD) of the newest recorded session, or null.
function lastSessionDate(journalDir) {
  const newest = newestDatedFile(path.join(journalDir, 'sessions'));
  if (!newest) return null;
  const m = path.basename(newest).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  try {
    return new Date(fs.lstatSync(newest).mtimeMs).toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
}

// Any session/handoff file modified after the given epoch ms?
function journaledSince(journalDir, epochMs) {
  for (const sub of ['sessions', 'handoff']) {
    try {
      const dir = path.join(journalDir, sub);
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.md')) continue;
        try {
          if (fs.lstatSync(path.join(dir, f)).mtimeMs > epochMs) return true;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }
  return false;
}

// ---------------------------------------------------------------------------
// stdin
// ---------------------------------------------------------------------------

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw || !raw.trim()) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (e) {
    return {};
  }
}

module.exports = {
  VALID_MODES,
  VALID_REMINDERS,
  HANDOFF_CAP,
  LIST_ITEM_CAP,
  TOTAL_CAP,
  REMINDER_TURNS,
  REMINDER_MS,
  debug,
  getConfig,
  getConfigDir,
  findJournal,
  hasGit,
  statePaths,
  sanitizeSessionId,
  safeWriteJson,
  readJsonCapped,
  freshSessionState,
  pruneSessionsDir,
  pruneProjects,
  commitsSince,
  commitsSinceTimestamp,
  isDirty,
  readCapped,
  capBytes,
  newestDatedFile,
  activePhases,
  openTroubleshooting,
  lastSessionDate,
  journaledSince,
  readStdinJson,
};
