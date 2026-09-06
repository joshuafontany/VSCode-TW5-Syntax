// The kind TiddlyWiki assigned, and the kind this grammar names.
//
// parseutils.js declares what an attribute value may look like — a string, a text reference, a
// filter, a macro call, a substitution — and this grammar spells all five again in its own
// patterns. Nothing compared the two readings, so a value the grammar reads as one kind and the
// parser reads as another passes every gate here: the scope exists, the corpus reaches it, the
// block boundary holds, and the reading still disagrees with the host.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the grammar names the kind TiddlyWiki assigned, within the ceiling', live, () => {
  const { code, out } = runTool('attribute-witness.js');
  assert.match(out, /attribute-witness  \d+ attribute\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The population comes from the host and has to be large, or a zero means nothing.
test('the population comes from TiddlyWiki, and every type it assigns has a reading', live, () => {
  const { out } = runTool('attribute-witness.js');
  const m = /(\d+) attribute\(s\) across (\d+) type\(s\)/.exec(out);
  assert.ok(m, out.slice(-400));
  assert.ok(Number(m[1]) > 2000, `only ${m[1]} attributes — the corpus went unread`);
  assert.ok(Number(m[2]) >= 5, `only ${m[2]} types — parseutils declares five`);
});

// A type the host assigns and this reading has no entry for must fail loudly rather than count
// as agreement, which is how a hand-kept map goes stale.
test('a type with no reading fails the gate', live, () => {
  const blind = (sandbox) => {
    const file = path.join(sandbox, 'tools', 'attribute-witness.js');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^ {2}indirect:.*$/m, ''));
  };
  const { code, out } = runInSandbox(blind, ['tools/attribute-witness.js']);
  assert.match(out, /indirect/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a type lost its reading and the gate held anyway');
});

test('a ceiling lowered past the disagreements fails the gate', live, () => {
  const lower = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'attribute-kind-ceiling.txt');
    const text = fs.readFileSync(file, 'utf8');
    const now = Number(text.split('\n')[0]);
    fs.writeFileSync(file, text.replace(String(now), String(Math.max(0, now - 10))));
  };
  const { code, out } = runInSandbox(lower, ['tools/attribute-witness.js']);
  assert.match(out, /above the ceiling/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the ceiling fell below the disagreements and the gate held anyway');
});
