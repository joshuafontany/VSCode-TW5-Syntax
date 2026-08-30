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
const { flatten, isPlainText, verdictAt, resolveTiddlyWiki, boot } = require('../../tools/tw5-oracle.js');

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
      children: [{ type: 'link', rule: 'prettylink', start: 42, end: 60, children: [] }]
    }
  ]);
  assert.strictEqual(verdictAt(spans, 12, 13).innermost, 'opaque', 'inside the definition');
  assert.strictEqual(verdictAt(spans, 45, 46).innermost, 'built', 'in the document beneath it');
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

test('TiddlyWiki reads a pragma only before the body begins', live, () => {
  const first = '\\define foo(a) $a$\nmore';
  const late = 'Some prose here.\n\n\\define foo(a) $a$\nmore';
  assert.strictEqual(boot(TW).readAt(first, ...span(first, '\\define foo(a) $a$')).kind, 'built');
  assert.strictEqual(boot(TW).readAt(late, ...span(late, '\\define foo(a) $a$')).kind, 'text');
});
