// The cut corpus, and the two ways a reading off it goes wrong.
//
// TiddlyWiki's own tiddlers carry the best-formed wikitext in existence — written by people who
// know the parser, in house style, to document the parser. A learner writes from the other end of
// that distribution, and a grammar measured only against the first end reports coverage it has
// not earned.
//
// `overreach-check --truncate` cuts every specimen short at a seeded offset to manufacture that
// other end: an opener with no close, a table missing its last row, a macro body cut mid-parameter.
// Both sides read the same bytes, so the verdict law holds — but two readings of the result stand
// wrong, and each one flatters the grammar:
//
//   THE CUT'S OWN REFUSAL. A construct whose close lies past the cut refuses for that reason
//   alone. Reading that as over-reach would demand an editor go dark on every keystroke a
//   construct takes to type. Truncation takes a PREFIX, so an offset means the same in both
//   texts: the whole tiddler answers whether the cut carries the entire reason.
//
//   THE STORED BODY. TiddlyWiki stores a macro body verbatim and never parses it, so the parser rules on
//   nothing inside it. Reading "not plain text" there as "the construct works" lets the cut
//   explain a span nothing ever examined — 377 of 519 spans at seed 1, three quarters of the
//   result. The check carries the same opaque law `review` holds, so a stored body answers
//   neither question here either.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TW5 = path.resolve(ROOT, '..', 'TiddlyWiki5');
const have = require('node:fs').existsSync(TW5);
const live = { skip: have ? false : 'no TiddlyWiki checkout beside the extension' };

/** One degraded run, as the gate invokes it. */
function cutRun(seed) {
  const out = execFileSync(
    'node',
    [
      './tools/overreach-check.js', '--corpus', '400',
      '--exclude=editions/test/tiddlers/tests/data',
      '--exclude=editions/text-slicer',
      '--expected=corpus/expected-divergence.txt',
      `--truncate=${seed}`
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const num = (re) => Number((out.match(re) || [])[1]);
  return {
    out,
    cut: num(/(\d+)\s+span\(s\) the cut alone refused/),
    stored: num(/(\d+)\s+span\(s\) the uncut tiddler STORES/),
    overreach: num(/(\d+)\s+span\(s\) the grammar CLAIMS/)
  };
}

test('a cut corpus reads as cut', { ...live, timeout: 600000 }, () => {
  const r = cutRun(1);
  // The run must actually degrade. A cut that changed nothing would report the well-formed
  // numbers and pass this file while measuring nothing.
  assert.ok(r.cut > 0, `no span answered to the cut — the corpus came through whole:\n${r.out}`);
  assert.ok(r.stored > 0, 'no stored-body span — the opaque law had nothing to hold');
});

test('no claim stands over text the whole tiddler also refuses', { ...live, timeout: 600000 }, () => {
  const r = cutRun(1);
  assert.strictEqual(
    r.overreach,
    0,
    `${r.overreach} span(s) over-reach on cut ground, and the whole tiddler refuses there too:\n${r.out}`
  );
});
