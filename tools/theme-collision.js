#!/usr/bin/env node
// The ruler, collided against the engine that paints.
//
// Every colour number this repository carries rests on `theme-model.js`. Nothing here ever asked
// `vscode-textmate` what it actually paints, so a defect in the model reads as a finding about the
// grammar, and four gates repeat it in one voice.
//
// THE ENGINE ANSWERS. A registry takes the rule list VS Code hands it, `tokenizeLine2` encodes the
// style it resolved into a token's metadata, and `getColorMap` names the colour behind the index.
// Whatever the engine says stands; the model stands wrong until it agrees.
//
//   foreground index   (metadata >>> 15) & 0x1FF
//   fontStyle bits     (metadata >>> 11) & 0xF
//
// Both offsets stand SETTLED rather than assumed, by the control below: a theme carrying exactly one
// rule paints one known scope one unmistakable colour, and the reading holds only where that index
// lands at that offset and at no other. Two earlier readings of this field named the BACKGROUND and
// an offset that looked right on one specimen.
//
// THE TRAP THIS GATE EXISTS TO CLOSE. A token no rule reaches takes the editor's own foreground, and
// a harness that lets the engine fall through to one default while the model falls through to
// another reports the gap between two defaults as a grammar finding. `engineTheme` builds the
// engine's rule list from the same reading `styleOf` falls through to, so both sides answer to one
// default by construction.
//
//   node tools/theme-collision.js [--verbose] [--themes=a,b] [--must-fail]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, grammarRegistry } = require('./tokenizer.js');
const { loadThemesByName, styleOf, engineTheme, probeTheme } = require('./theme-model.js');

const verbose = process.argv.includes('--verbose');
const only = (process.argv.find((a) => a.startsWith('--themes=')) || '').slice(9).split(',').filter(Boolean);
// COLLIDE THE INSTRUMENT. A comparison of a value against itself reads green forever, and the wiring
// that would do it — one theme reaching both sides through one variable — looks identical to the
// wiring that does not. Under this flag the engine paints theme N while the model answers for theme
// N+1, and the gate passes only where it goes RED.
const mustFail = process.argv.includes('--must-fail');

const CORPUS = path.join(ROOT, 'corpus', 'wikitext');
const SCOPE = 'text.html.tiddlywiki5';

/** The foreground the engine resolved, by the index it encoded. */
const engineForeground = (metadata, colourMap) => colourMap[(metadata >>> 15) & 0x1FF];

// The engine encodes a fontStyle as bits; the model spells it the way a theme writes it.
const STYLE_BITS = [[1, 'italic'], [2, 'bold'], [4, 'underline'], [8, 'strikethrough']];
const engineFontStyle = (metadata) => {
  const bits = (metadata >>> 11) & 0xF;
  const named = STYLE_BITS.filter(([bit]) => bits & bit).map(([, name]) => name).sort().join(' ');
  return named || null;
};

/** The metadata `tokenizeLine2` gave the run a position falls in. */
function metadataAt(encoded, index) {
  let found = encoded[1];
  for (let i = 0; i < encoded.length; i += 2) {
    if (encoded[i] > index) break;
    found = encoded[i + 1];
  }
  return found;
}

/**
 * Every token of a text, with the style the engine resolved and the style the model resolves.
 *
 * @param {object} grammar
 * @param {string[]} lines
 * @param {string[]} colourMap
 * @param {object} theme  the model
 */
function readThrough(grammar, lines, colourMap, theme) {
  const read = [];
  let stack = null;
  for (const line of lines) {
    const named = grammar.tokenizeLine(line, stack);
    const encoded = grammar.tokenizeLine2(line, stack);
    stack = named.ruleStack;
    for (const token of named.tokens) {
      const text = line.slice(token.startIndex, token.endIndex);
      // Whitespace carries no ink, so a foreground on it names nothing a reader meets.
      if (!text.trim()) continue;
      const metadata = metadataAt(encoded.tokens, token.startIndex);
      read.push({
        text,
        scopes: token.scopes,
        engine: { foreground: engineForeground(metadata, colourMap), fontStyle: engineFontStyle(metadata) },
        model: styleOf(token.scopes, theme)
      });
    }
  }
  return read;
}

/**
 * THE CONTROL. One theme, one rule, one unmistakable colour.
 *
 * A collision that cannot pass proves nothing, and a collision that cannot fail proves less. This
 * settles both offsets and both directions: the bold run must land the target colour and the prose
 * beside it must land the default, on BOTH sides.
 */
async function control(grammar) {
  const theme = probeTheme('markup.bold', { foreground: '#FF00FF', fontStyle: 'bold italic' });
  const registry = grammarRegistry();
  registry.setTheme(engineTheme(theme));
  const colourMap = registry.getColorMap();
  const read = readThrough(grammar, ["A ''bold run'' here."], colourMap, theme);
  const faults = [];
  const bold = read.find((t) => t.text === 'bold run');
  const prose = read.find((t) => t.text.trim() === 'here.');
  if (!bold || !prose) return ['the control specimen tokenized to neither a bold run nor prose beside it'];
  for (const [what, token, foreground, fontStyle] of [
    ['the bold run', bold, '#FF00FF', 'bold italic'], ['the prose beside it', prose, '#010203', null]]) {
    for (const side of ['engine', 'model']) {
      if (token[side].foreground !== foreground) {
        faults.push(`control: ${what} read ${token[side].foreground} through the ${side}, against ${foreground}`);
      }
      if ((token[side].fontStyle || null) !== fontStyle) {
        faults.push(`control: ${what} read ${JSON.stringify(token[side].fontStyle)} through the ${side}, against ${JSON.stringify(fontStyle)}`);
      }
    }
  }
  // THE OFFSET, SETTLED RATHER THAN ASSUMED: the target index must land at 15 and at no other offset.
  const encoded = grammar.tokenizeLine2("A ''bold run'' here.", null).tokens;
  const target = colourMap.findIndex((c) => c === '#FF00FF');
  const metadata = metadataAt(encoded, 4);
  const offsets = [];
  for (let off = 0; off <= 24; off++) if (((metadata >>> off) & 0x1FF) === target) offsets.push(off);
  if (offsets.join(',') !== '15') {
    faults.push(`control: the foreground index landed at offset(s) ${offsets.join(',') || 'none'}, against 15 alone`);
  }
  return faults;
}

(async () => {
  const registry = grammarRegistry();
  const grammar = await registry.loadGrammar(SCOPE);
  if (!grammar) {
    console.error('  no grammar stands under', SCOPE);
    process.exitCode = 2;
    return;
  }

  const faults = await control(grammar);
  for (const fault of faults) console.error(`  ${fault}`);

  const specimens = fs.existsSync(CORPUS)
    ? fs.readdirSync(CORPUS).filter((f) => f.endsWith('.tw')).sort()
      .map((f) => ({ name: f, lines: fs.readFileSync(path.join(CORPUS, f), 'utf8').split('\n') }))
    : [];
  const themes = [...loadThemesByName().entries()]
    .filter(([name]) => !only.length || only.includes(name))
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!themes.length || !specimens.length) {
    console.error(`  ${themes.length} theme(s) and ${specimens.length} specimen(s) — nothing to collide`);
    process.exitCode = 2;
    return;
  }

  let readings = 0;
  const parted = new Map();
  const samples = [];
  for (const [index, [name, theme]] of themes.entries()) {
    const painted = mustFail ? themes[(index + 1) % themes.length][1] : theme;
    registry.setTheme(engineTheme(painted));
    const colourMap = registry.getColorMap();
    for (const specimen of specimens) {
      for (const token of readThrough(grammar, specimen.lines, colourMap, theme)) {
        readings += 1;
        if (token.engine.foreground === token.model.foreground
          && token.engine.fontStyle === token.model.fontStyle) continue;
        const inner = token.scopes[token.scopes.length - 1];
        parted.set(inner, (parted.get(inner) || 0) + 1);
        if (samples.length < 20) {
          samples.push(`${name} · ${specimen.name} · ${JSON.stringify(token.text)} · ${inner}\n`
            + `      engine ${token.engine.foreground}/${token.engine.fontStyle}`
            + `   model ${token.model.foreground}/${token.model.fontStyle} via ${token.model.selector || '(the editor default)'}`);
        }
      }
    }
  }
  const diverged = [...parted.values()].reduce((a, b) => a + b, 0);

  // PER SCOPE, NEVER ONLY IN AGGREGATE. A residue concentrated in one scope names a different
  // defect from the same residue spread evenly, and an aggregate cannot tell them apart.
  if (diverged || verbose) {
    for (const [scope, n] of [...parted].sort((a, b) => b[1] - a[1])) {
      console.error(`  ${String(n).padStart(6)}  ${scope}`);
    }
    for (const sample of samples) console.error(`  ${sample}`);
  }
  console.log(`theme-collision  ${readings} token-reading(s) over ${themes.length} themes and ${specimens.length} specimens, `
    + `${diverged} where the model parts from the engine (${(diverged * 100 / readings).toFixed(2)}%)`
    + `, ${faults.length} control fault(s)${mustFail ? ' — under --must-fail, where divergence stands REQUIRED' : ''}`);
  if (mustFail) { process.exitCode = diverged > 0 ? 0 : 1; return; }
  process.exitCode = diverged === 0 && faults.length === 0 ? 0 : 1;
  return;
})();
