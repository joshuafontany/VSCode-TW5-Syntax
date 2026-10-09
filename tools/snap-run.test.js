// The batcher divides a file list, and every file handed to it lands in exactly one batch.
//
// A BATCHER THAT DROPS A FILE READS AS A CLEAN RUN. The snapshot tool says nothing about files it
// never met, so a file falling out of the division leaves every caller measuring a smaller
// population and reporting the same green. So the division answers on three counts: it loses
// nothing, it reorders nothing, and no batch runs long enough for cmd.exe to refuse it.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { batches, BUDGET } = require('./snap-run.js');

const fixed = ['vscode-tmgrammar-snap', '-g', './syntaxes/tiddlywiki5.json', '-s', 'text.html.tiddlywiki5'];
const cost = (args) => args.reduce((n, a) => n + a.length + 3, 0);

/** A file list long enough to need dividing, at a path length a scratch directory really reaches. */
const many = (n) => Array.from({ length: n },
  (_, i) => `/tmp/tw5-corpus-abc123/memetic-specimen-${String(i).padStart(3, '0')}.mem`);

test('every file handed in lands in exactly one batch, in order', () => {
  const files = many(400);
  const divided = batches(fixed, files);
  assert.ok(divided.length > 1, 'a list this long divided into one batch, so the ceiling went unmeasured');
  assert.deepStrictEqual(divided.flat(), files);
});

test('no batch runs long enough for a shell to refuse it', () => {
  for (const batch of batches(fixed, many(400))) {
    assert.ok(cost(fixed) + cost(batch) <= BUDGET,
      `a batch costs ${cost(fixed) + cost(batch)} characters, past the ${BUDGET} ceiling`);
  }
});

// A SHORT LIST MUST STILL RUN. Dividing is the exception, not the shape.
test('a list that fits runs as one batch', () => {
  const files = many(3);
  assert.deepStrictEqual(batches(fixed, files), [files]);
});

// THE COLLISION. A single file longer than the whole budget cannot be divided away — it has to ride
// a batch of its own rather than vanish, because a dropped file reads as a file that passed.
test('a file on its own past the budget still rides a batch', () => {
  const huge = `/tmp/${'d'.repeat(BUDGET * 2)}.mem`;
  const divided = batches(fixed, [huge, ...many(2)]);
  assert.deepStrictEqual(divided.flat(), [huge, ...many(2)]);
  assert.deepStrictEqual(divided[0], [huge], 'the oversized file shared a batch, so the division read its cost as free');
});

test('an empty list divides into nothing to run', () => {
  assert.deepStrictEqual(batches(fixed, []), [[]]);
});
