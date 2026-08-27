// The deciding half of tools/upstream-coverage.js, against snapshots that state their answer.
//
// The tool reads a .snap file and asks, per source line, whether the grammar scoped that
// line's OPENING token. Every earlier check ran through a real grammar over a real
// corpus, where a wrong answer and a wrong reason look identical.
// Here the snapshot stands as a fixture and states its own answer.
//
//   node --test tests/tools/

const test = require('node:test');
const assert = require('node:assert');
const { judgeSnapshot } = require('../../tools/upstream-coverage.js');

// `#^ …` annotates source column 0. `# ^ …` annotates column 1.
const BASE = 'text.html.tiddlywiki5 meta.paragraph.tiddlywiki5';

test('a line whose opening token carries only base scopes reads unscoped', () => {
  const snap = ['>plain prose line', `#^^^^^^^^^^^^^^^^^ ${BASE}`, '>'].join('\n');
  assert.strictEqual(judgeSnapshot(snap).get('plain prose line'), false);
});

test('a line whose opening token carries a real scope reads scoped', () => {
  const snap = [
    '>! a heading',
    '#^ text.html.tiddlywiki5 meta.heading.heading-1.tiddlywiki5 markup.heading.punctuation.definition.tiddlywiki5',
    '# ^^^^^^^^^^ text.html.tiddlywiki5 meta.heading.heading-1.tiddlywiki5',
    '>'
  ].join('\n');
  assert.strictEqual(judgeSnapshot(snap).get('! a heading'), true);
});

test('a scope arriving only AFTER the opening token does not count', () => {
  // A table row no rule reads: column 0 stands plain, and a transclusion further along
  // carries a scope of its own. The row reads unscoped.
  const snap = [
    '>|Alpha |{{Ref}} |',
    `#^^^^^^^^ ${BASE}`,
    `#        ^^^^^^^ ${BASE} meta.transclusion.transcludeinline.tiddlywiki5`,
    '>'
  ].join('\n');
  assert.strictEqual(judgeSnapshot(snap).get('|Alpha |{{Ref}} |'), false);
});

test('an opening token with no annotation of its own reads unscoped', () => {
  // Every annotation starts past column 0, so nothing speaks for the opening mark.
  const snap = ['>|Alpha |Beta |', `# ^^^^^ ${BASE}`, `#       ^^^^ ${BASE}`, '>'].join('\n');
  assert.strictEqual(judgeSnapshot(snap).get('|Alpha |Beta |'), false);
});

test('a later line does not overwrite an earlier verdict for the same text', () => {
  // The same construct can stand twice in one probe. The first verdict holds, and a
  // second occurrence must not flip it.
  const snap = [
    '>|Alpha |',
    '#^ text.html.tiddlywiki5 markup.other.table.tiddlywiki5',
    '>',
    '>|Alpha |',
    `#^^^^^^^^ ${BASE}`,
    '>'
  ].join('\n');
  assert.strictEqual(judgeSnapshot(snap).get('|Alpha |'), true);
});

test('blank source lines carry no verdict', () => {
  const snap = ['>', '>a line', `#^^^^^^^ ${BASE}`, '>'].join('\n');
  const v = judgeSnapshot(snap);
  assert.strictEqual(v.has(''), false);
  assert.strictEqual(v.get('a line'), false);
});

test('every source line in a snapshot receives a verdict', () => {
  // A line the reader never decides on silently counts as scoped in the caller, letting
  // a deleted rule go unreported.
  const snap = [
    '>! a heading',
    '#^ text.html.tiddlywiki5 meta.heading.heading-1.tiddlywiki5',
    '>|Alpha |Beta |',
    `#^^^^^^^^^^^^^^ ${BASE}`,
    '>plain prose line',
    `#^^^^^^^^^^^^^^^^^ ${BASE}`,
    '>'
  ].join('\n');
  const v = judgeSnapshot(snap);
  for (const line of ['! a heading', '|Alpha |Beta |', 'plain prose line']) {
    assert.ok(v.has(line), `no verdict for ${JSON.stringify(line)}`);
  }
  assert.deepStrictEqual(
    [v.get('! a heading'), v.get('|Alpha |Beta |'), v.get('plain prose line')],
    [true, false, false]
  );
});
