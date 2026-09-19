#!/usr/bin/env node
// tools/reader-scope.js — the reason-prefix flag every reader-keyed ledger shares.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readerOf, appliesToReader } = require('./reader-scope.js');

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
