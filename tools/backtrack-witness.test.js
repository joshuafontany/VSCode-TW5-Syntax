// The backtrack witness reads a pattern a reader would feel stall.
//
// A grammar runs on every keystroke, over input that stands unfinished by definition. A pattern
// whose cost rises with length turns typing into waiting, and nothing else here would notice: every
// other gate reads what a pattern MATCHES, and this one reads what it costs.
//
//   node --test tools/backtrack-witness.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runProvoked } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const live = { timeout: 900000 };

// The budget names an absolute cost, and the STATISTIC keeps it from answering to the machine: the
// witness takes the least of several rounds, because contention only ever adds time. A reading taken
// once crossed eight milliseconds beside a dozen other gates having done nothing different —
// measured at 1.4ms alone and past 8 under the suite, on the same bytes.
test('no pattern in this grammar stalls on unfinished input', live, () => {
  const { code, out } = runTool('backtrack-witness.js');
  assert.match(out, /0\s+pattern\(s\) a reader would feel stall/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-400));
});

test('the gate can fail, and fails on the budget it names', live, () => {
  // Oniguruma's optimizer refuses every classic catastrophic shape at the sizes this witness uses:
  // nested quantifiers over a shared class, a starred inner group, alternation with a required tail
  // that never arrives — ten shapes measured, and the worst ran 0.069ms against a budget of eight.
  // So a fault planted in the grammar proves nothing here, and the reading that decides the gate
  // gets collided directly instead.
  // Both knobs, so the reading answers to the flags rather than to whatever else the machine runs.
  // With the ratio alone at its default, whether any pattern crosses twenty times a control depends
  // on load — the very thing the ratio exists to remove.
  const { code, out } = runTool('backtrack-witness.js', ['--budget=0.0001', '--ratio=0.0001']);
  assert.match(out, /budget of 0.0001ms/, out.slice(-300));
  assert.match(out, /a control reading/, 'the reading named no control, so it answers to the machine');
  assert.match(out, /[1-9]\d*\s+pattern\(s\) a reader would feel stall/, out.slice(-300));
  assert.notStrictEqual(code, 0, 'every pattern stood over budget and the gate held anyway');
});

test('a lowered budget changes nothing about the patterns themselves', live, () => {
  // The knob answers to the reading, not to the grammar: the same patterns stand either way.
  const wide = runTool('backtrack-witness.js');
  const narrow = runTool('backtrack-witness.js', ['--budget=0.0001', '--ratio=0.0001']);
  const count = (out) => /(\d+) pattern\(s\),/.exec(out)[1];
  assert.strictEqual(count(wide.out), count(narrow.out), 'the budget changed which patterns got read');
});

// The verdict survives contention, which a reading taken once does not.
//
// The budget names an absolute cost, because that is what a reader feels — the slowest pattern this
// grammar holds runs 874 times a trivial control on adversarial input and costs under two
// milliseconds, so no ratio separates it from a stall. An absolute reading then answers to the
// machine unless the STATISTIC removes the machine: contention only ever adds time, so the witness
// takes the least of several rounds. Measured before it did: 1.7ms alone and 9.3ms beside a dozen
// gates on the same bytes, and two runs at rest disagreeing 0 stalls against 6.
//
// Headroom is the property, and it wants asserting rather than assuming: a worst reading sitting
// just under the budget passes today and fails whenever the machine breathes.
test('the worst reading keeps headroom against the budget', live, () => {
  // THE LEAST OF SEVERAL RUNS, for the reason the witness itself takes the least of several rounds:
  // contention only ever adds time. The witness reads 1.4ms alone and crossed 4 beside 386 tests,
  // where every round of a single run met the same contention — so the statistic wants applying one
  // level up, or this check measures the machine exactly as the reading it guards once did.
  const runs = [runTool('backtrack-witness.js'), runTool('backtrack-witness.js'), runTool('backtrack-witness.js')];
  const readings = runs.map((r) => Number(/worst ([\d.]+)ms against a budget of ([\d.]+)ms/.exec(r.out)[1]));
  const out = runs[readings.indexOf(Math.min(...readings))].out;
  const worst = Math.min(...readings);
  const budget = Number(/worst [\d.]+ms against a budget of ([\d.]+)ms/.exec(out)[1]);
  assert.ok(worst > 0, 'the witness timed nothing, so the budget guards nothing');
  assert.ok(worst * 2 < budget,
    `the worst pattern reads ${worst}ms against a budget of ${budget}ms, which ordinary noise crosses`);

  // ONE VERDICT ACROSS THE RUNS ALREADY PAID FOR. A witness whose reading wanders decides by
  // whichever run somebody looked at, and these three runs answer that without timing a fourth:
  // every run of this witness sweeps each pattern over 170 unfinished specimens, so a run bought to
  // assert stability alone spends the machine and reads nothing about the grammar.
  const stalls = runs.map((r) => /(\d+)\s+pattern\(s\) a reader would feel stall/.exec(r.out)[1]);
  assert.strictEqual(new Set(stalls).size, 1, `the same tree read ${stalls.join(', ')} stalls`);
});
