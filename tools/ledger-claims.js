#!/usr/bin/env node
// A ruling's numbers, answering to the measurement they came from.
//
// Every ledger here rules something and cites what it measured. The SCOPE a ruling names stands audited
// already: each ledger's own gate refuses a ruling explaining nothing and a reading nobody explained. The
// NUMBERS stood audited by nobody — and a citation that drifts turns a ruling into a lie a reader has no
// way to catch. Measured in this house: one ruling claimed no truthful family escaped the `variable` root,
// a single derivation refuted it, and nothing went red, because the claim had never been checkable.
//
// SO A LOAD-BEARING NUMBER CARRIES A MACHINE-READABLE TWIN. The prose stays prose; beside it a `# checks:`
// line states the same claim in a form an instrument can answer:
//
//   # checks: family <selector> rules-on >= 50, quiet >= 15
//   # checks: prose <scope> themes >= 40
//   # checks: paint <scope> themes <= 6
//
// `family` answers from `family-atlas` — how many bundled themes rule on a selector, and how many of those
// set the colour the editor already had. `prose` answers from `contrast-witness` over the corpus — how many
// themes leave a scope reading as ordinary prose. A claim naming a family nothing rules on, or a scope no
// carrier builds, REFUSES rather than passing on an absent row.
//
//   node tools/ledger-claims.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'corpus');
const verbose = process.argv.includes('--verbose');

/** A comparison a claim may state, and how to read it. */
const OPS = {
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '==': (a, b) => a === b
};

/**
 * Every claim the ledgers state, parsed from their `# checks:` lines.
 *
 * @returns {{file: string, line: number, kind: string, selector?: string, scope?: string, bounds: [string, string, number][]}[]}
 */
function claimsIn(dir = CORPUS) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.txt')) continue;
    const file = path.join(dir, entry.name);
    fs.readFileSync(file, 'utf8').split('\n').forEach((raw, i) => {
      const m = /^#\s*checks:\s*(\S+)\s+(\S+)\s+(.*)$/.exec(raw.trim());
      if (!m) return;
      const [, kind, subject, rest] = m;
      const bounds = [];
      for (const part of rest.split(',')) {
        const b = /^\s*([a-z-]+)\s*(>=|<=|==|>|<)\s*(\d+)\s*$/.exec(part);
        if (b) bounds.push([b[1], b[2], Number(b[3])]);
      }
      out.push({ file: path.basename(file), line: i + 1, kind, ...(kind === 'family' ? { selector: subject } : { scope: subject }), bounds });
    });
  }
  return out;
}

/**
 * Whether one claim holds, and what the measurement actually reads.
 *
 * @param {{kind: string, selector?: string, scope?: string, bounds: [string, string, number][]}} claim
 * @returns {Promise<{holds: boolean, reading: string}>}
 */
async function judge(claim) {
  if (!claim.bounds || !claim.bounds.length) return { holds: false, reading: 'the claim states no bound to check' };
  if (claim.kind === 'family') {
    const { atlas } = require('./family-atlas.js');
    const row = atlas().find((r) => r.selector === claim.selector);
    // A FAMILY NOTHING RULES ON HAS NO ROW, and an absent row is not a satisfied claim.
    if (!row) return { holds: false, reading: `no bundled theme rules on ${claim.selector}` };
    const measured = { 'rules-on': row.themes, quiet: row.quiet };
    return verdict(claim, measured);
  }
  if (claim.kind === 'paint') {
    // A PAINT CLAIM ANSWERS FOR ANY SCOPE A THEME MIGHT RULE ON, ours or a flagship grammar's — which is
    // what the strongest rulings here cite: that markdown's own `markup.superscript` measures the paint
    // rate ours does, so the silence belongs to the vocabulary rather than to this grammar. It asks the
    // scope ALONE, because a citation about another grammar's name carries no stack of ours to hand over.
    const { loadThemes: themesOf, paintRate } = require('./theme-paint.js');
    const themes = themesOf();
    if (!themes.length) return { holds: false, reading: 'no bundled theme stands to measure against' };
    const { painted, total } = paintRate(claim.scope, themes);
    const measured = { themes: painted.length, of: total };
    // A SCOPE NO THEME PAINTS reads zero, and a claim wanting one or more refuses on it rather than
    // passing on an absent reading — the same law the family kind holds.
    return verdict(claim, measured);
  }
  if (claim.kind === 'prose') {
    const { loadThemes } = require('./theme-model.js');
    const { reads, stacks } = require('./contrast-witness.js');
    const themes = loadThemes().filter((t) => t.defaults && t.defaults.foreground);
    const corpus = await stacks();
    const carrying = corpus.filter((e) => e.stack.some((sc) => sc === `${claim.scope}.tiddlywiki5`
      || sc.startsWith(`${claim.scope}.`)));
    if (!carrying.length) return { holds: false, reading: `no carrier builds ${claim.scope}` };
    const quiet = themes.filter((t) => carrying.some((e) => reads(e.stack, t, t).prose)).length;
    return verdict(claim, { themes: quiet });
  }
  return { holds: false, reading: `no instrument answers a \`${claim.kind}\` claim` };
}

/** The claim's bounds against what the instrument read. */
function verdict(claim, measured) {
  const parts = [];
  let holds = true;
  for (const [name, op, want] of claim.bounds) {
    const got = measured[name];
    if (got === undefined) { holds = false; parts.push(`${name} names nothing this instrument reads`); continue; }
    if (!OPS[op](got, want)) holds = false;
    parts.push(`${name} ${got} (wants ${op} ${want})`);
  }
  return { holds, reading: parts.join(', ') };
}

module.exports = { claimsIn, judge };

if (require.main !== module) return;

(async () => {
  const claims = claimsIn();
  const ledgers = new Set(claims.map((c) => c.file));
  const broken = [];
  for (const claim of claims) {
    const { holds, reading } = await judge(claim);
    if (!holds) broken.push(`${claim.file}:${claim.line} — ${claim.kind} ${claim.selector || claim.scope}: ${reading}`);
    else if (verbose) console.log(`  holds  ${claim.file}:${claim.line}  ${claim.kind} ${claim.selector || claim.scope}: ${reading}`);
  }
  for (const b of broken) console.error(`  a ruling citing a reading that moved: ${b}`);
  console.log(`ledger-claims  ${claims.length} claim(s) across ${ledgers.size} ledger(s), ${broken.length} that no longer hold`);
  process.exitCode = broken.length ? 1 : 0;
})();
