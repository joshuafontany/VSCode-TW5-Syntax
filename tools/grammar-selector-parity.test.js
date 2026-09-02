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

const ROOT = path.resolve(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', f), 'utf8'));
const pkg = require(path.join(ROOT, 'package.json'));
const wikitext = read('tiddlywiki5.json');

// Every grammar that wraps the wikitext grammar, found rather than listed. A wrapper references
// that grammar and carries injections of its own; a list of wrappers goes stale the moment one
// more appears, and two of these carried defects while a hand-written list named neither.
const WRAPPERS = Object.fromEntries(
  fs.readdirSync(path.join(ROOT, 'syntaxes'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, read(f)])
    .filter(([, g]) => g.scopeName !== wikitext.scopeName
      && JSON.stringify(g).includes(`"${wikitext.scopeName}`)
      && Object.keys(g.injections || {}).length > 0)
);

/** The selectors a grammar injects on, by the prefix that orders them. */
const selectors = (grammar, prefix) => Object.keys(grammar.injections || {}).filter((k) => k.startsWith(prefix));

// A shared injection stands in ONE grammar, registered to reach every scope that colours
// wikitext. A TextMate injection keys on a scope name and a wrapper carries a different one, so an
// injection written inside the base grammar fires only there. Copying it into each wrapper answers
// that, and costs a wrapper its colouring the moment somebody adds a fifth and forgets — silently,
// since a missing injection paints nothing and reports nothing. One grammar registered to every
// scope answers it instead, and a registration left out reaches nobody, which this reads at once.
test('a shared injection stands in one grammar and reaches every scope', () => {
  const injections = fs.readdirSync(path.join(ROOT, 'syntaxes'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, read(f)])
    .filter(([, g]) => g.injectionSelector);
  assert.ok(injections.length > 0, 'no grammar stands as an injection');

  const declared = new Set(pkg.contributes.grammars.filter((g) => !g.injectTo).map((g) => g.scopeName));
  for (const [file, grammar] of injections) {
    const entry = pkg.contributes.grammars.find((g) => g.scopeName === grammar.scopeName);
    assert.ok(entry, `${file} declares a scope the manifest never registers`);
    assert.ok(Array.isArray(entry.injectTo) && entry.injectTo.length,
      `${file} stands as an injection and reaches no scope`);
    const unreached = [...declared].filter((s) => !entry.injectTo.includes(s));
    assert.deepStrictEqual(unreached, [],
      `${file} reaches every scope but ${unreached.join(', ')}, where the same construct would go uncoloured`);
  }
});

// A copy beside the registration paints twice or drifts apart. One or the other, never both.
test('no grammar copies an injection a registered grammar already carries', () => {
  const selectors = fs.readdirSync(path.join(ROOT, 'syntaxes'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => read(f))
    .filter((g) => g.injectionSelector)
    .map((g) => g.injectionSelector);
  for (const file of fs.readdirSync(path.join(ROOT, 'syntaxes')).filter((f) => f.endsWith('.json'))) {
    const grammar = read(file);
    if (grammar.injectionSelector) continue;
    for (const own of Object.keys(grammar.injections || {})) {
      assert.ok(!selectors.includes(own),
        `${file} copies an injection a registered grammar already carries: ${own}`);
    }
  }
});

// The exclusion selector still stands copied, so the copies answer to each other.
test('any late-ordered exclusion selector matches the wikitext grammar', () => {
  const wrappers = fs.readdirSync(path.join(ROOT, 'syntaxes'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, read(f)])
    .filter(([, g]) => g.scopeName !== wikitext.scopeName && !g.injectionSelector
      && JSON.stringify(g).includes(`"${wikitext.scopeName}`) && Object.keys(g.injections || {}).length > 0);
  for (const [name, grammar] of wrappers) {
    const own = selectors(grammar, 'R:');
    if (own.length === 0) continue;
    assert.strictEqual(own[0], selectors(wikitext, 'R:')[0],
      `${name} excludes different regions from the bad-angle verdict than the wikitext grammar does`);
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

// A rule standing inside a capture begins where the capture begins, which stands mid-line. An
// anchor there matches nothing: `^` wants a line start and `$` a line end, and the capture offers
// neither. Three rules carried `^.*$` inside a capture and matched nothing at all, so a table
// caption and a table's class row went uncoloured while the grammar declared names for both.
//
// This holds MATCH rules. Eight begin/end regions carry the same anchors inside a capture and
// fire — the one-line definition bodies among them, which the suite asserts and the snapshots
// pin. An isolated grammar reproducing that shape painted nothing, and nobody has traced the
// difference, so the gate reaches as far as the measurement does and no further.
test('no rule inside a capture anchors to a line boundary', () => {
  for (const file of fs.readdirSync(path.join(ROOT, 'syntaxes')).filter((f) => f.endsWith('.json'))) {
    const grammar = read(file);
    const anchored = [];
    const walk = (node, insideCapture) => {
      if (!node || typeof node !== 'object') return;
      if (insideCapture && typeof node.match === 'string' && /^\^|\$$/.test(node.match)) {
        anchored.push(`${file}: ${node.match}`);
      }
      for (const key of Object.keys(node)) {
        const nested = insideCapture || ['captures', 'beginCaptures', 'endCaptures'].includes(key);
        walk(node[key], nested);
      }
    };
    walk(grammar, false);
    assert.deepStrictEqual(anchored, [], `rule(s) anchored to a line boundary inside a capture, which matches nothing: ${anchored.join(', ')}`);
  }
});
