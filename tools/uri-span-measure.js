#!/usr/bin/env node
// Scout instrument (throwaway): measures the resolved style of each named span of the sample
// `lar:`/`ni:`/`https:` line, across every bundled theme, for the URI-palette options under
// discussion. Not part of the shipped gate set.
//
//   node tools/uri-span-measure.js > /tmp/uri-measure-<label>.json

'use strict';

const { loadThemesByName, styleOf } = require('./theme-model.js');
const { tokenizeFrom } = require('./tokenizer.js');

const DIALECT = 'text.html.tiddlywiki5.memetic-wikitext';
const LINE = 'A lar:///ha.ka.ba/lares/api/pono?k=v#frag and ni:///sha-256;abc123 and https://example.com/a here.';

// Named spans, by [start,end) into LINE, fixed by inspection of the tokenizer output. These
// offsets do not move across the options below (none of them changes the regex's match length).
const SPANS = {
  'lar.scheme':        [2, 8],    // "lar://"
  'lar.sep.pre-root':  [8, 9],    // "/" before the root segment
  'lar.root.heading':  [9, 11],   // "ha"
  'lar.root.dot1':     [11, 12],  // "."
  'lar.root.angle':    [12, 14],  // "ka"
  'lar.root.dot2':     [14, 15],  // "."
  'lar.root.dynamic':  [15, 17],  // "ba"
  'lar.sep.post-root': [17, 18],  // "/" after the root segment
  'lar.path.lares':    [18, 23],
  'lar.sep.path1':      [23, 24],
  'lar.path.api':       [24, 27],
  'lar.sep.path2':      [27, 28],
  'lar.path.pono':      [28, 32],
  'lar.query.mark':     [32, 33],
  'lar.query.key':      [33, 34],
  'lar.query.assign':   [34, 35],
  'lar.query.value':    [35, 36],
  'lar.frag.mark':      [36, 37],
  'lar.frag.name':      [37, 41],
  'ni.scheme':          [46, 48],
  'ni.colon':           [48, 49],
  'ni.slash1':          [49, 50],
  'ni.slash2':          [50, 51],
  'ni.slash3':          [51, 52],
  'ni.algorithm':       [52, 59],
  'ni.checksum.sep':    [59, 60],
  'ni.checksum.digest': [60, 66],
  'https.scheme':       [71, 79],
  'https.body':         [79, 92],
};

function stackAt(tokens, at) {
  const token = tokens.find((t) => at >= t.startIndex && at < t.endIndex);
  if (!token) throw new Error(`no token covers offset ${at}`);
  return token.scopes;
}

async function main() {
  const { tokens } = await tokenizeFrom(DIALECT, [LINE]);
  const row = tokens[0];
  const spanStacks = {};
  for (const [name, [start]] of Object.entries(SPANS)) {
    spanStacks[name] = stackAt(row, start);
  }
  const themes = loadThemesByName();
  const out = { line: LINE, spans: {}, themeCount: themes.size };
  for (const [name, stack] of Object.entries(spanStacks)) {
    const perTheme = {};
    for (const [tname, theme] of themes) {
      const s = styleOf(stack, theme);
      perTheme[tname] = { fg: s.foreground || null, fs: s.fontStyle || null, isDefault: s.foreground === theme.defaults.foreground };
    }
    out.spans[name] = { stack, perTheme };
  }
  process.stdout.write(JSON.stringify(out));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
