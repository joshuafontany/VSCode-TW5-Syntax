// A grammar that copies another's injection selectors must copy the current ones.
//
// Two grammars wrap the wikitext grammar — the test-file grammar and the memetic dialect — and
// each carries injections of its own, because a TextMate injection keys on a scope name and no
// grammar inherits another's. A wrapper that omits one loses what it paints; a wrapper that keeps
// a stale copy paints something else. Both happened. Two selectors stand written three times: the
// one narrowing substitution to the macro body, and the one excluding the bad-angle verdict from
// regions that legitimately hold a `<`.
//
// Drift here reads as a defect in the specimens rather than in the thing they specify. Measured
// before this weld stood: identical bytes carried two bad-angle verdicts inside a .tw5.test file
// and none inside a .tw file, and a procedure body substituted in one and not the other.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', f), 'utf8'));
const wikitext = read('tiddlywiki5.json');
// Every grammar that wraps the wikitext grammar rather than relating to it.
const WRAPPERS = { 'tw5-test-file.json': read('tw5-test-file.json'), 'memetic-wikitext.json': read('memetic-wikitext.json') };

/** The selectors a grammar injects on, by the prefix that orders them. */
const selectors = (grammar, prefix) => Object.keys(grammar.injections || {}).filter((k) => k.startsWith(prefix));

test('each wrapper injects on selectors to compare', () => {
  assert.strictEqual(selectors(wikitext, 'R:').length, 1, 'the wikitext grammar carries one R: selector');
  for (const [name, grammar] of Object.entries(WRAPPERS)) {
    assert.strictEqual(selectors(grammar, 'R:').length, 1, `${name} carries one R: selector`);
    assert.ok(selectors(grammar, 'L:').length >= 1, `${name} carries its L: selectors`);
  }
});

test('the late-ordered exclusion selector matches the wikitext grammar', () => {
  for (const [name, grammar] of Object.entries(WRAPPERS)) {
    assert.strictEqual(
      selectors(grammar, 'R:')[0],
      selectors(wikitext, 'R:')[0],
      `${name} excludes different regions from the bad-angle verdict than the wikitext grammar does`
    );
  }
});

// A matching selector over different patterns paints differently under the same name. A wrapper
// writes `text.html.tiddlywiki5#rule` where the wikitext grammar writes `#rule`, because a
// wrapper reaches the rule through the grammar holding it — so the RULES compare, never the
// spelling. Measured before this stood: both wrappers omitted substitute-filter, and a
// `${ filter }$` placeholder inside a define body coloured ten spans in a .tw file and none in
// either wrapper.
test('every wrapper injects the same rules the wikitext grammar injects', () => {
  const rules = (grammar, selector) =>
    (grammar.injections[selector].patterns || []).map((p) => String(p.include).split('#').pop()).sort();
  const bodySelector = (g) => selectors(g, 'L:').find((k) => k.includes('meta.variable.macro.body'));
  const wanted = rules(wikitext, bodySelector(wikitext));
  for (const [name, grammar] of Object.entries(WRAPPERS)) {
    assert.deepStrictEqual(
      rules(grammar, bodySelector(grammar)),
      wanted,
      `${name} injects different rules under the same selector, so a placeholder paints in one grammar and not the other`
    );
  }
});

test('substitution injects on the macro body alone, in every wrapper', () => {
  const bodySelector = (g) => selectors(g, 'L:').find((k) => k.includes('meta.variable.macro.body'));
  const inWikitext = bodySelector(wikitext);
  assert.ok(inWikitext, 'the wikitext grammar names no macro-body selector');
  for (const [name, grammar] of Object.entries(WRAPPERS)) {
    assert.strictEqual(
      bodySelector(grammar),
      inWikitext,
      `${name} substitutes where the wikitext grammar does not, or fails to where it does`
    );
  }
});

// A key TextMate does not read changes nothing and reads as though it does.
test('no pattern carries a key TextMate never reads', () => {
  const KNOWN = new Set(['name', 'contentName', 'comment', 'match', 'begin', 'end', 'while', 'patterns',
    'captures', 'beginCaptures', 'endCaptures', 'whileCaptures', 'include', 'applyEndPatternLast',
    'disabled', 'injections', 'injectionSelector', 'repository', 'scopeName', 'fileTypes', 'firstLineMatch',
    'foldingStartMarker', 'foldingStopMarker', 'uuid', 'version', '$schema', 'information_for_contributors']);
  for (const file of fs.readdirSync(path.join(ROOT, 'syntaxes'))) {
    const grammar = read(file);
    const seen = new Set();
    // `repository` and `injections` map names an author chooses to patterns. Their KEYS answer to
    // nobody's vocabulary; their values answer to TextMate's.
    const NAMED_MAP = new Set(['repository', 'injections', 'captures', 'beginCaptures', 'endCaptures', 'whileCaptures']);
    const walk = (node, insideNamedMap) => {
      if (!node || typeof node !== 'object') return;
      if (!Array.isArray(node) && !insideNamedMap) {
        for (const k of Object.keys(node)) if (!KNOWN.has(k)) seen.add(k);
      }
      for (const k of Object.keys(node)) walk(node[k], !Array.isArray(node) && NAMED_MAP.has(k));
    };
    walk(grammar, false);
    assert.deepStrictEqual([...seen], [], `${file} carries key(s) TextMate never reads: ${[...seen].join(', ')}`);
  }
});
