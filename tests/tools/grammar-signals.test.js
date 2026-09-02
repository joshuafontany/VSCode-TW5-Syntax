// A version bump reaches the grammar as a failing gate, never as a construct that reads as prose.
//
// The host registers its own parser rules, and the harvest in the edition records what the booted
// TiddlyWiki said. A rule the host adds and this grammar never learns breaks nothing a gate
// watches — the grammar simply reads the new construct as text, correctly by its own lights and
// wrongly by the parser's. Only a comparison against the host notices.
//
// Two halves get checked: the harvest matches the TiddlyWiki this repo boots against, and every
// rule in it reaches the grammar under its own name or a declared one.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const HARVEST = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
const host = process.env.TW5_PATH ?? path.join(ROOT, '..', 'TiddlyWiki5');
const live = { skip: fs.existsSync(path.join(host, 'tiddlywiki.js')) ? false : 'no TiddlyWiki beside this repo', timeout: 600000 };

const run = (tool, args = []) => {
  try {
    return { code: 0, out: execFileSync('node', [path.join(ROOT, 'tools', tool), ...args], { encoding: 'utf8', cwd: ROOT }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const harvest = () => {
  const text = fs.readFileSync(HARVEST, 'utf8');
  return JSON.parse(text.slice(text.indexOf('\n\n') + 2));
};

test('the harvest matches the TiddlyWiki this repo boots against', live, () => {
  const { code, out } = run('grammar-signals.js', ['--check']);
  assert.match(out, /the harvest current/, out.slice(-400));
  assert.strictEqual(code, 0);
});

test('the harvest carries what a grammar needs to answer to', () => {
  const signals = harvest();
  assert.match(signals.version, /^\d+\.\d+/, 'the harvest names no TiddlyWiki version');
  for (const [key, least] of [['wikiRules', 30], ['filterOperators', 50], ['widgets', 40]]) {
    assert.ok(signals[key].length >= least,
      `${key} carries ${signals[key].length}, too few to read as a whole registry`);
    assert.deepStrictEqual([...signals[key]].sort(), signals[key], `${key} stands out of order, which hides a change`);
  }
});

test('every wikitext rule the host stands, the grammar reads', () => {
  const { code, out } = run('rule-coverage.js');
  assert.match(out, /0 unaccounted/, out.slice(-400));
  assert.strictEqual(code, 0);
});

// The gate exists for the rule nobody has written yet.
test('a rule the host adds and the grammar never learns fails the gate', () => {
  const original = fs.readFileSync(HARVEST, 'utf8');
  try {
    fs.writeFileSync(HARVEST, original.replace('"wikiRules": [', '"wikiRules": [\n        "quantumfold",'));
    const { code, out } = run('rule-coverage.js');
    assert.match(out, /stands a "quantumfold" rule this grammar never names/, out.slice(-400));
    assert.notStrictEqual(code, 0, 'the gate must fail, not only print');
  } finally {
    fs.writeFileSync(HARVEST, original);
  }
});

// A module the host cannot read never runs, and a boot reports nothing about it.
test('the compiled module carries a header TiddlyWiki reads', () => {
  const emitted = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'grammar-signals.js');
  const text = fs.readFileSync(emitted, 'utf8');
  const header = new RegExp('^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)', 'mg');
  const match = header.exec(text);
  assert.ok(match, 'the compiled module carries no header, so the wiki would load nothing');
  assert.match(match[1], /module-type: startup/, 'the module declares no startup type');
  assert.match(match[1], /^title: \$:\/tw5-syntax\//m, 'the module claims a title outside this edition');
});

// A startup that runs after the commands has nothing to render.
test('the startup stands before the commands that read it', () => {
  const source = fs.readFileSync(path.join(ROOT, 'editions', 'tw5-syntax', 'src', 'grammar-signals.ts'), 'utf8');
  assert.match(source, /exports\.before\s*=\s*\[\s*"commands"\s*\]/,
    'without this the render finds no tiddler and writes zero bytes, with exit code zero');
});
