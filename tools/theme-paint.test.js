// How loudly a scope reads: the prefix match that decides it, and the measurement over the
// bundled themes.
//
// The prefix rule carries the whole tool. `markup.underline` paints
// `markup.underline.link.wikilink.tiddlywiki5`; `markup.underlines` paints nothing; and a
// substring test would call both a match — silently converting a quiet scope into a loud
// one in the report while nothing changed on screen.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { themeRules, paints, loadThemes, paintRate, grammarScopes, THEME_DIR } = require('./theme-paint.js');

// ── the pure half ────────────────────────────────────────────────────────────

test('a theme declares its selectors as a string, a comma list, or an array', () => {
  assert.deepStrictEqual(themeRules({ tokenColors: [{ scope: 'markup.bold' }] }), ['markup.bold']);
  assert.deepStrictEqual(themeRules({ tokenColors: [{ scope: 'a, b ,c' }] }), ['a', 'b', 'c']);
  assert.deepStrictEqual(themeRules({ tokenColors: [{ scope: ['a', 'b'] }] }), ['a', 'b']);
  // A shape carrying no tokenColors names no theme. It arrives when a caller hands back what the
  // loader already flattened, and reading it as a theme with no rules turns a measurement over
  // sixty-five themes into one over nothing, reported green.
  assert.throws(() => themeRules({}), /takes a theme/);
  assert.throws(() => themeRules([]), /takes a theme/);
});

// A theme this reader cannot open gets dropped, and a drop that says nothing turns every reading
// above into one over fewer themes than it names.
test('every theme in the set reads, and none goes quietly', () => {
  const { loadThemes } = require('./theme-model.js');
  loadThemes.dropped.length = 0;
  const themes = loadThemes();
  assert.deepStrictEqual(loadThemes.dropped, [], 'theme(s) the reader dropped without a word');
  assert.ok(themes.length >= 60,
    `${themes.length} theme(s) read, where this repository measures against sixty-five`);
});

test('a selector paints a scope it prefixes on a dot boundary', () => {
  assert.strictEqual(paints('markup.underline.link.wikilink.tiddlywiki5', ['markup.underline']), 'markup.underline');
  assert.strictEqual(paints('markup.underline', ['markup.underline']), 'markup.underline');
});

// The boundary carries the whole tool: without it, `markup.underlines` claims a scope it
// has nothing to do with, and every quiet family would report as painted.
test('a selector that merely shares a prefix of characters paints nothing', () => {
  assert.strictEqual(paints('markup.underline.link.tiddlywiki5', ['markup.underlines']), null);
  assert.strictEqual(paints('meta.link.wikilink.tiddlywiki5', ['meta.linkage']), null);
});

test('a longer selector than the scope paints nothing', () => {
  assert.strictEqual(paints('meta.link', ['meta.link.wikilink']), null);
});

// A descendant selector names a context and then a target; only the target answers.
test('a descendant selector answers for its last element', () => {
  assert.strictEqual(paints('entity.name.tag.html', ['meta.tag entity.name']), 'entity.name');
  assert.strictEqual(paints('meta.tag.html', ['meta.tag entity.name']), null);
});

test('a rate counts each theme once, however many selectors reach the scope', () => {
  const themes = [
    { name: 'a', rules: ['markup.underline', 'markup.underline.link'] },
    { name: 'b', rules: ['meta.brace'] }
  ];
  const { painted, total, via } = paintRate('markup.underline.link.wikilink.tiddlywiki5', themes);
  assert.deepStrictEqual(painted, ['a']);
  assert.strictEqual(total, 2);
  assert.deepStrictEqual(via, { 'markup.underline': 1 });
});

// ── the live half ────────────────────────────────────────────────────────────

const themes = loadThemes();
const live = { skip: themes.length > 0 ? false : 'no bundled themes (run npm install)' };

test('the bundled theme set loads', live, () => {
  assert.ok(themes.length >= 20, `${themes.length} themes`);
  assert.ok(themes.every((t) => t.rules.length > 0));
});

// The measurement this repo acts on: a link-family scope inherits nearly every theme's link
// colour, and a meta-family scope inherits almost none. That gap IS the default switch a
// TextMate grammar holds, and these numbers ground the choice.
test('the link family reads loud and the meta family reads quiet', live, () => {
  const loud = paintRate('markup.underline.link.wikilink.tiddlywiki5', themes).painted.length;
  const quiet = paintRate('meta.link.wikilink.tiddlywiki5', themes).painted.length;
  assert.ok(loud > themes.length / 2, `link family painted by ${loud}/${themes.length}`);
  assert.ok(quiet < themes.length / 4, `meta family painted by ${quiet}/${themes.length}`);
  assert.ok(loud - quiet >= themes.length / 3, 'the gap carries the toggle');
});

test('the grammar emits its scopes where the measurement can reach them', live, () => {
  const scopes = grammarScopes('syntaxes/tiddlywiki5.json');
  assert.ok(scopes.includes('meta.paragraph.tiddlywiki5'));
  assert.ok(scopes.length > 200, `${scopes.length} scopes`);
  assert.ok(fs.existsSync(THEME_DIR));
});

// TiddlyWiki ships CamelCase linking disabled, so the LINK reads quiet by default. A theme
// that paints it anyway does no harm; a majority that did would undo the default.
test('the CamelCase link reads quiet in this grammar', live, () => {
  const scopes = grammarScopes('syntaxes/tiddlywiki5.json').filter(
    (s) => s.includes('wikilink') && !s.startsWith('punctuation.')
  );
  assert.ok(scopes.length > 0, 'the grammar still names the construct');
  for (const scope of scopes) {
    const { painted, total } = paintRate(scope, themes);
    assert.ok(painted.length < total / 4, `${scope} painted by ${painted.length}/${total}`);
  }
});

// The suppressing `~` keeps its punctuation scope, and it earns it: wikilinkprefix carries
// its OWN config key, TiddlyWiki ships it enabled, and it consumes the
// `~` whether or not CamelCase linking stands. Quieting it alongside the link would hide
// markup the parser genuinely reads.
test('the suppressing tilde keeps a punctuation scope, because TiddlyWiki still consumes it', live, () => {
  const scopes = grammarScopes('syntaxes/tiddlywiki5.json').filter((s) => s.includes('suppress.wikilink'));
  assert.deepStrictEqual(scopes, ['punctuation.definition.suppress.wikilink.tiddlywiki5']);
  assert.ok(paintRate(scopes[0], themes).painted.length > themes.length / 2);
});
