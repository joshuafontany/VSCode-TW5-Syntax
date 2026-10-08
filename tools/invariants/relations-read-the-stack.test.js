// A relation about colour answers over the STACK a reader meets, never over a scope alone.
//
// `theme-model.js` says it in its own docstring: a scope asked alone answers differently from the
// same scope inside a stack, because an ancestor cannot paint what a caller never handed over. A
// theme resolves the INNERMOST scope its rules reach, so a scope standing mid-stack decides nothing
// whenever something deeper carries a rule of its own.
//
// Measured, that gap ran a declared distinction green for a whole release: the link relation — the
// text a reader clicks against the title it reaches — reads 65 of 65 themes apart when each scope
// goes to the theme alone, and 16 of 65 in the stack a reader actually meets, under a floor of 40.
// The caption's stack ends `markup.link → markup.underline.link → string.other.link.title`, so
// `string` wins and `markup.underline.link` never decides a colour. In Monokai and both Gruvboxes,
// caption and target paint the SAME HEX.
//
// So every relation carries a specimen and the words to find in it, and the gate harvests the stack
// off that specimen the way `construct-legibility` already does. A relation naming bare scopes
// cannot be measured honestly, and this refuses one.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TIDDLER = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'ReaderRelations.tid');
const relations = JSON.parse(fs.readFileSync(TIDDLER, 'utf8').split('\n\n').slice(1).join('\n\n'));

for (const family of ['together', 'apart', 'alike']) {
  test(`every ${family} relation carries a specimen to harvest its stack from`, () => {
    const bare = (relations[family] ?? [])
      .filter((r) => !r.specimen || !Array.isArray(r.words) || r.words.length === 0)
      .map((r) => r.what);
    assert.deepStrictEqual(bare, [],
      `${bare.length} ${family} relation(s) name scopes with no specimen, so the gate can only ask each `
      + `scope alone — and a scope alone answers differently from the same scope in a reader's stack:\n  `
      + bare.join('\n  '));
  });

  // The CONTROL on the requirement: a specimen must actually carry every word the relation names, or
  // the relation reads green over a stack nothing in the specimen produced.
  test(`every ${family} relation names as many words as scopes`, () => {
    const mismatched = (relations[family] ?? [])
      .filter((r) => Array.isArray(r.words) && Array.isArray(r.scopes) && r.words.length !== r.scopes.length)
      .map((r) => `${r.what} — ${r.words.length} word(s), ${r.scopes.length} scope(s)`);
    assert.deepStrictEqual(mismatched, [], mismatched.join('\n  '));
  });
}

// AND THE WITNESS MUST ASK THE SAME WAY FOR EVERY FAMILY. A specimen in the declaration buys nothing
// while the tool still hands a bare scope to the resolver, and the repair landed on two families of
// three: the declared distinctions and the declared unities read the stack, while the opener/closer
// pairs and the things-met-as-one went on asking each scope alone. A half-migrated instrument reads
// exactly as green as an unmigrated one.
//
// So no colour a relation turns on comes from the bare-scope resolver. The stack answers, always.
test('the colour witness resolves every relation over a stack, never a bare scope', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools', 'colour-witness.js'), 'utf8');
  // The bare-scope resolver may be exported for a caller that genuinely holds one name and no
  // specimen; it may not decide a relation here.
  const calls = source.split('\n')
    .map((line, i) => ({ line: line.trim(), at: i + 1 }))
    .filter(({ line }) => /\bcolourOf\s*\(\s*t\b/.test(line));
  assert.deepStrictEqual(calls.map((c) => `${c.at}: ${c.line.slice(0, 90)}`), [],
    'the witness resolves a relation from a bare scope, which answers differently from the stack a reader meets');
});
