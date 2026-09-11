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

// Only the section under way. A published section states what it stated when it shipped, and the
// instruments have moved on since; welding those would demand rewriting history to match today.
/**
 * The text of the unreleased section, up to the first published heading.
 *
 * @param {string} text
 * @returns {string}
 */
function unreleased(text) {
  const start = text.indexOf('## 2.3.0');
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 1);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

const SECTION = unreleased(CHANGELOG);

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
  assert.ok(SECTION.length > 0, 'no unreleased section found in the CHANGELOG');
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
