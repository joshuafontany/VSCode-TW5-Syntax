// The `.snap` format, read in one place.
//
// THE COLUMN CONVENTION. The `#` occupies column 0 of an annotation line, so a caret at annotation
// index N names SOURCE column N. `#^` names column 0; `# ^` names column 1. The assertion format
// `.tw5.test` files use counts differently, so a column read off a snapshot and asserted in a test
// misses by one — a difference this repository has already paid for. Nine instruments read through
// here, so an off-by-one moves all nine at once.
//
// A VERDICT RUNS OPPOSITE TO A CLAIM. A claim says a construct works, so it answers to whether
// TiddlyWiki BUILT one; a verdict says nothing works here, so it answers to whether TiddlyWiki
// REFUSED. Counting the two together reads a correct verdict as an over-reach and hides an
// invention behind a passing total. A suppression runs the way a verdict does.
//
//   node --test tools/snapshot-format.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BASE, readSnapshot, claims, verdicts, declines, isVerdict, isSuppression } =
  require('./snapshot-format.js');

const snap = [
  '>! a heading',
  '#^ text.html.tiddlywiki5 markup.heading.punctuation.definition.tiddlywiki5',
  '# ^^^^^^^^^^ text.html.tiddlywiki5 meta.heading.heading-1.tiddlywiki5',
  '>plain prose'
].join('\n');

// THE COLUMN CONVENTION, measured rather than restated: `#^` names column 0.
test('a caret at annotation index N names source column N', () => {
  const [heading] = readSnapshot(snap);
  assert.strictEqual(heading.source, '! a heading');
  assert.deepStrictEqual(heading.annotations.map((a) => [a.start, a.end]), [[0, 1], [1, 11]],
    'the column reading moved, so every span a caller reports lands beside the text it names');
  assert.strictEqual(heading.source.slice(0, 1), '!', 'column 0 names something other than the marker');
});

// EVERY SOURCE LINE COMES BACK, annotated or not, so a caller counting lines counts the file's own.
test('an unannotated line still arrives, carrying an empty reading', () => {
  const lines = readSnapshot(snap);
  assert.strictEqual(lines.length, 2, 'a line carrying no annotation dropped out of the reading');
  assert.deepStrictEqual(lines[1], { line: 1, source: 'plain prose', annotations: [] });
  // THE CONTROL: a file holding no source line at all reads as empty rather than as one blank line.
  assert.deepStrictEqual(readSnapshot('# ^ orphan annotation\n'), []);
});

// A CARRIAGE RETURN counts as a line terminator to both `.` and `$`, so an annotation regex ending
// on `$` matches NOTHING on a CRLF file — and a caller reads a snapshot full of scopes as one
// carrying none, while every gate over it reports green having measured nothing.
test('a snapshot spelled with carriage returns reads the same', () => {
  const lf = readSnapshot(snap);
  assert.ok(lf[0].annotations.length > 0, 'the specimen carries no annotations, so this proves nothing');
  assert.deepStrictEqual(readSnapshot(snap.replace(/\n/g, '\r\n')), lf,
    'a CRLF snapshot read as carrying no annotations at all');
});

// A malformed annotation line drops rather than landing as a span nobody wrote.
test('a line that names no caret run contributes no span', () => {
  const [line] = readSnapshot('>text\n# no caret here\n#^\n#^ named.scope');
  assert.deepStrictEqual(line.annotations.map((a) => a.scopes), [['named.scope']],
    'a line carrying no caret run, or a caret run naming no scope, arrived as a span');
});

// A VERDICT RUNS OPPOSITE TO A CLAIM, and a suppression runs the way a verdict does.
test('a verdict and a suppression stand apart from a claim', () => {
  assert.strictEqual(isVerdict('invalid.illegal.tiddlywiki5'), true);
  assert.strictEqual(isVerdict('markup.bold.tiddlywiki5'), false);
  // A REGION, never the character. TiddlyWiki consumes the suppressing mark and emits a node
  // beginning AFTER it, so no node covers that column and no reading can say the parser honoured it.
  assert.strictEqual(isSuppression('meta.link.suppressed.wikilink.tiddlywiki5'), true);
  assert.strictEqual(isSuppression('meta.link.wikilink.tiddlywiki5'), false);
  // THE CONTROL: a scope merely NAMING invalidity elsewhere in its path claims a construct.
  assert.strictEqual(isVerdict('meta.invalid.thing'), false,
    'a scope naming invalidity mid-path read as a verdict, so a claim counts as a refusal');
});

// The three readings cut one stack three ways, and every scope lands in exactly one of them.
test('claims, verdicts and suppressions cut a stack without overlapping', () => {
  const stack = ['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5',
    'markup.bold.tiddlywiki5', 'invalid.illegal.tiddlywiki5', 'meta.link.suppressed.wikilink'];
  assert.deepStrictEqual(claims(stack), ['markup.bold.tiddlywiki5']);
  assert.deepStrictEqual(verdicts(stack), ['invalid.illegal.tiddlywiki5']);
  assert.deepStrictEqual(declines(stack), ['invalid.illegal.tiddlywiki5', 'meta.link.suppressed.wikilink']);
  assert.strictEqual(claims(stack).length + declines(stack).length + stack.filter((s) => BASE.has(s)).length,
    stack.length, 'a scope landed in two readings at once, or in none');
});

// THE BASE SCOPES CLAIM NOTHING. A span carrying nothing else claims no construct, so it has
// nothing to answer for — counting them reports coverage over every character in every file.
test('the base scopes every span carries claim nothing', () => {
  assert.deepStrictEqual(claims([...BASE]), []);
  assert.ok(BASE.has('text.html.tiddlywiki5') && BASE.has('text.html.tiddlywiki5.memetic-wikitext'),
    'a grammar root stands outside the base, so every span under it reports as a claim');
});
