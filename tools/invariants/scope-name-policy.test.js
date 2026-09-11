// The scope-name policy, held to the tree.
//
// `SCOPE-NAMES.md` states the rule this repository names its scopes by: a scope name reads as a
// PROMISE ABOUT MEANING, so it says what a span IS and never what colour the name would inherit.
// Most of that answers to judgement and no gate will ever decide it — whether a name is TRUE stays
// a reading. Three parts of it a machine can check, and this checks those.
//
// EACH CARRIES A FLOOR rather than a bare assertion. Two of the three stand violated today, at
// sites `corpus/delimiter-ledger.txt` and the policy both record; `syntaxes/**` answers to other
// work. A floor fails when the count GROWS, and fails again when it shrinks without somebody
// lowering the floor — so a cure lands with its gain pinned, and nothing quietly regrows.
//
// The population reads from the grammars through the one collector, so no hand-kept list drifts.
//
//   node --test tools/invariants/scope-name-policy.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { declaredScopesIn } = require('../grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'package.json')).contributes.grammars;

// THE SUFFIXES THIS REPOSITORY WRITES, read from the manifest's own scope names. A declared scope
// closing on one of them belongs to these grammars; anything else names a region handed to a guest
// grammar, which names its own scopes and answers to its own conventions.
const SUFFIXES = [...new Set(manifest.map((g) => g.scopeName.split('.').pop()))];
const ours = () => [...declaredScopesIn(path.join(ROOT, 'syntaxes'))]
  .filter((s) => SUFFIXES.includes(s.split('.').pop())).sort();

// The fourteen roots a theme writes rules against. A name opening on anything else reaches no rule.
const ROOTS = new Set(['comment', 'constant', 'entity', 'invalid', 'keyword', 'markup', 'meta',
  'punctuation', 'source', 'storage', 'string', 'support', 'text', 'variable']);

/** A name whose first segment names no TextMate root. */
const rootLast = (scope) => !ROOTS.has(scope.split('.')[0]);

/**
 * A name nesting `punctuation` under a content root.
 *
 * A scope name says what a span IS, and no span is a kind of heading-punctuation or of
 * string-punctuation. Measured across thirteen flagship grammars, a literal
 * `string.punctuation.definition.*` returns ZERO, and Sublime's own scope-naming guidance rules
 * against the shape. Where a mark should take its content's family, the cure STACKS — a
 * space-separated second scope on the same span — and never nests.
 */
const nestedPunctuation = (scope) => scope.split('.').slice(1).includes('punctuation');

/**
 * A segment carrying one of this repository's suffixes without equalling it.
 *
 * A dropped dot fuses two segments into a word no selector reaches: neither the family before it
 * nor the suffix after. Nothing downstream complains, because the name still READS as a name.
 */
const fusedSegment = (scope) => scope.split('.')
  .some((seg) => SUFFIXES.some((suffix) => seg !== suffix && seg.includes(suffix)));

const report = (list) => list.map((s) => `\n  ${s}`).join('');

test('the collector finds the population the policy answers for', () => {
  assert.ok(ours().length > 400, `${ours().length} scope name(s), which reads as a collector that found little`);
});

test('a violating name reads as a violation and a standing one does not', () => {
  // THE CONTROL, and it runs first. A predicate that fires on nothing reports green about nothing.
  assert.ok(rootLast('bold.punctuation.definition.markup.begin.tiddlywiki5'), 'a root-inverted name read as sound');
  assert.ok(!rootLast('punctuation.definition.markup.begin.bold.tiddlywiki5'), 'the cured spelling read as a violation');
  assert.ok(nestedPunctuation('string.punctuation.definition.operand.begin.tiddlywiki5'), 'a nested punctuation read as sound');
  assert.ok(!nestedPunctuation('punctuation.definition.markup.begin.bold.tiddlywiki5'), 'a leading punctuation read as nested');
  assert.ok(fusedSegment('meta.title.text.htmltiddlywiki5.multids-file'), 'a fused segment read as sound');
  assert.ok(!fusedSegment('meta.title.text.html.tiddlywiki5.multids-file'), 'a whole segment read as fused');
});

// ROOT FIRST. A theme selector reaches a scope by dot-bounded prefix, so only the segments at the
// FRONT can be selected on; a qualifier standing in front of the family root puts the name outside
// every rule written against that family. `MIGRATION.md` records 39 names that moved for this.
const ROOT_LAST_FLOOR = 0;

test('every scope opens on the root a theme writes rules against', () => {
  const bad = ours().filter(rootLast);
  assert.ok(bad.length <= ROOT_LAST_FLOOR, `${bad.length} name(s) opening on no TextMate root, floor ${ROOT_LAST_FLOOR}:${report(bad)}`);
});

// PUNCTUATION STACKS, NEVER NESTS. Seven names stand nested, and they wear two shapes: the filter
// operand's brackets, spelled three ways, and the heading mark that already carries the additive
// device the wrong way round. `corpus/delimiter-ledger.txt` records the heading one as OWED.
const NESTED_PUNCTUATION_FLOOR = 7;

test('no scope nests punctuation under a content root, above the floor', () => {
  const bad = ours().filter(nestedPunctuation);
  assert.ok(bad.length <= NESTED_PUNCTUATION_FLOOR,
    `${bad.length} name(s) nesting punctuation under a content root, floor ${NESTED_PUNCTUATION_FLOOR}:${report(bad)}`);
  assert.ok(bad.length >= NESTED_PUNCTUATION_FLOOR,
    `${bad.length} nested, under the floor of ${NESTED_PUNCTUATION_FLOOR} — lower the floor to pin the gain`);
});

// ONE SEGMENT, ONE WORD. A dropped dot leaves a name no selector reaches from either side.
const FUSED_FLOOR = 1;

test('no segment fuses a suffix onto the word before it, above the floor', () => {
  const bad = ours().filter(fusedSegment);
  assert.ok(bad.length <= FUSED_FLOOR, `${bad.length} fused segment(s), floor ${FUSED_FLOOR}:${report(bad)}`);
  assert.ok(bad.length >= FUSED_FLOOR,
    `${bad.length} fused, under the floor of ${FUSED_FLOOR} — lower the floor to pin the gain`);
});

// THE PREDICATES ABOVE RUN ON NAMES THIS FILE WRITES. That collides the reading and not the
// INSTRUMENT: a gate reading the wrong tree, or no tree, passes those and reports green about
// nothing. So a violating name goes into a real grammar in a sandbox, and the gate must find it.
test('a violating name planted in a grammar turns the gate red', { timeout: 120000 }, () => {
  const { runInSandbox } = require('../grammar-sandbox.js');
  const fs = require('node:fs');
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace('"markup.bold.tiddlywiki5"', '"markup.bold.punctuation.definition.tiddlywiki5"');
    assert.notStrictEqual(after, before, 'the provocation changed no name, so it plants no fault');
    fs.writeFileSync(file, after);
  }, ['tools/invariants/scope-name-policy.test.js']);
  assert.match(out, /nesting punctuation under a content root/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a planted violation held the gate anyway');
});
