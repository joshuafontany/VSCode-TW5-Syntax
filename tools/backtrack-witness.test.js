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
  const { code, out } = runTool('backtrack-witness.js', ['--budget=0.001']);
  assert.match(out, /budget of 0.001ms/, out.slice(-300));
  assert.match(out, /[1-9]\d*\s+pattern\(s\) a reader would feel stall/, out.slice(-300));
  assert.notStrictEqual(code, 0, 'every pattern stood over budget and the gate held anyway');
});

test('a lowered budget changes nothing about the patterns themselves', live, () => {
  // The knob answers to the reading, not to the grammar: the same patterns stand either way.
  const wide = runTool('backtrack-witness.js');
  const narrow = runTool('backtrack-witness.js', ['--budget=0.001']);
  const count = (out) => /(\d+) pattern\(s\),/.exec(out)[1];
  assert.strictEqual(count(wide.out), count(narrow.out), 'the budget changed which patterns got read');
});
