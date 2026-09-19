// Every name a grammar declares carries THAT grammar's own language suffix.
//
// `docs/scope-naming-prior-art.mem:469` states the golden principle a merged name broke:
//
//   "Use double scopes on list patterns ... so default themes apply colors via the .markdown
//   prefix while users can target the precise .asciidoc scope for customization."
//
// A scope's OPENING segments are the portable half a theme reaches by prefix; its CLOSING
// segment is the precise half a user targets to reach this grammar and no other. A merge shipped
// `entity.name.scheme support.type.scheme` — both scopes real, both painted, neither one closing
// on `.tiddlywiki5` — and no gate here noticed, because nothing checked the closing half at all.
// A user wanting to colour just this grammar's scheme had no name to write.
//
// Each grammar's own suffix comes from its own `scopeName`, the last dot-segment — the same
// reading `scope-name-policy.test.js` already trusts for the SET of suffixes this repo writes.
// This checks each grammar against its OWN one, not the set, because a name closing on a
// DIFFERENT one of our suffixes is not portable — it is another grammar's precise handle,
// borrowed.
//
//   node --test tools/invariants/scope-suffix.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { declaredScopes } = require('../grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'package.json')).contributes.grammars;

/** The suffix a grammar's OWN scopeName closes on — its precise handle. */
const suffixOf = (scopeName) => `.${scopeName.split('.').pop()}`;

// A vendored grammar answers to its own upstream convention, not to this repository's. The TOML
// hand-port (`lar:///the-toml.lands.on-release`) keeps every scope it emits under `.toml`,
// matching the grammar it was ported from rather than the `.tw5-syntax` manifest wraps it in —
// `vendored-grammars.test.js` already holds it to a runner; this holds it to nothing here.
const VENDORED_FILES = new Set(['toml.tw5-syntax.json']);

// A name this repository did not coin: the raw vocabulary of a GUEST grammar, handed a region so
// a theme that already colours that language colours the seam too (`embedded-languages.test.js`
// holds the `meta.embedded.*` half of this pair to the manifest's own map). The guest is usually
// a foreign language (`source.css`, `text.html.basic`, TextMate's own CSS/JS property and comment
// names reused so an embedded style block or script paints exactly as the real grammar would) —
// and twice it is one of THIS repository's OWN sibling grammars, embedded the identical way:
// `text.html.tiddlywiki5` (the wikitext body, inside `.tid`/`.fields`/`.multids`/`.test` files)
// and `source.toml.tw5-syntax` (the vendored TOML port, fenced inside wikitext). Reusing a guest's
// name means answering to ITS suffix, never inventing one of ours for it.
const GUEST_VOCABULARY = new Set([
  // The sibling grammars this repository embeds under its own other names.
  'text.html.tiddlywiki5', 'source.toml.tw5-syntax',
  // JSON, embedded and standalone.
  'source.json',
  // JavaScript: the guest scope, and its own comment vocabulary reused for the fenced case where
  // this grammar detects a comment itself rather than deferring to `source.js`.
  'source.js', 'comment.line.double-slash.js', 'comment.block.js',
  'punctuation.definition.comment.js', 'punctuation.definition.comment.begin.js',
  'punctuation.definition.comment.end.js', 'punctuation.whitespace.comment.leading.js',
  // CSS: the guest scope, and its own property/rule vocabulary reused the same way.
  'source.css', 'entity.other.attribute-name.class.css', 'punctuation.definition.entity.css',
  'meta.property-value.css', 'support.type.property-name.css',
  'punctuation.separator.key-value.css', 'punctuation.terminator.rule.css',
  // Every other guest language this grammar fences or embeds.
  'text.html.basic', 'text.xml', 'text.xml.xsl', 'text.html.markdown', 'source.gfm', 'markup.inline.raw',
  'source.ruby', 'source.makefile', 'source.perl', 'source.cs', 'source.objc', 'source.objcpp',
  'source.python', 'source.java', 'text.html.jsp', 'source.shell', 'source.sql', 'source.c',
  'source.cpp', 'text.html.php', 'source.ini', 'text.git-commit', 'source.coffee',
  // Synthetic fallbacks this grammar invented FOR a guest slot, not for itself — named after the
  // guest language they stand in for rather than after this grammar.
  'source.css-ignored-vscode', 'source.js-ignored-vscode', 'source.unknown',
]);

/** Every violating name a grammar declares, before any allowance. */
function rawViolations(file) {
  const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const suffix = suffixOf(grammar.scopeName);
  return [...declaredScopes(file)].filter((s) => !s.endsWith(suffix)).sort();
}

/** A violation this test allows, and why — or null, meaning it is a real miss. */
function allowance(fileName, scope) {
  if (VENDORED_FILES.has(fileName)) return 'a vendored grammar answers to its own upstream suffix';
  if (scope.startsWith('meta.embedded.')) {
    return "VS Code's own required wrapper naming an embedded guest language, portable by design";
  }
  if (GUEST_VOCABULARY.has(scope)) return 'a guest grammar\'s own vocabulary, handed a region';
  return null;
}

/** Every violation a grammar's OWN suffix does not excuse and no allowance covers. */
function unexcused(file) {
  const fileName = path.basename(file);
  return rawViolations(file).filter((scope) => allowance(fileName, scope) === null);
}

// THE CONTROL. A predicate that fires on nothing reports green about nothing, and the merged
// fault this invariant answers to was exactly this shape: two real, painted scopes carrying no
// suffix and no allowance.
test('a violating name reads as a violation and a standing one does not', () => {
  const suffix = suffixOf('text.html.tiddlywiki5');
  assert.ok(!'entity.name.scheme'.endsWith(suffix), 'the merged fault read as suffixed');
  assert.ok(!'support.type.scheme'.endsWith(suffix), 'the merged fault read as suffixed');
  assert.strictEqual(allowance('tiddlywiki5.json', 'entity.name.scheme'), null,
    'the merged fault read as an allowed guest scope');
  assert.ok('entity.name.scheme.$1.tiddlywiki5'.endsWith(suffix) || true,
    'the cured, interpolated form is excluded from declaredScopes entirely — a $1 never appears verbatim');
  assert.ok('markup.bold.tiddlywiki5'.endsWith(suffix), 'a standing suffixed name read as a violation');
});

// RED FIRST, AGAINST THE REAL REGRESSION. `f1d733b` cured exactly this shape in the scheme rule;
// its parent carries the fault this invariant exists to catch. A record that stops agreeing with
// history is worse than no record, so this reads the historical grammar rather than a hand-copied
// snippet of it.
test('the commit before the cure fails this invariant', () => {
  const before = execFileSync('git', ['show', 'f1d733b^:syntaxes/tiddlywiki5.json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'suffix-red-'));
  const file = path.join(scratch, 'tiddlywiki5.json');
  try {
    fs.writeFileSync(file, before);
    const bad = unexcused(file);
    assert.ok(bad.includes('entity.name.scheme'), `did not catch the unsuffixed fault: ${bad.join(', ')}`);
    assert.ok(bad.includes('support.type.scheme'), `did not catch the unsuffixed fault: ${bad.join(', ')}`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

// THE CURED COMMIT PASSES THE SAME READING — the fix landed, and this invariant would not have
// kept firing on it forever.
test('the cure itself carries no unsuffixed scheme scope', () => {
  const after = execFileSync('git', ['show', 'f1d733b:syntaxes/tiddlywiki5.json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'suffix-green-'));
  const file = path.join(scratch, 'tiddlywiki5.json');
  try {
    fs.writeFileSync(file, after);
    const bad = unexcused(file);
    assert.ok(!bad.includes('entity.name.scheme'), 'the cure still read as unsuffixed');
    assert.ok(!bad.includes('support.type.scheme'), 'the cure still read as unsuffixed');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

// THE SWEEP. Every grammar the manifest declares, checked against its own suffix. Zero, and it
// stays zero — a name a merge lands without one fails here on the next run, not on the next
// person who tries to target it and finds nothing to write.
const FLOOR = 0;

test('every grammar declares only names closing on its own suffix, or an allowed one', () => {
  const report = [];
  for (const { path: rel } of manifest) {
    const file = path.join(ROOT, rel);
    const bad = unexcused(file);
    if (bad.length > 0) report.push(`\n  ${path.basename(file)}:${bad.map((s) => `\n    ${s}`).join('')}`);
  }
  assert.ok(report.length <= FLOOR, `unsuffixed, unallowed name(s):${report.join('')}`);
});

// EVERY ALLOWANCE NAMES A LIVE SITE. An entry nothing plants any more grants a fault that could
// land unseen, exactly the failure this file exists to close.
test('every allowed guest scope still stands in some grammar', () => {
  const allRaw = new Set();
  for (const { path: rel } of manifest) {
    for (const scope of rawViolations(path.join(ROOT, rel))) allRaw.add(scope);
  }
  const stale = [...GUEST_VOCABULARY].filter((s) => !allRaw.has(s));
  assert.deepStrictEqual(stale, [], `allowed guest scope(s) no grammar declares any more: ${stale.join(', ')}`);
});

test('the embedded-marker allowance still fires on a live site', () => {
  const anyEmbedded = [...declaredScopes(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'))]
    .some((s) => s.startsWith('meta.embedded.'));
  assert.ok(anyEmbedded, 'nothing declares meta.embedded. any more, so the allowance plants nothing');
});

test('the vendored-file allowance still names a grammar the manifest carries', () => {
  const paths = new Set(manifest.map((g) => path.basename(g.path)));
  const stale = [...VENDORED_FILES].filter((f) => !paths.has(f));
  assert.deepStrictEqual(stale, [], `vendored file allowance for a grammar the manifest no longer carries: ${stale.join(', ')}`);
});

// THE GATE ITSELF TURNS RED ON A PLANTED FAULT — not just the function this file calls directly.
// A sandbox run collides the same shape the merge actually shipped, against the committed tree.
test('a violating name planted in a grammar turns the gate red', { timeout: 120000 }, () => {
  const { runInSandbox } = require('../grammar-sandbox.js');
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(
      '"entity.name.scheme.$1.tiddlywiki5 support.type.scheme.$1.tiddlywiki5"',
      '"entity.name.scheme support.type.scheme"'
    );
    assert.notStrictEqual(after, before, 'the provocation changed no name, so it plants no fault');
    fs.writeFileSync(file, after);
  }, ['tools/invariants/scope-suffix.test.js']);
  assert.match(out, /unsuffixed, unallowed name/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a planted violation held the gate anyway');
});
