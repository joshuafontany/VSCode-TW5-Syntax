// A vendored grammar answers to a runner, or it answers to nobody.
//
// `tests/grammars/` holds grammars other people wrote, so an embedded-language assertion resolves
// the scope it names. `grammars.sh` names each path, and a grammar the file omits loads in neither
// runner — every assertion against it reads as absent rather than as wrong, and the suite reports
// green over a language nothing checked.
//
// The two failures run opposite ways and this holds both: a file here that no runner loads, and a
// path the shell names that nothing holds.
//
//   node --test tools/vendored-grammars.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const VENDORED = path.join(ROOT, 'tests', 'grammars');
const SHELL = fs.readFileSync(path.join(ROOT, 'grammars.sh'), 'utf8');

// Every path the shell names under the repository, quoted one per line.
const named = [...SHELL.matchAll(/^\s*"((?:tests|syntaxes)\/[^"]+)"\s*$/gm)].map((m) => m[1]);

// A runner reads a grammar as JSON, plist or tmLanguage. A `.cson` carries an upstream source and
// its licence beside the converted form, which the runner reads instead.
const LOADABLE = /\.(json|plist|tmLanguage)$/;

test('every grammar vendored here, a runner loads', () => {
  const unloaded = fs.readdirSync(VENDORED)
    .filter((f) => LOADABLE.test(f))
    .filter((f) => !named.includes(`tests/grammars/${f}`));
  assert.deepStrictEqual(unloaded, [],
    'vendored grammar(s) no runner loads — an assertion against one reads as absent, never as wrong');
});

test('every path the shell names, something holds', () => {
  const missing = named.filter((p) => !fs.existsSync(path.join(ROOT, p)));
  assert.deepStrictEqual(missing, [], 'path(s) grammars.sh names that nothing holds');
});

test('a source kept for its licence stands beside the form a runner reads', () => {
  const orphans = fs.readdirSync(VENDORED)
    .filter((f) => f.endsWith('.cson'))
    .filter((f) => !fs.existsSync(path.join(VENDORED, f.replace(/\.cson$/, '.json'))));
  assert.deepStrictEqual(orphans, [],
    'source form(s) with no converted grammar beside them — the licence covers nothing here');
});

test('the directory says what it holds', () => {
  const readme = path.join(VENDORED, 'README.md');
  assert.ok(fs.existsSync(readme), 'nothing beside the vendored grammars says where they came from');
  const text = fs.readFileSync(readme, 'utf8');
  assert.match(text, /grammars\.sh/, 'the account names no loader');
});
