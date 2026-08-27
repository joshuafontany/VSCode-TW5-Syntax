// The deciding half of tools/composition-check.js, against snapshots that state their answer.
//
// The tool asks whether a file reads the same way with something in front of it. Its two
// pure parts — reading a snapshot into per-line annotations, and comparing two readings —
// answer here without a grammar or a corpus in the way.

const test = require('node:test');
const assert = require('node:assert');
const { readingsOf, movedLines } = require('../../tools/composition-check.js');

const B = 'text.html.tiddlywiki5 meta.paragraph.tiddlywiki5';

test('a snapshot reads into one entry per non-blank source line', () => {
  const snap = ['>a line', `#^^^^^^^ ${B}`, '>', '>another', `#^^^^^^^^ ${B}`, '>'].join('\n');
  const r = readingsOf(snap);
  assert.deepStrictEqual([...r.keys()], ['a line', 'another']);
  assert.strictEqual(r.get('a line').length, 1);
});

test('a line keeps its first reading when it appears twice', () => {
  const snap = ['>dup', '#^^^ FIRST', '>', '>dup', '#^^^ SECOND', '>'].join('\n');
  assert.deepStrictEqual(readingsOf(snap).get('dup'), ['#^^^ FIRST']);
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

test('a line absent from the pair reads as no evidence, not as moved', () => {
  const alone = readingsOf(['>x', `#^ ${B}`, '>'].join('\n'));
  const together = readingsOf(['>y', `#^ ${B}`, '>'].join('\n'));
  assert.deepStrictEqual(movedLines(alone, together), []);
});
