#!/usr/bin/env node
// CONTRAST, not coverage — whether the reach a theme grants a construct bought the construct
// anything.
//
// `theme-paint` answers whether a theme's rule REACHES a scope. A rule can reach and paint the
// editor's own foreground, and then the token reads as ordinary prose however loudly the gauge
// agrees a theme found it. Derived over the 65 bundled themes: 1,191 of 11,756 foreground rules —
// one in ten — set the colour the editor already had, and `variable` is the single most-shipped such
// selector, with 18 of the 54 themes ruling on it leaving the colour exactly where it stood.
//
// So reach and legibility name two different questions, and every instrument in this house measured
// the first. Measured on the dev bench and reproduced here: `{{`, `[[`, a call's name and a widget's
// brackets read as body text in themes that all three coverage gauges called green.
//
// THE DISTANCE, NOT THE EQUALITY. Two hexes that differ in the last bit read as one colour to an
// eye, so the reading answers to CIE76 ΔE against the theme's own default, with the
// just-noticeable difference as the bar.
//
// ONE RESOLVER. Every foreground comes from `theme-model.js#styleOf`, the resolver
// `theme-collision.js` welds to vscode-textmate's own metadata at zero divergence. This file adds a
// DISTANCE and never a second resolution — `tools/invariants/one-implementation.test.js` guards that.
//
// DERIVED, NEVER LISTED. The readings come from every token the corpus builds, keyed by the scope
// STACK a reader meets, because a hand-written list of constructs cannot notice the one it missed —
// and a scope asked alone answers differently from the same scope inside a stack.
//
//   node tools/contrast-witness.js [--verbose]   the prose readings, and the rulings that explain them
//   node tools/contrast-witness.js --control     the instrument, collided
//   node tools/contrast-witness.js --must-fail   each theme answered against the NEXT theme's default

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { tokenizeFrom } = require('./tokenizer.js');
const { loadThemes, styleOf, probeTheme } = require('./theme-model.js');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'corpus', 'prose-reading-ledger.txt');
const verbose = process.argv.includes('--verbose');
const wantControl = process.argv.includes('--control');
const mustFail = process.argv.includes('--must-fail');

/** The grammar a carrier opens under, by the name it carries. */
const READINGS = { '.tw': 'text.html.tiddlywiki5', '.mem': 'text.html.tiddlywiki5.memetic-wikitext' };

// A token reading within this distance of the editor's own foreground reads as prose. CIE76 puts the
// just-noticeable difference near 2.3.
const JND = 2.3;

// HOW MANY THEMES MAY BUY NOTHING BEFORE A SCOPE OWES A RULING. A quarter of the bundled set.
//
// A handful of themes leaving one colour where the editor had it says more about those themes than
// about this grammar — measured, our widget's `<` reads as prose in 18 of 65 and the real `html`
// grammar's own `<` reads as prose in exactly 18 too, so a low count names a habit shared across
// every grammar a theme author has met. A quarter is where the reading stops being a habit: above it,
// a construct reads as body text to a reader picking a theme at random, and that wants a reason.
const BAR = 16;

/** sRGB hex to linear RGB. */
function linear(hex) {
  const n = String(hex || '').replace('#', '').padEnd(6, '0');
  const out = [];
  for (let i = 0; i < 6; i += 2) {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    out.push(c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  }
  return out;
}

/** Linear RGB to CIE XYZ, sRGB primaries, D65. */
function xyz([r, g, b]) {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041
  ];
}

const D65 = [0.95047, 1.0, 1.08883];
const pivot = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);

/** A hex colour in CIE L*a*b*. */
function lab(hex) {
  const [X, Y, Z] = xyz(linear(hex));
  const fx = pivot(X / D65[0]);
  const fy = pivot(Y / D65[1]);
  const fz = pivot(Z / D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 ΔE between two hex colours. */
function deltaE(a, b) {
  const A = lab(a);
  const B = lab(b);
  return Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2);
}

/**
 * How one stack reads under one theme.
 *
 * `reached` and `prose` answer SEPARATELY, and the pair is the whole point: a rule that wins and
 * paints the default reads `reached` with `prose`, where a scope no rule reaches reads `prose`
 * alone. A gauge fusing those two reports the second as the first and cures the wrong construct.
 *
 * @param {string[]} stack
 * @param {object} theme  the theme resolving the colour
 * @param {object} against  the theme whose default the distance answers to
 */
function reads(stack, theme, against) {
  const style = styleOf(stack, theme);
  const base = (against.defaults ?? style).foreground;
  const dE = deltaE(style.foreground, base);
  return { reached: Boolean(style.selector), prose: dE < JND, dE, foreground: style.foreground, base };
}

/** Every carrier the corpus holds, with the grammar it opens under. */
function carriers() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const scope = READINGS[path.extname(entry.name)];
      if (scope) out.push({ file, scope });
    }
  };
  walk(path.join(ROOT, 'corpus'));
  return out;
}

/** The rulings the ledger carries: a stack's innermost scope, and the reason it reads as prose. */
function rulings() {
  if (!fs.existsSync(LEDGER)) return [];
  const out = [];
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [scope, ...rest] = line.split('#');
    const reason = rest.join('#').trim();
    if (scope.trim() && reason) out.push({ scope: scope.trim(), reason });
  }
  return out;
}

/**
 * Every distinct scope stack the corpus builds, with how many tokens carry it and where.
 *
 * Keying by the STACK rather than the innermost scope keeps the reading honest: the same innermost
 * name resolves differently behind different ancestors, and a theme ruling on an ancestor decides
 * the colour of both.
 */
async function stacks() {
  const tally = new Map();
  for (const { file, scope } of carriers()) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const { tokens } = await tokenizeFrom(scope, lines);
    tokens.forEach((row, i) => {
      for (const t of row) {
        const text = lines[i].slice(t.startIndex, t.endIndex);
        if (!text.trim()) continue;
        // A token carrying only a grammar's root scope stands outside every rule this repo wrote.
        const stack = t.scopes;
        if (stack.length < 2) continue;
        const key = stack.join(' ');
        const seen = tally.get(key) || { stack, tokens: 0, where: new Set(), sample: text };
        seen.tokens += 1;
        seen.where.add(`${path.basename(file)}:${i + 1}`);
        tally.set(key, seen);
      }
    });
  }
  return [...tally.values()];
}

/**
 * THE CONTROL. Each arm kills one measured lie by construction, and the gate refuses to report a
 * number without them.
 */
function control(themes) {
  const faults = [];
  const stack = ['text.html.tiddlywiki5', 'meta.probe.tiddlywiki5', 'keyword.probe.tiddlywiki5'];
  const editor = { foreground: '#c0c0c0', background: '#101010' };

  // ARM 1 — a rule setting only a BACKGROUND changes no foreground, so the distance must stay at
  // zero. A gauge reading the background reports this as a loud construct.
  const bg = probeTheme('keyword.probe', { background: '#ff0000' }, editor);
  const bgRead = reads(stack, bg, bg);
  if (bgRead.dE >= JND) faults.push(`background-only: a background rule moved the distance to ${bgRead.dE.toFixed(2)}`);

  // ARM 2 — a rule setting a FOREGROUND far from the default must move the distance well past the
  // just-noticeable difference, or the instrument cannot see a real paint at all.
  const fg = probeTheme('keyword.probe', { foreground: '#ff0000' }, editor);
  const fgRead = reads(stack, fg, fg);
  if (fgRead.dE <= JND) faults.push(`foreground-only: a red rule against grey read only ${fgRead.dE.toFixed(2)}`);

  // ARM 3 — THE TWO FAULTS MUST PART. A rule painting EXACTLY the editor's foreground reads reached
  // AND prose; a scope no rule names reads prose without reaching. Fusing them names the wrong cure.
  const same = probeTheme('keyword.probe', { foreground: editor.foreground }, editor);
  const invisible = reads(stack, same, same);
  const unreached = reads(['text.html.tiddlywiki5', 'meta.probe.tiddlywiki5', 'nothing.rules.this'], same, same);
  if (!(invisible.reached && invisible.prose)) faults.push('reached and invisible: a rule painting the default failed to read as both');
  if (unreached.reached || !unreached.prose) faults.push('reached and invisible: an unreached scope failed to read as prose alone');

  // ARM 4 — the bundled themes must really carry a default to answer against, or every distance
  // above measures against a fallback nobody ships.
  const without = themes.filter((t) => !t.defaults || !t.defaults.foreground);
  if (without.length) faults.push(`${without.length} bundled theme(s) carry no default foreground to measure against`);

  console.log(`  background-only   ΔE ${bgRead.dE.toFixed(2)}  (wants < ${JND})`);
  console.log(`  foreground-only   ΔE ${fgRead.dE.toFixed(2)}  (wants > ${JND})`);
  console.log(`  reached and invisible   reached=${invisible.reached} prose=${invisible.prose}`
    + `   vs unreached   reached=${unreached.reached} prose=${unreached.prose}`);
  console.log(`  ${themes.length} theme(s) carrying a default foreground: ${themes.length - without.length}`);
  console.log(`contrast-witness  ${faults.length} fault(s) in the instrument`);
  for (const f of faults) console.error(`  ${f}`);
  return faults.length;
}

module.exports = { deltaE, lab, reads, JND, BAR, stacks, rulings, carriers };

if (require.main !== module) return;

(async () => {
  const themes = loadThemes().filter((t) => t.defaults && t.defaults.foreground);
  if (!themes.length) {
    console.error('  no bundled theme carries a default foreground, so no distance can be measured');
    process.exitCode = 2;
    return;
  }
  if (wantControl) { process.exitCode = control(themes) === 0 ? 0 : 1; return; }

  const found = await stacks();
  const ruled = rulings();

  // THE GRAIN. A stack is the honest unit to RESOLVE — a theme ruling on an ancestor decides the
  // colour of every stack under it — and the wrong unit to RULE: the same innermost name appears
  // behind many ancestors, and a ledger per stack ran to 733 entries that differ by nothing a reader
  // could act on. So the reading resolves per stack and reports per innermost SCOPE, which is the
  // name a fork would change.
  const byScope = new Map();
  for (const entry of found) {
    const inner = entry.stack[entry.stack.length - 1];
    // A scope belonging to another grammar answers for that grammar. An embedded JavaScript run
    // reads however its own authors named it, and no fork here moves it.
    if (!/\.(tiddlywiki5|memetic-wikitext)$/.test(inner)) continue;
    // THE MISPAIRED ARM answers for one theme while reading the NEXT theme's default, which breaks
    // the pairing every distance here rests on. A count that survives that proves nothing.
    const invisible = new Set();
    const dark = new Set();
    themes.forEach((theme, i) => {
      const against = mustFail ? themes[(i + 1) % themes.length] : theme;
      const r = reads(entry.stack, theme, against);
      if (r.prose && r.reached) invisible.add(theme.name ?? i);
      if (r.prose && !r.reached) dark.add(theme.name ?? i);
    });
    const seen = byScope.get(inner)
      || { inner, tokens: 0, where: new Set(), sample: entry.sample, invisible: new Set(), dark: new Set() };
    seen.tokens += entry.tokens;
    for (const w of entry.where) seen.where.add(w);
    for (const t of invisible) seen.invisible.add(t);
    for (const t of dark) seen.dark.add(t);
    byScope.set(inner, seen);
  }

  // REACHED AND INVISIBLE is the reading no other gate can see: a theme's rule won and left the
  // colour exactly where ordinary prose has it, so every coverage gauge reports the construct found.
  // A scope no rule reaches reads as prose too, and `dark-construct` already rules that class.
  const rows = [...byScope.values()].map((r) => ({
    ...r, prose: r.invisible.size + r.dark.size, reachedAndInvisible: r.invisible.size
  }));

  const loud = rows.filter((r) => r.reachedAndInvisible > BAR);
  const unruled = loud.filter((r) => !ruled.some((d) => r.inner === d.scope || r.inner.startsWith(`${d.scope}.`)));
  const idle = ruled.filter((d) => !loud.some((r) => r.inner === d.scope || r.inner.startsWith(`${d.scope}.`)));

  if (verbose) {
    for (const r of [...rows].sort((a, b) => (b.reachedAndInvisible - a.reachedAndInvisible) || (b.tokens - a.tokens)).slice(0, 26)) {
      console.log(`  ${String(r.reachedAndInvisible).padStart(2)}/${themes.length} reached-and-invisible`
        + `  ${String(r.dark.size).padStart(2)} unreached  ${String(r.tokens).padStart(4)} tok  ${r.inner}`);
      console.log(`            ${JSON.stringify(r.sample).slice(0, 40)}  ${[...r.where][0]}`);
    }
  }

  // THE MISPAIRED ARM ANSWERS ONE QUESTION ONLY: does the count move. Its readings answer for one
  // theme against another theme's default, so every ruling in the ledger reads idle by construction —
  // reporting that as ledger drift would make the arm fail for the reason it exists.
  if (mustFail) {
    console.log(`contrast-witness  ${rows.length} stack(s) over ${themes.length} theme(s), `
      + `${rows.reduce((sum, r) => sum + r.reachedAndInvisible, 0)} prose reading(s), `
      + `${loud.length} above the bar of ${BAR}, mispaired`);
    process.exitCode = 0;
    return;
  }

  for (const r of unruled) {
    console.error(`  a reading nobody explained: ${r.inner} — a rule wins and buys nothing in`
      + ` ${r.reachedAndInvisible}/${themes.length} theme(s), ${r.tokens} token(s), e.g. ${[...r.where][0]}`);
  }
  for (const d of idle) console.error(`  a ruling explaining nothing: ${d.scope} — no reading under it buys nothing`);

  const proseReadings = rows.reduce((sum, r) => sum + r.reachedAndInvisible, 0);
  console.log(`contrast-witness  ${rows.length} stack(s) over ${themes.length} theme(s), ${proseReadings} prose reading(s), `
    + `${loud.length} above the bar of ${BAR}, ${unruled.length} unruled, ${idle.length} explaining nothing`);
  process.exitCode = unruled.length || idle.length ? 1 : 0;
  return;
})();
