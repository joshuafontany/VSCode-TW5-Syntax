// An injection selector names a scope. Where nothing emits that scope, the injection paints
// nothing and says so nowhere.
//
// A selector matches a scope name as a dot-bounded PREFIX of a scope standing in the stack, so
// one extra segment in the middle of an emitted name puts it out of reach. Measured: the
// substituted-attribute injection selected `text.substituted.attribute.html.tiddlywiki5` while
// the rules emitted `text.substituted.single.attribute.html.tiddlywiki5` and its triple sibling.
// Every gate read green — the value coloured, the scope names checked out, the snapshots pinned
// — and a `$(var)$` inside a backtick attribute value stood as flat text for as long as the
// grammar shipped.
//
// The pinned snapshots carry every scope the corpus reaches, so a selector's reach reads off
// them without running a grammar again.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { readSnapshot } = require('../../tools/snapshot-format.js');

const ROOT = path.resolve(__dirname, '..', '..');
const SAMPLES = path.join(ROOT, 'tests', 'samples');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', f), 'utf8'));

/** Every scope standing in a pinned snapshot. */
function emittedScopes() {
  const out = new Set();
  if (!fs.existsSync(SAMPLES)) return out;
  for (const name of fs.readdirSync(SAMPLES)) {
    if (!name.endsWith('.snap')) continue;
    for (const { annotations } of readSnapshot(fs.readFileSync(path.join(SAMPLES, name), 'utf8'))) {
      for (const ann of annotations) for (const s of ann.scopes) out.add(s);
    }
  }
  return out;
}

// A selector expression carries `L:`/`R:` ordering, comma alternatives, descendant paths, and
// `-` exclusions. Reach turns on the scope names it REQUIRES, so the exclusions come away first —
// splitting on commas before that pulls a multi-term exclusion group apart and reads its members
// as requirements.
const EXCLUSION = /\s-\s*(\([^)]*\)|[^,]+)/g;

/** The scopes a selector requires, and the scopes it excludes. */
function selectorScopes(expression) {
  const excluded = [];
  const positive = expression.replace(EXCLUSION, (m, group) => {
    const body = group.startsWith('(') ? group.slice(1, -1) : group;
    for (const term of body.split(',')) {
      const scope = term.trim().split(/\s+/).pop();
      if (scope) excluded.push(scope);
    }
    return '';
  });
  const required = positive
    .split(',')
    .map((alt) => alt.replace(/^\s*[LR]:/, '').trim().split(/\s+/).pop())
    .filter(Boolean);
  return { required, excluded };
}

/** Does any emitted scope stand at or under this selector's scope? */
const reaches = (scope, emitted) =>
  [...emitted].some((e) => e === scope || e.startsWith(`${scope}.`));

const GRAMMARS = fs.readdirSync(path.join(ROOT, 'syntaxes'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, read(f)]);

const emitted = emittedScopes();
const live = { skip: emitted.size > 0 ? false : 'no pinned snapshots' };

test('the pinned snapshots carry scopes to select against', live, () => {
  assert.ok(emitted.size > 100, `${emitted.size} distinct scopes`);
});

test('a selector naming an emitted scope reaches it, and one naming a hole does not', () => {
  const sample = new Set(['text.substituted.single.attribute.html.tiddlywiki5']);
  assert.ok(reaches('text.substituted', sample), 'a prefix at a dot boundary reaches');
  assert.ok(reaches('text.substituted.single.attribute.html.tiddlywiki5', sample), 'the whole name reaches');
  assert.ok(!reaches('text.substituted.attribute.html.tiddlywiki5', sample),
    'a segment missing from the middle puts the selector out of reach');
  assert.ok(!reaches('text.subst', sample), 'a prefix off a dot boundary reaches nothing');
  assert.deepStrictEqual(selectorScopes('L:meta.paragraph.tiddlywiki5, markup.quote.q').required,
    ['meta.paragraph.tiddlywiki5', 'markup.quote.q']);
  const fenced = selectorScopes('R:text.html - (comment.block, text.html meta.embedded)');
  assert.deepStrictEqual(fenced.required, ['text.html'], 'an exclusion group holds no requirement');
  assert.deepStrictEqual(fenced.excluded, ['comment.block', 'meta.embedded'],
    'a descendant path excludes on its last element');
});

test('every injection selector reaches a scope the corpus emits', live, () => {
  const unreached = [];
  for (const [file, grammar] of GRAMMARS) {
    const expressions = [
      ...Object.keys(grammar.injections || {}),
      ...(grammar.injectionSelector ? [grammar.injectionSelector] : [])
    ];
    for (const expression of expressions) {
      for (const scope of selectorScopes(expression).required) {
        if (!reaches(scope, emitted)) unreached.push(`${file}  selects  ${scope}`);
      }
    }
  }
  assert.deepStrictEqual(unreached, [],
    'injection selector(s) naming a scope no rule emits, which paint nothing and report nothing');
});

// An exclusion naming a scope nothing emits fences nothing. It breaks no colour on the day it
// goes stale — it lets through what it stood to hold back, wherever that scope is emitted under
// another name.
test('every injection exclusion fences a scope the corpus emits', live, () => {
  const idle = [];
  for (const [file, grammar] of GRAMMARS) {
    for (const expression of Object.keys(grammar.injections || {})) {
      for (const scope of selectorScopes(expression).excluded) {
        if (!reaches(scope, emitted)) idle.push(`${file}  excludes  ${scope}`);
      }
    }
  }
  assert.deepStrictEqual([...new Set(idle)], [],
    'injection exclusion(s) naming a scope no rule emits, which fence nothing');
});
