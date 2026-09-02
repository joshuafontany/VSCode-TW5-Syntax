// The extension ships colouring and nothing that runs.
//
// A TextMate grammar decides how loudly a construct reads and never which parser rules a wiki
// stands — nothing in the VS Code API hands a grammar to an extension at runtime. So the
// configuration this extension offers works by scope naming and theme rules, and a release that
// quietly grew an activation path would answer a different design.
//
// That claim about the API answers to Microsoft's tree rather than to this one, and no test here
// can hold it. Its CONSEQUENCE lives here and this holds that: the package declares no entry
// point, contributes only declarative surfaces, carries no runtime dependency, and packs no
// executable file. A grammar-only extension stays a grammar-only extension by measurement.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

// Surfaces VS Code reads without running anything. A key outside this set contributes behaviour.
const DECLARATIVE = new Set(['languages', 'grammars', 'snippets', 'configurationDefaults', 'configuration', 'themes', 'iconThemes', 'semanticTokenScopes']);

test('the package declares no entry point', () => {
  assert.strictEqual(pkg.main, undefined, 'a `main` entry gives the extension a runtime');
  assert.strictEqual(pkg.browser, undefined, 'a `browser` entry gives the extension a web runtime');
  assert.strictEqual(pkg.activationEvents, undefined, 'activation events exist to start something');
});

test('the package contributes only declarative surfaces', () => {
  const contributed = Object.keys(pkg.contributes || {});
  const behavioural = contributed.filter((k) => !DECLARATIVE.has(k));
  assert.deepStrictEqual(behavioural, [], `contributions VS Code cannot read without running code: ${behavioural.join(', ')}`);
  assert.ok(contributed.includes('grammars'), 'a grammar extension contributes grammars');
});

test('the package carries no runtime dependency', () => {
  assert.deepStrictEqual(Object.keys(pkg.dependencies || {}), [], 'a runtime dependency ships with the extension');
});

// The ignore list decides what packs, and it names directories rather than contributions — so an
// edit there can drop a declared grammar and nothing downstream complains. VS Code loads a
// language whose grammar file went missing and colours nothing, silently.
test('every declared contribution packs', { timeout: 120000 }, (t) => {
  let listing;
  try {
    listing = execFileSync('npx', ['--no-install', 'vsce', 'ls'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    t.skip('vsce unavailable — the ignore list stands unread');
    return;
  }
  const packed = new Set(listing.split('\n').map((l) => l.trim()).filter(Boolean));
  const declared = [
    ...(pkg.contributes.grammars || []).map((g) => g.path),
    ...(pkg.contributes.snippets || []).map((s) => s.path),
    ...(pkg.contributes.languages || []).filter((l) => l.configuration).map((l) => l.configuration)
  ].map((p) => p.replace(/^\.\//, ''));
  const absent = [...new Set(declared)].filter((f) => !packed.has(f));
  assert.deepStrictEqual(absent, [], `declared but never packed, so VS Code loads it and colours nothing: ${absent.join(', ')}`);
});

// The manifest decides what packs. A file the ignore list misses ships whatever it holds.
test('nothing executable packs into the extension', { timeout: 120000 }, (t) => {
  let listing;
  try {
    listing = execFileSync('npx', ['--no-install', 'vsce', 'ls'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    t.skip('vsce unavailable — the ignore list stands unread');
    return;
  }
  const packed = listing.split('\n').map((l) => l.trim()).filter(Boolean);
  assert.ok(packed.length > 0, 'the manifest packs nothing at all');
  const executable = packed.filter((f) => /\.(js|cjs|mjs|ts|sh)$/.test(f));
  assert.deepStrictEqual(executable, [], `executable file(s) packed: ${executable.join(', ')}`);
});
