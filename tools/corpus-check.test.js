// The corpus gate refuses, and this plants each fault it stands for.
//
// It holds three ratchets at once — a coverage floor that may rise and never fall, an unreached
// ceiling that may fall and never rise, and a containment check over every file. A gate holding
// three numbers can hold none of them: one reading wired wrongly leaves the other two green and the
// run reports success.
//
//   node --test tools/corpus-check.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 600000 };

test('the corpus stands, and every scope it declares it reaches', live, () => {
  const { code, out } = runTool('corpus-check.js');
  assert.match(out, /unreached: 0 this grammar emits/, out.slice(-400));
  assert.match(out, /containment: 0 of \d+ files bleed/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-400));
});

test('a floor raised past what the corpus reaches fails the gate', live, () => {
  const raise = (sandbox) => {
    const floor = path.join(sandbox, 'corpus', 'coverage-floor.txt');
    const text = fs.readFileSync(floor, 'utf8');
    const now = Number(text.split('\n')[0]);
    fs.writeFileSync(floor, text.replace(String(now), String(now + 5)));
  };
  const { code, out } = runInSandbox(raise, ['tools/corpus-check.js']);
  assert.notStrictEqual(code, 0, 'the floor rose past the corpus and the gate held anyway');
  assert.match(out, /floor \d+/, out.slice(-400));
});

test('a ceiling lowered past what stands unreached fails the gate', live, () => {
  // The ceiling reads zero, so lowering it cannot fail — a scope the corpus stops reaching must.
  // Emptying one corpus file drops the scopes only it reaches, which the FLOOR catches first; the
  // reading below names whichever ratchet answers, since both stand for the same loss.
  const empty = (sandbox) => {
    fs.writeFileSync(path.join(sandbox, 'corpus', 'wikitext', 'blocks.tables.tw'), 'plain prose.\n');
  };
  const { code, out } = runInSandbox(empty, ['tools/corpus-check.js']);
  assert.notStrictEqual(code, 0, 'a corpus file lost its ground and the gate held anyway');
  assert.match(out, /floor|ceiling|unreached/, out.slice(-400));
});

test('a file whose construct bleeds onto the sentence after it fails the gate', live, () => {
  // Containment appends an ordinary sentence to every corpus file and asks that it carry only what
  // the same sentence carries alone. A file ending inside an open construct takes it.
  const bleed = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'wikitext', 'blocks.styles.tw');
    fs.appendFileSync(file, '\n@@\n');
  };
  const { code, out } = runInSandbox(bleed, ['tools/corpus-check.js']);
  assert.notStrictEqual(code, 0, 'a file bled onto the sentence after it and the gate held anyway');
  assert.match(out, /bleed/, out.slice(-400));
});
