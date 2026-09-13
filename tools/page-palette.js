#!/usr/bin/env node
// How many colours a whole PAGE of wikitext spends.
//
// Every colour measurement this house made reads one construct at a time. Ware's ceiling does not:
//
//   "We can only use between six and twelve color codes reliably. This results partly from contrast
//   effects that can alter the appearance of colors."
//
// The mechanism is contrast effects and colour-category confusion, and both act across a SCREEN
// rather than across a bracket pair. ColorBrewer's shipped qualitative maxima agree from an
// independent direction — Dark2/Set2/Accent/Pastel2 cap at 8, Set1/Pastel1 at 9, Set3/Paired at 12,
// and Paired holds six light/dark pairs rather than twelve categories.
//
// So this counts DISTINCT foregrounds over a whole page, per theme, and says where one crosses 12.
//
// IT REPORTS AND NEVER RATCHETS. A page's colour count belongs to the theme at least as much as to
// the grammar — a theme ruling on twenty families spends twenty colours on text this grammar names
// once — and a gate that re-seats every time an honest name changes teaches a reader to re-seat it.
// A corpus file exercises constructs on purpose and reads louder than a page anybody writes, which
// is why the host's own tiddlers stand in the reading beside it.
//
//   node tools/page-palette.js [--verbose] [--top=N]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { loadThemesByName, styleOf } = require('./theme-model.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');
const { parseTid } = require('./wiki-data.js');

const verbose = process.argv.includes('--verbose');
const top = Number((process.argv.find((a) => a.startsWith('--top=')) || '--top=8').slice(6));

// Ware's reliable band, and the far edge of it. A page below the low end asks nothing of a reader;
// a page past the high end asks for a distinction the eye does not reliably make.
const CEILING = 12;

/** Every page the reading stands over: the corpus, and pages the host itself writes. */
function pages() {
  const found = [];
  const corpus = path.join(ROOT, 'corpus', 'wikitext');
  if (fs.existsSync(corpus)) {
    for (const f of fs.readdirSync(corpus).filter((x) => x.endsWith('.tw')).sort()) {
      found.push({ name: `corpus/${f}`, kind: 'corpus', text: fs.readFileSync(path.join(corpus, f), 'utf8') });
    }
  }
  // A HOST TIDDLER, because a corpus is not a page. The corpus exercises constructs on purpose and
  // reads louder than anything a writer writes; the host's own documentation reads as prose that
  // happens to carry constructs, which is the text a reader actually meets.
  let host;
  try { host = resolveTiddlyWiki(); } catch { host = null; }
  if (host) {
    const docs = path.join(host, 'editions', 'tw5.com', 'tiddlers');
    const walk = (dir, depth) => {
      if (depth > 2 || !fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, depth + 1); continue; }
        if (!entry.name.endsWith('.tid') || found.filter((p) => p.kind === 'host').length >= 40) continue;
        const { fields, body } = parseTid(fs.readFileSync(full, 'utf8'));
        if (fields.type && fields.type !== 'text/vnd.tiddlywiki') continue;
        if (body.split('\n').length < 20) continue;
        found.push({ name: `host/${entry.name}`, kind: 'host', text: body });
      }
    };
    walk(docs, 0);
  }
  return found;
}

(async () => {
  const themes = [...loadThemesByName().entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const reading = pages();
  if (!themes.length || !reading.length) {
    console.error(`  ${themes.length} theme(s) and ${reading.length} page(s) — nothing to count`);
    process.exitCode = 2;
    return;
  }

  const perPage = [];
  const perTheme = new Map();
  for (const page of reading) {
    const tokens = (await tokenize('text.html.tiddlywiki5', page.text)).flat()
      .filter((t) => page.text.slice(t.startIndex, t.endIndex).trim());
    const counts = themes.map(([name, theme]) => {
      const n = new Set(tokens.map((t) => styleOf(t.scopes, theme).foreground)).size;
      perTheme.set(name, (perTheme.get(name) || []).concat(n));
      return n;
    });
    const sorted = [...counts].sort((a, b) => a - b);
    perPage.push({
      name: page.name, kind: page.kind, tokens: tokens.length,
      low: sorted[0], median: sorted[Math.floor(sorted.length / 2)], high: sorted[sorted.length - 1],
      over: counts.filter((n) => n > CEILING).length
    });
  }

  const byKind = (kind) => perPage.filter((p) => p.kind === kind);
  const share = (rows) => {
    const over = rows.reduce((a, p) => a + p.over, 0);
    return { over, of: rows.length * themes.length };
  };

  if (verbose) {
    for (const p of [...perPage].sort((a, b) => b.median - a.median).slice(0, top)) {
      console.log(`  ${String(p.median).padStart(3)} median  ${String(p.low).padStart(3)}–${String(p.high).padEnd(3)}  `
        + `${String(p.over).padStart(2)}/${themes.length} themes past ${CEILING}  ${p.name} (${p.tokens} tokens)`);
    }
    console.log('  themes spending the most, by median over every page:');
    const medians = [...perTheme].map(([name, counts]) => {
      const s = [...counts].sort((a, b) => a - b);
      return [name, s[Math.floor(s.length / 2)]];
    }).sort((a, b) => b[1] - a[1]);
    for (const [name, n] of medians.slice(0, top)) console.log(`    ${String(n).padStart(3)}  ${name}`);
    for (const [name, n] of medians.slice(-3)) console.log(`    ${String(n).padStart(3)}  ${name}`);
  }

  for (const kind of ['corpus', 'host']) {
    const rows = byKind(kind);
    if (!rows.length) continue;
    const { over, of } = share(rows);
    const medians = rows.map((p) => p.median).sort((a, b) => a - b);
    console.log(`page-palette  ${kind}: ${rows.length} page(s) over ${themes.length} themes, `
      + `median ${medians[Math.floor(medians.length / 2)]} colour(s) a page, `
      + `${over}/${of} readings past ${CEILING} (${(over * 100 / of).toFixed(0)}%)`);
  }
})();
