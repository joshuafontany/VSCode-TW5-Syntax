// A pinned reading holds the grammar to what it read yesterday, and something must run it.
//
// Every other instrument here reads the grammar and rules on it. This one reads nothing: it pins a
// tokenization and reports the day it changes, which makes it the only gate that catches a fix
// reaching further than its author meant. Measured: a blank-line bound added to a call's end cut a
// construct TiddlyWiki carries across blank lines, and the pinned readings said so for eight
// samples while `gates` reported every gate holding — the snapshot runs stood outside the list.
//
// So the collision plants a fault in a COPY of the tree and watches the check find it. A run that
// only reads the working tree answers whether the tree stands clean today, never whether the check
// still looks.
//
//   node --test tools/snapshot-check.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runProvoked } = require('./grammar-sandbox.js');
const { runNode, ROOT } = require('./run-tool.js');

const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const live = { timeout: 600000 };

/** The per-scope runs the manifest names, so a scope added later joins without anybody listing it. */
const scopeRuns = () => Object.entries(require(path.join(ROOT, 'package.json')).scripts)
  .filter(([name, body]) => /^snap-/.test(name) && name !== 'snap-update' && body.includes('snapshot-check.js'))
  .map(([, body]) => body.replace(/^node \.\//, '').match(/(\S+snapshot-check\.js)\s+(\S+)\s+(.+)$/))
  .filter(Boolean)
  .map(([, tool, scope, glob]) => [scope, glob.replace(/^['"]|['"]$/g, '')]);

test('the manifest names a snapshot run for every scope this grammar stands', live, () => {
  const runs = scopeRuns();
  assert.ok(runs.length >= 6, `the manifest names ${runs.length} snapshot run(s), where the grammar stands more`);
  const scopes = runs.map(([scope]) => scope);
  for (const wanted of ['text.html.tiddlywiki5', 'text.html.tiddlywiki5.memetic-wikitext']) {
    assert.ok(scopes.includes(wanted), `no snapshot run pins ${wanted}`);
  }
});

test('every pinned reading holds against the grammar as it stands', live, () => {
  for (const [scope, glob] of scopeRuns()) {
    const { code, out } = runNode(['tools/snapshot-check.js', scope, glob]);
    assert.match(out, /\d+ pinned, 0 drifted/, `${scope}\n${out.slice(-1500)}`);
    assert.strictEqual(code, 0, `${scope} drifted\n${out.slice(-1500)}`);
  }
});

// The fault: a call's end takes a blank-line bound. TiddlyWiki carries a call across a blank line
// and builds it, so the bound cuts the closer loose and the pinned readings must say so.
test('a bound that cuts a construct the host carries reads as drift', live, () => {
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').replaceAll('"end": "(>>)",', '"end": "(>>)|(?=^$)",');
  assert.notStrictEqual(provoked, fs.readFileSync(GRAMMAR, 'utf8'), 'the provocation changed nothing, so it plants no fault');
  const { code, out } = runProvoked(provoked, ['tools/snapshot-check.js'], ['text.html.tiddlywiki5', './tests/samples/*.tw']);
  assert.match(out, /pinned, [1-9]\d* drifted/, out.slice(-1500));
  assert.notStrictEqual(code, 0, 'the check reports drift and still exits clean');
});

// A check that reads no sample reports zero drift over nothing, and every caller believes it.
test('a run reaching no sample refuses rather than reporting a clean pin', live, () => {
  const { code, out } = runNode(['tools/snapshot-check.js', 'text.html.tiddlywiki5', './tests/samples/*.nothing-carries-this']);
  assert.ok(!/[1-9]\d* pinned, 0 drifted/.test(out), `a run over no sample read as a clean pin: ${out.slice(-500)}`);
  assert.notStrictEqual(code, 0, `a run over no sample exited clean: ${out.slice(-500)}`);
});
