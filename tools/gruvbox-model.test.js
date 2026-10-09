// Whether the six `jdinhlife.gruvbox` themes resolve at all, and whether a reader missing one
// notices rather than reading a silent five as six, or a silent zero as "nothing to report".
//
//   node --test tools/gruvbox-model.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { flatten } = require('./theme-model.js');
const { SLUG, newestGruvbox, resolveThemesDir, loadGruvboxThemes } = require('./gruvbox-model.js');

/** A throwaway directory shaped like `<root>/jdinhlife.gruvbox-<version>/themes/*.json`. */
function fixture(names, version = '1.29.1') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-fixture-'));
  const themesDir = path.join(root, `jdinhlife.gruvbox-${version}`, 'themes');
  fs.mkdirSync(themesDir, { recursive: true });
  for (const name of names) {
    fs.writeFileSync(path.join(themesDir, `${name}.json`), JSON.stringify({
      type: 'dark',
      colors: { 'editor.foreground': '#ebdbb2', 'editor.background': '#1d2021' },
      tokenColors: [{ scope: 'variable', settings: { foreground: '#83a598' } }]
    }));
  }
  return root;
}

const SIX = ['gruvbox-dark-hard', 'gruvbox-dark-medium', 'gruvbox-dark-soft',
  'gruvbox-light-hard', 'gruvbox-light-medium', 'gruvbox-light-soft'];

test('CONTROL: a known-good fixture reads all six, by name, derived rather than hand-counted', () => {
  const root = fixture(SIX);
  try {
    const prior = process.env.VSCODE_EXTENSIONS_DIR;
    process.env.VSCODE_EXTENSIONS_DIR = root;
    const { themes, names, available, reason } = loadGruvboxThemes();
    assert.strictEqual(available, true, reason || 'a six-theme fixture must resolve as available');
    assert.strictEqual(themes.length, 6);
    assert.deepStrictEqual([...names].sort(), [...SIX].sort());
    if (prior === undefined) delete process.env.VSCODE_EXTENSIONS_DIR; else process.env.VSCODE_EXTENSIONS_DIR = prior;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    delete process.env.VSCODE_EXTENSIONS_DIR;
  }
});

// THE COLLIDER. A report that cannot notice a theme going missing measures nothing — this proves
// that dropping one of the six from the directory a reading would otherwise meet turns the count
// from 6 to 5, by name, rather than reading 6 regardless or reading nothing at all.
test('COLLIDER: a fixture missing one theme reads five, naming which one is gone', () => {
  const five = SIX.filter((n) => n !== 'gruvbox-light-soft');
  const root = fixture(five);
  try {
    process.env.VSCODE_EXTENSIONS_DIR = root;
    const { themes, names, available } = loadGruvboxThemes();
    assert.strictEqual(available, true);
    assert.strictEqual(themes.length, 5, 'a fixture missing one theme must read 5, not 6');
    assert.ok(!names.includes('gruvbox-light-soft'), 'the missing theme must not appear by name');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    delete process.env.VSCODE_EXTENSIONS_DIR;
  }
});

test('an explicit GRUVBOX_THEMES_DIR reads directly, with no extensions-root search', () => {
  const root = fixture(SIX);
  const themesDir = path.join(root, `jdinhlife.gruvbox-1.29.1`, 'themes');
  try {
    process.env.GRUVBOX_THEMES_DIR = themesDir;
    const { themes, available } = loadGruvboxThemes();
    assert.strictEqual(available, true);
    assert.strictEqual(themes.length, 6);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    delete process.env.GRUVBOX_THEMES_DIR;
  }
});

test('no extension anywhere reads absent, named, never a thrown error and never a silent zero passed as success', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-empty-'));
  try {
    process.env.VSCODE_EXTENSIONS_DIR = empty;
    const { themes, available, reason } = loadGruvboxThemes();
    assert.strictEqual(available, false);
    assert.strictEqual(themes.length, 0);
    assert.ok(reason && reason.length > 10, 'an absent reading must name why');
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
    delete process.env.VSCODE_EXTENSIONS_DIR;
  }
});

test('a GRUVBOX_THEMES_DIR naming a path that does not exist reads absent, named', () => {
  process.env.GRUVBOX_THEMES_DIR = '/nonexistent/gruvbox-themes-dir';
  try {
    const { available, reason } = loadGruvboxThemes();
    assert.strictEqual(available, false);
    assert.ok(/does not exist/.test(reason));
  } finally {
    delete process.env.GRUVBOX_THEMES_DIR;
  }
});

test('the newest of two installed versions wins, by lexical sort on the version suffix', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-versions-'));
  try {
    for (const version of ['1.20.0', '1.29.1']) {
      const dir = path.join(root, `jdinhlife.gruvbox-${version}`, 'themes');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'gruvbox-dark-hard.json'), JSON.stringify({ type: 'dark', colors: {}, tokenColors: [] }));
    }
    const resolved = newestGruvbox(root);
    assert.ok(resolved.includes('1.29.1'), `expected the newer version, got ${resolved}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// A sanity reading on `flatten`, so a failure here never gets mistaken for a `theme-model.js` fault.
test('a loaded gruvbox theme flattens to the same shape loadThemes() hands every bundled theme', () => {
  const root = fixture(['gruvbox-dark-hard']);
  try {
    process.env.VSCODE_EXTENSIONS_DIR = root;
    const { themes } = loadGruvboxThemes();
    const [theme] = themes;
    const sample = flatten({ type: 'dark', colors: {}, tokenColors: [] });
    assert.deepStrictEqual(Object.keys(theme).sort(), Object.keys(sample).sort());
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    delete process.env.VSCODE_EXTENSIONS_DIR;
  }
});
