// A `lar:` URI's root terms and anchor keep the underline the enclosing link family carries.
//
// `styleOf` (`theme-model.js`) resolves each style PROPERTY from the DEEPEST matching rule in the
// scope stack, independently per property — so a leaf scope that wins fontStyle for an unrelated
// reason (Gruvbox Dark Medium's `text.html entity.name.tag`, ruling `bold`) silently overwrites the
// underline the enclosing `markup.underline.link.lar.memetic-wikitext` region set, without touching
// foreground at all. Measured before this file's ruling landed (`LEDGER-3.0.0.md`, 2026-09-21): the
// root's three terms and the `#`-anchor read aqua and bold in Gruvbox Dark Medium, carrying no
// underline, while the punctuation between them stayed underlined — the underline flickered along
// the address. `entity.name.tag.heading/angle/dynamic/anchor.*` now stack a bare
// `markup.underline.*` scope last, which wins fontStyle back without a foreground of its own to
// overwrite the leaf's distinguishing colour.
//
// THE CONTROL: a bare `https://` autolink's own body text carries no such leaf override, so it
// serves as the reading a `lar:` URI should match, not exceed. Both are measured over the full
// bundled theme set, never a single theme, because a single theme can accidentally agree.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadThemes, styleOf } = require('../theme-model.js');
const { tokenizeFrom } = require('../tokenizer.js');

const DIALECT = 'text.html.tiddlywiki5.memetic-wikitext';
const live = { timeout: 300000 };

/** The full scope stack vscode-textmate builds for the character at `at` on tokenized `line`. */
function stackAt(tokens, at) {
  const token = tokens.find((t) => at >= t.startIndex && at < t.endIndex);
  assert.ok(token, `no token covers offset ${at}`);
  return token.scopes;
}

test('a lar: root term keeps at least as much underline reach as the base https autolink', live, async () => {
  const themes = loadThemes();
  const line = 'A lar:///ha.ka.ba/lares/api/pono/meme?k=v#frag and https://example.com/a here.';
  const { tokens } = await tokenizeFrom(DIALECT, [line]);
  const larHeadingAt = line.indexOf('ha');
  const larAnchorAt = line.indexOf('frag');
  const httpsBodyAt = line.indexOf('example.com');
  const larHeadingStack = stackAt(tokens[0], larHeadingAt);
  const larAnchorStack = stackAt(tokens[0], larAnchorAt);
  const httpsBodyStack = stackAt(tokens[0], httpsBodyAt);

  assert.ok(larHeadingStack.some((s) => s.startsWith('entity.name.tag.heading.lar.')),
    'the heading term should still wear its own distinguishing scope');
  assert.ok(larAnchorStack.some((s) => s.startsWith('entity.name.tag.anchor.')),
    'the anchor should still wear its own distinguishing scope');

  const underlineCount = (stack) => themes.filter((t) => {
    const style = styleOf(stack, t);
    return style.fontStyle && style.fontStyle.includes('underline');
  }).length;

  const headingCount = underlineCount(larHeadingStack);
  const anchorCount = underlineCount(larAnchorStack);
  const httpsCount = underlineCount(httpsBodyStack);

  assert.ok(headingCount >= httpsCount,
    `the lar: heading keeps underline in ${headingCount}/${themes.length} themes, the base https `
    + `autolink's own body in ${httpsCount}/${themes.length} — a lar: URI should read AT LEAST `
    + 'as underlined as the URL family it belongs to');
  assert.ok(anchorCount >= httpsCount,
    `the lar: anchor keeps underline in ${anchorCount}/${themes.length} themes, the base https `
    + `autolink's own body in ${httpsCount}/${themes.length}`);
});

test('control: a distinguishing leaf scope with no fontStyle of its own never drops the underline', () => {
  const themes = loadThemes();
  const base = ['text.html.tiddlywiki5', 'markup.underline.link.lar.memetic-wikitext'];
  const withoutFix = [...base, 'entity.name.tag.heading.lar.memetic-wikitext'];
  const withFix = [...base, 'entity.name.tag.heading.lar.memetic-wikitext', 'markup.underline.lar.memetic-wikitext'];
  const count = (stack) => themes.filter((t) => {
    const s = styleOf(stack, t);
    return s.fontStyle && s.fontStyle.includes('underline');
  }).length;
  const before = count(withoutFix);
  const after = count(withFix);
  assert.ok(after > before,
    `the stacked cure should raise underline reach; measured ${before} -> ${after} of ${themes.length}`);
  assert.strictEqual(after, count(base),
    'the stacked cure should reach the CEILING — exactly what the region alone would give with no leaf override');
});
