// Does the base hold still?
//
// A full pass over carrier ground surfaces divergences. Instances of a class the ledgers already
// name say the base held and the ground merely widened; a class NOBODY has named says the base
// still moves. That distinction decides when healing yields the priority to designing,
// so it answers to a measurement rather than to a count of quiet weeks.
//
// ⚠ AND THE CONDITION CAN BE MET BY RULING GENEROUSLY. Widen a ledger key far enough and every
// finding falls inside it, which reads identical to a base that settled. So the key's REACH gets
// gated too: a ruling may gain entries and may not gain breadth.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the pass reads carrier ground and names every class it finds', live, () => {
  const { code, out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '12']);
  assert.match(out, /still  \d+ carrier\(s\), \d+ divergence\(s\) across \d+ class\(es\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

test('a class no ledger names reads as the base still moving', live, () => {
  const { out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '12', '--verbose']);
  assert.match(out, /named by a ledger|unnamed/, out.slice(-500));
});

// The guard the floor asked for: a ruling may gain entries and may not gain reach.
test('a ledger key that broadened fails the gate', live, () => {
  const ledger = path.join(ROOT, 'corpus', 'swallow-ledger.txt');
  const before = fs.readFileSync(ledger, 'utf8');
  try {
    fs.writeFileSync(ledger, before.replace(/^runaway comment\.block\.html\.\*/m, 'runaway comment.*'));
    const { code, out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '4']);
    assert.match(out, /broadened|reaches further/, out.slice(-600));
    assert.notStrictEqual(code, 0, 'a ledger key widened and the gate held anyway');
  } finally {
    fs.writeFileSync(ledger, before);
  }
});
