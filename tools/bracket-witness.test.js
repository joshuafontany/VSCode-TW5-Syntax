// The bracket witness reproduces the one colour no theme and no scope decides: the red VS Code paints
// on a bracket its own matcher reads as unmatched.
//
// THE DECIDING HALF TAKES ITS TOKENS AS AN ARGUMENT, so the rule stands pinned against tokens built
// for the purpose rather than against whatever today's grammar emits.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const reds = (...args) => require('./bracket-witness.js').redBrackets(...args);
const PAIRS = [['<!--', '-->'], ['{', '}'], ['[', ']'], ['(', ')']];
const slow = { timeout: 900000 };

// One line, one token per run of characters sharing a scope stack.
const plain = (line) => [[{ startIndex: 0, endIndex: line.length, scopes: ['text.test'] }]];
const shape = (found) => found.map((r) => `${r.line}:${r.col} ${r.text} ${r.kind}`);

test('balanced brackets paint nothing', () => {
  assert.deepStrictEqual(reds(['(a [b] c)'], plain('(a [b] c)'), PAIRS), []);
});

test('a closer with no opener of its kind reads red', () => {
  assert.deepStrictEqual(shape(reds(['a)'], plain('a)'), PAIRS)), ['1:2 ) close']);
});

test('an opener nothing closes reads red', () => {
  assert.deepStrictEqual(shape(reds(['(a'], plain('(a'), PAIRS)), ['1:1 ( open']);
});

test('a closer reaching past an opener of another kind leaves that opener red', () => {
  // VS Code closes the nearest opener of the closer's own kind anywhere on the stack, and every
  // opener it passes stays unclosed.
  assert.deepStrictEqual(shape(reds(['( [ )'], plain('( [ )'), PAIRS)), ['1:3 [ open']);
});

test('a bracket inside a string, comment or regex token stands out of the matching', () => {
  const line = '"(" )';
  const tokens = [[
    { startIndex: 0, endIndex: 3, scopes: ['text.test', 'string.quoted.double.test'] },
    { startIndex: 3, endIndex: 5, scopes: ['text.test'] }
  ]];
  assert.deepStrictEqual(shape(reds([line], tokens, PAIRS)), ['1:5 ) close']);
});

test('an embedded region hands its brackets back to the matching', () => {
  // vscode-textmate reads the innermost of comment|string|regex|meta.embedded, and meta.embedded
  // resets the type to Other — so a script body's parens match even under a string-typed parent.
  const tokens = [[{ startIndex: 0, endIndex: 1, scopes: ['text.test', 'string.x.test', 'meta.embedded.block.js'] }]];
  assert.deepStrictEqual(shape(reds(['('], tokens, PAIRS)), ['1:1 ( open']);
});

test('a bracket spelled across several characters matches as one', () => {
  assert.deepStrictEqual(reds(['<!-- a -->'], plain('<!-- a -->'), PAIRS), []);
  assert.deepStrictEqual(shape(reds(['a -->'], plain('a -->'), PAIRS)), ['1:3 --> close']);
});

// RULED 2026-09-21: `(` and `)` retired from every language configuration's `brackets`. Wikitext
// prose carries unpaired parentheses constantly — "1)", "(see above" — and VS Code painted every
// unmatched one red over any theme, a false alarm no scope earns and no reader asked for. The `(`
// AUTO-CLOSING pair stands unchanged; only the colourizer's own matching list moves.

test('neither wikitext language declares ( ) among its bracket pairs any more', () => {
  const { languages } = require('./bracket-witness.js');
  const configured = languages();
  assert.ok(configured.length > 0, 'no language read from package.json — the pattern stopped matching');
  for (const lang of configured) {
    const names = lang.pairs.map(([open, close]) => `${open} ${close}`);
    assert.ok(!names.includes('( )'), `${lang.id} still declares ( ) among its brackets: ${names.join(', ')}`);
  }
});

test('ordinary prose parentheses read no red under the real wikitext pairs', () => {
  const { languages } = require('./bracket-witness.js');
  const wikitext = languages().find((l) => l.id === 'tiddlywiki5');
  assert.ok(wikitext, 'no tiddlywiki5 language configuration found to read pairs from');
  const line = 'See point 1) below (and the note above) for detail.';
  assert.deepStrictEqual(reds([line], plain(line), wikitext.pairs), [],
    'unpaired prose parentheses painted red under the pairs this repository ships');
});

// THE GATE, over the real grammars and every carrier.

test('every red a carrier holds stands declared', slow, () => {
  const { code, out } = runTool('bracket-witness.js');
  assert.match(out, /bracket-witness {2,}\d+ carrier\(s\)/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-800));
});

test('a stray closer written into a carrier reads as a red nobody declared', slow, () => {
  const { code, out } = runInSandbox((sandbox) => {
    fs.appendFileSync(path.join(sandbox, 'corpus', 'wikitext', 'blocks.headings.tw'), '\nA stray ] closes nothing here.\n');
  }, ['tools/bracket-witness.js']);
  assert.match(out, /blocks\.headings\.tw/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a stray closer read clean');
});

test('a declaration whose bracket no longer reads red fails as stale', slow, () => {
  const { code, out } = runInSandbox((sandbox) => {
    fs.appendFileSync(path.join(sandbox, 'corpus', 'bracket-ledger.txt'),
      'corpus/wikitext/blocks.headings.tw  1  (  open  "a line nobody wrote"  # a declaration the gate must refuse\n');
  }, ['tools/bracket-witness.js']);
  assert.match(out, /stale/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a declaration explaining nothing read clean');
});
