#!/usr/bin/env node
// TiddlyWiki, asked directly.
//
// TiddlyWiki's parser raises no error on bad markup — what it cannot read falls through as
// text — so the only honest question about a construct asks what the parser BUILDS:
//
//   the parser returns a node     -> the construct works -> a scope may stand
//   the parser yields plain text  -> the author reached for markup and missed
//
// Nothing here reads a rule's regex. This boots the real parser, hands it source, and
// reports the tree. A regex tells you what a rule LOOKS for; only the parser tells you
// what survived rule ordering, block-vs-inline dispatch, the prefix checks a rule runs
// after its own match, and $:/config/WikiParserRules — which switches rules off.
//
//   node tools/tw5-oracle.js '<wikitext>'   dump the tree TiddlyWiki builds
//   node tools/tw5-oracle.js --rules        list the rules TiddlyWiki stands
//
// The deciding half — flatten, isPlainText, isOpaqueBody, verdictAt — stands under test in
// tests/tools/tw5-oracle.test.js.

const fs = require('node:fs');
const path = require('node:path');

/**
 * Every node in a parse tree, depth-first, parents before children.
 *
 * ATTRIBUTES COUNT. TiddlyWiki places an HTML attribute and a macro-call parameter beside the
 * node rather than beneath it — each carries its own start and end under `attributes`, and
 * neither appears among the children. A walk that follows children alone resolves every
 * attribute in a wiki no finer than the tag around it, and a macro's parameters not at all.
 *
 * A macro-typed attribute value carries a whole node of its own, so the walk descends into it.
 *
 * @param {object[]} tree
 * @returns {object[]}
 */
function flatten(tree) {
  const out = [];
  const visit = (nodes) => {
    for (const n of nodes || []) {
      if (!n || typeof n !== 'object') continue;
      out.push(n);
      for (const attribute of Object.values(n.attributes || {})) {
        if (!attribute || typeof attribute !== 'object') continue;
        // Only a placed attribute joins the spans; a name or a body carrying no extent cannot
        // answer for a column.
        if (typeof attribute.start === 'number' && typeof attribute.end === 'number') out.push(attribute);
        if (attribute.value && typeof attribute.value === 'object') visit([attribute.value]);
      }
      visit(n.children);
    }
  };
  visit(tree);
  return out;
}

/**
 * Plain text, as opposed to a widget that merely calls itself text.
 *
 * Two constructs answer to the type "text" without standing as prose, by different routes.
 * html.js sets a widget's type from its own tag — `node.type = node.tag.substr(1)` — so
 * `<$text>` arrives typed "text" and tagged. mvvdisplayinline builds a text widget with NO
 * tag at all, carrying its content in `attributes.text`, so `((variable))` arrives typed
 * "text" and untagged.
 *
 * What separates prose from both: a plain text node carries its content in a `text` STRING.
 * A widget carries its content in attributes. Reading the property, rather than the type or
 * the tag, tells the two apart wherever the collision comes from.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isPlainText(node) {
  return node.type === 'text' && typeof node.text === 'string';
}

// Constructs TiddlyWiki stores rather than parses. macrodef and fnprocdef build a `set` node
// carrying the body in attributes.value, which TiddlyWiki examines at the CALL, in whatever
// context the call stands, never at the definition. Neither the name nor the body carries an
// extent, so no column inside one can be answered for.
const UNPARSED_BODY = new Set(['macrodef', 'fnprocdef']);

// Rules that consume a leading mark and hand back a node BEGINNING AFTER IT. wikilinkprefix
// strips the tilde and returns `text` from start + 1; extlink and syslink do the same for a
// link they declined. The mark itself lands in no node, so no reading of the tree can say
// whether the parser honoured it — but the node that follows names the rule that ate it.
const CONSUMES_A_LEADING_MARK = new Set(['wikilinkprefix', 'wikilink', 'extlink', 'syslink']);

/**
 * A region the parser reached and did not look inside.
 *
 * Asking what TiddlyWiki built at a span within a definition body has no answer from this
 * parse — the body parses later, somewhere else. A reading that called such a span built
 * would credit the definition's own node for text nobody has parsed; one that called it text
 * would claim a refusal nobody made.
 *
 * The node's own EXTENT decides, never its children. parsePragmas nests everything after a
 * pragma beneath it, so a definition in a real file always carries children — the document
 * that follows it — while its own start..end still spans the definition alone.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isOpaqueBody(node) {
  return UNPARSED_BODY.has(node.rule);
}

/**
 * What TiddlyWiki made of the source between two offsets.
 *
 * The tightest node covering the span answers, so a construct inside a paragraph speaks
 * for itself rather than for the paragraph around it.
 *
 * A span reads as BUILT when any construct covers it, and the tightest such construct
 * answers. Covering decides rather than matching, because a grammar names a construct's
 * parts as well as its whole — the text inside `''…''` carries markup.bold while the
 * `<strong>` TiddlyWiki built spans the delimiters too. Demanding an exact node there
 * would report every construct's own content as refused.
 *
 * Three readings shape the answer, and each one earns its place:
 *
 * - The `parseblock` paragraph never counts as a construct. TiddlyWiki wraps a run in
 *   `<p>` precisely where NO block rule matched, so that node names an absence.
 * - A built cover outranks a text cover. Every construct carries a text child — an extlink
 *   wraps the URL it linked — so reading the deepest node would call every link plain text.
 * - `kind` reads a node's TYPE, never its rule name. TiddlyWiki records a refusal by
 *   handing back a text node that still carries the rule's name — wikilink returns
 *   `text [wikilink]` for a link it declined to make — so a rule name proves only that a
 *   rule looked, never that it built.
 * - A node's type alone does not identify plain text. html.js sets a widget's type from
 *   its own tag (`node.type = node.tag.substr(1)`), so the `<$text>` widget arrives
 *   carrying type "text". Only a node with text and NO tag reads as plain text.
 *
 * The verdict carries the covering node's own extent, so a scope stopping one character
 * short of what TiddlyWiki linked stays visible to the caller.
 *
 * TWO READINGS COME BACK, because a claim and a verdict ask opposite questions of the same
 * span. `kind` reads the WIDEST evidence — does any construct cover this? — which suits a
 * claim, since a grammar names a construct's parts as well as its whole. `innermost` reads
 * the TIGHTEST cover, which suits a verdict: a verdict says the parser built nothing HERE,
 * and `<<:>>` standing inside a heading TiddlyWiki built remains text TiddlyWiki refused.
 *
 * @param {object[]} spans  flatten()'s output
 * @param {number} start
 * @param {number} end
 * @returns {{kind:'built'|'text'|'none', innermost:'built'|'text'|'opaque'|'none', rule:string|null, start:number|null, end:number|null}}
 */
function verdictAt(spans, start, end) {
  const covers = spans.filter(
    (n) =>
      typeof n.start === 'number' &&
      typeof n.end === 'number' &&
      n.start <= start &&
      n.end >= end &&
      n.rule !== 'parseblock'
  );
  if (covers.length === 0) return { kind: 'none', innermost: 'none', rule: null, start: null, end: null };
  const tightest = covers.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
  const built = covers.filter((n) => !isPlainText(n));
  const pool = built.length > 0 ? built : covers;
  const best = pool.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
  // A span the tree cannot speak for. TiddlyWiki records an attribute, a suppressing mark and a
  // macro parameter without emitting a node over them — wikilinkprefix hands back a node that
  // BEGINS after the tilde — so a span sitting inside a construct, starting nowhere a node
  // starts and covered by none of that construct's children, has no reading here either way.
  const childCovers = (spans.some((n) => n.start === start) === false) &&
    !covers.some((n) => n !== tightest && n.start > tightest.start && n.start <= start && n.end >= end);
  // A mark a suppressing rule ate: the refusal it produced begins exactly where this span ends.
  const eaten = spans.some(
    (n) => n.start === end && isPlainText(n) && CONSUMES_A_LEADING_MARK.has(n.rule)
  );
  const unreachable = eaten || (!isPlainText(tightest) && tightest.start !== start && childCovers);
  const innermost = isOpaqueBody(tightest) || unreachable ? 'opaque' : isPlainText(tightest) ? 'text' : 'built';
  return {
    kind: built.length > 0 ? 'built' : 'text',
    innermost,
    rule: best.rule || null,
    start: best.start,
    end: best.end
  };
}

/**
 * Where TiddlyWiki stands on this machine: TW5_PATH, an installed `tiddlywiki` package,
 * or the sibling checkout this repo sits beside. Absent all three the caller skips rather
 * than fails — the courtesy grammars.sh already extends to a grammar it cannot find.
 *
 * @returns {string|null}
 */
function resolveTiddlyWiki() {
  const candidates = [];
  // TW5_PATH names a checkout outright and outranks everything.
  if (process.env.TW5_PATH) candidates.push(process.env.TW5_PATH);
  // A checkout beside this one outranks the pinned package. Parser work happens in a checkout,
  // and the released package would answer for a parser that work has already moved past —
  // silently, since both resolve and both boot.
  candidates.push(path.resolve(__dirname, '..', '..', 'TiddlyWiki5'));
  // The devDependency, so a contributor holding only this repository still runs every gate.
  try {
    candidates.push(path.dirname(require.resolve('tiddlywiki/package.json')));
  } catch {
    /* not installed */
  }
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(c, 'boot', 'boot.js'))) return c;
  }
  return null;
}

const booted = new Map();

/**
 * Boot TiddlyWiki and hand back an oracle over it.
 *
 * `rules` sets $:/config/WikiParserRules entries by their key under that prefix, e.g.
 * `{'Inline/wikilink': 'enable'}`. Those MUST land before the first parse: setupRules
 * deletes disabled rules from WikiParser.prototype, so the first parse fixes the rule set
 * for the life of the instance. Each distinct rule set gets its own boot, cached here.
 *
 * @param {string} twPath
 * @param {{rules?: Record<string,string>}} [options]
 */
function boot(twPath, options = {}) {
  const rules = options.rules || {};
  const key = `${twPath} ${JSON.stringify(Object.entries(rules).sort())}`;
  if (booted.has(key)) return booted.get(key);

  const $tw = require(path.join(twPath, 'boot', 'boot.js')).TiddlyWiki();
  // The rule set MUST stand before boot. Startup parses wikitext of its own, and the first
  // parse runs setupRules, which DELETES disabled rules from WikiParser.prototype — a
  // tiddler added after boot arrives too late to bring one back.
  for (const [name, value] of Object.entries(rules)) {
    $tw.preloadTiddler({ title: `$:/config/WikiParserRules/${name}`, text: value });
  }
  // Boot narrates to stdout; a tool reporting scopes has nothing to say about editions.
  $tw.boot.argv = ['--version'];
  const speak = console.log;
  const write = process.stdout.write;
  console.log = () => {};
  process.stdout.write = () => true;
  let ready = false;
  try {
    $tw.boot.boot(() => {
      ready = true;
    });
  } finally {
    console.log = speak;
    process.stdout.write = write;
  }
  if (!ready) throw new Error('TiddlyWiki booted asynchronously; this oracle needs it synchronous');

  const parse = (text, parserOptions = {}) => $tw.wiki.parseText('text/vnd.tiddlywiki', text, parserOptions);

  const oracle = {
    $tw,
    parse,
    /** Every span TiddlyWiki built from this source, depth-first. */
    spans: (text, parserOptions) => flatten(parse(text, parserOptions).tree),
    /** What TiddlyWiki made of source[start..end). */
    readAt: (text, start, end, parserOptions) => verdictAt(oracle.spans(text, parserOptions), start, end),
    /** The diagnostics TiddlyWiki's own parser raised. */
    diagnostics: (text, parserOptions) => parse(text, parserOptions).diagnostics || [],
    /**
     * The rules TiddlyWiki actually STANDS, per type — the set left after
     * $:/config/WikiParserRules has had its say. A rule TiddlyWiki ships code for and
     * switches off never appears.
     */
    activeRules: () => {
      const p = parse('x');
      return {
        pragma: Object.keys(p.pragmaRuleClasses || {}).sort(),
        block: Object.keys(p.blockRuleClasses || {}).sort(),
        inline: Object.keys(p.inlineRuleClasses || {}).sort()
      };
    }
  };
  booted.set(key, oracle);
  return oracle;
}

module.exports = { flatten, isPlainText, isOpaqueBody, verdictAt, resolveTiddlyWiki, boot };

if (require.main === module) {
  const tw = resolveTiddlyWiki();
  if (!tw) {
    console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const oracle = boot(tw, args.includes('--camelcase') ? { rules: { 'Inline/wikilink': 'enable' } } : {});
  if (args.includes('--rules')) {
    const active = oracle.activeRules();
    for (const type of ['pragma', 'block', 'inline']) {
      console.log(`${type.padEnd(6)} ${String(active[type].length).padStart(2)}  ${active[type].join(' ')}`);
    }
    process.exit(0);
  }
  const src = (args.find((a) => !a.startsWith('--')) || '').replace(/\\n/g, '\n');
  const parsed = oracle.parse(src);
  const show = (n, depth) => {
    const extent = typeof n.start === 'number' ? ` @${n.start}-${n.end}` : '';
    const body = n.text !== undefined ? ` ${JSON.stringify(n.text)}` : '';
    const rule = n.rule ? ` [${n.rule}]` : '';
    console.log(`${'  '.repeat(depth)}${n.type}${n.tag ? `<${n.tag}>` : ''}${rule}${body}${extent}`);
    for (const c of n.children || []) show(c, depth + 1);
  };
  parsed.tree.forEach((n) => show(n, 0));
  for (const d of parsed.diagnostics || []) console.log(`diagnostic ${JSON.stringify(d)}`);
}
