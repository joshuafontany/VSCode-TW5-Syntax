// PATTERN INTEGRITY: a generated file stands current with its source.
//
// The edition's modules answer to TypeScript in `src/` and run as JavaScript in `tiddlers/`. A
// contributor editing the source and forgetting the build ships the OLD module: the wiki loads it,
// the gates it carries run, and every reading comes back green from code nobody wrote.
//
// Two readings answer, and each covers what the other cannot.
//
// The BUILD reading rebuilds and compares. A compiler stands in this repository's own dependencies,
// pinned to the version whose bytes the committed modules carry, so `--check` answers whether the
// tree holds what today's compiler writes — it trusts nothing, and it wants a toolchain.
//
// The WELD reading recomputes the sha256 of every source the build recorded. It answers only that
// nobody edited a source since the last build, and it wants no compiler at all — so it still stands
// where a reader has none.
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

test('the compiler stands in this repository, not in a checkout above it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const pinned = (pkg.devDependencies || {}).typescript;
  assert.ok(pinned, 'no compiler stands in this repository, so nothing here can rebuild the edition');
  assert.match(pinned, /^\d+\.\d+\.\d+$/,
    `typescript stands at ${pinned} — a range lets a newer compiler write different bytes than the tree carries`);
  assert.ok(fs.existsSync(path.join(ROOT, 'node_modules', '.bin', 'tsc')),
    'the pinned compiler stands installed nowhere');
  const { data } = readData('EditionBuild.tid');
  assert.ok(data.compiler.includes(pinned),
    `the modules answer to ${data.compiler}, and this repository pins ${pinned}`);
});

test('the tree carries what today\'s compiler writes', { timeout: 300000 }, () => {
  const { code, out } = runTool('edition-build.js', ['--check']);
  assert.match(out, /the tree current/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-400));
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
