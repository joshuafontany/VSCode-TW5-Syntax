// One computation, one implementation.
//
// Four tools read themes and each carried its own loader and matching rule; ten asked bash for the
// grammar set and each carried the same two lines; three resolved the TiddlyWiki this repo answers
// to; two parsed a `.tid`. Each set stood identical on the day somebody wrote it, and would part
// on the day one of them learned something.
//
// This holds the collapse. A tool reaching past a shared module to do the work itself fails here,
// and so does a shared module nothing reads — a collapse nobody uses costs the same as the
// duplication it replaced, without the honesty of looking duplicated.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOLS = path.join(ROOT, 'tools');

const sources = fs.readdirSync(TOOLS).filter((f) => f.endsWith('.js'))
  .map((f) => ({ name: f, text: fs.readFileSync(path.join(TOOLS, f), 'utf8') }));

/** The code of a file, with its comments removed — a comment naming a thing does not do it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Each shared module, the work it holds, and the file allowed to do that work itself.
const COLLAPSED = [
  { module: 'theme-model.js', doing: /tokenColors/, what: 'reading what a theme paints' },
  { module: 'tokenizer.js', doing: /source \.\/grammars\.sh/, what: 'resolving the grammar set' },
  { module: 'wiki-data.js', doing: /lines\[i\]\.trim\(\) === ''/, what: 'parsing a tiddler file' }
];

for (const { module: owner, doing, what } of COLLAPSED) {
  test(`only ${owner} does the work of ${what}`, () => {
    const others = sources
      .filter((s) => s.name !== owner)
      .filter((s) => doing.test(code(s.text)))
      .map((s) => s.name);
    assert.deepStrictEqual(others, [], `tool(s) doing their own ${what} beside ${owner}`);
  });

  test(`${owner} stands read`, () => {
    const readers = sources.filter((s) => s.name !== owner)
      .filter((s) => new RegExp(`require\\('\\./${owner.replace('.js', '')}`).test(s.text));
    assert.ok(readers.length > 0, `nothing reads ${owner}, so the collapse holds nothing together`);
  });
}

// Host resolution collapsed the same way, and a second resolver would answer differently the day
// either one learned something.
test('only the oracle resolves the TiddlyWiki this repo answers to', () => {
  const others = sources.filter((s) => s.name !== 'tw5-oracle.js')
    .filter((s) => /candidates\.push\(path\.resolve/.test(code(s.text)))
    .map((s) => s.name);
  assert.deepStrictEqual(others, [], 'tool(s) resolving a host of their own beside the oracle');
});
