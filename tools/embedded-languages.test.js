// The grammar names a guest language twice, and the two names must agree.
//
// `meta.embedded.block.<lang>` on the region tells VS Code which language lives there, and the
// manifest's `embeddedLanguages` map turns that scope into a language id. Together they carry
// comment-toggling, snippets and bracket-matching across the seam — a fence full of JavaScript
// takes `//` for a comment rather than the host's own. The colour comes from the guest grammar
// and arrives with or without either declaration, so nothing visible breaks when they drift, and
// nothing visible reports the drift either.
//
// VS Code's own markdown grammar writes the pair the same way: `meta.embedded.block.cpp
// source.cpp` as one space-separated contentName.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { declaredScopes } = require('./grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..');
const manifest = require(path.join(ROOT, 'package.json')).contributes;
const grammar = require(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'));

/** Every contentName that hands a region to a guest grammar. */
function embeddings() {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const name = node.contentName;
    if (typeof name === 'string' && /(^|\s)(source\.|text\.(html\.basic|xml))/.test(name)) {
      found.push(name);
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(grammar.repository);
  return found;
}

test('every embedded region names its guest language', () => {
  const bare = embeddings().filter((n) => !n.includes('meta.embedded.'));
  assert.deepStrictEqual([...new Set(bare)], [],
    'contentName(s) handing a region to a guest grammar without naming the language');
});

test('every scope the manifest maps is a scope the grammar emits', () => {
  const emitted = declaredScopes(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'));
  const mapped = new Set();
  for (const g of manifest.grammars) {
    for (const scope of Object.keys(g.embeddedLanguages || {})) mapped.add(scope);
  }
  assert.ok(mapped.size > 0, 'the manifest maps no embedded language at all');
  const orphans = [...mapped].filter((scope) => !emitted.has(scope)).sort();
  assert.deepStrictEqual(orphans, [],
    'embeddedLanguages scope(s) no rule emits, which map nothing');
});

test('every embedded scope the grammar emits is a scope the manifest maps', () => {
  const emitted = [...declaredScopes(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'))]
    .filter((s) => s.startsWith('meta.embedded.block.'));
  const mapped = new Set();
  for (const g of manifest.grammars) {
    for (const scope of Object.keys(g.embeddedLanguages || {})) mapped.add(scope);
  }
  const unmapped = emitted.filter((s) => !mapped.has(s)).sort();
  assert.deepStrictEqual(unmapped, [],
    'embedded scope(s) the manifest maps to no language, so the editor learns nothing from them');
});

// A grammar that colours wikitext and carries no map hands the guest nothing.
test('every grammar that colours wikitext carries the map', () => {
  const wikitext = manifest.grammars.filter((g) => g.language && !/injection/.test(g.path));
  const without = wikitext.filter((g) => !g.embeddedLanguages).map((g) => g.scopeName);
  assert.deepStrictEqual(without, [], 'grammar(s) colouring wikitext with no embeddedLanguages map');
});
