// The grammar answers to the wiki THIS HOUSE boots, never only to a stock TiddlyWiki.
//
//   node --test tools/house-rules.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool, ROOT } = require('./run-tool.js');

const PLUGIN = path.resolve(ROOT, '..', 'packages', 'lararium-tw5', 'src', 'wikirules');
const live = { skip: fs.existsSync(PLUGIN) ? false : 'no house plugin stands beside this checkout', timeout: 600000 };

// A COVERAGE GATE MEASURES THE POPULATION IT WAS GIVEN. `rule-coverage` derives its rules from
// `$tw.modules.types.wikirule` on a STOCK TiddlyWiki, and reads 0 unaccounted — while the house's own
// plugin registers rules that same boot never sees. Measured: `lar-declaration` consumes a doctype
// line and returns it as literal TEXT where the grammar reads a macro call, and no gate said so.
test('every wikirule the house plugin registers stands accounted for', live, () => {
  const { code, out } = runTool('rule-coverage.js');
  assert.match(out, /\d+ house rule\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-800));
});

// THE POPULATION COMES FROM THE PLUGIN'S OWN SOURCE, never from a list here — a rule the house adds
// reaches this reading the day it lands.
test('the house rules derive from the plugin rather than from a list', live, () => {
  const { out } = runTool('rule-coverage.js', ['--verbose']);
  for (const rule of fs.readdirSync(PLUGIN).filter((f) => f.endsWith('.ts')).map((f) => f.replace('.ts', ''))) {
    // A shared helper registers no rule of its own; only a module exporting a rule name counts.
    const src = fs.readFileSync(path.join(PLUGIN, `${rule}.ts`), 'utf8');
    if (!/^export const name\s*=/m.test(src)) continue;
    assert.match(out, new RegExp(rule), `the reading never met the house rule \`${rule}\``);
  }
});
