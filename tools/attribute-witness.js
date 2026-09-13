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
  process.exitCode = 2;
  return;
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
      // THE VALUE'S WHOLE SPAN, never one position inside it. A kind region need not cover every
      // character of a value — a filtered value carries operators and operands under its own
      // scopes, and a probe reading a single point lands inside one of those and reports the kind
      // it found there. The kind stands wherever it stands.
      const [line, column] = place(from);
      const [lastLine, lastColumn] = place(Math.max(from, attribute.end - 1));
      let named = null;
      // The WHOLE scope chain, not the kind alone. A disagreement keys to the structure that
      // produced it, and that structure names itself in the outer scopes — a raw span, an
      // embedded stylesheet, a macro-call parameter region left open — never in the kind word.
      let chain = '';
      for (let row = line; row <= lastLine && !named; row += 1) {
        for (const token of lines[row] ?? []) {
          if (row === line && token.endIndex <= column) continue;
          if (row === lastLine && token.startIndex > lastColumn) continue;
          if (!chain) chain = token.scopes.join(' ');
          const kind = token.scopes.filter((s) => ANY_KIND.test(s)).slice(-1)[0];
          if (kind && KINDS[attribute.type] && KINDS[attribute.type].test(kind)) { named = kind; chain = token.scopes.join(' '); break; }
          if (kind && !named) { named = kind; chain = token.scopes.join(' '); }
        }
      }
      // The nearest call opener standing before the value, and the START TAG that carries it.
      // A `<` opening a call is not a tag opener: reading the nearest `<` of any shape put the
      // opener inside a `<<macro>>` value on the line above, and the two attributes after it then
      // keyed to nothing while the tag they sit in spans a blank line.
      const opener = text.lastIndexOf('<<', attribute.start);
      let tagOpen = -1;
      for (let i = attribute.start; i >= 0; i -= 1) {
        if (text[i] !== '<' || text[i - 1] === '<' || text[i + 1] === '<') continue;
        if (!/[A-Za-z$/]/.test(text[i + 1] ?? '')) continue;
        tagOpen = i;
        break;
      }
      read += 1;
      counts.set(attribute.type, (counts.get(attribute.type) ?? 0) + 1);
      if (!KINDS[attribute.type]) continue;
      if (named && KINDS[attribute.type].test(named)) continue;
      disagreements.push({
        type: attribute.type,
        named: named ?? '(no kind named)',
        // A VALUELESS ATTRIBUTE CARRIES NO VALUE TO NAME A KIND OVER. TiddlyWiki types a bare
        // `allowfullscreen` as a string and SYNTHESISES the value "true", and the span it hands
        // back covers the attribute's NAME. Naming that span a string would paint the name as its
        // own value, so the two readings part here by construction rather than by defect.
        //
        // The absence of an `=` does NOT name this class. A positional macro parameter carries no
        // separator either and its whole span IS its value — `<<.from-version "5.2.0">>` places one
        // named `0` — so reading the separator alone counted 29 where 17 stand. The span standing
        // equal to the attribute's own name is what says the source holds no value.
        valueless: text.slice(attribute.start, attribute.end).trim() === attribute.name,
        text: text.slice(attribute.start, attribute.end).trim().slice(0, 52),
        chain,
        value: text.slice(from, attribute.end).trim(),
        quadOpener: opener > 1 && text.slice(opener - 2, opener) === '<<',
        blankLineTag: tagOpen >= 0 && /\n[ \t]*\n/.test(text.slice(tagOpen, attribute.end)),
        file: path.relative(host, file)
      });
    }
  }

  // WHAT PRODUCED EACH DISAGREEMENT, keyed by the structure rather than by the file it sits in.
  // Every class here answers a question the two readings ask differently, and each key states the
  // shape a fix would have to reach. A disagreement matching no key stands UNCLASSIFIED and fails
  // the gate: a residue counted but unpartitioned hides a class that grew behind a class that
  // shrank, and the total holds while the grammar moves underneath it.
  //
  // The ladder reads in order and the first key wins, so a structural cause outranks the kind
  // word it produced. Reading the kind word first put five disagreements under a "neighbouring
  // kind" heading that had nothing in common: two sat inside a raw span, two inside a start tag
  // broken across a blank line, and one inside a parameter region no `\end` could close.
  const CLASSES = [
    ['an attribute carrying no value in the source', (d) => d.valueless],
    ['inside a backtick raw span the grammar paired against the host', (d) => /markup\.raw\.inline/.test(d.chain)],
    ['inside an embedded stylesheet the grammar hands to CSS', (d) => /source\.css/.test(d.chain)],
    ['a call opening on `<<<<`', (d) => d.quadOpener],
    ['a triple-quoted macro parameter', (d) => d.value.startsWith('"""')],
    ['inside a macro-call parameter region the grammar never closed', (d) => /meta\.variable\.call\.parameter/.test(d.chain)],
    ['a start tag broken across a blank line', (d) => d.blankLineTag]
  ];
  const classed = new Map(CLASSES.map(([name]) => [name, 0]));
  const unclassified = [];
  for (const d of disagreements) {
    const hit = CLASSES.find(([, holds]) => holds(d));
    if (hit) classed.set(hit[0], classed.get(hit[0]) + 1);
    else unclassified.push(d);
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
    const valueless = disagreements.filter((d) => d.valueless).length;
    console.log(`  ${valueless} of ${disagreements.length} disagreement(s) stand on an attribute carrying NO value in the source`);
    for (const d of disagreements) {
      console.log(`     ${d.valueless ? 'bare  ' : 'valued'} ${d.type.padEnd(12)} ${d.named.padEnd(42)} ${JSON.stringify(d.text)}  ${d.file}`);
    }
  }
  if (disagreements.length > ceiling) {
    console.error(`  ${disagreements.length} attribute(s) read a kind other than the one TiddlyWiki assigned, above the ceiling of ${ceiling}`);
    for (const d of disagreements.slice(0, 6)) {
      console.error(`     ${d.type} read as ${d.named} — ${JSON.stringify(d.text)} in ${d.file}`);
    }
  }
  for (const [name, n] of classed) if (n || verbose) console.log(`  ${String(n).padStart(4)}  ${name}`);
  for (const d of unclassified) {
    console.error(`  UNCLASSIFIED  ${d.type} read as ${d.named} — ${JSON.stringify(d.text)} in ${d.file}`);
    console.error(`                ${d.chain}`);
  }
  console.log(`  ${disagreements.length} disagreement(s) across ${[...classed.values()].filter(Boolean).length} named class(es), ${unclassified.length} unclassified`);
  console.log(`attribute-witness  ${read} attribute(s) across ${counts.size} type(s), `
    + `${read - disagreements.length} reading the kind TiddlyWiki assigned (ceiling ${ceiling})`);
  process.exitCode = untyped.length === 0 && unclassified.length === 0 && disagreements.length <= ceiling ? 0 : 1;
  return;
})();
