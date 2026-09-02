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
const fs = require('node:fs');
const path = require('node:path');
const { runTool, runNode } = require('./run-tool.js');
const { readData } = require('./wiki-data.js');

const ROOT = path.resolve(__dirname, '..');
const HARVEST = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');
const host = resolveTiddlyWiki() ?? '';
const live = { skip: fs.existsSync(path.join(host, 'tiddlywiki.js')) ? false : 'no TiddlyWiki beside this repo', timeout: 600000 };


const harvest = () => {
  return readData('GrammarSignals.tid').data;
};

test('the harvest matches the TiddlyWiki this repo boots against', live, () => {
  const { code, out } = runTool('grammar-signals.js', ['--check']);
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
  const { code, out } = runTool('rule-coverage.js');
  assert.match(out, /0 unaccounted/, out.slice(-400));
  assert.strictEqual(code, 0);
});

// The gate exists for the rule nobody has written yet.
test('a rule the host adds and the grammar never learns fails the gate', () => {
  const original = fs.readFileSync(HARVEST, 'utf8');
  try {
    fs.writeFileSync(HARVEST, original.replace('"wikiRules": [', '"wikiRules": [\n        "quantumfold",'));
    const { code, out } = runTool('rule-coverage.js');
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

// The wiki that shows a ruling runs the instrument that enforces it. A command tiddler carries the
// gates into the edition, so a reader who opens the wiki never leaves it to run one.
test('the edition carries a command that runs the gates', live, () => {
  const emitted = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'grammar-commands.js');
  const text = fs.readFileSync(emitted, 'utf8');
  const header = new RegExp('^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)', 'mg');
  const match = header.exec(text);
  assert.ok(match, 'the compiled command carries no header, so the wiki would load nothing');
  assert.match(match[1], /module-type: command/, 'the module declares no command type');
  const { out } = runNode([path.join(host, 'tiddlywiki.js'),
    path.join(ROOT, 'editions', 'tw5-syntax'), '--gate', 'list']);
  assert.match(out, /\d+ gate\(s\): /, out.slice(-300));
  assert.match(out, /colour-witness/, 'the command lists a gate the manifest names');
});

// A module tiddler meets no __dirname, and a command reaching for one dies where it runs rather
// than where it compiles.
test('the command finds the repository without __dirname', () => {
  const source = fs.readFileSync(path.join(ROOT, 'editions', 'tw5-syntax', 'src', 'grammar-commands.ts'), 'utf8');
  // The comment explaining its absence names it, so the code alone answers here.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\b__dirname\b/.test(code), 'a module tiddler meets no __dirname');
  assert.match(source, /boot\.wikiPath/, 'the boot knows where it opened the wiki');
});
