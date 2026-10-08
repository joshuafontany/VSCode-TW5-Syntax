// A control that stopped controlling reports nothing, and reports it in green.
//
// A specimen written to be malformed stands exempt from the gates that measure well-formed text —
// it bleeds on purpose, so a containment check would fail on it forever. The exemption costs
// nothing while the specimen still degrades. The day the grammar improves past it, the specimen
// reads clean, keeps its exemption, and every gate agrees that nothing is wrong.
//
// So a must-fail specimen declares the degradation it asserts, and the declaration gets measured.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 600000 };

test('every must-fail specimen still fails the way it declares', live, () => {
  const { code, out } = runTool('must-fail.js');
  assert.match(out, /must-fail  \d+ specimen\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The two halves of the declaration, each provoked on its own: a specimen nobody declared, and a
// declaration naming no specimen.
test('a must-fail specimen carrying no declaration fails the gate', live, () => {
  const strip = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'must-fail.txt');
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text.split('\n').filter((l) => !/^degenerate\.unterminated/.test(l)).join('\n'));
  };
  const { code, out } = runInSandbox(strip, ['tools/must-fail.js']);
  assert.match(out, /degenerate\.unterminated/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a specimen lost its declaration and the gate held anyway');
});

test('a declaration naming no specimen fails the gate', live, () => {
  const invent = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'must-fail.txt');
    fs.appendFileSync(file, '\ndegenerate.nosuchfile.tw  bleeds  # a control nobody wrote\n');
  };
  const { code, out } = runInSandbox(invent, ['tools/must-fail.js']);
  assert.match(out, /nosuchfile/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a declaration named no specimen and the gate held anyway');
});

// The one that matters: a specimen the grammar learned to read cleanly.
test('a control that stopped degrading fails the gate', live, () => {
  const heal = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'wikitext', 'degenerate.unterminated.tw');
    fs.writeFileSync(file, 'Every construct here closes.\n\n<<<\nA quote that closes.\n<<<\n');
  };
  const { code, out } = runInSandbox(heal, ['tools/must-fail.js']);
  assert.match(out, /degenerate\.unterminated[\s\S]*declares/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'a control stopped controlling and the gate held anyway');
});
