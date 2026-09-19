#!/usr/bin/env node
// Filters, taken from the host that writes them.
//
// A grammar reads a filter run structurally: any word standing in operator position colours as an
// operator, and `:cascade` colours beside `:nosuchprefix`. That reading beats a name list — a
// release adding an operator needs no change here — and it hides its own failures, because a name
// the pattern cannot match simply reads as something else and nothing counts it.
//
// So the population comes from the host on three counts. Every operator and every run prefix
// TiddlyWiki registers stands in a filter and must read as one. And every filter string standing
// in TiddlyWiki's own tiddlers — attribute values and filtered transclusions alike — gets handed
// to TiddlyWiki's OWN compiler first: what it compiles, this grammar reads without a verdict.
//
// The compiler decides what counts as a filter, so no reading of the format written here can
// widen or narrow the population. A string TiddlyWiki refuses stands over: a grammar owes no
// reading to text the parser declines.
//
//   node tools/filter-witness.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { readData } = require('./wiki-data.js');

const verbose = process.argv.includes('--verbose');

/** Every `.tid` the host ships, wherever it keeps them. */
function tiddlers(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) tiddlers(file, out);
    else if (entry.name.endsWith('.tid')) out.push(file);
  }
  return out;
}

// Where an author writes a filter: a widget's `filter` attribute, and a filtered transclusion.
// Both spellings come from the parser's own rules — filteredtranscludeblock matches `{{{…}}}`,
// and every list-like widget declares a filter attribute — so neither reads as a guess.
const IN_ATTRIBUTE = /filter=(?:"([^"\n]{3,120})"|'([^'\n]{3,120})')/g;
const IN_TRANSCLUSION = /\{\{\{\s*([^\n}]{3,120}?)\s*\}\}\}/g;

const host = resolveTiddlyWiki();
if (!host) {
  console.error('  no TiddlyWiki stands where this looked — set TW5_PATH');
  process.exitCode = 2;
  return;
}
const oracle = boot(host, {});
const { data: signals } = readData('GrammarSignals.tid');

/** What the grammar names across one filter, standing where a filter stands. */
async function scopesOf(filter) {
  const line = `{{{ ${filter} }}}`;
  const [tokens] = await tokenize('text.html.tiddlywiki5', `${line}\n`);
  return { tokens: tokens ?? [], scopes: new Set((tokens ?? []).flatMap((t) => t.scopes)) };
}

(async () => {
  const unread = [];

  // ── every name the host registers, standing where its own kind stands ─────────────────────
  for (const operator of signals.filterOperators ?? []) {
    const { tokens } = await scopesOf(`[${operator}[x]]`);
    const at = 5 + operator.length - 1;
    const covering = tokens.find((t) => t.startIndex <= at && t.endIndex > at);
    if (!covering || !covering.scopes.some((s) => s.startsWith('keyword.operator'))) {
      unread.push([`operator ${operator}`, covering ? covering.scopes.slice(-1)[0] : '(nothing)']);
    }
  }
  for (const prefix of signals.filterRunPrefixes ?? []) {
    const { tokens } = await scopesOf(`[tag[x]] :${prefix}[all[]]`);
    const at = `{{{ [tag[x]] :`.length;
    const covering = tokens.find((t) => t.startIndex <= at && t.endIndex > at);
    if (!covering || !covering.scopes.some((s) => s.startsWith('storage.modifier.prefix'))) {
      unread.push([`prefix :${prefix}`, covering ? covering.scopes.slice(-1)[0] : '(nothing)']);
    }
  }

  // ── every filter the host itself writes ───────────────────────────────────────────────────
  const found = new Set();
  for (const file of tiddlers(path.join(host, 'core')).concat(tiddlers(path.join(host, 'editions/tw5.com/tiddlers')))) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const m of text.matchAll(IN_ATTRIBUTE)) found.add(m[1] ?? m[2]);
    for (const m of text.matchAll(IN_TRANSCLUSION)) found.add(m[1]);
  }
  const compiles = [...found].filter((f) => {
    try { oracle.$tw.wiki.compileFilter(f); return true; } catch { return false; }
  });
  for (const filter of compiles) {
    const { scopes } = await scopesOf(filter);
    const verdict = [...scopes].find((s) => s.startsWith('invalid.'));
    if (verdict) unread.push([filter.slice(0, 60), verdict]);
    else if (![...scopes].some((s) => s.startsWith('meta.filter'))) {
      unread.push([filter.slice(0, 60), '(carries no filter scope)']);
    }
  }

  if (verbose) {
    console.log(`  ${compiles.length} filter(s) from ${found.size} harvested string(s)`);
  }
  for (const [what, how] of unread.slice(0, 12)) {
    console.error(`  TiddlyWiki writes ${JSON.stringify(what)} and the grammar reads ${how}`);
  }
  console.log(`filter-witness  ${compiles.length} filter(s) TiddlyWiki compiles, `
    + `${(signals.filterOperators ?? []).length} operator(s), ${(signals.filterRunPrefixes ?? []).length} prefix(es), `
    + `${unread.length} unread`);
  process.exitCode = unread.length === 0 ? 0 : 1;
  return;
})();
