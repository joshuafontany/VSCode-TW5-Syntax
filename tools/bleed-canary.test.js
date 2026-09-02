// The canary reads a bleed, and reads inheritance as agreement.
//
// The gate appends an ordinary sentence to every sample and asks whether the grammar colours it.
// Two answers stand apart, and the difference decides the gate: a construct that opened and never
// closed has taken text it should not, while a sample ending inside a construct TiddlyWiki ALSO
// carries has handed the sentence on legitimately.
//
// The second reading ran off a prefix list of scope families, which reads the grammar's vocabulary
// back to itself and goes stale in silence. `meta.styleblock` arrived under a name no prefix there
// covered, and two samples ending in a stray `@@` reported as bleeding for it — while TiddlyWiki
// carried the same text into the same construct and raised a diagnostic saying so. Both samples
// stand without the stray, and the reading answers to the parser, so the next rename costs nothing.
//
//   node --test tools/bleed-canary.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const ARGS = ['text.html.tiddlywiki5', './tests/samples/*.tw'];
const live = { timeout: 600000 };

test('no sample colours the sentence after it', live, () => {
  const { code, out } = runTool('bleed-canary.js', ARGS);
  assert.match(out, /22 samples, 0 bleeding/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-400));
});

test('a sample ending inside a construct the parser carries reads as agreement', live, () => {
  // A bare `@@` opens a style block with no style and closes nothing, so it runs to the end of the
  // tiddler — TiddlyWiki says as much in an `unterminated-styleblock` diagnostic. The grammar
  // colouring the sentence after it agrees with the parser, and the gate holds.
  const stray = (sandbox) =>
    fs.appendFileSync(path.join(sandbox, 'tests', 'samples', 'canary-control.tw'), '\n@@\n');
  const { code, out } = runInSandbox(stray, ['tools/bleed-canary.js'], ARGS);
  assert.match(out, /0 bleeding, 1 ending inside a construct TiddlyWiki also carries/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

test('dropping the parser question puts that sample on the report', live, () => {
  // The same sandbox, asked without the reading. What comes back names the state these two gates
  // stood in while a prefix list decided the matter, so the reading has something to decide.
  const stray = (sandbox) =>
    fs.appendFileSync(path.join(sandbox, 'tests', 'samples', 'canary-control.tw'), '\n@@\n');
  const { code, out } = runInSandbox(stray, ['tools/bleed-canary.js'], [...ARGS, '--strict']);
  assert.match(out, /1 bleeding/, out.slice(-600));
  assert.match(out, /meta\.styleblock\.definition\.body/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the canary must fail the gate, not only print');
});

test('the parser decides inheritance, so a renamed scope family cannot go quiet', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools', 'bleed-canary.js'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(/readAt\(/.test(code), 'the canary asks no parser, so inheritance answers to a list again');
  assert.ok(!/startsWith\(p\)/.test(code), 'a prefix list decides inheritance again');
});
