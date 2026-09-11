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
// A CEILING WEARS ONE OF FIVE SHAPES, and each carries its own falsification.
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
//   SPACE    A body the host parses in offsets of its own. A grammar carries one coordinate space
//            per document, so no scope names which space a span belongs to.
//   WIKI     ONE source, several wikis. The bytes never move; what the wiki holds around them does,
//            and the reading parts. A grammar reads the bytes. This is the shape a language server
//            answers and a tree-sitter grammar does not.
//   VALUE    A construct the grammar NAMES correctly and whose meaning the host computes. A scope
//            names a span, never a value, so the entity stands named and unresolved.
//
// NEITHER SHAPE PROVES IMPOSSIBILITY, and this file never claims one. It measures that the host
// draws a distinction, and that this grammar as it stands does not. Where somebody tried
// constructions and they failed, the entry SAYS WHICH — a claim carrying no attempts reads as an
// excuse dressed as a limit.
//
//   node tools/textmate-ceiling.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');

const verbose = process.argv.includes('--verbose');
// WRITING IS A FLAG, never a side effect of reading. Tests invoke this tool in parallel and other
// tests read the tiddlers directory beside it; a gate that writes on every run turns its own suite
// into shared mutable state. `npm run ceiling` passes the flag, so the harvest stays current.
const write = process.argv.includes('--write');
const OUT = path.join(__dirname, '..', 'editions', 'tw5-syntax', 'tiddlers', 'TextMateCeiling.tid');
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
// claim. `tried` names constructions somebody measured and watched fail. `answeredBy` names WHAT
// KIND OF READER closes it — the field that turns this list from a set of limits into a mandate,
// and the one a later effort sorts on when it asks which of these it must supply.
const CEILINGS = [
  {
    key: 'whole-document lookahead',
    answeredBy: 'a parser holding the whole document — tree-sitter answers this',
    shape: 'blind',
    what: 'a construct that opens only where its closer stands somewhere ahead',
    why: 'TiddlyWiki scans to the end of the source for `>>` before building a call, and builds nothing at all where none stands. A pattern reads one line and the rule stack carried across it, so both inputs open the same region. THE SAME CEILING WEARS OTHER CONSTRUCTS: `\\parameters\\s*\\(([^)]*)\\)` carries a signature across blank lines to a closing paren anywhere ahead and builds nothing where none stands — measured, a signature with a closer on a later line or across a blank line agrees with the grammar exactly, and the two part only where no `)` stands in the file at all. `codeinline.js` wears it a third way and pays the most for it: it runs `reEnd.exec(this.parser.source)` over the WHOLE source, so a code run crosses line breaks freely and an unterminated delimiter renders as literal text carrying no node. This grammar spells the construct as a `match` whose content class refuses a newline, so the two pair DIFFERENT backticks and the mis-pairing ALTERNATES — every span the host reads as raw reads as wikitext here, and every span it reads as wikitext paints raw. Measured at 10 attributes across five templates in `corpus/attribute-kind-ceiling.txt`.',
    tried: 'a blank-line bound on the call end, which cut 116 real multi-line calls out of 16087 openers measured over 700 carriers while answering the 0 that carry no closer. Two more relaxations ran on the codeinline arm and both failed: a `begin`/`end` pair runs an unmatched opener to the end of the document, and 9 of the 2493 tiddlers swept carry an unterminated code run the host renders as literal text (`mono-block`, `splitregexp Operator`, `CallParameterValue`, `tm-new-tiddler`, `Serving TW5 from Android`, `#9739-empty-codeblock`, `Release 5.3.0`, `Linking in WikiText`, `Substituted Attribute Values`); a blank-line bound on that end mis-pairs the 8 tiddlers whose code runs legitimately cross a blank line',
    a: `<<foo\n${'x\n'.repeat(6)}>>\n`,
    b: `<<foo\n${'x\n'.repeat(6)}`,
    line: 0
  },
  {
    key: 'rule-set mutation',
    answeredBy: 'a reader carrying parser STATE across a document — a language server holds it; a static grammar does not',
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
    answeredBy: 'a reader parsing a stored body on demand, at the moment something renders it — the widget layer, never a syntax layer',
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
    answeredBy: 'a reader carrying a span TOGETHER WITH its space — tree-sitter injections answer this; a flat scope list does not',
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
    answeredBy: 'a symbol table over the wiki — a language server, and nothing below one',
    shape: 'wiki',
    what: 'bytes whose meaning stands in another tiddler',
    why: '`<<d hello>>` reaches a macro, a procedure, a function or a custom widget, and the definition may live anywhere in the wiki. TiddlyWiki refuses to guess at parse time and builds a `transclude`; the difference surfaces only at render, where a macro substitutes `$x$` and a procedure hands it through.',
    tried: 'nothing — a grammar reads one file and holds no symbol table. This is the ceiling a language server exists to answer.',
    source: '\\import [[CeilingDefinition]]\n<<d hello>>',
    paints: /meta\.variable\.call\./,
    states: {
      macro: [{ title: 'CeilingDefinition', text: '\\define d(x)\nA $x$ B\n\\end', tags: '$:/tags/Macro' }],
      procedure: [{ title: 'CeilingDefinition', text: '\\procedure d(x)\nA $x$ B\n\\end', tags: '$:/tags/Macro' }]
    }
  },
  {
    key: 'import by filter',
    answeredBy: 'a filter engine running against a live wiki — a language server wired to the wiki, never a grammar',
    shape: 'wiki',
    what: 'a pragma whose effect a filter over the wiki decides',
    why: '`\\import` takes a FILTER, not a title, so which definitions arrive depends on what the wiki holds when it runs. Measured: `\\import [tag[GapTag]]` renders `IMPORTED` and `\\import [tag[NoSuchTag]]` renders nothing, on identical calling bytes.',
    tried: 'nothing — a filter runs against a wiki, and a grammar holds no wiki. A language server holds one; a tree-sitter grammar does not.',
    source: '\\import [tag[CeilingTag]]\n<<imported>>',
    paints: /meta\.directive\.import\./,
    states: {
      tagged: [{ title: 'CeilingImport', text: '\\define imported() IMPORTED', tags: 'CeilingTag' }],
      untagged: [{ title: 'CeilingImport', text: '\\define imported() IMPORTED', tags: 'OtherTag' }]
    }
  },
  {
    key: 'indirect attribute value',
    answeredBy: 'a resolver reading tiddler fields — a language server for hover and completion; the render layer for the value itself',
    shape: 'wiki',
    what: 'an attribute whose value stands in another tiddler field',
    why: 'TiddlyWiki types an attribute `indirect` and resolves the reference at widget time. Measured: `<$text text={{CeilingField!!myfield}}/>` renders the field where it stands and nothing where it does not, on identical bytes.',
    tried: 'nothing at the grammar, which names the reference correctly and can never resolve it. `attribute-witness` reads the KIND TiddlyWiki assigns and stops there, on purpose.',
    source: '<$text text={{CeilingField!!myfield}}/>',
    paints: /string\.text-reference\.|meta\.attribute\./,
    states: {
      present: [{ title: 'CeilingField', text: '', myfield: 'the value' }],
      absent: [{ title: 'CeilingField', text: '', myfield: '' }]
    }
  },
  {
    key: 'entity value',
    answeredBy: 'a reader that reports a VALUE beside a span — hover in a language server, or the render layer',
    shape: 'value',
    what: 'a construct the grammar names whose VALUE the host computes',
    why: 'An entity parses to an `entity` node and renders to the character it names — `&hellip; and &#x2014;` renders `… and —`. The grammar names the entity exactly and carries no scope for what it stands for, because a scope names a span and never a value.',
    tried: 'nothing, and nothing should. The ceiling names what a tool must not expect from scopes: a reader wanting the character reads the host, never the grammar.',
    source: '&hellip; and &#x2014;',
    paints: /constant\.character\.|entity/
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
      // ONE SOURCE, SEVERAL WIKIS. The bytes never move; what the wiki holds around them does, and
      // the reading parts. A grammar reads the bytes.
      const rendered = {};
      // A CLEAN WIKI PER STATE. Every entry writes into one wiki, and a state left standing decides
      // the entry after it — an order the list never declares and nobody reading it would expect.
      for (const [state, tiddlers] of Object.entries(c.states)) {
        for (const t of Object.values(c.states).flat()) oracle.$tw.wiki.deleteTiddler(t.title);
        for (const t of tiddlers) oracle.$tw.wiki.addTiddler(t);
        oracle.$tw.wiki.addTiddler({ title: 'CeilingSource', text: c.source });
        rendered[state] = oracle.$tw.wiki.renderTiddler('text/plain', 'CeilingSource').trim();
      }
      const looks = new Set(Object.values(rendered));
      if (looks.size < 2) broken.push(`${c.key} — every wiki state renders alike (${[...looks].join(' | ')}), so no distinction stands outside the file`);
      const lines = c.source.split('\n');
      const grammar = (await Promise.all(lines.map((_, i) => painted(`${c.source}\n`, i)))).join(' ');
      if (!c.paints.test(grammar)) broken.push(`${c.key} — the grammar paints nothing the entry names, so the probe reads the wrong span`);
      readings.push([c.key, `one source, ${looks.size} renderings: ${Object.entries(rendered).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(' vs ')}`]);
    } else if (c.shape === 'value') {
      // The grammar NAMES the construct and carries no scope for what it stands for: a scope names
      // a span, never a value.
      oracle.$tw.wiki.addTiddler({ title: 'CeilingSource', text: c.source });
      const rendered = oracle.$tw.wiki.renderTiddler('text/plain', 'CeilingSource').trim();
      if (rendered === c.source.trim()) broken.push(`${c.key} — the host renders the source unchanged, so it computes no value to stand outside of`);
      const grammar = await painted(`${c.source}\n`, 0);
      if (!c.paints.test(grammar)) broken.push(`${c.key} — the grammar names no such construct, so it claims nothing it cannot resolve`);
      if (grammar.includes(rendered)) broken.push(`${c.key} — a scope carries the rendered value, so the grammar reaches it after all`);
      readings.push([c.key, `source ${JSON.stringify(c.source)} renders ${JSON.stringify(rendered)}; no scope carries it`]);
    }
  }

  // THE EVIDENCE PRINTS BY DEFAULT. This gate exists to hand a later reader a mandate, and a mandate
  // behind a flag reaches nobody: `gate-report` keeps the summary line alone, so anything held back
  // for `--verbose` never reaches the record a reader opens.
  for (const [key, reading] of readings) {
    const c = CEILINGS.find((x) => x.key === key);
    console.log(`  ${key} — ${c.answeredBy}`);
    console.log(`     ${reading}`);
    if (verbose) console.log(`     ${c.why}`);
  }
  for (const b of broken) console.error(`  ${b}`);
  // THE MANDATE LANDS IN THE WIKI, harvested the way the gate report is. A list living only in a
  // tool reaches whoever runs the tool; a later effort scoping a language server or a tree-sitter
  // grammar opens the wiki. Hand-editing it goes stale the moment the tree moves, so nobody should.
  const reading = new Map(readings);
  const body = {
    ceilings: CEILINGS.length,
    standing: CEILINGS.length - broken.length,
    entries: CEILINGS.map((c) => ({
      key: c.key,
      shape: c.shape,
      answeredBy: c.answeredBy,
      what: c.what,
      why: c.why,
      tried: c.tried,
      measured: reading.get(c.key) || ''
    }))
  };
  if (write) fs.writeFileSync(OUT, 'title: $:/tw5-syntax/TextMateCeiling\n'
    + 'type: application/json\n'
    + 'tags: $:/tags/TW5Syntax/GrammarData\n'
    + 'caption: TextMate ceiling\n'
    + 'description: What a TextMate grammar cannot reach about TiddlyWiki, and which kind of reader closes each one — harvested, never hand-written\n'
    + `ceilings-standing: ${body.standing} of ${body.ceilings}\n`
    + `\n${JSON.stringify(body, null, 4)}\n`);

  console.log(`textmate-ceiling  ${CEILINGS.length} ceiling(s) measured against TiddlyWiki, ${broken.length} that no longer stand${write ? ', written' : ''}`);
  process.exit(broken.length === 0 ? 0 : 1);
})();
