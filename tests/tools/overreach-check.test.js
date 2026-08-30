// The pure halves of tools/overreach-check.js: reading a snapshot back into spans, placing
// a column in the file, and deciding where the grammar and the parser disagree.
//
// The column arithmetic carries the whole tool. A reading off by one moves every finding
// onto its neighbour — silently, because the neighbour usually carries a scope too. The `.snap`
// convention itself lives in tools/snapshot-format.js.

const test = require('node:test');
const assert = require('node:assert');
const { parseSnapshot, offsetAt, claims, verdicts, review } = require('../../tools/overreach-check.js');
const { declines } = require('../../tools/snapshot-format.js');
const { readExpected, isExpected } = require('../../tools/overreach-check.js');

test('a snapshot reads back as the spans it annotates', () => {
  const snap = ['>A x1HelloThere here', '#    ^^^^^^^^^^ text.html.tiddlywiki5 markup.underline.link.wikilink.tiddlywiki5', '>'].join('\n');
  assert.deepStrictEqual(parseSnapshot(snap), [
    {
      line: 0,
      start: 4,
      end: 14,
      scopes: ['text.html.tiddlywiki5', 'markup.underline.link.wikilink.tiddlywiki5']
    }
  ]);
});

// The '#' holds column 0 of the annotation line, so its whitespace run measures the
// source column: four spaces before the caret name source column 4.
test('the caret column lands on the source column it names', () => {
  const source = 'A x1HelloThere here';
  const [ann] = parseSnapshot(`>${source}\n#    ^^^^^^^^^^ scope.a\n`);
  assert.strictEqual(source.slice(ann.start, ann.end), 'HelloThere');
});

test('a caret run at column zero names the start of the line', () => {
  const source = '! A heading';
  const [ann] = parseSnapshot(`>${source}\n#^ punctuation.a\n`);
  assert.strictEqual(ann.start, 0);
  assert.strictEqual(source.slice(ann.start, ann.end), '!');
});

test('every source line advances the count, annotated or not', () => {
  const snap = ['>first', '#^^^^^ scope.a', '>second', '>third', '#^^^^^ scope.b'].join('\n');
  assert.deepStrictEqual(parseSnapshot(snap).map((a) => a.line), [0, 2]);
});

test('an offset counts the newline that ends each line', () => {
  const source = 'ab\ncde\nf';
  assert.strictEqual(offsetAt(source, 0, 0), 0);
  assert.strictEqual(offsetAt(source, 1, 0), 3);
  assert.strictEqual(offsetAt(source, 2, 0), 7);
  assert.strictEqual(source[offsetAt(source, 1, 2)], 'e');
});

test('a span carrying only base scopes claims nothing', () => {
  assert.deepStrictEqual(claims(['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5']), []);
  assert.deepStrictEqual(claims(['text.html.tiddlywiki5', 'markup.bold.tiddlywiki5']), ['markup.bold.tiddlywiki5']);
});

// review() asks the oracle; a stub oracle keeps the decider under test without a boot.
const stubOracle = (answers) => ({
  readAt: (_source, start, end) =>
    answers[`${start}-${end}`] || { kind: 'built', innermost: 'built', rule: 'stub', start, end }
});

// A verdict runs OPPOSITE to a claim: it says nothing works here, so it answers to whether
// TiddlyWiki REFUSED. Counting it as a claim reads a correct verdict as an over-reach.
test('a verdict counts as a verdict, never as a claim', () => {
  const scopes = ['text.html.tiddlywiki5', 'invalid.illegal.bad-angle-bracket.html.tiddlywiki5'];
  assert.deepStrictEqual(claims(scopes), []);
  assert.deepStrictEqual(verdicts(scopes), ['invalid.illegal.bad-angle-bracket.html.tiddlywiki5']);
});

// A suppression scope asserts the same thing a verdict does — the parser declined here — so
// it answers to refusal, not to construction. `meta.link.suppressed.wikilink` marks a tilde
// TiddlyWiki honoured; counting it as a claim reports every honoured suppressor as over-reach.
test('a suppression counts with the verdicts, never with the claims', () => {
  const scopes = ['text.html.tiddlywiki5', 'meta.link.suppressed.wikilink.tiddlywiki5'];
  assert.deepStrictEqual(claims(scopes), []);
  assert.deepStrictEqual(declines(scopes), ['meta.link.suppressed.wikilink.tiddlywiki5']);
});

test('a suppression standing where TiddlyWiki refuses reports nothing', () => {
  const source = 'a ~CamelCaseLink b';
  const snap = `>${source}\n#  ^ text.html.tiddlywiki5 meta.link.suppressed.wikilink.tiddlywiki5\n`;
  const refuse = { readAt: (_s, start, end) => ({ kind: 'text', innermost: 'text', rule: 'wikilinkprefix', start, end }) };
  assert.deepStrictEqual(review(source, snap, refuse), []);
});

test('a verdict standing where TiddlyWiki refuses reports nothing', () => {
  const source = 'NDT<<:>> here';
  const snap = `>${source}\n#  ^ text.html.tiddlywiki5 invalid.illegal.bad-angle-bracket.html.tiddlywiki5\n`;
  const refuse = { readAt: (_s, start, end) => ({ kind: 'text', innermost: 'text', rule: null, start, end }) };
  assert.deepStrictEqual(review(source, snap, refuse), []);
});

test('a verdict standing where TiddlyWiki builds reports as an invention', () => {
  const source = 'see [[A Tiddler]] here';
  const snap = `>${source}\n#   ^ text.html.tiddlywiki5 invalid.illegal.bad-angle-bracket.html.tiddlywiki5\n`;
  const build = { readAt: (_s, start, end) => ({ kind: 'built', innermost: 'built', rule: 'prettylink', start, end }) };
  const found = review(source, snap, build);
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].kind, 'invention');
  assert.strictEqual(found[0].rule, 'prettylink');
});

// A verdict on text standing INSIDE a construct the parser built still reads correct: the
// parser built nothing at the span itself.
test('a verdict inside a built block reports nothing when the span itself stays text', () => {
  const source = '!! Avertissement<<:>>';
  const snap = `>${source}\n#                ^ text.html.tiddlywiki5 invalid.illegal.bad-angle-bracket.html.tiddlywiki5\n`;
  const inHeading = {
    readAt: (_s, start, end) => ({ kind: 'built', innermost: 'text', rule: 'heading', start, end })
  };
  assert.deepStrictEqual(review(source, snap, inHeading), []);
});

// Inside a definition body the parser looked at nothing, so neither direction has grounds.
test('nothing reports inside an unparsed definition body', () => {
  const source = '\\define m()\nbody with < here\n\\end';
  const at = source.indexOf('<');
  const claim = `>body with < here\n#          ^ text.html.tiddlywiki5 markup.bold.tiddlywiki5\n`;
  const opaque = { readAt: (_s, start, end) => ({ kind: 'built', innermost: 'opaque', rule: 'macrodef', start, end }) };
  assert.deepStrictEqual(review(source, claim, opaque), []);
  const verdict = `>body with < here\n#          ^ text.html.tiddlywiki5 invalid.illegal.bad-angle-bracket.html.tiddlywiki5\n`;
  assert.deepStrictEqual(review(source, verdict, opaque), []);
  assert.ok(at > 0);
});

test('a claimed span TiddlyWiki refuses reports, and names what it painted', () => {
  const source = 'A x1HelloThere here';
  const snap = `>${source}\n#    ^^^^^^^^^^ text.html.tiddlywiki5 markup.underline.link.wikilink.tiddlywiki5\n`;
  const found = review(source, snap, stubOracle({ '4-14': { kind: 'text', innermost: 'text', rule: 'wikilink', start: 4, end: 14 } }));
  assert.deepStrictEqual(found, [
    {
      kind: 'overreach',
      line: 1,
      col: 5,
      span: 'HelloThere',
      rule: 'wikilink',
      scope: 'markup.underline.link.wikilink.tiddlywiki5'
    }
  ]);
});

test('a claimed span TiddlyWiki builds reports nothing', () => {
  const source = 'A HelloThere here';
  const snap = `>${source}\n#  ^^^^^^^^^^ text.html.tiddlywiki5 markup.underline.link.wikilink.tiddlywiki5\n`;
  assert.deepStrictEqual(review(source, snap, stubOracle({})), []);
});

// Prose inside a paragraph carries the base scopes and nothing else. TiddlyWiki yields text
// for all of it, so counting those would report every sentence in the corpus.
test('unclaimed prose never reports, however TiddlyWiki reads it', () => {
  const source = 'just a sentence.';
  const snap = `>${source}\n#^^^^^^^^^^^^^^^^ text.html.tiddlywiki5 meta.paragraph.tiddlywiki5\n`;
  const refuseEverything = { readAt: (_s, start, end) => ({ kind: 'text', innermost: 'text', rule: null, start, end }) };
  assert.deepStrictEqual(review(source, snap, refuseEverything), []);
});

test('a span on the second line reports its own line number', () => {
  const source = 'first line\nA &Ridiculous; here';
  const snap = ['>first line', '>A &Ridiculous; here', '#  ^^^^^^^^^^^^ text.html.tiddlywiki5 constant.character.entity.named.x', ''].join('\n');
  const start = source.indexOf('&Ridiculous;');
  const found = review(source, snap, stubOracle({ [`${start}-${start + 12}`]: { kind: 'text', innermost: 'text', rule: null } }));
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].line, 2);
  assert.strictEqual(found[0].span, '&Ridiculous;');
});

// ── ruled divergences ────────────────────────────────────────────────────────
//
// Some spans stand where TiddlyWiki refuses BY RULING: CamelCase carries a scope the host
// ships disabled, `\rules only` narrows a rule set no TextMate grammar can follow, and a
// fixture carrying deliberate faults carries them on purpose. A tally that counts those beside
// a genuine over-reach can never reach zero, and a reader learns nothing from the number.
//
// Each ruling stands written with its reason. A line carrying no reason names no ruling.

test('a ruling names a scope and a reason', () => {
  const text = [
    '# The corpus ruling file',
    'meta.link.wikilink  # TiddlyWiki ships CamelCase linking disabled',
    '',
    'pragmas.tw:punctuation.definition.directive  # a \\rules run narrows the rule set'
  ].join('\n');
  assert.deepStrictEqual(readExpected(text), [
    { file: null, scope: 'meta.link.wikilink', reason: 'TiddlyWiki ships CamelCase linking disabled' },
    { file: 'pragmas.tw', scope: 'punctuation.definition.directive', reason: 'a \\rules run narrows the rule set' }
  ]);
});

test('a line carrying no reason reads as no ruling at all', () => {
  assert.throws(() => readExpected('meta.link.wikilink'), /reason/);
});

// A fixture carrying deliberate faults diverges wholesale, and says so with an empty scope. A
// ruling naming neither a file nor a scope would excuse the whole corpus, and the reader
// refuses it.
test('an empty scope covers one named file, and nothing wider', () => {
  const rules = readExpected('degenerate.illegal.tw:  # a fixture written to be malformed');
  assert.ok(isExpected(rules, 'corpus/wikitext/degenerate.illegal.tw', 'anything.at.all'));
  assert.ok(!isExpected(rules, 'corpus/wikitext/inline.links.tw', 'anything.at.all'));
  assert.throws(() => readExpected(': # excuse everything'), /neither a file nor a scope/);
  assert.throws(() => readExpected('  x  '), /reason/);
});

// A dialect extends wikitext with a vocabulary the host parser cannot know, and names it with
// its own scope suffix. One ruling covers the vocabulary; every scope the dialect INHERITS
// still ends in the base suffix and still answers.
test('a ruling may name a scope suffix, and covers only what carries it', () => {
  const rules = readExpected('*.memetic-wikitext  # the dialect\'s own vocabulary, unread by the host parser');
  assert.ok(isExpected(rules, 'corpus/memetic/lar-uris.mem', 'keyword.other.scheme.lar.memetic-wikitext'));
  assert.ok(isExpected(rules, 'corpus/memetic/sigils.mem', 'meta.carrier.control.memetic-wikitext'));
  assert.ok(!isExpected(rules, 'corpus/memetic/sigils.mem', 'markup.bold.tiddlywiki5'), 'an inherited reading still answers');
});

test('a ruling matches by scope prefix, and by file where it names one', () => {
  const rules = readExpected([
    'meta.link.wikilink  # ships disabled',
    'pragmas.tw:punctuation.definition.directive  # narrows the rule set'
  ].join('\n'));
  assert.ok(isExpected(rules, 'corpus/wikitext/inline.links.tw', 'meta.link.wikilink.tiddlywiki5'));
  assert.ok(isExpected(rules, 'corpus/wikitext/pragmas.tw', 'punctuation.definition.directive.tiddlywiki5'));
  // The same scope in a file the ruling does not name stays unexplained.
  assert.ok(!isExpected(rules, 'corpus/wikitext/other.tw', 'punctuation.definition.directive.tiddlywiki5'));
  assert.ok(!isExpected(rules, 'corpus/wikitext/inline.links.tw', 'markup.bold.tiddlywiki5'));
});
