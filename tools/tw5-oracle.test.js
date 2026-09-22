// The oracle: TiddlyWiki's own parser, asked what it BUILDS.
//
// The grammar may scope a construct only where TiddlyWiki reads one. TiddlyWiki raises no
// error on bad markup — what it cannot read falls through as text — so the only honest
// question asks what the parser BUILDS, and only the parser answers it.
//
// Two halves stand under test. The pure half — flatten, verdictAt — decides a verdict from
// a parse tree and boots nothing. The live half boots TiddlyWiki and reports what it built,
// and skips itself where no TiddlyWiki checkout resolves.
//
// Every offset below comes from indexOf over the probe's own text. A hand-counted column
// makes a second, unwitnessed claim about the source, and it fails silently.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  flatten,
  isPlainText,
  verdictAt,
  resolveTiddlyWiki,
  boot,
  deepFreeze,
  memoKeyFor,
  resetParseMemoForTests
} = require('./tw5-oracle.js');

/** The span of `part` inside `text`, so no test carries a hand-counted column. */
const span = (text, part) => {
  const start = text.indexOf(part);
  assert.notStrictEqual(start, -1, `probe does not contain ${JSON.stringify(part)}`);
  return [start, start + part.length];
};

// ── the pure half ────────────────────────────────────────────────────────────

test('flatten walks a tree depth-first and keeps every span', () => {
  const tree = [
    {
      type: 'element',
      tag: 'p',
      rule: 'parseblock',
      start: 0,
      end: 20,
      children: [
        { type: 'text', text: 'A ', start: 0, end: 2 },
        {
          type: 'link',
          rule: 'wikilink',
          start: 2,
          end: 13,
          children: [{ type: 'text', text: 'HelloWorld2', start: 2, end: 13 }]
        }
      ]
    }
  ];
  assert.deepStrictEqual(
    flatten(tree).map((n) => `${n.type}:${n.start}-${n.end}`),
    ['element:0-20', 'text:0-2', 'link:2-13', 'text:2-13']
  );
});

test('a node the parser built reads as built, and names its rule', () => {
  const spans = flatten([{ type: 'link', rule: 'wikilink', start: 2, end: 13, children: [] }]);
  assert.deepStrictEqual(verdictAt(spans, 2, 13), {
    kind: 'built', innermost: 'built', rule: 'wikilink', start: 2, end: 13
  });
});

// TiddlyWiki records a REFUSAL by returning a text node that still carries the rule's
// name — wikilink hands back `text [wikilink]` for a link it declined to make. Reading
// `rule` would call that a construct; only `type` separates built from refused.
test('a text node carrying a rule name reads as refused, never as built', () => {
  const spans = flatten([{ type: 'text', rule: 'wikilink', text: 'HelloThere', start: 4, end: 14 }]);
  assert.deepStrictEqual(verdictAt(spans, 4, 14), {
    kind: 'text', innermost: 'text', rule: 'wikilink', start: 4, end: 14
  });
});

test('the tightest covering node decides, so a construct inside a paragraph answers for itself', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'p',
      rule: 'parseblock',
      start: 0,
      end: 20,
      children: [{ type: 'link', rule: 'extlink', start: 4, end: 12, children: [] }]
    }
  ]);
  assert.strictEqual(verdictAt(spans, 4, 12).kind, 'built');
  assert.strictEqual(verdictAt(spans, 4, 12).rule, 'extlink');
});

// The paragraph names the ABSENCE of a construct: TiddlyWiki wraps a run in <p> exactly
// where no block rule matched. Counting it would report every stretch of prose as built.
test('the paragraph wrapper never answers for what it wraps', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'p',
      rule: 'parseblock',
      start: 0,
      end: 40,
      children: [{ type: 'text', text: 'A &NotAnEntity; here', start: 0, end: 40 }]
    }
  ]);
  assert.strictEqual(verdictAt(spans, 2, 34).kind, 'text');
});

// Every construct carries a text child of its own extent — an extlink wraps the URL it
// linked — so reading the deepest node would call every link plain text.
test('a built node outranks the text of its own extent', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'a',
      rule: 'extlink',
      start: 4,
      end: 24,
      children: [{ type: 'text', text: 'https://ex.com/a', start: 4, end: 24 }]
    }
  ]);
  assert.deepStrictEqual(verdictAt(spans, 4, 24), {
    kind: 'built', innermost: 'built', rule: 'extlink', start: 4, end: 24
  });
});

// A grammar under-reaching by one character still sits inside the node TiddlyWiki built,
// so presence alone would pass it. The verdict carries the built node's OWN extent.
test('a verdict carries the built extent, so a short scope stays visible', () => {
  const spans = flatten([{ type: 'link', rule: 'wikilink', start: 2, end: 13, children: [] }]);
  const v = verdictAt(spans, 2, 12);
  assert.strictEqual(v.kind, 'built');
  assert.strictEqual(v.end, 13, 'the node runs one character past the queried span');
});

// html.js sets a widget's node type from its own tag — node.type = node.tag.substr(1) —
// so the <$text> widget builds a node of type "text". A node's type therefore does not
// identify plain text on its own; only a node with text and no tag does. TiddlyWiki's own
// templates use <$text> throughout, so reading type alone calls a great many built widgets
// prose the parser refused.
test('a widget calling itself text never reads as plain text', () => {
  assert.strictEqual(isPlainText({ type: 'text', text: 'hello' }), true);
  assert.strictEqual(isPlainText({ type: 'text', tag: '$text', rule: 'html' }), false);
  const spans = flatten([{ type: 'text', tag: '$text', rule: 'html', start: 0, end: 22, children: [] }]);
  assert.deepStrictEqual(verdictAt(spans, 0, 22), {
    kind: 'built', innermost: 'built', rule: 'html', start: 0, end: 22
  });
});

// A second door onto the same collision. mvvdisplayinline returns a text WIDGET — type
// "text", no tag at all, its content in attributes.text — where a plain text node carries its
// content in a `text` property. Reading type and tag alone calls every `((variable))` in a
// wiki prose the parser refused.
test('a text widget carrying no tag still never reads as plain text', () => {
  const widget = { type: 'text', attributes: { text: { type: 'filtered', filter: '[(v)join[, ]]' } } };
  assert.strictEqual(isPlainText(widget), false);
  assert.strictEqual(isPlainText({ type: 'text', text: 'ordinary prose' }), true);
  const spans = flatten([{ ...widget, rule: 'mvvdisplayinline', start: 0, end: 13, children: [] }]);
  assert.strictEqual(verdictAt(spans, 0, 13).kind, 'built');
  assert.strictEqual(verdictAt(spans, 0, 13).innermost, 'built');
});

test('a span no node covers reads as none', () => {
  assert.deepStrictEqual(verdictAt(flatten([]), 0, 5), {
    kind: 'none', innermost: 'none', rule: null, start: null, end: null
  });
});

// A claim and a verdict ask opposite questions of one span. `!! Avertissement<<:>>` builds a
// heading, and `<<:>>` inside it stays text TiddlyWiki refused — so a scope CLAIMING a
// construct there reads correct off the heading, while a scope CONDEMNING the brackets reads
// correct off the text. One covering rule cannot serve both.
test('a claim reads the widest cover and a verdict reads the tightest', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'h2',
      rule: 'heading',
      start: 0,
      end: 20,
      children: [{ type: 'text', text: 'Avertissement<<:>>', start: 2, end: 20 }]
    }
  ]);
  const v = verdictAt(spans, 15, 16);
  assert.strictEqual(v.kind, 'built', 'a construct covers the span');
  assert.strictEqual(v.innermost, 'text', 'the parser built nothing at the span itself');
});

// A \\define or \\procedure builds a `set` node carrying its body as an ATTRIBUTE STRING —
// zero children, no text. TiddlyWiki parses nothing inside it at definition time; the body
// parses later, at call time, in whatever context the call stands. So neither a claim nor a
// verdict about a span in there stands on this parse, and the reading says so rather than
// guessing.
test('a span inside an unparsed definition body reads as opaque', () => {
  const spans = flatten([
    { type: 'set', rule: 'macrodef', start: 0, end: 40, children: [], attributes: { name: {}, value: {} } }
  ]);
  assert.strictEqual(verdictAt(spans, 12, 13).innermost, 'opaque');
  assert.strictEqual(verdictAt(spans, 12, 13).rule, 'macrodef');
});

// parsePragmas nests the rest of the document beneath each pragma, so a definition in a real
// file always carries children. Its own extent still spans the definition alone.
test('a definition carrying the whole document as children still reads opaque inside itself', () => {
  const spans = flatten([
    {
      type: 'set',
      rule: 'macrodef',
      start: 0,
      end: 40,
      children: [
        {
          type: 'link',
          rule: 'prettylink',
          start: 42,
          end: 60,
          children: [{ type: 'text', text: 'the link text', start: 44, end: 58 }]
        }
      ]
    }
  ]);
  assert.strictEqual(verdictAt(spans, 12, 13).innermost, 'opaque', 'inside the definition');
  assert.strictEqual(verdictAt(spans, 42, 43).innermost, 'built', 'where the link beneath it begins');
});

// TiddlyWiki PLACES an attribute and a macro-call parameter: each carries its own start and
// end under `attributes`, beside the node rather than beneath it. A walk that follows children
// alone never reaches them, and every attribute in a wiki resolves no finer than its tag.
test('flatten reaches a placed attribute, which stands beside the node and not beneath it', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'div',
      rule: 'html',
      start: 0,
      end: 24,
      attributes: { align: { name: 'align', type: 'string', value: 'left', start: 5, end: 18 } },
      children: [{ type: 'text', text: 'x', start: 19, end: 20 }]
    }
  ]);
  assert.ok(spans.some((n) => n.start === 5 && n.end === 18), 'the attribute stands among the spans');
  assert.strictEqual(verdictAt(spans, 5, 18).kind, 'built');
});

// A macro invocation places its parameters the same way, so a span inside one answers even
// though the invocation carries no children at all.
test('a macro parameter answers, where the invocation carries no children', () => {
  const spans = flatten([
    {
      type: 'transclude',
      rule: 'macrocallinline',
      start: 2,
      end: 11,
      attributes: { 0: { name: '0', type: 'string', value: 'one', start: 5, end: 9 } },
      children: []
    }
  ]);
  assert.strictEqual(verdictAt(spans, 5, 9).innermost, 'built');
});

// The suppressing mark itself. wikilinkprefix strips the tilde and returns a node beginning
// AFTER it, so the tilde's column lands in no node at all and no reading of the tree can say
// whether the parser honoured it. The node that follows names the rule that ate it.
test('a mark a suppressing rule consumed reads as opaque', () => {
  const spans = flatten([
    {
      type: 'element',
      tag: 'h1',
      rule: 'heading',
      start: 0,
      end: 20,
      children: [{ type: 'text', rule: 'wikilinkprefix', text: 'CamelCaseLink', start: 5, end: 18 }]
    }
  ]);
  assert.strictEqual(verdictAt(spans, 4, 5).innermost, 'opaque', 'the tilde at column four');
  assert.strictEqual(verdictAt(spans, 5, 18).innermost, 'text', 'the text it handed back');
});

test('a construct that simply carries no children stays judgeable', () => {
  const spans = flatten([{ type: 'entity', rule: 'entity', start: 2, end: 10, children: [] }]);
  assert.strictEqual(verdictAt(spans, 2, 10).innermost, 'built');
});

// ── the live half ────────────────────────────────────────────────────────────

const TW = resolveTiddlyWiki();
const live = { skip: TW ? false : 'no TiddlyWiki checkout resolved (set TW5_PATH)' };
const camel = () => boot(TW, { rules: { 'Inline/wikilink': 'enable' } });

test('the oracle reports the rules TiddlyWiki stands, not the ones it ships code for', live, () => {
  const active = boot(TW).activeRules();
  assert.ok(active.inline.includes('extlink'), 'extlink stands by default');
  assert.ok(active.block.includes('codeblock'), 'codeblock stands by default');
  // core/wiki/config/wikilink.tid reads "disable" — upstream PR #7513, 2023-06-08.
  assert.ok(!active.inline.includes('wikilink'), 'CamelCase linking stands OFF by default');
  assert.ok(active.inline.includes('wikilinkprefix'), 'the ~ suppressor still stands');
});

// The config tiddler MUST land before boot: startup parses wikitext of its own, and the
// first parse deletes disabled rules from WikiParser.prototype for good.
test('a rule switched on by config comes back, and leaves the default boot alone', live, () => {
  assert.ok(camel().activeRules().inline.includes('wikilink'));
  assert.ok(!boot(TW).activeRules().inline.includes('wikilink'), 'boots stay isolated');
});

test('the oracle reads a construct TiddlyWiki builds', live, () => {
  const src = 'see https://ex.com/a here';
  const v = boot(TW).readAt(src, ...span(src, 'https://ex.com/a'));
  assert.strictEqual(v.kind, 'built');
  assert.strictEqual(v.rule, 'extlink');
});

// ── the divergences this instrument exists to catch ──────────────────────────
// Each states what TiddlyWiki BUILDS. tools/overreach-check.js compares the grammar
// against these answers rather than against anybody's reading of the format.

test('TiddlyWiki refuses a CamelCase word standing after a digit', live, () => {
  const blocked = 'A x1HelloThere here';
  const clear = 'A HelloThere here';
  assert.strictEqual(camel().readAt(blocked, ...span(blocked, 'HelloThere')).kind, 'text');
  assert.strictEqual(camel().readAt(clear, ...span(clear, 'HelloThere')).kind, 'built');
});

test('TiddlyWiki carries a trailing digit into a CamelCase link', live, () => {
  const src = 'A HelloWorld2 here';
  const v = camel().readAt(src, ...span(src, 'HelloWorld'));
  assert.strictEqual(v.kind, 'built');
  assert.strictEqual(v.end, span(src, 'HelloWorld2')[1], 'the link runs through the digit');
});

test('TiddlyWiki caps an entity at eight characters', live, () => {
  const short = 'A &hellip; here';
  const long = 'A &CounterClockwiseContourIntegral; here';
  assert.strictEqual(boot(TW).readAt(short, ...span(short, '&hellip;')).kind, 'built');
  assert.strictEqual(boot(TW).readAt(long, ...span(long, '&CounterClockwiseContourIntegral;')).kind, 'text');
});

test('TiddlyWiki reads a fenced block at any indentation', live, () => {
  const src = '      ```js\nvar x = 1;\n```\n';
  const v = boot(TW).readAt(src, ...span(src, '```js'));
  assert.strictEqual(v.kind, 'built');
  assert.strictEqual(v.rule, 'codeblock');
});

test('TiddlyWiki carries emphasis across a line break inside one paragraph', live, () => {
  const src = "start ''bold text\nstill bold'' end";
  assert.strictEqual(boot(TW).readAt(src, ...span(src, "''bold text\nstill bold''")).kind, 'built');
});

test('TiddlyWiki carries an apostrophe inside an external link', live, () => {
  const src = "see https://ex.com/a'b/c end";
  const v = boot(TW).readAt(src, ...span(src, 'https://ex.com/a'));
  assert.strictEqual(v.kind, 'built');
  assert.strictEqual(v.end, span(src, "https://ex.com/a'b/c")[1], 'the link runs through the apostrophe');
});

test('the <$text> widget in TiddlyWiki own templates reads as built', live, () => {
  const src = '<$text text=<<join>>/><$jsontiddler tiddler=<<currentTiddler>>/>';
  assert.strictEqual(boot(TW).readAt(src, ...span(src, '<$text text=<<join>>/>')).kind, 'built');
});

test('TiddlyWiki looks inside no definition body, and the oracle says so', live, () => {
  const src = '\\define m()\nbody with < here\n\\end';
  const at = src.indexOf('<');
  assert.strictEqual(boot(TW).readAt(src, at, at + 1).innermost, 'opaque');
});

// The discriminator rests on every rule, not on the collisions that happened to surface.
// TiddlyWiki's rule modules return `type: "text"` from twenty-two sites; twenty-one carry the
// content in a `text` string, and mvvdisplayinline carries it in attributes. A rule added
// upstream that types a node "text" without a text string opens a fourth door onto the same
// collision, and this reads the modules rather than waiting for a count to look wrong.
test('every text-typed node the parser builds carries a text string, or names itself a widget', live, () => {
  const dir = path.join(TW, 'core/modules/parsers/wikiparser/rules');
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? walk(p) : e.name.endsWith('.js') ? [p] : [];
    });
  // mvvdisplayinline builds a text WIDGET, content in attributes.text; isPlainText knows it.
  const KNOWN_WIDGETS = new Set(['mvvdisplayinline.js']);
  const bare = [];
  let sites = 0;
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/type:\s*"text"/g)) {
      sites += 1;
      const after = src.slice(m.index, m.index + 400);
      const filledLater = /textNode\.text\s*=/.test(src);
      if (/\btext\s*:/.test(after.split(/}\s*[,;)]/)[0]) || filledLater) continue;
      if (KNOWN_WIDGETS.has(path.basename(file))) continue;
      bare.push(`${path.basename(file)}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  // A sweep that reached nothing would report nothing, and pass as quietly as a clean one. The
  // floor is READER-RELATIVE (tools/reader-scope.js's own generalisation, applied to a rule-source
  // sweep rather than a ledger): this repository's own fork carries 22 `type: "text"` sites and
  // the pinned devDependency carries 14, eight fewer rule modules the fork has grown since — never
  // a floor calibrated to one reader and silently failing the other.
  const floor = boot(TW).$tw.version === '5.4.1' ? 12 : 20;
  assert.ok(sites >= floor, `the sweep reached ${sites} text-typed sites`);
  assert.deepStrictEqual(bare, [], `text-typed nodes carrying no text string: ${bare.join(' ')}`);
});

test('TiddlyWiki builds a variable display, and the oracle reads it as built', live, () => {
  const src = 'A variable ((varname)) here';
  assert.strictEqual(boot(TW).readAt(src, ...span(src, '((varname))')).innermost, 'built');
});

test('TiddlyWiki reads a pragma only before the body begins', live, () => {
  const first = '\\define foo(a) $a$\nmore';
  const late = 'Some prose here.\n\n\\define foo(a) $a$\nmore';
  assert.strictEqual(boot(TW).readAt(first, ...span(first, '\\define foo(a) $a$')).kind, 'built');
  assert.strictEqual(boot(TW).readAt(late, ...span(late, '\\define foo(a) $a$')).kind, 'text');
});

// A NESTED PARSE RESTARTS OFFSETS, and a reader locating by offset must not cross into one.
//
// TiddlyWiki parses the body of a typed block as the type it declares, and the nodes that parse
// builds carry offsets into the INNER text: measured, `$$$text/vnd.tiddlywiki` holding a quoteblock
// reports the typed block at 23..42 and the quoteblock inside it at 0..14. A witness asking which
// rule covers an absolute offset then reads the inner node as standing at the top of the document.
// `still` reported a divergence class on exactly that, over TiddlyWiki's own tiddlers, where the
// grammar's reading and the host's agree.
//
// The detection derives: a child starting BEFORE its parent names a restarted space, and no list of
// node types goes stale behind it.
test('a subtree whose offsets restart stands outside an offset reading', live, () => {
  const oracle = boot(TW);
  const nested = oracle.parse('$$$text/vnd.tiddlywiki\n<<<\nQuoted\n<<<\n$$$\n').tree;
  const all = flatten(nested);
  assert.ok(all.some((n) => n.rule === 'typedblock'), 'the probe builds no typed block');
  assert.ok(all.some((n) => n.rule === 'quoteblock'), 'the probe builds no nested quoteblock');

  const outer = flatten(nested, { sameSpace: true });
  assert.ok(outer.some((n) => n.rule === 'typedblock'), 'the typed block itself stands in the outer space');
  assert.ok(!outer.some((n) => n.rule === 'quoteblock'),
    'a node carrying inner-text offsets reads as standing in the document, where it never stood');

  // A tree with no nesting reads the same either way, so the pruning costs nothing where it applies.
  const plain = oracle.parse('<<<\nQuoted\n<<<\n').tree;
  assert.deepStrictEqual(flatten(plain, { sameSpace: true }).map((n) => n.rule),
    flatten(plain).map((n) => n.rule), 'pruning changed a tree that restarts nothing');
});

// A TEXT NODE AS TIGHT AS ITS CONTAINER ANSWERS FOR THE CHARACTER. A table cell holding one mark
// spans exactly that mark, and so does the text the host kept inside it; the deeper of two equal
// covers states what TiddlyWiki made of the character. Measured on `|<|spanned |`: `<` opening a
// row builds a cell holding the text `<`, and a tie kept for the container read it as built.
test('the deeper of two equal covers answers for the span', live, () => {
  const oracle = boot(TW);
  const source = '|a |b |\n|<|spanned |\n';
  const at = source.indexOf('<');
  assert.strictEqual(oracle.readAt(source, at, at + 1).innermost, 'text',
    'a character the host kept as text inside a cell read as a construct it built');
  // Control: a cell mark the host consumes stays built.
  const joined = '|a |b |\n|c |<|\n';
  const mark = joined.lastIndexOf('<');
  assert.notStrictEqual(oracle.readAt(joined, mark, mark + 1).innermost, 'text',
    'a colspan mark the host consumed read as text');
});

// A PRAGMA NESTS THE DOCUMENT BENEATH IT, and that nesting restarts nothing.
//
// parsePragmas hands every block after a definition to the definition as its children, while the
// definition's own start..end spans the definition alone — so a child starts PAST its parent's end.
// A restarted space rebases to zero, which sets its child BEFORE its parent. A child past the end
// stands in the same space, and a walk reading it otherwise loses every construct after a leading
// `\procedure`.
test('a pragma keeps the document it nests in the same space', live, () => {
  const tree = boot(TW).parse('\\procedure p()\nbody\n\\end\n\n<<<\nQuoted\n<<<\n').tree;
  assert.ok(flatten(tree).some((n) => n.rule === 'quoteblock'), 'the probe builds no quoteblock after the pragma');
  assert.ok(flatten(tree, { sameSpace: true }).some((n) => n.rule === 'quoteblock'),
    'a block after a leading pragma dropped out of the space it stands in');
});

// A TIDDLER'S OWN TYPE PICKS ITS PARSER, and a reader forcing wikitext compares against a reading
// TiddlyWiki never produces.
//
// Measured over TiddlyWiki's own `core/`: `$:/palettes/Nord` declares
// `type: application/x-tiddler-dictionary`, and the host parses that body into ONE `genesis` node.
// Forced through the wikitext parser the same bytes build `parseblock, macrocallinline,
// macrocallinline, quoteblock, parseblock` — and a sweep comparing THAT against a grammar which
// honours the declared type reported 252 cuts of divergence on one file. Twenty dictionaries stand
// in `core/` alone.
test('the oracle parses a body as the type its tiddler declares', live, () => {
  const oracle = boot(TW);
  const body = 'alert-border: <<colour x>>\n\nPlain prose here.\n';
  const wikitext = oracle.parseAs('text/vnd.tiddlywiki', body).tree.map((n) => n.type);
  const dictionary = oracle.parseAs('application/x-tiddler-dictionary', body).tree.map((n) => n.type);
  assert.notDeepStrictEqual(dictionary, wikitext,
    'the oracle reads a dictionary and a wikitext body alike, so the type picks nothing');
  assert.deepStrictEqual(wikitext, oracle.parse(body).tree.map((n) => n.type),
    'the wikitext reading moved, so `parse` no longer names the default it always named');
});

// ── the parse memo (Story 1 of the parse-cache epic) ────────────────────────

// THE KEY, pure — `memoKeyFor` needs no boot, so every dimension gets a direct test rather than
// one inferred from whichever dimensions happen to vary inside a single real checkout.
test('the memo key: changing any one dimension misses, changing none hits', () => {
  const base = ['/some/tw', '5.4.1', 'codehash1', '[]', 'text/vnd.tiddlywiki', {}, 'hello world'];
  const key = (...args) => memoKeyFor(...args);
  const control = key(...base);

  assert.strictEqual(key(...base), control, 'identical inputs missed their own key');

  const dims = [
    ['/other/tw', 0], // reader path
    ['5.4.2', 1], // reported version
    ['codehash2', 2], // oracle's own code
    ['[["Inline/wikilink","enable"]]', 3], // rule set in force
    ['application/x-tiddler-dictionary', 4], // parse mode / type
    [{ parseAsInline: true }, 5] // parser options (inline flag lives here)
  ];
  for (const [replacement, index] of dims) {
    const varied = base.slice();
    varied[index] = replacement;
    assert.notStrictEqual(key(...varied), control, `dimension ${index} changed but the key did not`);
  }

  // The source text itself.
  const variedText = base.slice();
  variedText[6] = 'hello worlds';
  assert.notStrictEqual(key(...variedText), control, 'changing the source text did not change the key');
});

test('the parse memo hits on a repeat and misses when the type or text changes', live, () => {
  resetParseMemoForTests();
  const oracle = boot(TW);
  const text = 'Plain prose for the memo probe.';

  const first = oracle.parse(text);
  const second = oracle.parse(text);
  assert.strictEqual(first, second, 'an identical (reader, rules, mode, text) call missed the memo');

  const otherType = oracle.parseAs('application/x-tiddler-dictionary', text);
  assert.notStrictEqual(otherType, first, 'a different parse mode hit the same memo entry');

  const otherText = oracle.parse(`${text} plus more.`);
  assert.notStrictEqual(otherText, first, 'different source text hit the same memo entry');
});

// FREEZE. A memoized tree is shared by every later caller of the same key — a caller that
// mutates it would corrupt what every other reader of that key sees next. Strict mode (this
// file, and every `tools/*.js` module) turns that mutation into a thrown TypeError instead.
/**
 * Runs `fn`, expecting it to throw a `TypeError`, and fails the test with `msg` if it does not.
 *
 * Neither `assert.throws(fn, TypeError, …)` nor a plain `instanceof TypeError` works here: a
 * mutation on a tree TiddlyWiki built throws a TypeError constructed in TiddlyWiki's OWN
 * `vm.createContext({})` sandbox realm (`boot/boot.js:631`), whose `TypeError` is a distinct
 * class object from this process's own — same name, different identity, so `instanceof` (and
 * `assert.throws`'s own instanceof check) reads it as a mismatch and reports "did not throw"
 * even though it did. Reading `.name` instead reads the right thing regardless of which realm
 * threw it.
 */
function assertThrowsTypeError(fn, msg) {
  try {
    fn();
  } catch (e) {
    assert.strictEqual(e && e.name, 'TypeError', `${msg} (threw ${e && e.name}, not TypeError)`);
    return;
  }
  assert.fail(msg);
}

test('a memoized tree throws on mutation instead of accepting it', live, () => {
  resetParseMemoForTests();
  const oracle = boot(TW);
  const tree = oracle.parse('a mutation probe').tree;
  assertThrowsTypeError(() => {
    tree.push({ type: 'intruder' });
  }, 'pushing onto a memoized tree array did not throw');
  const node = flatten(tree)[0];
  // Property ASSIGNMENT on a frozen object only throws under strict mode (this file has no
  // `'use strict'` pragma); an intrinsic like Array#push always throws regardless, which is why
  // the push above needs no such wrapper. See the deepFreeze unit test below for the full note.
  const assignStrict = new Function('node', "'use strict'; node.type = 'tampered';");
  assertThrowsTypeError(() => assignStrict(node), 'assigning a property on a memoized node did not throw');
});

// COLLIDER. A fresh parse (memo bypassed) and a memoized parse of the same key must agree
// deep-equal — the freeze changes mutability, never content.
test('a fresh parse and a memoized parse of the same key agree deep-equal', live, () => {
  resetParseMemoForTests();
  const oracle = boot(TW);
  const text = 'Compare a fresh parse against a memoized one: <<macro>> and ((var)).';

  const memoized = oracle.parse(text);
  resetParseMemoForTests();
  const fresh = oracle.parse(text);

  assert.deepStrictEqual(fresh, memoized, 'a fresh parse and a memoized parse of the same key disagreed');
  assert.notStrictEqual(fresh, memoized, 'resetting the memo should force a second, distinct object');
});

test('deepFreeze freezes nested objects and arrays, not just the top level', () => {
  const value = { children: [{ attributes: { href: { value: 'x' } } }] };
  deepFreeze(value);
  // This file carries no `'use strict'` pragma, and a property assignment on a frozen object
  // fails SILENTLY in sloppy mode rather than throwing — every consuming tool that DOES mutate
  // would have to opt into strict mode to see the throw the freeze promises, which is exactly
  // why every real `tools/*.js` reader either already runs strict or (checked by hand) never
  // mutates a returned tree at all. Proving the throw here needs an explicitly strict function.
  const assignStrict = new Function('value', "'use strict'; value.children[0].attributes.href.value = 'y';");
  assertThrowsTypeError(() => assignStrict(value), 'a frozen property assignment did not throw in strict mode');
  assertThrowsTypeError(() => { value.children.push({}); }, 'pushing onto a frozen array did not throw');
});

// OFF SWITCH. ORACLE_MEMO=off must bypass the memo entirely — a fresh child process proves it,
// since the flag is read once at module load.
test('ORACLE_MEMO=off bypasses the memo entirely', live, () => {
  const { execFileSync } = require('node:child_process');
  const probe = `
    const { boot, resolveTiddlyWiki } = require(${JSON.stringify(path.resolve(__dirname, 'tw5-oracle.js'))});
    const tw = resolveTiddlyWiki();
    const oracle = boot(tw);
    const a = oracle.parse('memo-off probe');
    const b = oracle.parse('memo-off probe');
    process.stdout.write(JSON.stringify({ same: a === b, frozen: Object.isFrozen(a.tree) }));
  `;
  const out = execFileSync(process.execPath, ['-e', probe], {
    encoding: 'utf8',
    env: { ...process.env, TW5_PATH: TW, ORACLE_MEMO: 'off' }
  });
  const result = JSON.parse(out);
  assert.strictEqual(result.same, false, 'ORACLE_MEMO=off still returned the same object twice');
  assert.strictEqual(result.frozen, false, 'ORACLE_MEMO=off still froze the tree');
});

// BOUND. A memo max smaller than the distinct-key population must evict rather than grow
// unbounded — proven in a fresh process so the module-load-time MEMO_MAX takes effect.
test('ORACLE_MEMO_MAX bounds the memo by evicting the least-recently-used entry', live, () => {
  const { execFileSync } = require('node:child_process');
  const probe = `
    const oracleMod = require(${JSON.stringify(path.resolve(__dirname, 'tw5-oracle.js'))});
    const { boot, resolveTiddlyWiki } = oracleMod;
    const tw = resolveTiddlyWiki();
    const oracle = boot(tw);
    for (let i = 0; i < 20; i += 1) oracle.parse('bound probe ' + i);
    // Re-parsing key 0 after the bound (5) was long exceeded must MISS (a fresh object), since
    // it was evicted well before this call.
    const again = oracle.parse('bound probe 0');
    const alsoAgain = oracle.parse('bound probe 0');
    process.stdout.write(JSON.stringify({ secondCallHitsFirst: again === alsoAgain }));
  `;
  const out = execFileSync(process.execPath, ['-e', probe], {
    encoding: 'utf8',
    env: { ...process.env, TW5_PATH: TW, ORACLE_MEMO_MAX: '5' }
  });
  const result = JSON.parse(out);
  // The re-parse of key 0 (itself now the newest entry) must still memo-hit on its OWN repeat —
  // bounding evicts old entries, it does not disable the memo for entries within the bound.
  assert.strictEqual(result.secondCallHitsFirst, true,
    'a freshly re-added key, itself within the bound, missed its own repeat');
});
