#!/usr/bin/env node
// The kind TiddlyWiki assigned to a value, and the kind this grammar names for the same span.
//
// parseutils.js declares what an attribute value may look like — a quoted or bare STRING, a text
// reference (INDIRECT), a FILTER, a MACRO call, a backtick SUBSTITUTION — and every rule that
// takes attributes reaches the same reader. This grammar spells all five again in its own
// patterns, and no gate here compared the two: a value read as one kind and parsed as another
// passes every one of them, because the scope exists, the corpus reaches it, and the block
// boundary holds while the reading still disagrees with the host.
//
// So the host decides both halves. `parseAttribute` writes a `type` on each attribute it places
// and an extent to go with it, so the population, the verdict and the span all come from
// TiddlyWiki, and this holds only the vocabulary — which kind word answers to which type.
//
// THE KIND WEARS A WORD, NEVER A POSITION. An attribute value stands several regions deep: the
// element, the attribute by its own name, the kind, and whatever the value itself carries. Read
// the outermost and every value answers `meta.attribute.class`; read the innermost and a filtered
// value answers with the operator inside its first run. The kind names itself, wherever it sits.
//
//   node tools/attribute-witness.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { parseTid } = require('./wiki-data.js');

const verbose = process.argv.includes('--verbose');
const CEILING = path.join(ROOT, 'corpus', 'attribute-kind-ceiling.txt');

// The kind word each type answers to. A type the host assigns and this map has no entry for
// fails outright: a hand-kept map goes stale by silence, and an absent entry would otherwise
// read as agreement.
const KINDS = {
  string: /^string\.(quoted|unquoted|other)\./,
  indirect: /^string\.text-reference\./,
  filtered: /^meta\.attribute\.filtered\./,
  macro: /^meta\.(variable\.macrocall|attribute\.mvv)/,
  substituted: /^text\.substituted\./
};
const ANY_KIND = new RegExp(Object.values(KINDS).map((r) => `(?:${r.source})`).join('|'));

const host = resolveTiddlyWiki();
if (!host) {
  console.error('  no TiddlyWiki stands where this looked — set TW5_PATH');
  process.exit(2);
}
const oracle = boot(host, {});

function tiddlers(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) tiddlers(file, out);
    else if (entry.name.endsWith('.tid')) out.push(file);
  }
  return out;
}

(async () => {
  const files = tiddlers(path.join(host, 'core'))
    .concat(tiddlers(path.join(host, 'editions/tw5.com/tiddlers')));
  const counts = new Map();
  const disagreements = [];
  let read = 0;

  for (const file of files) {
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const { fields, body } = parseTid(raw);
    // A tiddler declares the tongue its body speaks. Reading an HTML template or a stylesheet as
    // wikitext manufactures a disagreement out of a reading nobody asked either party for.
    if (fields.type && fields.type !== 'text/vnd.tiddlywiki') continue;
    const text = body;
    if (!text.trim() || text.split('\n').length > 200) continue;

    let placed;
    try {
      // Every placed attribute, by whether the host TYPED it — never by whether this map has a
      // word for that type. Selecting on the map drops the unknown type instead of reporting it,
      // and an entry missing from the vocabulary then reads as agreement.
      placed = flatten(oracle.parse(text).tree)
        .filter((n) => n.name !== undefined && typeof n.start === 'number' && typeof n.type === 'string');
    } catch { continue; }
    if (!placed.length) continue;

    let lines;
    try { lines = await tokenize('text.html.tiddlywiki5', text); } catch { continue; }
    const starts = [0];
    for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
    const place = (offset) => {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; }
      return [lo, offset - starts[lo]];
    };

    for (const attribute of placed) {
      // The span reads ` name=value`, so the value opens past the separator. A value crossing
      // lines wants a reading of its own and stands over rather than answering wrongly.
      const separator = text.indexOf('=', attribute.start);
      const from = separator >= 0 && separator < attribute.end ? separator + 1 : attribute.start;
      if (text.slice(from, attribute.end).includes('\n')) continue;
      const [line, column] = place(Math.min(attribute.end - 1, Math.max(from, (from + attribute.end) >> 1)));
      const token = (lines[line] ?? []).find((t) => t.startIndex <= column && t.endIndex > column);
      const named = token ? token.scopes.filter((s) => ANY_KIND.test(s)).slice(-1)[0] : null;
      read += 1;
      counts.set(attribute.type, (counts.get(attribute.type) ?? 0) + 1);
      if (!KINDS[attribute.type]) continue;
      if (named && KINDS[attribute.type].test(named)) continue;
      disagreements.push({
        type: attribute.type,
        named: named ?? '(no kind named)',
        text: text.slice(attribute.start, attribute.end).trim().slice(0, 52),
        file: path.basename(file)
      });
    }
  }

  const untyped = [...counts.keys()].filter((type) => !KINDS[type]);
  for (const type of untyped) {
    console.error(`  TiddlyWiki assigns a "${type}" attribute type this reading has no kind word for`);
  }

  const ceiling = fs.existsSync(CEILING)
    ? Number(fs.readFileSync(CEILING, 'utf8').split('\n')[0].trim()) : Infinity;

  if (verbose) {
    const byType = new Map();
    for (const d of disagreements) byType.set(d.type, (byType.get(d.type) ?? 0) + 1);
    for (const [type, n] of [...counts].sort()) {
      console.log(`  ${type.padEnd(12)} ${String(n).padStart(5)} read, ${String(byType.get(type) ?? 0).padStart(4)} reading another kind`);
    }
    for (const d of disagreements.slice(0, 12)) {
      console.log(`     ${d.type.padEnd(12)} ${d.named.padEnd(42)} ${JSON.stringify(d.text)}  ${d.file}`);
    }
  }
  if (disagreements.length > ceiling) {
    console.error(`  ${disagreements.length} attribute(s) read a kind other than the one TiddlyWiki assigned, above the ceiling of ${ceiling}`);
    for (const d of disagreements.slice(0, 6)) {
      console.error(`     ${d.type} read as ${d.named} — ${JSON.stringify(d.text)} in ${d.file}`);
    }
  }
  console.log(`attribute-witness  ${read} attribute(s) across ${counts.size} type(s), `
    + `${read - disagreements.length} reading the kind TiddlyWiki assigned (ceiling ${ceiling})`);
  process.exit(untyped.length === 0 && disagreements.length <= ceiling ? 0 : 1);
})();
