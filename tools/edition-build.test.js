// PATTERN INTEGRITY: a generated file stands current with its source.
//
// The edition's modules answer to TypeScript in `src/` and run as JavaScript in `tiddlers/`. A
// contributor editing the source and forgetting the build ships the OLD module: the wiki loads it,
// the gates it carries run, and every reading comes back green from code nobody wrote.
//
// Nothing could notice. TypeScript stands in no dependency of this repository — the build finds a
// compiler in a parent checkout — so continuous integration cannot rebuild and compare, and the
// compiled modules ARE the shipped artifact.
//
// So the build records the sha256 of every source it compiled, and this recomputes them. Verifying
// wants no compiler; only rebuilding does.
//
// The build also named ONE module by hand and verified that one. A second arrived, compiled, and
// stood unverified beside it — the shape a hand-written enumeration always takes.
//
//   node --test tools/edition-build.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readData } = require('./wiki-data.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'editions', 'tw5-syntax', 'src');
const TIDDLERS = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers');

const sources = () => fs.readdirSync(SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, file))).digest('hex');

test('every source compiles to a module that stands beside it', () => {
  for (const source of sources()) {
    const emitted = path.join(TIDDLERS, source.replace(/\.ts$/, '.js'));
    assert.ok(fs.existsSync(emitted), `${source} names no compiled module the wiki could load`);
  }
});

test('what the wiki loads answers to the source standing here', () => {
  const { sources: recorded } = readData('EditionBuild.tid').data;
  const stale = sources().filter((source) => recorded[source] !== digest(source));
  assert.deepStrictEqual(stale, [],
    'source(s) edited since the build — the wiki loads the module compiled from the older bytes');
});

test('the record names every source, and every source it names stands', () => {
  const { sources: recorded } = readData('EditionBuild.tid').data;
  const here = sources();
  assert.deepStrictEqual(Object.keys(recorded).sort(), [...here].sort(),
    'the record and the source directory name different sets');
});

test('the build verifies every module it compiles, not one it names', () => {
  const { code, out } = runTool('edition-build.js');
  assert.strictEqual(code, 0, out.slice(-400));
  assert.match(out, new RegExp(`${sources().length} module\\(s\\)`), out.slice(-300));
  for (const source of sources()) {
    const name = source.replace(/\.ts$/, '.js').replace(/\./g, '\\.');
    assert.match(out, new RegExp(name), `the build never named ${source}`);
  }
});

test('a source edited since the build reads as stale', () => {
  // The collision, run against the reading rather than the tree: the recorded digest answers to
  // bytes, so a byte changed anywhere in a source parts from it.
  const { sources: recorded } = readData('EditionBuild.tid').data;
  const source = sources()[0];
  const edited = crypto.createHash('sha256')
    .update(`${fs.readFileSync(path.join(SRC, source), 'utf8')}\nvoid 0;\n`).digest('hex');
  assert.notStrictEqual(edited, recorded[source],
    'a source with a line appended read as the same bytes');
});
