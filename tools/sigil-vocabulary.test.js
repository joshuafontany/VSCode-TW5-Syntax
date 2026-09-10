// The specimens must answer to the vocabulary the house writes, and the reading must be able to fail.
//
// A grammar can declare a rich vocabulary, reach every scope it declares, and never meet the form a
// carrier in the wild carries. Measured before this gate stood: the specimens wrote
// `<<~ hud Focus(10) Feedback(3)>>` and `<<~ syad 🏛️>>`, two forms the seed had already retired,
// while carrying NONE of `set`, `oracle`, `stance`, `carry`, `focus`, `drift-ward`, `frame` or
// `loops` — fourteen of eighteen unexercised.
//
//   node --test tools/sigil-vocabulary.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');

const SEED = path.resolve(ROOT, '..', 'bags', 'lares', 'ha.ka.ba', 'lares', 'api', 'noosphere-boot.mem');
const live = { skip: fs.existsSync(SEED) ? false : 'no boot seed stands beside this checkout', timeout: 600000 };

test('every sigil the seed writes stands in a specimen', live, () => {
  const { code, out } = runTool('sigil-vocabulary.js');
  assert.match(out, /\d+ sigil\(s\) the seed writes across \d+ specimen\(s\), 0 unexercised/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// A specimen carrying a sigil the seed never writes reads as a FINDING, never a fault: another
// carrier writes `hoike` and `kue`, `loulou` names a wikilink, and `unknown-sigil` stands as a
// deliberate control for a name the house never coined. The reading says which, and passes.
test('a sigil beyond the seed reads as a finding rather than a fault', live, () => {
  const { code, out } = runTool('sigil-vocabulary.js');
  assert.match(out, /carried beyond the seed/, out.slice(-400));
  assert.match(out, /a specimen carries `<<~ unknown-sigil`/, 'the deliberate control never surfaced');
  assert.strictEqual(code, 0, 'a sigil beyond the seed failed the gate, where it names a finding');
});

// The fault: the house starts writing a sigil and no specimen ever meets it.
test('a sigil the seed writes and no specimen carries fails the gate', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      // The seed stands OUTSIDE the sandbox, so the provocation moves the specimens instead: a
      // carrier that drops a form reads exactly as a seed that gained one.
      const file = path.join(sandbox, 'corpus', 'memetic', 'sigils.mem');
      const before = fs.readFileSync(file, 'utf8');
      const after = before.replace(/^<<~ oracle .*$/m, '');
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(file, after);
    },
    ['tools/sigil-vocabulary.js']);
  assert.match(out, /the seed writes `<<~ oracle` and no specimen carries it/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a sigil went unexercised and the gate held anyway');
});

// A NAME FOLLOWED BY AN ELLIPSIS NAMES NOTHING. The seed explains its own grammar in its own
// grammar — `<<~ name …>>` invokes `<<~name …>>` — and a reader taking that literally reads the
// metavariable `name` as a sigil the house writes, then demands a specimen invent one. It did.
test('a metavariable in the seed prose never reads as a sigil', live, () => {
  const { out } = runTool('sigil-vocabulary.js', ['--verbose']);
  const written = /written by the seed : (.*)/.exec(out);
  assert.ok(written, 'the reading names no vocabulary at all');
  assert.ok(!written[1].split(/\s+/).includes('name'),
    `the placeholder \`name\` reads as a sigil: ${written[1]}`);
  // And the real neighbours it stands between still read, so the cure cut nothing live.
  for (const real of ['node', 'oracle', 'loops']) {
    assert.ok(written[1].split(/\s+/).includes(real), `the cure dropped \`${real}\`, which the seed writes`);
  }
});

// A contributor holding only this checkout meets no seed. The reading says so and passes, rather
// than failing for a file that was never theirs to hold.
test('no seed beside the checkout reads as no vocabulary, and holds', live, () => {
  const { code, out } = runTool('sigil-vocabulary.js', [], { env: { LARES_SEED: '/nonexistent/seed.mem' } });
  // The env names a seed that stands nowhere; the resolver falls through to the sibling path, which
  // DOES stand here — so this asserts the resolver's own order rather than the absent branch.
  assert.match(out, /sigil-vocabulary /, out.slice(-300));
  assert.strictEqual(code, 0, out.slice(-300));
});
