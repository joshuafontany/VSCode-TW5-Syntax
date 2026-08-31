// A grammar that copies another's injection selectors must copy the current ones.
//
// The test-file grammar wraps the wikitext grammar and carries injections of its own, because a
// TextMate injection keys on a scope name and no grammar inherits another's. So two selectors
// stand written twice, and a copy drifts silently: the one narrowing substitution to the macro
// body, and the one excluding the bad-angle verdict from regions that legitimately hold a `<`.
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
const testFile = read('tw5-test-file.json');

/** The selectors a grammar injects on, by the prefix that orders them. */
const selectors = (grammar, prefix) => Object.keys(grammar.injections || {}).filter((k) => k.startsWith(prefix));

test('both grammars inject on selectors to compare', () => {
  assert.ok(selectors(wikitext, 'R:').length === 1, 'the wikitext grammar carries one R: selector');
  assert.ok(selectors(testFile, 'R:').length === 1, 'the test-file grammar carries one R: selector');
  assert.ok(selectors(testFile, 'L:').length >= 2, 'the test-file grammar carries its L: selectors');
});

test('the late-ordered exclusion selector matches the wikitext grammar', () => {
  assert.strictEqual(
    selectors(testFile, 'R:')[0],
    selectors(wikitext, 'R:')[0],
    'the test-file grammar excludes different regions from the bad-angle verdict than the wikitext grammar does'
  );
});

test('substitution injects on the macro body alone, in both grammars', () => {
  const bodySelector = (g) => selectors(g, 'L:').find((k) => k.includes('meta.variable.macro.body'));
  const inWikitext = bodySelector(wikitext);
  const inTestFile = bodySelector(testFile);
  assert.ok(inWikitext && inTestFile, 'a grammar names no macro-body selector');
  assert.strictEqual(
    inTestFile,
    inWikitext,
    'a definition body substitutes in a .tw5.test file and not in a .tw file, or the reverse'
  );
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
