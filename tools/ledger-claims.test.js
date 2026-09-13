// A ruling's numbers answer to the measurement they came from.
//
// Every ledger in this corpus rules something and cites what it measured: a family at 54 themes with 18
// leaving the colour alone, a pair parting in four, a construct reading prose in 63 of 65. The SCOPE each
// ruling names stands audited already — its own gate refuses a ruling explaining nothing, and refuses a
// reading nobody explained. The NUMBERS stand audited by nobody, and a citation that drifts turns a
// ruling into a lie a reader has no way to catch.
//
// Measured: one ruling in this house claimed no truthful family escaped the `variable` root, and a single
// derivation refuted it — the claim had never been checkable, so nothing went red when it stopped being
// true.
//
// So a load-bearing number carries a machine-readable twin. `# checks:` lines state the claim in a form
// the atlas and the contrast reading can answer, and this refuses a claim whose measurement moved.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { claimsIn, judge } = require('./ledger-claims.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('every claim a ledger states holds against its own measurement', live, () => {
  const { code, out } = runTool('ledger-claims.js');
  assert.match(out, /ledger-claims\s+\d+ claim\(s\) across \d+ ledger\(s\)/, out.slice(-900));
  assert.match(out, /0 that no longer hold/, out.slice(-900));
  assert.strictEqual(code, 0, out.slice(-900));
});

test('the ledgers carry claims to check at all', () => {
  const found = claimsIn();
  assert.ok(found.length >= 3,
    `${found.length} claim(s) across the ledgers — a checker with nothing to check reads clean forever`);
  for (const claim of found) {
    assert.ok(claim.kind, `a claim with no kind: ${JSON.stringify(claim)}`);
    assert.ok(claim.file, `a claim naming no ledger: ${JSON.stringify(claim)}`);
  }
});

// THE CONTROL: a claim stating something false must be REFUSED, or the checker agrees with anything.
test('a claim that reads false stands refused', live, async () => {
  const honest = await judge({ kind: 'family', selector: 'variable', bounds: [['rules-on', '>=', 50], ['quiet', '>=', 15]] });
  assert.strictEqual(honest.holds, true, `the checker refused a claim this house measured twice: ${honest.reading}`);
  const broken = await judge({ kind: 'family', selector: 'variable', bounds: [['quiet', '>=', 60]] });
  assert.strictEqual(broken.holds, false,
    'the checker agreed that 60 of 65 themes leave `variable` alone, which no reading supports');
  // AND A CLAIM ABOUT A FAMILY NOTHING RULES ON must refuse rather than pass on an absent row.
  const absent = await judge({ kind: 'family', selector: 'nothing.rules.this.family', bounds: [['rules-on', '>=', 1]] });
  assert.strictEqual(absent.holds, false, 'a family no theme rules on read as holding its claim');
});

// AND THE OTHER KIND: a construct's prose reading over the corpus, which the contrast witness measures.
test('a prose claim answers to the corpus', live, async () => {
  const held = await judge({ kind: 'prose', scope: 'markup.superscript', bounds: [['themes', '>=', 40]] });
  assert.strictEqual(held.holds, true, `the checker refused a reading the ledger rules: ${held.reading}`);
  const broken = await judge({ kind: 'prose', scope: 'markup.superscript', bounds: [['themes', '<=', 2]] });
  assert.strictEqual(broken.holds, false, 'the checker agreed a construct reading prose in 63 themes reads prose in 2');
});
