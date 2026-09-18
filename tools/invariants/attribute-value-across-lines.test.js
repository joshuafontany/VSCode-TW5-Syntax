// An attribute value reads the same whether it stands on one line or spans several.
//
// A widget attribute takes an indirect value `{{ref}}`, a multi-valued variable `((name))` and a
// filtered run `{{{ filter }}}`. Each opens a REGION bounded by lookarounds, so the region itself
// already carries a value across a line break. What paints the INSIDE of that region decides what a
// reader meets one line down.
//
// A `match` READS ONE LINE AND NO MORE. An interior spelled as a single match paints the whole value
// where the value fits on the opener's line, and paints nothing at all where it does not — the
// characters still stand inside the region, so nothing reports a gap and a reader simply meets an
// unpainted reference.
//
// THE FILTERED FORM IS THE MODEL: its interior stands as a nested begin/end region naming its own
// marks, so the filter rules reach every line between them.
//
// THE CONTROL IS THE SINGLE-LINE FORM, and it carries the weight here. The interior of an indirect
// value answers to `#textReference`, whose match runs to the end of a line — an interior region left
// unbounded therefore swallows its own closing `}}` and the single-line reading breaks while the
// multi-line one appears to work. Every reading below is asserted BOTH ways for that reason: a cure
// that buys the second line by losing the first fails here rather than in a snapshot.
//
//   node --test tools/invariants/attribute-value-across-lines.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('../tokenizer.js');

// A token carries the span it covers rather than the text inside it, so the text comes back from the
// source line the token stands on.
/** Every scope standing on the first token whose text equals `word`. */
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

// Each value written twice: once inline, once carried across a break. The word named is the one a
// reader looks at, and it must read alike both ways.
const FORMS = {
  'an indirect value': {
    word: 'field',
    wants: /entity\.name\.tiddler\.field/,
    inline: '<$link to={{tiddler!!field}}/>\n',
    spanning: '<$link to={{\ntiddler!!field\n}}/>\n'
  },
  'a multi-valued variable': {
    word: 'varname',
    wants: /variable\.name\.mvv\.attribute/,
    inline: '<$link to=((varname))/>\n',
    spanning: '<$link to=((\nvarname\n))/>\n'
  },
  // The form already cured, standing as the model the two above answer to. A repair that broke this
  // would read as progress everywhere else.
  'a filtered value': {
    word: 'tag',
    wants: /keyword\.operator\.filter|entity\.filter/,
    inline: '<$link to={{{ [tag[x]] }}}/>\n',
    spanning: '<$link to={{{\n[tag[x]]\n}}}/>\n'
  }
};

for (const [name, form] of Object.entries(FORMS)) {
  test(`${name} paints its interior on the line it opened`, async () => {
    const scopes = await scopesOn(form.inline, form.word);
    assert.ok(scopes, `the inline specimen built no \`${form.word}\` token, so this measures nothing`);
    assert.match(scopes, form.wants, `${name} reads as ${scopes} on its own line`);
  });

  test(`${name} paints its interior on a line it spans`, async () => {
    const scopes = await scopesOn(form.spanning, form.word);
    assert.ok(scopes, `the spanning specimen built no \`${form.word}\` token, so this measures nothing`);
    assert.match(scopes, form.wants,
      `${name} reads as ${scopes} one line down, so its interior stopped at the break`);
  });
}

// AND THE VALUE MUST END WHERE IT ENDS. An interior region reaching past its own closing marks paints
// the rest of the tag as part of the value, which every reading above would still call a success.
test('a value stops at its closing marks', async () => {
  for (const [name, form] of Object.entries(FORMS)) {
    for (const shape of ['inline', 'spanning']) {
      const source = form[shape];
      const lines = await tokenize('text.html.tiddlywiki5', source);
      const rows = source.split('\n');
      const tail = lines.flatMap((line, row) => line
        .filter((t) => (rows[row] ?? '').slice(t.startIndex, t.endIndex).includes('/>'))
        .flatMap((t) => t.scopes));
      assert.ok(tail.length > 0, `the ${shape} ${name} built no closing tag token`);
      assert.ok(!tail.some((sc) => /attribute\.(indirect|mvv|filtered)/.test(sc)),
        `the ${shape} ${name} runs past its closing marks and paints the tag's own end: ${[...new Set(tail)].join(' ')}`);
    }
  }
});
