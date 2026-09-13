#!/usr/bin/env node
// The vocabulary a grammar may choose from, derived from the themes people actually use.
//
// Every naming fork in this grammar arrived as a hand-listed candidate set — four or five families
// somebody thought of, measured across the bundled themes, the loudest kept. A hand-written list
// cannot notice the family it missed, and the families that matter rest on no opinion: they are the
// selectors the 65 bundled themes rule on, with the reach each one carries and the share of that reach
// that buys a construct nothing.
//
// TWO NUMBERS DECIDE A FAMILY.
//   `themes` — how many themes rule on the selector at all. Reach.
//   `quiet`  — how many of those set the colour the editor already had. A rule that wins and changes
//              nothing, so a reader meets ordinary prose. `variable` carries the worst ratio in the
//              bundled set, which is why every `variable.*` name in this grammar reads as prose to a
//              third of readers.
//
// A DESIGN-TIME READING. It ships nothing: the package declares no runtime and
// `tools/invariants/ships-no-runtime.test.js` holds that. The atlas answers at the bench, where a
// naming choice gets made.
//
//   node tools/family-atlas.js                    every selector, worst ratio first
//   node tools/family-atlas.js --loud             families worth reaching for: broad reach, little quiet
//   node tools/family-atlas.js --like <prefix>    the families under one root
//   node tools/family-atlas.js --for <scope> [--candidates a,b]
//                                                 what a candidate BUYS and what it COSTS, grammar untouched
//
// The deciding halves — `atlas`, `leaveAlone` — stand under test in tools/family-atlas.test.js.

'use strict';

const { loadThemes } = require('./theme-model.js');

/** How many themes ruling on a row's selector leave the colour where the editor had it. */
const leaveAlone = (row) => row.quiet;

/**
 * Every selector the themes rule on, with its reach and its quiet share.
 *
 * A SELECTOR COUNTS ONCE PER THEME, however many rules a theme writes for it — a theme listing
 * `variable` in three rules rules on it once as far as a reader is concerned.
 *
 * THE QUIET TEST READS THE FOREGROUND THE RULE SETS, never the colour a whole stack resolves to. A
 * stack answers a different question, which `tools/contrast-witness.js` asks; here the question stands
 * at the rule itself: does this rule, on its own terms, move the colour off the editor's default.
 *
 * @param {object[]} [themes]  the themes to read, or the bundled set
 * @returns {{selector: string, themes: number, quiet: number, ratio: number}[]}
 */
function atlas(themes = loadThemes()) {
  const seen = new Map();
  for (const theme of themes) {
    const base = (theme.defaults?.foreground || '').toLowerCase();
    // One entry per selector per theme, so a theme writing three rules for one family counts once.
    const here = new Map();
    for (const rule of theme.rules || []) {
      const fore = (rule.settings?.foreground || '').toLowerCase();
      if (!fore) continue;
      for (const part of rule.parts || []) {
        // A DESCENDANT SELECTOR NAMES A PLACE, NOT A FAMILY. `meta.thing keyword.other` answers only
        // inside a `meta.thing`, so its last element alone would credit `keyword.other` with reach it
        // does not carry everywhere. The whole selector stands as written.
        if (!here.has(part)) here.set(part, fore);
      }
    }
    for (const [part, fore] of here) {
      const row = seen.get(part) || { selector: part, themes: 0, quiet: 0 };
      row.themes += 1;
      if (base && fore === base) row.quiet += 1;
      seen.set(part, row);
    }
  }
  return [...seen.values()]
    .map((r) => ({ ...r, ratio: r.themes ? r.quiet / r.themes : 0 }))
    .sort((a, b) => (b.ratio - a.ratio) || (b.themes - a.themes) || a.selector.localeCompare(b.selector));
}

/**
 * What appending a candidate to a published scope buys, and what it costs.
 *
 * BUYS reads over the corpus: how many themes reach the construct, and how many of those leave the
 * colour where the editor already had it. COSTS reads the declared distinctions the legibility gate
 * holds, under the same substitution — through that gate's OWN reading, so the price answers to the
 * same arithmetic that would refuse the fork afterward.
 *
 * THE GRAMMAR STAYS WHERE IT IS. The substitution lives in the reading, never on disk, so a candidate
 * costs one run instead of an edit, a sweep and a revert.
 *
 * @param {string} published  the scope a fork would stack a name beside
 * @param {string[]} candidates
 */
async function price(published, candidates) {
  const { reads } = require('./contrast-witness.js');
  const { stacks } = require('./contrast-witness.js');
  const { pairsApart } = require('./construct-legibility.js');
  const themes = loadThemes().filter((t) => t.defaults && t.defaults.foreground);
  const corpus = await stacks();
  const carrying = corpus.filter((e) => e.stack.some((sc) => sc === `${published}.tiddlywiki5`
    || sc.startsWith(`${published}.tiddlywiki5 `) || sc === published || sc.startsWith(`${published}.`)));
  // A CANDIDATE PRICED AGAINST NOTHING PRICES NOTHING. A published scope no carrier builds has no
  // reading to move, and saying so beats reporting a clean bill.
  const base = { seated: (await pairsApart()).seated };
  const before = await pairsApart();
  const rows = [];
  for (const candidate of candidates) {
    const buys = { reached: 0, invisible: 0 };
    for (const theme of themes) {
      let reached = false;
      let invisible = false;
      for (const entry of carrying) {
        const r = reads([...entry.stack, `${candidate}.tiddlywiki5`], theme, theme);
        if (r.reached) reached = true;
        if (r.reached && r.prose) invisible = true;
      }
      if (reached) buys.reached += 1;
      if (invisible) buys.invisible += 1;
    }
    const was = { reached: 0, invisible: 0 };
    for (const theme of themes) {
      let reached = false;
      let invisible = false;
      for (const entry of carrying) {
        const r = reads(entry.stack, theme, theme);
        if (r.reached) reached = true;
        if (r.reached && r.prose) invisible = true;
      }
      if (reached) was.reached += 1;
      if (invisible) was.invisible += 1;
    }
    const after = await pairsApart({ find: `${published}.tiddlywiki5`, append: `${candidate}.tiddlywiki5` });
    const now = new Map(after.readings);
    const falls = [];
    for (const [pair, apart] of before.readings) {
      const floor = base.seated.get(pair);
      const then = now.get(pair);
      if (floor === undefined || then === undefined) continue;
      if (then < floor && apart >= floor) falls.push(`${pair} — ${then}/${after.themes}, below the floor of ${floor}`);
      else if (then < apart) falls.push(`${pair} — ${apart} to ${then}, floor ${floor}`);
    }
    rows.push({ candidate, was, buys, falls, carriers: carrying.length });
  }
  return rows;
}

module.exports = { atlas, leaveAlone, price };

if (require.main !== module) return;

const args = process.argv.slice(2);
const loud = args.includes('--loud');
const likeAt = args.indexOf('--like');
const like = likeAt >= 0 ? args[likeAt + 1] : null;

const forAt = args.indexOf('--for');
const published = forAt >= 0 ? args[forAt + 1] : null;
const candAt = args.indexOf('--candidates');
const candidates = candAt >= 0 ? (args[candAt + 1] || '').split(',').filter(Boolean) : [];

if (published) {
  (async () => {
    if (!candidates.length) {
      console.error('  --for wants --candidates a,b to price against it');
      process.exitCode = 2;
      return;
    }
    const rows = await price(published, candidates);
    console.log(`  pricing ${published}, carried by ${rows[0].carriers} corpus stack(s)\n`);
    for (const r of rows) {
      console.log(`  + ${r.candidate}`);
      console.log(`      buys   ${r.was.reached} reached, ${r.was.invisible} invisible`
        + `  ->  ${r.buys.reached} reached, ${r.buys.invisible} invisible`);
      if (!r.falls.length) console.log('      costs  nothing the legibility floors hold');
      for (const f of r.falls) console.log(`      costs  ${f}`);
    }
    console.log(`family-atlas  ${rows.length} candidate(s) priced against ${published}, grammar untouched`);
    process.exitCode = 0;
  })();
  return;
}

const themes = loadThemes();
let rows = atlas(themes);
if (like) rows = rows.filter((r) => r.selector === like || r.selector.startsWith(`${like}.`));
// A family worth reaching for: most themes rule on it, and almost none of them leave it alone.
if (loud) rows = rows.filter((r) => r.themes >= themes.length / 2 && r.quiet <= 1)
  .sort((a, b) => (b.themes - a.themes) || a.selector.localeCompare(b.selector));

const shown = rows.slice(0, loud || like ? 40 : 26);
console.log(`  rules on  quiet  selector`);
for (const r of shown) {
  console.log(`  ${String(r.themes).padStart(8)}  ${String(r.quiet).padStart(5)}  ${r.selector}`);
}
if (rows.length > shown.length) console.log(`  … ${rows.length - shown.length} more`);
console.log(`family-atlas  ${rows.length} selector(s) across ${themes.length} theme(s)`
  + `${loud ? ', loud only' : ''}${like ? `, under ${like}` : ''}`);
process.exitCode = 0;
