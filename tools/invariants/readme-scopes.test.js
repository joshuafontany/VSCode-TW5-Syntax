// Every scope the README hands a reader, the grammars still declare.
//
// The README tells a reader which scope to name in `editor.tokenColorCustomizations`. A scope that
// moves takes that instruction with it and VS Code reports nothing: the rule stops matching, and the
// construct paints the colour of prose. A reader following the page then quiets nothing, colours
// nothing, and has no way to tell.
//
// `MIGRATION.md` names gone scopes ON PURPOSE and answers to `scope-migration.test.js`; this reads
// the README alone, where every name stands as an instruction rather than as a record.
//
// The population derives from the grammars through the one collector, so no hand-kept list can
// drift from it.
//
//   node --test tools/invariants/readme-scopes.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { declaredScopesIn } = require('../grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..', '..');
const README = path.join(ROOT, 'README.md');

// A NAME THIS GRAMMAR OWNS. Three or more dot-bounded segments closing on one of the two suffixes
// these grammars write. A theme root — `string`, `punctuation` — names a family rather than a scope
// this repository declares, and a prose fragment closing on a dot names no scope at all.
const OURS = /\b[a-z][a-z0-9-]*(?:\.[a-z0-9$-]+)+\.(?:tiddlywiki5|memetic-wikitext)\b/g;

/** Every scope name the README hands a reader, with the line it stands on. */
function namedInReadme() {
  const lines = fs.readFileSync(README, 'utf8').split('\n');
  const out = [];
  lines.forEach((line, i) => {
    for (const hit of line.matchAll(OURS)) out.push({ scope: hit[0], line: i + 1 });
  });
  return out;
}

// A GRAMMAR'S OWN ROOT counts too. The languages table names each scope a file opens under, and a
// theme rule reaches those the same way it reaches any other; the manifest declares them, so the
// accepted set reads from there rather than from a second hand-kept list.
const declared = declaredScopesIn(path.join(ROOT, 'syntaxes'));
for (const g of require(path.join(ROOT, 'package.json')).contributes.grammars) declared.add(g.scopeName);

test('the reader finds the scopes the README names', () => {
  const named = namedInReadme();
  assert.ok(named.length >= 3, `${named.length} scope name(s) in the README, which reads as a reader that found none`);
});

test('a made-up scope reads as absent and a declared one as present', () => {
  // THE CONTROL. A check that never fires on a name nobody declares reports green about nothing.
  assert.ok(!declared.has('meta.nosuchthing.tiddlywiki5'), 'the grammars declare a name invented for this check');
  assert.ok(declared.has('meta.link.wikilink.tiddlywiki5'), 'the collector found no scope the grammars do declare');
  assert.deepStrictEqual([...'meta.nosuchthing.tiddlywiki5'.matchAll(OURS)].map((m) => m[0]),
    ['meta.nosuchthing.tiddlywiki5'], 'the reader misses a well-formed name');
  assert.deepStrictEqual([...'a `markup.underline.link.` prefix'.matchAll(OURS)].map((m) => m[0]), [],
    'the reader takes a prose fragment closing on a dot for a scope');
});

test('every scope the README names, the grammars declare', () => {
  const gone = namedInReadme().filter(({ scope }) => !declared.has(scope));
  const report = gone.map(({ scope, line }) => `\n  README.md:${line}  ${scope}`).join('');
  assert.deepStrictEqual(gone, [],
    `${gone.length} scope name(s) the README hands a reader that no grammar declares:${report}`);
});
