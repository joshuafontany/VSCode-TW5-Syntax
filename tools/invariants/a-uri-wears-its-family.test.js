// Every URI scheme the dialect names wears the same enclosing family.
//
// A URI is one object: a reader meets an address, not a scheme beside a separator beside a digest.
// Every flagship grammar says so with an enclosing region — markdown wraps a link in
// `markup.underline.link.markdown`, and this grammar's own external links and `lar:` addresses wear
// `markup.underline.link.*` too. The parts inside may differ, and should: a `lar:` root paints its
// heading, angle and dynamic apart on purpose. What the enclosing family buys is the FLOOR — every
// separator and mark inside an address inherits a themed ancestor instead of falling to prose.
//
// Measured, one scheme stood without one: a block check's separators read as ordinary prose in 35 of
// 65 bundled themes — its `:`, its three `/`, its `;` — while the same marks inside a `lar:` address
// inherited the link family. The house writes 89 block checks.
//
// The schemes DERIVE from the grammar's own `keyword.other.scheme.*` names, so a scheme added
// tomorrow answers this the day it lands.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { tokenizeFrom } = require('../tokenizer.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DIALECT = 'text.html.tiddlywiki5.memetic-wikitext';
const live = { timeout: 300000 };

/** Every scheme the dialect names, taken from the scope that names one. */
function schemes() {
  const text = fs.readFileSync(path.join(ROOT, 'syntaxes', 'memetic-wikitext.json'), 'utf8');
  const out = new Set();
  for (const m of text.matchAll(/keyword\.other\.scheme\.([a-z0-9-]+)\.memetic-wikitext/g)) out.add(m[1]);
  return [...out].sort();
}

// One address per scheme, written the way the house writes it.
const ADDRESS = {
  lar: 'lar:///a.b.c',
  ni: 'ni:///sha-256;abc123def'
};

test('every scheme the dialect names carries an address to measure', () => {
  const unwritten = schemes().filter((s) => !ADDRESS[s]);
  assert.deepStrictEqual(unwritten, [],
    `the grammar names scheme(s) no address here exercises: ${unwritten.join(', ')}`);
});

test('every URI wears an enclosing family its marks can inherit', live, async () => {
  const failures = [];
  for (const scheme of schemes()) {
    const line = `A stamp ${ADDRESS[scheme]} here.`;
    const { tokens } = await tokenizeFrom(DIALECT, [line]);
    const inside = tokens[0].filter((t) => {
      const text = line.slice(t.startIndex, t.endIndex);
      return ADDRESS[scheme].includes(text) && text.trim() && !/^(A|stamp|here\.)$/.test(text);
    });
    assert.ok(inside.length > 2, `${scheme}: the address tokenized to ${inside.length} span(s)`);
    const bare = inside.filter((t) => !t.scopes.some((s) => /^markup\.underline\.link\./.test(s)));
    if (bare.length) {
      failures.push(`${scheme}: ${bare.length} of ${inside.length} span(s) wear no link family — `
        + bare.map((t) => JSON.stringify(line.slice(t.startIndex, t.endIndex))).join(' '));
    }
  }
  assert.deepStrictEqual(failures, [], failures.join('\n  '));
});
