// A ledger of the shape `<field> ... "<quoted text>" # reason`, read and keyed the one way.
//
//   node --test tools/ledger-shape.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { defineLedger } = require('./ledger-shape.js');

test('keyOf joins plain fields and quotes only the last', () => {
  const { keyOf } = defineLedger([{ name: 'file' }, { name: 'char' }, { name: 'verdict', enum: ['A', 'B'] }]);
  assert.strictEqual(keyOf('a.tw', '-', 'A', 'a line with "quotes"'),
    'a.tw  -  A  ' + JSON.stringify('a line with "quotes"'));
});

test('readLedger parses a well-formed line and keys it as keyOf would', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-shape-'));
  const file = path.join(dir, 'x.txt');
  fs.writeFileSync(file, '# a comment, skipped\n\na.tw  3  OVERREACH  "the mark"  # because reasons\n');
  const { keyOf, readLedger } = defineLedger([{ name: 'file' }, { name: 'char', kind: 'number' }, { name: 'verdict', enum: ['OVERREACH', 'MISS'] }]);
  const declared = readLedger(file);
  assert.strictEqual(declared.get(keyOf('a.tw', 3, 'OVERREACH', 'the mark')), 'because reasons');
  fs.rmSync(dir, { recursive: true, force: true });
});

// THE COLLIDER: a line the shape's own regex cannot parse — a missing quote, an enum word the
// definition never named — must not silently vanish. It stands recorded as `unreadable: <line>`,
// with a null reason, so a caller reporting undeclared findings still names it rather than
// reading it as agreement.
test('an unreadable line stands recorded rather than silently dropped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-shape-'));
  const file = path.join(dir, 'x.txt');
  fs.writeFileSync(file, 'a.tw  WRONGWORD  "text"  # a verdict this shape never named\n');
  const { readLedger } = defineLedger([{ name: 'file' }, { name: 'verdict', enum: ['OVERREACH', 'MISS'] }]);
  const declared = readLedger(file);
  const unreadable = [...declared.keys()].filter((k) => k.startsWith('unreadable: '));
  assert.strictEqual(unreadable.length, 1);
  assert.strictEqual(declared.get(unreadable[0]), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a missing ledger file reads as no declarations, not a throw', () => {
  const { readLedger } = defineLedger([{ name: 'file' }]);
  assert.deepStrictEqual(readLedger('/no/such/ledger.txt'), new Map());
});
