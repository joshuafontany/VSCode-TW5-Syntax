// Whether the reach a theme grants a construct BOUGHT the construct anything.
//
// A theme resolves a rule and paints a colour; nothing says that colour differs from the one
// ordinary prose takes. Measured across the 65 bundled themes, 1,191 of 11,756 foreground rules —
// one in ten — paint the editor's own foreground, and `variable` is the most-shipped such selector,
// with 18 of the 54 themes ruling on it leaving the colour exactly where the editor had it. So a
// construct stands REACHED by every theme and reads as body text to every reader, and every gauge
// in this house measuring reach reports it green.
//
// This gate measures the DISTANCE instead: CIE76 ΔE between the foreground a token resolves to and
// the theme's own default. Under the just-noticeable difference the token reads as prose, whatever
// rule won.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the witness reports a prose reading over the corpus', live, () => {
  const { out, code } = runTool('contrast-witness.js');
  assert.match(out, /contrast-witness\s+\d+ stack\(s\)/, out.slice(-800));
  assert.strictEqual(code, 0, out.slice(-800));
});

// EVERY PROSE READING CARRIES A RULING, and a ruling naming nothing retires with what it explained.
// The same shape the recovery ledger holds: a gate whose ledger drifts stops measuring and says so.
test('every construct reading as prose carries a reason, and no reason stands idle', live, () => {
  const { out } = runTool('contrast-witness.js');
  assert.match(out, /0 unruled/, out.slice(-800));
  assert.match(out, /0 explaining nothing/, out.slice(-800));
});

// THE INSTRUMENT, COLLIDED. Four probe designs in this house have already lied about colour: one
// read BACKGROUND where it meant foreground, one scanned the wrong bit offset, one counted "no rule"
// as a divergence from "the default colour", and one asked a mid-stack scope on its own. Each arm
// below kills one of those by construction, and the gate refuses to report without them.
test('the control arms hold', live, () => {
  const { out, code } = runTool('contrast-witness.js', ['--control']);
  assert.strictEqual(code, 0, out.slice(-1200));
  assert.match(out, /background-only/, out.slice(-1200));
  assert.match(out, /foreground-only/, out.slice(-1200));
  // The arm that parts the two faults: a rule that paints EXACTLY the default reaches and reads
  // prose, where an unreached scope reads prose without reaching. A gauge fusing those reports the
  // second as the first and cures the wrong thing.
  assert.match(out, /reached and invisible/, out.slice(-1200));
  assert.match(out, /0 fault\(s\)/, out.slice(-1200));
});

// A MUST-FAIL ARM, because a prose count that cannot move proves nothing. Answering for one theme
// while reading the NEXT theme's default breaks the pairing the measurement rests on, and the count
// must collapse.
test('the reading collapses when a theme answers against another theme default', live, () => {
  const honest = runTool('contrast-witness.js').out;
  const broken = runTool('contrast-witness.js', ['--must-fail']).out;
  const count = (o) => Number(/(\d+) prose reading\(s\)/.exec(o)?.[1] ?? -1);
  assert.ok(count(honest) > 0, honest.slice(-400));
  assert.ok(count(broken) >= 0, broken.slice(-400));
  assert.ok(count(broken) < count(honest),
    `the mispaired arm read ${count(broken)} against the honest ${count(honest)}, so the pairing carries no weight`);
});

// THE COLLISION. A ruling stands for a reading above the bar, so a ruling naming a scope no reading
// leaves quiet must read idle and the gate must refuse. Planted into a sandbox rather than the tree,
// because a gate proven only by a clean working tree answers whether the tree stands clean today.
test('a ruling explaining nothing turns the gate red', live, () => {
  const { code, out } = runInSandbox((sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'prose-reading-ledger.txt');
    fs.appendFileSync(ledger, '\nkeyword.operator.filter               # a reading no theme leaves quiet\n');
  }, ['tools/contrast-witness.js']);
  assert.match(out, /explaining nothing/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'an idle ruling stood and the gate held anyway');
});

// The ledger lives beside the other corpus ledgers, never inside the tool.
//
// A LEDGER NAMING NOTHING STATES A MEASUREMENT. A ruling stands here for a construct reading as body
// text ABOVE the bar, so an empty ledger says every construct clears it — which the witness's own
// summary must then report, or the emptiness names a ledger somebody trimmed rather than a corpus
// that moved.
test('the ruling ledger stands in the corpus, and its silence answers to the witness', () => {
  const ledger = path.join(ROOT, 'corpus', 'prose-reading-ledger.txt');
  assert.ok(fs.existsSync(ledger), 'no prose-reading ledger stands in corpus/');
  const text = fs.readFileSync(ledger, 'utf8');
  const rulings = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (rulings.length) return;
  const honest = runTool('contrast-witness.js', []).out;
  assert.match(honest, /0 above the bar of \d+/,
    'the ledger rules nothing while the witness reads a construct above the bar');
  assert.match(honest, /0 unruled/, 'the ledger rules nothing while the witness names an unruled reading');
});
