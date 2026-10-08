// The filter witness must read what TiddlyWiki writes, and must refuse when the grammar stops.
//
// A gate reporting zero reads the same whether the grammar reads every filter or the gate stopped
// looking, so the collision matters as much as the run.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 600000 };

test('every filter TiddlyWiki writes reads without a verdict', live, () => {
  const { code, out } = runTool('filter-witness.js');
  assert.match(out, /0 unread/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The population comes from the host, so it has to be large and it has to be real. A witness
// harvesting nothing would report zero as loudly as a sound one.
test('the population comes from TiddlyWiki, and it is large', live, () => {
  const { out } = runTool('filter-witness.js');
  const m = /(\d+) filter\(s\) TiddlyWiki compiles, (\d+) operator\(s\), (\d+) prefix\(es\)/.exec(out);
  assert.ok(m, out.slice(-400));
  assert.ok(Number(m[1]) > 300, `only ${m[1]} filters harvested — the corpus went unread`);
  assert.ok(Number(m[2]) > 50, `only ${m[2]} operators — the harvest went unread`);
  assert.ok(Number(m[3]) > 5, `only ${m[3]} prefixes — the harvest carries none`);
});

test('a grammar that stops reading filter operators fails the gate', live, () => {
  const blind = (sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').split('keyword.operator').join('markup.other.blinded'));
  };
  const { code, out } = runInSandbox(blind, ['tools/filter-witness.js']);
  assert.match(out, /[1-9]\d* unread/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the grammar stopped naming operators and the gate held anyway');
});
