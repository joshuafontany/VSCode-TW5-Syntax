// The reader's own recipe for the constructs this grammar cannot make loud.
//
// Some constructs read as body text in a quarter or more of the bundled themes, and the ledger rules
// each one: the family that would cure it either lies about what it names or costs a neighbour its
// declared distinction. A grammar cannot fix those from inside, and the extension ships no runtime to
// fix them from outside — so the remaining honest move hands the READER the switch, measured.
//
// The recipe generates from the ledger and the contrast reading, never by hand: a scope that stops
// reading as prose leaves the recipe the same day, and one that starts joins it.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { recipe, render } = require('./reading-recipe.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };
const MARK = '<!-- reading-recipe -->';

test('the recipe names every scope the ledger rules as reading prose', live, async () => {
  const rows = await recipe();
  const ledger = fs.readFileSync(path.join(ROOT, 'corpus', 'prose-reading-ledger.txt'), 'utf8');
  for (const row of rows) {
    // THE LEDGER KEYS A SCOPE WITHOUT THE GRAMMAR'S OWN SUFFIX, and the recipe emits it with one — a
    // reader pastes the full name into settings. The row carries both so the weld compares like with like.
    assert.ok(ledger.includes(row.key),
      `the recipe names ${row.key}, which the ledger does not rule — a recommendation nobody explained`);
    assert.strictEqual(row.scope, `${row.key}.tiddlywiki5`, 'the emitted scope and the ledger key disagree');
    assert.ok(row.themes > 0, `${row.scope} carries no reading to recommend against`);
    assert.ok(row.why && row.why.length > 10, `${row.scope} carries no reason a reader could act on`);
  }
});

// A SETTINGS RULE CARRYING A COLOUR HOLDS THAT COLOUR ACROSS EVERY THEME A READER SWITCHES TO. The
// recipe therefore recommends `fontStyle` alone, which every theme keeps its own colours under.
// AN EMPTY RECIPE STATES A MEASUREMENT. The ledger rules a construct only above the bar, so a ledger
// naming none says every construct clears it — and the block a reader meets must say that in words
// rather than stand as an empty table nobody can act on.
test('a recipe naming no scope states why, and rules nothing', live, async () => {
  const rows = await recipe();
  const block = render(rows, 65);
  if (rows.length) {
    assert.match(block, /\| construct \|/, 'a recipe with rows carries the table those rows fill');
    return;
  }
  assert.doesNotMatch(block, /\| construct \|/, 'a recipe naming no scope still printed a table');
  assert.doesNotMatch(block, /textMateRules/, 'a recipe naming no scope still recommended a rule');
  assert.match(block, /reads as body text in more than a quarter/, 'an empty recipe states no measurement');
});

test('the recipe recommends nothing that outlives a theme switch', live, async () => {
  for (const row of await recipe()) {
    assert.ok(row.settings.fontStyle, `${row.scope} carries no fontStyle to recommend`);
    assert.strictEqual(row.settings.foreground, undefined,
      `${row.scope} recommends a literal colour, which survives every theme switch a reader makes`);
  }
});

test('the README carries the generated recipe, unchanged', live, () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes(MARK), `the README carries no ${MARK} block for the recipe to weld to`);
  const { out, code } = runTool('reading-recipe.js');
  assert.strictEqual(code, 0, out.slice(-600));
  const generated = out.slice(out.indexOf(MARK));
  const start = readme.indexOf(MARK);
  const carried = readme.slice(start, start + generated.length);
  assert.strictEqual(carried.trim(), generated.trim(),
    'the README\'s recipe and the tool\'s reading disagree — run `npm run reading-recipe -- --write`');
});
