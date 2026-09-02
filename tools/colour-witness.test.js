// What a reader sees, held as a gate.
//
// Every other gate reads scope names. A reader reads colours, and the two come apart both ways:
// two names paint alike when no theme rule reaches past their shared family, and one construct
// paints two ways when its parts sit in different families. Neither shows in a snapshot.
//
// Three faults found by eye rather than by any gate answered to this relation — a link whose
// visible text changed colour with the presence of a caption, and a `lar:` root whose three terms
// carried three names and one colour.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { colourOf, declaredScopes, openerCloserPairs, scopesOverWords, APART, TOGETHER } = require('./colour-witness.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const live = { skip: fs.existsSync(THEMES) ? false : 'no bundled themes — run npm install' };

const themes = fs.existsSync(THEMES)
  ? fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
      .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(THEMES, f), 'utf8')); } catch { return null; } })
      .filter(Boolean)
  : [];

test('the resolver reads a theme the way a theme reads a scope', live, () => {
  // A rule reaching further wins, and a descendant selector answers on its last element.
  const theme = { tokenColors: [
    { scope: 'keyword', settings: { foreground: '#111111' } },
    { scope: 'keyword.control', settings: { foreground: '#222222' } },
    { scope: 'meta.thing keyword.other', settings: { foreground: '#333333' } }
  ] };
  assert.strictEqual(colourOf(theme, 'keyword.operator.x'), '#111111');
  assert.strictEqual(colourOf(theme, 'keyword.control.directive.x'), '#222222');
  assert.strictEqual(colourOf(theme, 'keyword.other.x'), '#333333');
  assert.strictEqual(colourOf(theme, 'string.quoted'), null, 'a scope no rule reaches paints as the editor foreground');
});

test('an opener and its closer read alike in every theme', live, () => {
  const scopes = declaredScopes();
  const pairs = openerCloserPairs(scopes);
  const floorFile = path.join(ROOT, 'corpus', 'colour-pair-floor.txt');
  const floor = fs.existsSync(floorFile) ? Number(fs.readFileSync(floorFile, 'utf8').split('\n')[0].trim()) : 0;
  assert.ok(pairs.length >= floor, `${pairs.length} opener/closer pair(s), below the floor of ${floor}`);
  const split = pairs
    .map(([a, b]) => [a, b, themes.filter((t) => colourOf(t, a) !== colourOf(t, b)).length])
    .filter(([, , n]) => n > 0)
    .map(([a, b, n]) => `${n}/${themes.length}  ${a} vs ${b}`);
  assert.deepStrictEqual(split.slice(0, 4), [], `${split.length} pair(s) a theme paints apart`);
});

// A relation over scope NAMES stays true when a rule swaps which capture carries which name, and
// such a swap makes a link's visible text change colour with a caption beside it. So this reads
// the scope each word actually receives, from a snapshot of a specimen.
test('what a reader meets as one thing reads as one colour', { ...live, timeout: 300000 }, () => {
  for (const relation of TOGETHER) {
    const found = scopesOverWords(relation.specimen, relation.words);
    const missing = relation.words.filter((w) => !found[w]);
    assert.deepStrictEqual(missing, [], `${relation.what}: the specimen colours nothing over ${missing.join(', ')}`);
    const carried = relation.words.map((w) => found[w]);
    const differ = themes.filter((t) => new Set(carried.map((s) => colourOf(t, s))).size > 1).length;
    assert.strictEqual(differ, 0, `${relation.what}: ${differ}/${themes.length} themes read it apart (${carried.join(' vs ')})`);
  }
});

test('a declared distinction reaches enough themes to show', live, () => {
  const scopes = declaredScopes();
  for (const relation of APART) {
    const absent = relation.scopes.filter((s) => !scopes.has(s));
    assert.deepStrictEqual(absent, [], `${relation.what}: named scope(s) no grammar emits: ${absent.join(', ')}`);
    const apart = themes.filter((t) => new Set(relation.scopes.map((s) => colourOf(t, s))).size >= relation.scopes.length).length;
    assert.ok(apart >= relation.least, `${relation.what}: ${apart}/${themes.length} themes tell it apart, wanting ${relation.least}`);
  }
});
