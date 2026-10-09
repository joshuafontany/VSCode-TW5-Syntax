#!/usr/bin/env node
// What the six `jdinhlife.gruvbox` themes read, beside the bundled 65 — REPORTED, never ratcheted.
//
// The operator's ruling stands in two parts and this tool answers to both. The earlier ruling —
// floors stay on the bundled set — never moves: this file writes no floor, seats nothing in
// `corpus/`, and touches no existing gate's assertion. The later ruling — the gruvbox six get
// measured and reported beside the 65 — is what this prints. A reader comparing the two columns
// below judges for themselves; nothing here fails the build over what a comparator reads.
//
// TWO READINGS, EACH BORROWED FROM THE GATE THAT ALREADY OWNS THE JUDGMENT, NEVER RE-DERIVED:
//   - `family-atlas.js`'s `atlas(themes)` answers how many themes rule on a selector and how many
//     of those leave the colour where the editor already had it. Parameterised by the themes it
//     reads, so this hands it the gruvbox six exactly as `family-atlas.js` itself hands it the
//     bundled 65 — one deciding half, two populations.
//   - `construct-legibility.js`'s `look()` answers how one theme paints a token's foreground and
//     fontStyle together; `CONSTRUCTS`/`PROSE` name the specimens. `pairsApart()` itself is NOT
//     reused — it is hardwired to `loadThemesByName()` — so this file tokenizes the same specimens
//     once (`tokenizer.js`'s own `tokenize`, the gate's own dependency) and calls the gate's own
//     `look()` over both populations, which is the one piece of judgment that must never fork.
//
// A MACHINE CARRYING NEITHER EXTENSION NOR OVERRIDE READS SKIP, NAMED, EXIT 0 — the house's own
// runtime-degrade convention (`recovery-witness.js`, `tools/gate-report.js`'s `SELF_SKIP`). This
// is not a gate (`tools/gate-report.js`'s `NOT_A_GATE` excludes it, ruled in `CIGates.tid` under
// `notGates`) precisely because a comparator population standing absent on a machine answers no
// question CI could hold a build to — the bundled-65 gates already carry every floor that matters.
//
//   node tools/gruvbox-report.js [--verbose]

'use strict';

const { loadThemes, loadThemesByName } = require('./theme-model.js');
const { loadGruvboxThemes } = require('./gruvbox-model.js');
const { atlas } = require('./family-atlas.js');
const { look, CONSTRUCTS, PROSE } = require('./construct-legibility.js');
const { tokenize } = require('./tokenizer.js');

const verbose = process.argv.includes('--verbose');

/** The `apart` reading for every construct against prose, over ONE population of themes. */
async function apartFromProse(themes, specimensTokenized) {
  const proseLooks = themes.map((t) => look(specimensTokenized.__prose, t));
  const out = {};
  for (const [rule, tokens] of Object.entries(specimensTokenized)) {
    if (rule === '__prose') continue;
    const looks = themes.map((t) => look(tokens, t));
    out[rule] = looks.filter((l, i) => l !== proseLooks[i]).length;
  }
  return out;
}

(async () => {
  const gruvbox = loadGruvboxThemes();
  if (!gruvbox.available) {
    console.log(`gruvbox-report  SKIP — ${gruvbox.reason}`);
    process.exitCode = 0;
    return;
  }

  const bundled = loadThemes();
  if (!bundled.length) {
    console.error('  no bundled themes — run npm install');
    process.exitCode = 2;
    return;
  }

  // ONE TOKENIZATION, SHARED BY BOTH POPULATIONS. The construct's own scopes never depend on which
  // themes read them, so tokenizing once and painting it twice is the same specimen read against
  // two panels rather than two different specimens — which is what a caller re-tokenizing per
  // population would risk drifting into without anyone noticing.
  const specimens = { ...CONSTRUCTS, __prose: PROSE };
  const tokenized = {};
  for (const [rule, [, source]] of Object.entries(specimens)) {
    tokenized[rule] = (await tokenize('text.html.tiddlywiki5', source)).flat();
  }

  const bundledApart = await apartFromProse(bundled, tokenized);
  const gruvboxApart = await apartFromProse(gruvbox.themes, tokenized);

  const names = Object.keys(CONSTRUCTS);
  const weakestBundled = names.reduce((a, b) => (bundledApart[b] < bundledApart[a] ? b : a));
  const weakestGruvbox = names.reduce((a, b) => (gruvboxApart[b] < gruvboxApart[a] ? b : a));

  // family-atlas's OWN reading of `variable`, the selector its own header comment names as the
  // worst-ratio family in the bundled set, over both populations — the same `atlas()` the
  // `family-atlas` gate itself calls with no argument to mean "the bundled 65".
  const bundledRows = atlas(bundled);
  const gruvboxRows = atlas(gruvbox.themes);
  const bundledVariable = bundledRows.find((r) => r.selector === 'variable');
  const gruvboxVariable = gruvboxRows.find((r) => r.selector === 'variable');

  if (verbose) {
    console.log(`  construct                  bundled/65   gruvbox/${gruvbox.themes.length}`);
    for (const rule of [...names].sort((a, b) => bundledApart[a] - bundledApart[b])) {
      console.log(`  ${CONSTRUCTS[rule][0].padEnd(26)}${String(`${bundledApart[rule]}/65`).padStart(10)}` +
        `${String(`${gruvboxApart[rule]}/${gruvbox.themes.length}`).padStart(14)}`);
    }
    console.log('');
    console.log(`  family 'variable'           bundled/65   gruvbox/${gruvbox.themes.length}`);
    console.log(`  rules on it                ${String(`${bundledVariable ? bundledVariable.themes : 0}/65`).padStart(10)}` +
      `${String(`${gruvboxVariable ? gruvboxVariable.themes : 0}/${gruvbox.themes.length}`).padStart(14)}`);
    console.log(`  leaves it where it was     ${String(`${bundledVariable ? bundledVariable.quiet : 0}/65`).padStart(10)}` +
      `${String(`${gruvboxVariable ? gruvboxVariable.quiet : 0}/${gruvbox.themes.length}`).padStart(14)}`);
  }

  // NO VERDICT TO HOLD. The comparator population reports beside the bundled one; nothing here
  // turns a gruvbox reading into a failing build, however the two columns compare — that is the
  // standing ruling this tool exists to keep, not merely state.
  console.log(`gruvbox-report  ${gruvbox.themes.length} of 6 gruvbox theme(s) read (${gruvbox.names.join(', ')}), `
    + `weakest construct vs prose: bundled ${CONSTRUCTS[weakestBundled][0]} ${bundledApart[weakestBundled]}/65, `
    + `gruvbox ${CONSTRUCTS[weakestGruvbox][0]} ${gruvboxApart[weakestGruvbox]}/${gruvbox.themes.length}; `
    + `'variable' rules-on bundled ${bundledVariable ? bundledVariable.themes : 0}/65 quiet ${bundledVariable ? bundledVariable.quiet : 0}, `
    + `gruvbox ${gruvboxVariable ? gruvboxVariable.themes : 0}/${gruvbox.themes.length} quiet ${gruvboxVariable ? gruvboxVariable.quiet : 0} `
    + `— reported, no floor`);
  process.exitCode = 0;
})();
