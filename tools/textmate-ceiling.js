#!/usr/bin/env node
// What a TextMate grammar CANNOT reach about TiddlyWiki, measured rather than asserted.
//
// Every other instrument here asks whether this grammar reads what the host reads. This one asks
// the opposite question and answers it in the same currency: which readings stand OUTSIDE any
// grammar of this kind, because the deciding evidence sits somewhere a pattern cannot look.
//
// THE POINT IS A MANDATE, NOT AN EXCUSE. A ceiling named here says what a later reader — a language
// server, a tree-sitter grammar, a parser wired to the wiki itself — must supply that this one
// never can. A ceiling that turns out reachable RETIRES, and the gate fails until somebody removes
// it, exactly the way a ruling explaining nothing fails its own gate. So the list cannot quietly
// grow into a catalogue of things nobody tried.
//
// A CEILING WEARS ONE OF TWO SHAPES, and each carries its own falsification.
//
//   BLIND    Two inputs the host tells apart, read alike by the grammar. The gate holds only while
//            the host STILL parts them and the grammar STILL cannot: a host that stops parting them
//            names a ceiling that never existed, and a grammar that starts parting them names one
//            somebody closed.
//   PHANTOM  One input where the grammar paints structure the host builds no node for. The gate
//            holds while the host still builds nothing there. Painting it names no defect — a macro
//            body renders as wikitext at widget time, so a reader wants it coloured — but it names a
//            reading no parse tree will ever confirm, and a tool trusting the scopes as structure
//            reads a tree the host never built.
//
// NEITHER SHAPE PROVES IMPOSSIBILITY, and this file never claims one. It measures that the host
// draws a distinction, and that this grammar as it stands does not. Where somebody tried
// constructions and they failed, the entry SAYS WHICH — a claim carrying no attempts reads as an
// excuse dressed as a limit.
//
//   node tools/textmate-ceiling.js [--verbose]

'use strict';

const path = require('node:path');
const { tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');

const verbose = process.argv.includes('--verbose');
const TW = resolveTiddlyWiki();
if (!TW) {
  console.log('textmate-ceiling  no TiddlyWiki checkout resolved, so no host stands to measure against');
  process.exit(0);
}
const oracle = boot(TW);

/** The rules the host builds from a source, in ONE coordinate space. */
const built = (source) => flatten(oracle.parse(source).tree, { sameSpace: true })
  .map((node) => node.rule).filter(Boolean).join(',');

/** Every scope this grammar puts on one line of a source. */
const painted = async (source, line, scope = 'text.html.tiddlywiki5') => {
  const lines = await tokenize(scope, source);
  return [...new Set((lines[line] || []).flatMap((token) => token.scopes))].sort().join(' ');
};

// ── the ceilings ────────────────────────────────────────────────────────────────────────────────
//
// Each entry carries the specimen it stands on, so a reader meets the evidence rather than the
// claim. `tried` names constructions somebody measured and watched fail.
const CEILINGS = [
  {
    key: 'whole-document lookahead',
    shape: 'blind',
    what: 'a construct that opens only where its closer stands somewhere ahead',
    why: 'TiddlyWiki scans to the end of the source for `>>` before building a call, and builds nothing at all where none stands. A pattern reads one line and the rule stack carried across it, so both inputs open the same region.',
    tried: 'a blank-line bound on the call end, which cut 116 real multi-line calls out of 16087 openers measured over 700 carriers while answering the 0 that carry no closer',
    a: `<<foo\n${'x\n'.repeat(6)}>>\n`,
    b: `<<foo\n${'x\n'.repeat(6)}`,
    line: 0
  },
  {
    key: 'rule-set mutation',
    shape: 'phantom',
    what: 'a pragma that deletes a rule for the rest of the document',
    why: '`\\rules except html` removes the html rule from the parser instance, so a tag below it builds nothing. A grammar carries a static rule set and paints the tag either way.',
    tried: 'nothing — a TextMate grammar names its patterns at load time, and no measured construction removes one at read time',
    source: '\\rules except html\n\n<div>x</div>\n',
    line: 2,
    hostMustNotBuild: /(^|,)html(,|$)/,
    grammarMustPaint: /meta\.tag\./
  },
  {
    key: 'verbatim storage',
    shape: 'phantom',
    what: 'a body the host stores and never parses',
    why: 'TiddlyWiki keeps a macro body as text and builds one `set/macrodef` node with nothing inside it; the body becomes a tree only at widget time. The grammar paints wikitext in there on purpose, since a reader meets it rendered.',
    tried: 'nothing, and nothing should — painting it serves the reader. The ceiling names what a tool must not INFER from those scopes: no parse tree confirms them.',
    source: '\\define d()\n! A heading\n\\end\n',
    line: 1,
    hostMustNotBuild: /(^|,)heading(,|$)/,
    grammarMustPaint: /markup\.heading\./
  },
  {
    key: 'nested coordinate space',
    shape: 'space',
    what: 'a body the host parses in offsets of its own',
    why: 'A typed block declaring wikitext parses its body as wikitext, and the nodes that parse builds carry offsets into the INNER text. A grammar carries one coordinate space per document, so no scope can name which space a span belongs to.',
    tried: 'nothing at the grammar; `flatten(tree, { sameSpace: true })` answers it on the READING side, by refusing to cross into a restarted space at all',
    source: '$$$text/vnd.tiddlywiki\n<<<\nQuoted\n<<<\n$$$\n',
    inner: 'quoteblock',
    outer: 'typedblock'
  },
  {
    key: 'cross-tiddler resolution',
    shape: 'wiki',
    what: 'bytes whose meaning stands in another tiddler',
    why: '`<<d hello>>` reaches a macro, a procedure, a function or a custom widget, and the definition may live anywhere in the wiki. TiddlyWiki refuses to guess at parse time and builds a `transclude`; the difference surfaces only at render, where a macro substitutes `$x$` and a procedure hands it through.',
    tried: 'nothing — a grammar reads one file and holds no symbol table. This is the ceiling a language server exists to answer.',
    call: '\\import [[CeilingDefinition]]\n<<d hello>>',
    definitions: { macro: '\\define d(x)\nA $x$ B\n\\end', procedure: '\\procedure d(x)\nA $x$ B\n\\end' }
  }
];

(async () => {
  const broken = [];
  const readings = [];

  for (const c of CEILINGS) {
    if (c.shape === 'blind') {
      const hostA = built(c.a);
      const hostB = built(c.b);
      const grammarA = await painted(c.a, c.line);
      const grammarB = await painted(c.b, c.line);
      if (hostA === hostB) broken.push(`${c.key} — the host reads both inputs alike (${hostA}), so it names no distinction to stand outside of`);
      if (grammarA !== grammarB) broken.push(`${c.key} — the grammar now parts the two inputs, so the ceiling stands closed and wants retiring`);
      readings.push([c.key, `host parts (${hostA.slice(0, 24)} | ${hostB.slice(0, 24)}), grammar reads alike`]);
    } else if (c.shape === 'phantom') {
      const host = built(c.source);
      const grammar = await painted(c.source, c.line);
      if (c.hostMustNotBuild.test(host)) broken.push(`${c.key} — the host builds it after all (${host}), so the grammar names no phantom`);
      if (!c.grammarMustPaint.test(grammar)) broken.push(`${c.key} — the grammar paints nothing there, so it claims no structure the host lacks`);
      readings.push([c.key, `host builds ${host || 'nothing'}, grammar paints structure inside it`]);
    } else if (c.shape === 'space') {
      const all = flatten(oracle.parse(c.source).tree);
      const one = flatten(oracle.parse(c.source).tree, { sameSpace: true });
      const nested = all.find((n) => n.rule === c.inner);
      const outer = all.find((n) => n.rule === c.outer);
      if (!nested || !outer) broken.push(`${c.key} — the host builds no ${c.inner} inside a ${c.outer}, so no second space stands`);
      else if (nested.start >= outer.start) broken.push(`${c.key} — the inner node stands inside its parent's span, so the host restarts no offsets`);
      if (one.some((n) => n.rule === c.inner)) broken.push(`${c.key} — the inner node reads inside one space, so nothing separates the two`);
      readings.push([c.key, nested && outer ? `host reports ${c.outer} at ${outer.start}..${outer.end} and ${c.inner} at ${nested.start}..${nested.end}` : 'unmeasured']);
    } else if (c.shape === 'wiki') {
      const rendered = {};
      for (const [kind, text] of Object.entries(c.definitions)) {
        oracle.$tw.wiki.addTiddler({ title: 'CeilingDefinition', text, tags: '$:/tags/Macro' });
        oracle.$tw.wiki.addTiddler({ title: 'CeilingCall', text: c.call });
        rendered[kind] = oracle.$tw.wiki.renderTiddler('text/plain', 'CeilingCall').trim();
      }
      const looks = new Set(Object.values(rendered));
      if (looks.size < 2) broken.push(`${c.key} — the wiki renders every definition kind alike (${[...looks].join(' | ')}), so no distinction stands outside the file`);
      const grammar = await painted(`${c.call}\n`, 1);
      if (!/meta\.variable\.call\./.test(grammar)) broken.push(`${c.key} — the grammar paints no call, so the probe reads the wrong span`);
      readings.push([c.key, `one call, two renderings: ${Object.entries(rendered).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(' vs ')}`]);
    }
  }

  if (verbose) {
    for (const [key, reading] of readings) console.log(`  ${key}\n     ${reading}`);
  }
  for (const b of broken) console.error(`  ${b}`);
  console.log(`textmate-ceiling  ${CEILINGS.length} ceiling(s) measured against TiddlyWiki, ${broken.length} that no longer stand`);
  process.exit(broken.length === 0 ? 0 : 1);
})();
