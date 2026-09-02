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

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');

const read = (f) => ({ name: f, text: fs.readFileSync(path.join(TOOLS, f), 'utf8') });
const all = fs.readdirSync(TOOLS).filter((f) => f.endsWith('.js')).map(read);

// The instruments alone. A test sits beside the instrument it collides, and naming the work marks how
// it collides — `theme-paint.test.js` reads a theme on purpose, to prove the tool reads it the same
// way. Holding a test to the rule would forbid the collision that proves the rule.
const sources = all.filter((s) => !s.name.endsWith('.test.js'));

// Spelled in pieces: a rule that names the thing it forbids reads as its own offender.
const ENV = `TW5_${'PATH'}`;

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
  const others = all.filter((s) => s.name !== 'tw5-oracle.js' && s.name !== 'tw5-oracle.test.js')
    .filter((s) => /candidates\.push\(path\.resolve/.test(code(s.text))
      || new RegExp(`process\\.env\\.${ENV}\\s*(\\?\\?|\\|\\|)`).test(code(s.text)))
    .map((s) => s.name);
  assert.deepStrictEqual(others, [], 'file(s) resolving a host of their own beside the oracle');
});

// A test answers to the same rule here. Two of them read `TW5_PATH` and fell back to a sibling
// checkout by hand, which the oracle already does with three more candidates behind it — so a
// contributor whose TiddlyWiki stands somewhere the oracle finds and the hand-rolled pair does not
// saw those two skip while every other gate ran.
test('a test resolves its host through the oracle as well', () => {
  const rolled = all.filter((s) => s.name.endsWith('.test.js') && s.name !== 'tw5-oracle.test.js')
    .filter((s) => code(s.text).includes(ENV) && !/require\('\.\/tw5-oracle/.test(s.text))
    .map((s) => s.name);
  assert.deepStrictEqual(rolled, [], `test(s) reaching for ${ENV} without the oracle`);
});
