// A construct spanning two lines reads the same on both.
//
// A grammar reads one line at a time, carrying a rule stack in. A construct whose opener and closer
// sit on different lines therefore needs its inner reading declared TWICE — once in the pattern that
// matched the opener's own line, and once in whatever pattern carries the continuation — and a
// grammar that declares the first alone still passes every gate: the region name stands, the
// containment holds, and the scope appears in the snapshot from the first line's reading.
//
// What breaks is the COLOUR. A theme rules on the innermost scope, so a continuation carrying the
// region name alone takes the editor's default foreground while the same characters one line above
// take a tiddler's. A reader sees one object painted two ways and no theme toggle moves it.
//
// The bar comes from the construct's OWN first line rather than from a number: whatever family the
// grammar chose there, the continuation answers to it.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { tokenizeFrom } = require('../tokenizer.js');
const { loadThemes, paintRate } = require('../theme-paint.js');

const SCOPE = 'text.html.tiddlywiki5';
const themes = loadThemes();
const live = { timeout: 300000 };

// Each case names the construct, the two lines it spans, and the text a reader looks at on each.
// The reference text repeats deliberately: the same characters, read once per line.
const WRAPPED = [
  { what: 'a transclusion', lines: ['{{A', 'Tiddler}}'], first: 'A', second: 'Tiddler' },
  { what: 'a templated transclusion', lines: ['{{A/Tiddler||A', 'Template}}'], first: 'A/Tiddler', second: 'Template' }
];

/** The innermost scope the grammar leaves on a piece of text, and how many themes reach it. */
async function reading(lines, row, want) {
  const { tokens } = await tokenizeFrom(SCOPE, lines);
  for (const t of tokens[row]) {
    const piece = lines[row].slice(t.startIndex, t.endIndex);
    if (piece.trim() !== want) continue;
    const inner = t.scopes[t.scopes.length - 1];
    return { inner, painted: paintRate(inner, themes).painted.length, total: themes.length };
  }
  throw new Error(`no single token carries ${JSON.stringify(want)} on line ${row + 1} of ${JSON.stringify(lines.join('\n'))}`);
}

for (const { what, lines, first, second } of WRAPPED) {
  test(`${what} paints its continuation as loudly as its first line`, live, async () => {
    const head = await reading(lines, 0, first);
    const tail = await reading(lines, 1, second);
    // The CONTROL: the first line must itself reach a theme, or this case measures nothing.
    assert.ok(head.painted > 0,
      `${what} reaches no theme on its FIRST line either (${head.inner}), so this case sets no bar`);
    assert.ok(tail.painted >= head.painted,
      `${what} paints its first line in ${head.painted}/${head.total} themes via ${head.inner}, `
      + `and its continuation in ${tail.painted}/${tail.total} via ${tail.inner} — one object, two colours`);
  });
}
