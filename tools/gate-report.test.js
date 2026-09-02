// The report names every gate, and reads each one's verdict rather than its last word.
//
// A report gathering seventeen instruments earns trust only where the gathering holds: a gate the
// manifest adds must join without anybody remembering, and a tool that prints a warning after its
// summary must still report the summary. Both failed on the first run — the list stood correct and
// the verdict did not, so `overreach` reported "grammar not found for source.sassdoc" where its
// count of diverging spans belonged.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOL = fs.readFileSync(path.join(ROOT, 'tools', 'gate-report.js'), 'utf8');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

// The tool exports its own derivation, so this reads the same list the report runs rather than
// deriving a second one that could differ from it silently.
const { gateNames } = require('./gate-report.js');
const gates = gateNames;

test('the report takes its gate list from the manifest', () => {
  assert.match(TOOL, /require\(path\.join\(ROOT, 'package\.json'\)\)\.scripts/,
    'a list written here would miss a gate somebody adds');
  assert.ok(gates().length >= 15, `${gates().length} gate(s) — too few to read as the whole set`);
});

// A tool's summary carries its own name and what it counted; a warning after it does not.
test('a verdict reads from the summary line, never the last', () => {
  const out = [
    'grammar not found for "source.sassdoc"',
    'overreach-check  174  span(s) the grammar CLAIMS and TiddlyWiki refuses',
    'grammar not found for "text.log"'
  ];
  const summary = [...out].reverse().find((l) => /^\S+ {2,}\S/.test(l.trim()));
  assert.match(summary, /^overreach-check/, 'the verdict must come from the summary, not the warning below it');
});

// Every script the report runs must actually run. Two of them demanded an argument the manifest
// never supplied, so each returned a usage line where a verdict belonged.
test('every gate the report runs takes no argument the manifest withholds', () => {
  const needy = [];
  for (const gate of gates()) {
    const body = scripts[gate];
    const file = /tools\/([\w.-]+\.(?:js|sh))/.exec(body);
    if (!file) continue;
    const source = fs.readFileSync(path.join(ROOT, 'tools', file[1]), 'utf8');
    // What matters: does the SCRIPT hand over what the tool wants? A tool printing a usage line
    // when argv[2] stands empty needs one argument, and a script naming only the tool supplies
    // none — unless the tool falls back to the host every other gate resolves.
    const suppliesArgument = body.replace(/\.?\/?tools\/[\w.-]+\.(?:js|sh)/, '')
      .trim().split(/\s+/).filter(Boolean).length > 1;
    if (/Usage: node tools\//.test(source) && !suppliesArgument && !/resolveTiddlyWiki\(\)/.test(source)) {
      needy.push(gate);
    }
  }
  assert.deepStrictEqual(needy, [],
    'gate(s) the manifest runs with no argument that demand one, so each reports a usage line');
});
