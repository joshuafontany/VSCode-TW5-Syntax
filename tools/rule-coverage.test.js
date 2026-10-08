// The coverage gate refuses, and this plants each fault it stands for.
//
// It answers to the host on two counts now — every wikitext rule the grammar names, and every
// pragma the zone lets stand — so a collision has to provoke each independently.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 600000 };

test('the grammar names every rule and every pragma the host stands', live, () => {
  const { code, out } = runTool('rule-coverage.js');
  assert.match(out, /0 unaccounted/, out.slice(-500));
  assert.match(out, /pragma keyword\(s\) guarded across \d+ rule\(s\)/, `the gate must report on the pragma zone: ${out.slice(-300)}`);
  assert.strictEqual(code, 0, out.slice(-500));
});

// The pragma zone opens on a keyword list. TiddlyWiki spells each keyword inside the rule module's
// own matchRegExp, so a keyword the zone omits closes the zone on the line that carries it — and
// every directive below that line reads as prose.
test('a keyword struck from the pragma zone fails the gate', live, () => {
  const strike = (sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').split('parsermode').join('parsermodex'));
  };
  const { code, out } = runInSandbox(strike, ['tools/rule-coverage.js']);
  assert.match(out, /parsermode/, out.slice(-500));
  assert.notStrictEqual(code, 0, 'the zone stopped naming a pragma and the gate held anyway');
});

// A pragma whose token never reaches the harvest leaves the guard checked against a shorter list
// than the host stands, and the run reads green on the strength of what nobody harvested.
test('a pragma reaching the harvest with no token fails the gate', live, () => {
  const strip = (sandbox) => {
    const file = path.join(sandbox, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
    const text = fs.readFileSync(file, 'utf8');
    const head = text.indexOf('\n\n');
    const signals = JSON.parse(text.slice(head + 2));
    delete signals.pragmaTokens.parsermode;
    fs.writeFileSync(file, `${text.slice(0, head + 2)}${JSON.stringify(signals, null, 4)}\n`);
  };
  const { code, out } = runInSandbox(strip, ['tools/rule-coverage.js']);
  assert.match(out, /"parsermode" pragma reaches the harvest carrying no token/, out.slice(-500));
  assert.notStrictEqual(code, 0, 'a pragma lost its token and the gate held anyway');
});
