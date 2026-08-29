// The deciding half of tools/composition-check.js, against snapshots that state their answer.
//
// The tool asks whether a file reads the same way with something in front of it. Its two
// pure parts — reading a snapshot into per-line annotations, and comparing two readings —
// answer here without a grammar or a corpus in the way.

const test = require('node:test');
const assert = require('node:assert');
const { readingsOf, movedLines } = require('../../tools/composition-check.js');

const B = 'text.html.tiddlywiki5 meta.paragraph.tiddlywiki5';

test('a snapshot reads into one entry per source line, in order', () => {
  const snap = ['>a line', `#^^^^^^^ ${B}`, '>', '>another', `#^^^^^^^^ ${B}`, '>'].join('\n');
  const r = readingsOf(snap);
  assert.deepStrictEqual(r.map((e) => e.line), ['a line', '', 'another', '']);
  assert.strictEqual(r[0].reading.length, 1);
});

test('the same line text in two places keeps two readings', () => {
  // Keying by line text compares one sample's reading against another's, which is how three
  // pairs read as failing while every sample composed.
  const snap = ['>dup', '#^^^ FIRST', '>dup', '#^^^ SECOND'].join('\n');
  const r = readingsOf(snap);
  assert.deepStrictEqual(r.map((e) => e.reading[0]), ['#^^^ FIRST', '#^^^ SECOND']);
});

test('a sample whose lines do not line up reports lost alignment rather than drift', () => {
  const alone = readingsOf(['>x', '#^ A', '>'].join('\n'));
  const other = readingsOf(['>y', '#^ A', '>'].join('\n'));
  assert.match(movedLines(alone, other)[0], /ALIGNMENT LOST/);
});

test('identical readings move nothing', () => {
  const a = readingsOf(['>x', `#^ ${B}`, '>'].join('\n'));
  const b = readingsOf(['>x', `#^ ${B}`, '>'].join('\n'));
  assert.deepStrictEqual(movedLines(a, b), []);
});

test('a line scoped differently in company reads as moved', () => {
  const alone = readingsOf(['>x', `#^ ${B}`, '>'].join('\n'));
  const together = readingsOf(['>x', `#^ ${B} meta.codeblock.tiddlywiki5`, '>'].join('\n'));
  assert.deepStrictEqual(movedLines(alone, together), ['x']);
});

test('a line gaining an extra annotation reads as moved', () => {
  const alone = readingsOf(['>x y', `#^ ${B}`, '>'].join('\n'));
  const together = readingsOf(['>x y', `#^ ${B}`, `#  ^ ${B} markup.bold.tiddlywiki5`, '>'].join('\n'));
  assert.deepStrictEqual(movedLines(alone, together), ['x y']);
});

test('a blank line carries no comparison', () => {
  // A blank line takes no annotation, so it can neither move nor lose alignment.
  const alone = readingsOf(['>', '>x', '#^ A', '>'].join('\n'));
  const together = readingsOf(['>', '>x', '#^ A', '>'].join('\n'));
  assert.deepStrictEqual(movedLines(alone, together), []);
});
