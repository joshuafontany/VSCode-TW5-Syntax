// What a delimiter inherits from the content it bounds, held to a ruling.
//
// `contentName` covers the INTERIOR of a region, so a delimiter falls outside the content family
// BY CONSTRUCTION. Nothing downstream notices: the region paints, the content paints, and the mark
// that opened it reads as whatever its own name reaches.
//
// The gate reads the tree and requires a ruling for every parting shape it finds. These provoke it:
// a shape nobody ruled, a ruling for a shape the tree no longer carries, and a ruling that explains
// nothing must each turn it red.
//
//   node --test tools/delimiter-inheritance.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');

const LEDGER = path.join(ROOT, 'corpus', 'delimiter-ledger.txt');

test('every parting shape the tree declares stands ruled', () => {
  const { code, out } = runTool('delimiter-inheritance.js');
  assert.match(out, /\d+ contentName rule\(s\) over \d+ shape\(s\), 0 unruled/, out.slice(-800));
  assert.strictEqual(code, 0, out.slice(-800));
});

test('the reading names each kind and the count under it', () => {
  const { out } = runTool('delimiter-inheritance.js');
  for (const kind of ['inert', 'covering', 'inherits', 'parts', 'unnamed-delimiter']) {
    assert.ok(out.includes(kind), `the reading names no ${kind}`);
  }
  // The inert claim gets MEASURED, never asserted: a `contentName` on a match rule reads identically
  // with and without it, and the control proves the comparison can part two readings that differ.
  assert.match(out, /a contentName on a match rule moves nothing/, 'the inert claim went unmeasured');
  assert.match(out, /control: a contentName on a begin\/end rule moves the reading/, 'no control ran');
});

test('a shape nobody ruled fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const at = lines.findIndex((l) => l.startsWith('parts '));
    assert.notStrictEqual(at, -1, 'the ledger carries no parting ruling to take away');
    lines.splice(at, 1);
    fs.writeFileSync(file, lines.join('\n'));
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /shape\(s\) the tree declares and the ledger rules nowhere/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'an unruled shape held the gate anyway');
});

test('a ruling for a shape the tree no longer carries fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    fs.appendFileSync(file, '\nparts markup.gone <- punctuation.definition   # a shape this tree stopped declaring, left standing in the record\n');
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /ruling\(s\) naming a shape the tree no longer declares/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a stale ruling held the gate anyway');
});

test('a ruling that explains nothing fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    const text = fs.readFileSync(file, 'utf8');
    const fixed = text.replace(/^(parts [^#]+#).*$/m, '$1 fine');
    assert.notStrictEqual(fixed, text, 'the provocation shortened no reason');
    fs.writeFileSync(file, fixed);
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /ruling\(s\) explaining nothing/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a ruling explaining nothing held the gate anyway');
});

test('the ledger rules the shapes rather than the rules, so it cannot grow per pattern', () => {
  const lines = fs.readFileSync(LEDGER, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.ok(lines.length > 0, 'the ledger rules nothing');
  assert.ok(lines.length < 60, `${lines.length} rulings, which reads as a list per pattern rather than per shape`);
});
