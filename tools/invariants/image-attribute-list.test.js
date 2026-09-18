// An image's attribute list reads the same on every line it spans.
//
// `[img ... [target]]` takes an HTML-shaped attribute list between the `img` keyword and the inner
// `[`, and TiddlyWiki's own image rule accepts that list across line breaks — `parseutils.js`
// reads attributes with `\s*` between them and never anchors to a line.
//
// A GRAMMAR ANCHORING THAT LIST TO `\G` READS ONE LINE AND NO MORE. `\G` matches only where the
// previous match ended, so it holds on the opener's own line and fails at the first line break;
// every line after the first then falls through to the region's own `markup.other.image` name and
// a reader meets an attribute name, its `=` and its value painted as undifferentiated image body.
//
// So the reading asserts the PROPERTY rather than a line count: an attribute written on a
// continuation line carries the same attribute scopes the identical attribute carries inline.
// Written that way, the specimen can grow a line without the assertion going quiet.
//
// THE CONTROL IS THE SINGLE-LINE FORM, asserted from the same specimen pair. A cure that reaches
// the second line by loosening the region until the list swallows the target would take the
// single-line reading with it, and the control fails where the loss lands.
//
//   node --test tools/invariants/image-attribute-list.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('../tokenizer.js');

// A token carries the span it covers rather than the text inside it — `{startIndex, endIndex,
// scopes}` — so the text comes back from the source line the token stands on. A reader asking a
// token for `.text` gets `undefined`, and every comparison against it then answers "no such token"
// about a specimen the grammar painted correctly.
/** Every scope standing on the first token whose text equals `word`, over all lines. */
async function scopesOn(source, word) {
  const lines = await tokenize('text.html.tiddlywiki5', source);
  const rows = source.split('\n');
  for (let row = 0; row < lines.length; row += 1) {
    for (const token of lines[row]) {
      if ((rows[row] ?? '').slice(token.startIndex, token.endIndex).trim() === word) {
        return token.scopes.join(' ');
      }
    }
  }
  return null;
}

// One attribute, written twice: once inline and once a line down. The two must read alike.
const INLINE = '[img width=50 [ Tip | http://example.com/i.png ]]\n';
const SPANNING = '[img\n    width=50\n    [ Tip | http://example.com/i.png ]]\n';

test('an attribute name reads as an attribute name on the line the list opened', async () => {
  const scopes = await scopesOn(INLINE, 'width');
  assert.ok(scopes, 'the inline specimen built no `width` token, so this measures nothing');
  assert.match(scopes, /entity\.other\.attribute-name/,
    `an image attribute on the opener's own line reads as ${scopes}`);
});

test('an attribute name reads as an attribute name on a line the list spans', async () => {
  const inline = await scopesOn(INLINE, 'width');
  const spanning = await scopesOn(SPANNING, 'width');
  assert.ok(spanning, 'the spanning specimen built no `width` token, so this measures nothing');
  assert.match(spanning, /entity\.other\.attribute-name/,
    `an image attribute one line down reads as ${spanning}, so the attribute list stopped at the break`);
  assert.strictEqual(spanning, inline,
    'the same attribute reads differently inline and one line down');
});

// THE TARGET STAYS THE TARGET. A list that reached the second line by running until the closing
// brackets would paint the image source as an attribute value, and every reading above would still
// pass. This is the arm that notices.
test('the image target reads as a target in both forms', async () => {
  for (const [name, source] of [['inline', INLINE], ['spanning', SPANNING]]) {
    const lines = await tokenize('text.html.tiddlywiki5', source);
    const rows = source.split('\n');
    const scopes = lines.flatMap((line, row) => line
      .filter((t) => (rows[row] ?? '').slice(t.startIndex, t.endIndex).includes('example.com'))
      .flatMap((t) => t.scopes));
    assert.ok(scopes.some((sc) => /markup\.underline\.link\.image/.test(sc)),
      `the ${name} image's target reads as ${[...new Set(scopes)].join(' ')} rather than as an image link`);
  }
});
