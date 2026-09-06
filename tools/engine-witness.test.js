// One grammar, two engines, and a host that swallows what either refuses.
//
// vscode-textmate does not raise when Oniguruma declines a pattern: the rule simply never matches,
// the corpus reaches fewer scopes, the snapshots record the reduced reading as correct, and every
// gate here passes. Probed directly, the WASM engine accepts `(?<unclosed`, `(`, `*bad` and
// `[z-a]` without a word — the swallow sits below the API, so no reading of that engine can find
// a dead pattern and a SECOND engine has to answer.
//
// A second engine also answers a question the first cannot: this grammar runs wherever a reader
// meets it, and a docs site rendering through Shiki translates every pattern to JavaScript first.
// A construct only one engine implements colours differently there, silently, for a reader who
// runs no gate and files no issue.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const live = { timeout: 600000 };

test('every pattern this repository ships crosses to the second engine', live, () => {
  const { code, out } = runTool('engine-witness.js');
  assert.match(out, /engine-witness  \d+ pattern\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

test('the witness reads every grammar the manifest ships', live, () => {
  const { out } = runTool('engine-witness.js');
  const m = /(\d+) pattern\(s\) across (\d+) grammar\(s\)/.exec(out);
  assert.ok(m, out.slice(-400));
  assert.ok(Number(m[1]) > 500, `only ${m[1]} patterns — a grammar went unread`);
  assert.ok(Number(m[2]) >= 6, `only ${m[2]} grammars — the manifest ships more`);
});

// The malformed pattern the first engine takes without a word.
test('a pattern the second engine refuses fails the gate', live, () => {
  const break_ = (sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
    grammar.repository.paragraph = { match: '[z-a]', name: 'invalid.probe' };
    fs.writeFileSync(file, JSON.stringify(grammar, null, 4));
  };
  const { code, out } = runInSandbox(break_, ['tools/engine-witness.js']);
  assert.match(out, /[1-9]\d* refused|out of order/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'the second engine refused a pattern and the gate held anyway');
});

// A ruling covering a construct one engine implements and the other does not, so a real
// portability gap never launders as an accepted entry.
test('every ruling in the ledger still names a refusal', live, () => {
  const { code, out } = runTool('engine-witness.js');
  assert.doesNotMatch(out, /explains nothing/, out.slice(-500));
  assert.strictEqual(code, 0, out.slice(-500));
});
