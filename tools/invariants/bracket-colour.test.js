// Who decides the colour of a `{` the grammar already painted.
//
// VS Code's bracket-pair colorization paints a bracket by its NESTING DEPTH, out of
// `editorBracketHighlight.foreground1..6`, and that decision lands ON TOP of every token colour a
// theme and a grammar agreed on. The pairs it colours derive from `brackets` whenever
// `colorizedBracketPairs` stands absent — so declaring `["{","}"]` for bracket MATCHING enlists the
// same pair into depth colouring, and a reader gets both.
//
// WIKITEXT CARRIES NO NESTING FOR A DEPTH COLOUR TO REPORT. `{{`, `[[`, `((` and `{{{` spell one
// marker each, and the editor reads them as two or three nested pairs: measured in Gruvbox Dark and
// Monokai, `{{MyTiddler}}` painted its outer brace depth-1 and its inner brace depth-2, while every
// scope on both braces stood correct and identical. A reader then sees two colours inside one
// marker, no theme toggle moves it, and the grammar wears the fault.
//
// So the configurations colour NO pair, and `brackets` goes on serving matching and the jump
// commands alone.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseJsonc } = require('../jsonc.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIGS = ['language-configuration.json', 'memetic-language-configuration.json'];

// The markers the grammar paints out of bracket characters. A pair colouring any of these characters
// repaints the middle of one marker.
const MARKERS = ['{{', '}}', '{{{', '}}}', '[[', ']]', '((', '))'];

for (const file of CONFIGS) {
  const config = parseJsonc(fs.readFileSync(path.join(ROOT, file), 'utf8'));

  test(`${file} hands every bracket colour to the grammar`, () => {
    assert.ok(Array.isArray(config.colorizedBracketPairs),
      `${file} declares no colorizedBracketPairs, so VS Code colours by depth every pair in \`brackets\``);
    assert.deepStrictEqual(config.colorizedBracketPairs, [],
      `${file} colours a pair by depth, which repaints a marker the grammar already painted`);
  });

  // The guard on the cure: emptying the colour list must not empty `brackets` itself, which carries
  // matching, the jump commands, and the indent rules.
  test(`${file} keeps its brackets for matching`, () => {
    assert.ok(Array.isArray(config.brackets) && config.brackets.length > 0,
      `${file} declares no brackets at all, so bracket matching and the jump commands go with them`);
  });

  // A CONTROL on the reading above: the characters a depth colour would reach must really sit inside
  // the markers the grammar paints, or this file guards a pair nothing writes.
  test(`${file} declares brackets whose characters open a wikitext marker`, () => {
    const chars = new Set(config.brackets.flat().flatMap((b) => [...b]));
    const reached = MARKERS.filter((m) => [...m].every((c) => chars.has(c)));
    assert.ok(reached.length > 0,
      `no marker among ${MARKERS.join(' ')} shares a character with ${file}'s brackets`);
  });
}
