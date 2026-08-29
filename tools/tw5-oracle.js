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
// The deciding half — flatten, verdictAt — stands under test in tests/tools/tw5-oracle.test.js.

const fs = require('node:fs');
const path = require('node:path');

/**
 * Every node in a parse tree, depth-first, parents before children.
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
      visit(n.children);
    }
  };
  visit(tree);
  return out;
}

/**
 * Plain text, as opposed to a widget that merely calls itself text.
 *
 * html.js sets a widget's node type from its own tag — `node.type = node.tag.substr(1)` —
 * so `<$text>` builds a node of type "text". Reading type alone reports every `<$text>`
 * widget in TiddlyWiki's own templates as prose the parser refused.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isPlainText(node) {
  return node.type === 'text' && !node.tag;
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
 * @param {object[]} spans  flatten()'s output
 * @param {number} start
 * @param {number} end
 * @returns {{kind:'built'|'text'|'none', rule:string|null, start:number|null, end:number|null}}
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
  if (covers.length === 0) return { kind: 'none', rule: null, start: null, end: null };
  const built = covers.filter((n) => !isPlainText(n));
  const pool = built.length > 0 ? built : covers;
  const best = pool.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
  return {
    kind: built.length > 0 ? 'built' : 'text',
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
  if (process.env.TW5_PATH) candidates.push(process.env.TW5_PATH);
  try {
    candidates.push(path.dirname(require.resolve('tiddlywiki/package.json')));
  } catch {
    /* not installed */
  }
  candidates.push(path.resolve(__dirname, '..', '..', 'TiddlyWiki5'));
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

module.exports = { flatten, isPlainText, verdictAt, resolveTiddlyWiki, boot };

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
