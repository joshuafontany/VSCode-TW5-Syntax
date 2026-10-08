#!/usr/bin/env node
// tools/reader-scope.js — the reason-prefix flag every reader-keyed ledger shares.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readerOf, appliesToReader, owedOf } = require('./reader-scope.js');

test('a reason naming no reader peels off nothing', () => {
  assert.deepStrictEqual(readerOf('OWED — a style separator'), { version: null, rest: 'OWED — a style separator' });
  assert.deepStrictEqual(readerOf(''), { version: null, rest: '' });
  assert.deepStrictEqual(readerOf(undefined), { version: null, rest: '' });
});

test('a reason opening READER <version> names that reader and peels the tag off', () => {
  assert.deepStrictEqual(
    readerOf('READER 5.4.1 — an unterminated run still builds there'),
    { version: '5.4.1', rest: 'an unterminated run still builds there' }
  );
  // A ruling may still be OWED once its reader is named.
  assert.deepStrictEqual(
    readerOf('READER 5.5.0-prerelease OWED — a fork-only reading'),
    { version: '5.5.0-prerelease', rest: 'OWED — a fork-only reading' }
  );
});

test('a ruling naming no reader answers for every reader', () => {
  assert.ok(appliesToReader(null, '5.4.1'));
  assert.ok(appliesToReader(null, '5.5.0-prerelease'));
  assert.ok(appliesToReader(null, undefined));
});

test('a ruling naming a reader answers ONLY for that one — the control', () => {
  assert.ok(appliesToReader('5.4.1', '5.4.1'));
  assert.ok(!appliesToReader('5.4.1', '5.5.0-prerelease'));
  assert.ok(!appliesToReader('5.4.1', undefined));
});

// SIX sites once tested `/^OWED\b/` against the reason text directly, and three of them never
// peeled a `READER <version>` tag off first — so a `READER <v> OWED` row read OWED to the readers
// that strip and RULED (silently, never a mismatch) to the ones that do not. `owedOf` shares
// `readerOf`'s own prefix handling so every site reads the same row the same way.
test('owedOf reads a tagged OWED row the same as an untagged one — the fault this closes', () => {
  assert.ok(owedOf('OWED — a style separator'));
  assert.ok(owedOf('READER 5.4.1 OWED — a fork-only reading'), 'a READER tag must not hide OWED from owedOf');
});

test('owedOf reads false for a reason that is not OWED, tagged or not', () => {
  assert.ok(!owedOf('a boundary a reader must see, so the parting serves'));
  assert.ok(!owedOf('READER 5.4.1 — an unterminated run still builds there'));
});

test('owedOf treats a missing or empty reason as not owed', () => {
  assert.ok(!owedOf(''));
  assert.ok(!owedOf(null));
  assert.ok(!owedOf(undefined));
});

// THE CONTROL this fix exists to pass: the raw-text test the three non-stripping sites carried
// would have read a READER-tagged OWED row as ruled — reproduced here directly, so the fix's own
// test file carries the red this report quotes from the live tools.
test('the control: testing /^OWED\\b/ on the raw reason is exactly the bug owedOf fixes', () => {
  const rawTest = (reason) => /^OWED\b/.test(reason);
  const tagged = 'READER 5.4.1 OWED — the planted row';
  assert.ok(!rawTest(tagged), 'the raw test must still miss a tagged OWED row (reproducing the fault)');
  assert.ok(owedOf(tagged), 'owedOf must catch what the raw test misses');
});
