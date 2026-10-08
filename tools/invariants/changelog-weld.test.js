// A count written into the record answers to the thing that counts it.
//
// The record states figures the instruments produce: how many rulings excuse a divergence, how
// many files the host corpus carries. Both move when work lands — a fix that clears a divergence
// retires its ruling — and prose does not move with them. Nothing reports the gap: every gate
// reads the instruments, and none of them reads the record, so a stale figure ships.
//
// This welds the two. It reads the figures the record states and collides them against the files
// the instruments read, so a fix that changes a count either updates the record or reports here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
// THE RELEASE'S RECORD STANDS BESIDE ITS STORY. CHANGELOG.md tells what a release grants a reader;
// LEDGER-<version>.md holds every construct, ruling and measurement behind it. A figure either one
// states answers to the same ground, so the weld reads both.
const VERSION = require(path.join(ROOT, 'package.json')).version;
const LEDGER_FILE = path.join(ROOT, `LEDGER-${VERSION}.md`);
const LEDGER = fs.existsSync(LEDGER_FILE) ? fs.readFileSync(LEDGER_FILE, 'utf8') : '';
const SCOPE_NAMES = fs.readFileSync(path.join(ROOT, 'SCOPE-NAMES.md'), 'utf8');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'MIGRATION.md'), 'utf8');

// Only the section under way. A published section states what it stated when it shipped, and the
// instruments have moved on since; welding those would demand rewriting history to match today.
/**
 * The text of the unreleased section, up to the first published heading.
 *
 * @param {string} text
 * @returns {string}
 */
function unreleased(text) {
  // THE SECTION DERIVES FROM THE MANIFEST, never from a version typed here. A gate naming a
  // version by hand stops finding its own section on the next bump — measured on 2.3.0 -> 3.0.0,
  // where every weld below went quiet at once and the gate reported no ruling count to weld.
  const version = require(path.join(ROOT, 'package.json')).version;
  const start = text.indexOf(`## ${version}`);
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 1);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

const SECTION = unreleased(CHANGELOG) + unreleased(LEDGER);

/**
 * Every figure the section states for a given noun, as written.
 *
 * @param {string} noun  singular form, e.g. "ruling"
 * @returns {number[]}
 */
function stated(noun) {
  const re = new RegExp(`(\\d+)\\s+written\\s+${noun}s|(\\d+)\\s+${noun}s\\b`, 'g');
  const out = [];
  for (const m of SECTION.matchAll(re)) out.push(Number(m[1] ?? m[2]));
  return out;
}

/** Rulings the divergence file actually carries: one per line that is neither blank nor a comment. */
function rulingsOnDisk() {
  const text = fs.readFileSync(path.join(ROOT, 'corpus', 'expected-divergence.txt'), 'utf8');
  return text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
}

test('the section states a ruling count to weld', () => {
  assert.ok(SECTION.length > 0, 'no unreleased section found in the CHANGELOG or its ledger');
  assert.ok(stated('ruling').length > 0, 'the section states no ruling count — nothing to weld');
});

// The README names gates a contributor runs. A renamed or retired script leaves the name
// standing in prose, where it reads as an instruction and fails only in the reader's terminal.
test('every gate the README names exists', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const scripts = require(path.join(ROOT, 'package.json')).scripts;
  const named = [...readme.matchAll(/`npm run ([a-z0-9:-]+)/g)].map((m) => m[1]);
  assert.ok(named.length > 5, `the README names ${named.length} gate(s) — the pattern stopped matching`);
  const missing = [...new Set(named)].filter((name) => !(name in scripts));
  assert.deepStrictEqual(missing, [], `the README names gate(s) package.json does not carry: ${missing.join(', ')}`);
});

test('every ruling count the record states matches the divergence file', () => {
  const onDisk = rulingsOnDisk();
  for (const figure of stated('ruling')) {
    assert.strictEqual(
      figure,
      onDisk,
      `the record states ${figure} ruling(s); corpus/expected-divergence.txt carries ${onDisk}. ` +
        'A fix that retires a ruling updates the record with it.'
    );
  }
});

// MIGRATION.md is the gate-checked ground truth for the scope migration: its own headline
// derives, live, from `declaredScopesIn` reading both grammars — see scope-migration.test.js.
// CHANGELOG.md and SCOPE-NAMES.md each restate that headline in prose, by hand, and a grammar
// edit that moves the gate-checked numbers leaves the hand-restated copies to go stale silently.
// This welds every restatement to MIGRATION.md's own headline rather than to a number typed here.

/**
 * The gate-checked headline MIGRATION.md states: old/new declared-scope totals, gone, new.
 *
 * @returns {{ oldTotal: number, newTotal: number, gone: number, added: number }}
 */
function migrationHeadline() {
  const m = MIGRATION.match(
    /declares \*\*(\d+)\*\* scope names at `v2\.2\.1` and \*\*(\d+)\*\* now\. Between them, \*\*(\d+)\*\*\s+names stand gone and \*\*(\d+)\*\* stand new/
  );
  assert.ok(m, 'MIGRATION.md no longer states its headline in the expected shape — the weld cannot read it');
  return { oldTotal: Number(m[1]), newTotal: Number(m[2]), gone: Number(m[3]), added: Number(m[4]) };
}

/** Every {gone, added} pair a text restates, by matching each known restatement shape. */
function scopeRestatements(text) {
  const out = [];
  let m;

  m = text.match(/retires (\d+) of the (\d+)\s*\nnames `v2\.2\.1` published and adds (\d+)/);
  if (m) out.push({ where: 'CHANGELOG intro', oldTotal: Number(m[2]), gone: Number(m[1]), added: Number(m[3]) });

  m = text.match(/(\d+) scope names stand at `v2\.2\.1` and\s*\n\s*(\d+) here; (\d+) went, (\d+) arrived/);
  if (m) out.push({ where: 'CHANGELOG body', oldTotal: Number(m[1]), newTotal: Number(m[2]), gone: Number(m[3]), added: Number(m[4]) });

  m = text.match(/moved \*\*(\d+)\*\* of (\d+) declared names and added \*\*(\d+)\*\*/);
  if (m) out.push({ where: 'SCOPE-NAMES headline', oldTotal: Number(m[2]), gone: Number(m[1]), added: Number(m[3]) });

  return out;
}

test('CHANGELOG.md and SCOPE-NAMES.md restate MIGRATION.md\'s certified scope-migration headline', () => {
  const truth = migrationHeadline();
  const found = [...scopeRestatements(CHANGELOG), ...scopeRestatements(LEDGER).map((r) => ({ ...r, where: `LEDGER ${r.where}` })),
    ...scopeRestatements(SCOPE_NAMES)];
  assert.ok(found.length > 0, 'no scope-migration restatement found in CHANGELOG.md or SCOPE-NAMES.md — the weld found nothing to check');
  for (const r of found) {
    assert.strictEqual(r.gone, truth.gone, `${r.where} states ${r.gone} gone; MIGRATION.md's gate-checked headline states ${truth.gone}.`);
    assert.strictEqual(r.added, truth.added, `${r.where} states ${r.added} added; MIGRATION.md's gate-checked headline states ${truth.added}.`);
    assert.strictEqual(r.oldTotal, truth.oldTotal, `${r.where} states an old total of ${r.oldTotal}; MIGRATION.md states ${truth.oldTotal}.`);
    if (r.newTotal !== undefined) {
      assert.strictEqual(r.newTotal, truth.newTotal, `${r.where} states a new total of ${r.newTotal}; MIGRATION.md states ${truth.newTotal}.`);
    }
  }
});
