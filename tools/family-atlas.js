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

module.exports = { atlas, leaveAlone };

if (require.main !== module) return;

const args = process.argv.slice(2);
const loud = args.includes('--loud');
const likeAt = args.indexOf('--like');
const like = likeAt >= 0 ? args[likeAt + 1] : null;

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
