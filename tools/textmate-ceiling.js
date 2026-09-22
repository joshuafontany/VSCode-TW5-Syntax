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
// A CEILING WEARS ONE OF SIX SHAPES, and each carries its own falsification.
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
//   STACK    A scope the grammar ADDS to a span and can never REMOVE. A region opened inside a
//            quoted value keeps that value's scope under every construct it goes on to paint, so a
//            theme rule written against the enclosing family reaches all of them. The gate holds
//            while the grammar still paints constructs in there and the reader still honours no
//            removal: a reader that honours one names a ceiling somebody closed.
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
  process.exitCode = 0;
  return;
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

// ── the removal a reader offers, or does not ──────────────────────────────────────
//
// Sublime prescribes `clear_scopes:` for exactly this span and states the prescription verbatim:
// when a string holds interpolated code, "the `string.*` scope should be removed using
// `clear_scopes:`". vscode-textmate's `IRawRule` enumerates fourteen keys — include, name,
// contentName, match, captures, begin, beginCaptures, end, endCaptures, while, whileCaptures,
// patterns, repository, applyEndPatternLast — and names no removal among them. A grammar declaring
// one therefore declares an ignored key, which reports nothing and changes nothing.
//
// ASSERTING THAT COSTS NOTHING, so the gate MEASURES it: three grammars, one line, read under the
// registry this repository's own gates build. The cleared arm declares `clear_scopes` and must read
// BYTE-IDENTICAL to the plain arm. The moved arm shows what an honoured removal would read as, so
// the comparison stands on a difference the reader CAN express.
const CLEAR_SCOPES_PROBE = {
  line: 'a "x WIKI y" b',
  plain: {
    scopeName: 'source.ceiling.plain',
    patterns: [{
      begin: '"', end: '"', name: 'string.quoted.double.ceiling',
      patterns: [{ match: 'WIKI', name: 'markup.bold.ceiling' }]
    }]
  },
  // The same grammar, asking the reader to drop the enclosing string over the inner construct.
  cleared: {
    scopeName: 'source.ceiling.cleared',
    patterns: [{
      begin: '"', end: '"', name: 'string.quoted.double.ceiling',
      patterns: [{ match: 'WIKI', name: 'markup.bold.ceiling', clear_scopes: true }]
    }]
  },
  // What an honoured removal reads as: the construct standing free of the string. A reader reaching
  // this from the cleared arm closes this ceiling.
  moved: {
    scopeName: 'source.ceiling.moved',
    patterns: [{ match: 'WIKI', name: 'markup.bold.ceiling' },
      { begin: '"', end: '"', name: 'string.quoted.double.ceiling' }]
  }
};

/** The scope stack this reader puts on every token of one line, under one throwaway grammar. */
const probeStack = async (raw) => {
  const { createRegistryFromGrammars } = require('vscode-tmgrammar-test/dist/common/index.js');
  const reg = createRegistryFromGrammars([{
    grammar: { path: `${raw.scopeName}.json`, scopeName: raw.scopeName },
    content: JSON.stringify(raw)
  }]);
  const grammar = await reg.loadGrammar(raw.scopeName);
  // The root scope differs by arm on purpose — three grammars cannot share one scope name — so it
  // drops out of the reading and the comparison stands on what the rules put ON TOP of it.
  return grammar.tokenizeLine(CLEAR_SCOPES_PROBE.line, null).tokens
    .map((t) => t.scopes.filter((x) => x !== raw.scopeName).join(' ')).join(' | ');
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
    tried: 'a blank-line bound on the call end, which cut 116 real multi-line calls out of 16087 openers measured over 700 carriers while answering the 0 that carry no closer. Two more relaxations ran on the codeinline arm and both failed: a `begin`/`end` pair runs an unmatched opener to the end of the document, and 9 of the 2493 tiddlers swept carry an unterminated code run the host renders as literal text (`mono-block`, `splitregexp Operator`, `CallParameterValue`, `tm-new-tiddler`, `Serving TW5 from Android`, `#9739-empty-codeblock`, `Release 5.3.0`, `Linking in WikiText`, `Substituted Attribute Values`); a blank-line bound on that end mis-pairs the 8 tiddlers whose code runs legitimately cross a blank line. RULED, NOT ONLY MEASURED (2026-09-18): an inline code run, italic (`//(?=[^\\n]*//)…//|(?=$)`), bold, underline and the other emphasis marks bound their close to the SAME LINE, and `htmlwidget`\'s tag/attribute rules bound a start tag at the blank line rather than reading ahead across it. A TRANSCLUSION AND A FILTERED TRANSCLUSION JOIN THE LIST (2026-09-21): both carried across a blank line on purpose, so an unclosed `{{` or `{{{` ran to the end of the source and painted every paragraph after it — `corpus/wikitext/degenerate.unterminated.tw`\'s own `{{transclusion` line named the specimen. Both now end at `(?=^$)` too, alongside the same-line and next-line closers a reader still gets, which costs the one case where a real filter or template title genuinely spans a blank line to a closer further down. TiddlyWiki carries every one of these across lines and across blank lines inside one block; this grammar could widen each bound the same way `whole-document lookahead` names, and the operator ruled against it on purpose, not for lack of trying: a stray unclosed `//` or `<div` early in a tiddler would then run forward looking for its own close and paint every paragraph after it — including ones with no mark of their own — until it happened to find one, so ONE typo takes down a whole document\'s highlighting rather than the one line that carries it. A line-bounded miss reads as itself, wrong only where it stands; an unbounded false match reads as a cascade. `tree-sitter`, holding the whole document AND able to reparse incrementally when the guess a wrong bound made turns out wrong, can accept the cascade\'s cost where a stream-oriented grammar answering to a live editor cannot.',
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
    key: 'enclosing scope removal',
    answeredBy: 'a reader that REPLACES a span\'s scope rather than only adding to it \u2014 Sublime\'s `clear_scopes:`, and tree-sitter, whose injections restart the highlight stack at the injected node',
    shape: 'stack',
    what: 'a construct opened inside a quoted value, which wears that value\'s scope for as long as the region stands',
    why: 'This grammar embeds wikitext INSIDE quoted attribute values \u2014 a substituted attribute value, a filter run in an attribute, the `lar:` injection reaching inside `string.quoted.double.html`. A TextMate rule only ADDS scopes, so every construct opened in there carries the enclosing `string.*` on its stack for as long as the region stands, and a theme rule written against `string` reaches all of them: a reader meets wikitext wearing a string\'s colour. Sublime prescribes the cure verbatim \u2014 where a string holds interpolated code, "the `string.*` scope should be removed using `clear_scopes:`" \u2014 and vscode-textmate\'s `IRawRule` enumerates fourteen keys naming no removal among them. Measured over corpus and samples: 1080 of 24376 tokens stand under a string they cannot leave, across 47 of 79 carriers, 8 enclosing string scopes and 67 trapped construct names \u2014 `string.text-reference` over 492 of them, `string.quoted.double.html` over 330, `string.unquoted.uri.lar` over 167.',
    tried: 'declaring `clear_scopes: true` on the inner rule and reading the result, which this gate re-runs on every pass: the cleared arm reads BYTE-IDENTICAL to the plain arm, so the key parses and moves nothing. The additive cure stands available and answers a different question \u2014 a space-separated multi-scope name ADDS a content scope to a delimiter, the device MagicPython and VS Code TypeScript both ship \u2014 but nothing a grammar writes takes a scope back OFF a span, so it widens a reading rather than narrowing one',
    source: '<$link tooltip="""a [[Page]] and {{Ref!!field}} here""">x</$link>'
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
    } else if (c.shape === 'stack') {
      // A SCOPE THE GRAMMAR ADDS AND NEVER TAKES BACK. The specimen must actually open a construct
      // inside a string, or the entry names nothing enclosed; and the reader must honour no removal,
      // or somebody closed this and the entry wants retiring.
      const line = (await tokenize('text.html.tiddlywiki5', `${c.source}\n`))[0] || [];
      const trapped = line.filter((t) => {
        const at = t.scopes.findIndex((x) => /^string\./.test(x));
        return at >= 0 && t.scopes.slice(at + 1)
          .some((x) => !/^string\./.test(x) && !/^punctuation\.definition\.string\./.test(x));
      });
      const names = new Set(trapped.flatMap((t) => t.scopes.filter((x) => !/^string\./.test(x) && !/^text\.|^source\./.test(x))));
      const enclosing = new Set(trapped.flatMap((t) => t.scopes.filter((x) => /^string\./.test(x))));
      if (!trapped.length) broken.push(`${c.key} — the grammar paints no construct inside a string on this specimen, so nothing stands enclosed`);
      const plain = await probeStack(CLEAR_SCOPES_PROBE.plain);
      const cleared = await probeStack(CLEAR_SCOPES_PROBE.cleared);
      if (plain !== cleared) broken.push(`${c.key} — the reader honours a scope removal after all, so the ceiling stands closed and wants retiring`);
      // THE CONTROL. Two readings agreeing prove nothing unless the comparison can part two that
      // differ. The moved arm paints the same construct OUTSIDE the string — what an honoured
      // removal reads as — so a comparison blind to it would agree with everything.
      const moved = await probeStack(CLEAR_SCOPES_PROBE.moved);
      if (plain === moved) broken.push(`${c.key} — the control reads the same as the plain arm, so the comparison parts nothing and the agreement above says nothing`);
      readings.push([c.key, `${names.size} construct scope(s) stand under a string on ${trapped.length} token(s), inside ${[...enclosing].join(' + ') || 'no string'}; a rule declaring clear_scopes reads identically`]);
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
  process.exitCode = broken.length === 0 ? 0 : 1;
  return;
})();
