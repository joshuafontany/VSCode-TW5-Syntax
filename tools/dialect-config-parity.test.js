// The dialect's language configuration carries the base's, or says why it does not.
//
// The grammar derives: the dialect includes the wikitext grammar once, copies no rule, and every
// shared injection stands in one grammar registered to both. Measured over 666 corpus lines, the
// two produce the same 2639 spans with the same scopes.
//
// The CONFIGURATION derives from nothing. It sits in a second file with no include and no
// injection, so a bracket dropped from one, a word pattern widened in one, an auto-close added to
// one — each lands in the dialect only when somebody remembers, and that remembering carries the
// lag. It showed: the dialect took `core` from `$:/core/Something` where the base took the whole title.
//
// So each difference stands DECLARED with the reason a dialect needs it, and anything else reads
// as the base moving on alone.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseJsonc } = require('./contributions.test.js');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => parseJsonc(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const base = read('language-configuration.json');
const dialect = read('memetic-language-configuration.json');

// What the dialect may hold differently, and why. A key absent here must match the base exactly.
const DECLARED = {
  autoClosingPairs: 'a sigil closes on ` >>` rather than `>>`, since the house writes `<<~ name >>` with the closer spaced off',
  autoCloseBefore: 'a backtick opens a code span in wikitext and stands ordinary inside a sigil, so the dialect does not stop there',
  wordPattern: 'the dialect takes a `lar:` address and a `#anchor` whole, beside everything the base takes'
};

// A list's ORDER carries no meaning to VS Code for these keys, so two lists holding the same
// pairs read as the same configuration however they sit. Comparing the text instead reports a
// reordering as a lag and teaches a reader to ignore the gate.
const shape = (value) => (Array.isArray(value)
  ? JSON.stringify([...value.map((v) => JSON.stringify(v))].sort())
  : JSON.stringify(value));

test('the dialect declares every key the base declares', () => {
  const missing = Object.keys(base).filter((k) => !(k in dialect)).sort();
  assert.deepStrictEqual(missing, [], 'key(s) the base configures and the dialect leaves unset');
});

test('every difference between them stands declared with a reason', () => {
  const undeclared = [];
  for (const key of Object.keys(base)) {
    if (key in DECLARED) continue;
    if (shape(base[key]) !== shape(dialect[key])) undeclared.push(key);
  }
  assert.deepStrictEqual(undeclared.sort(), [],
    'key(s) where the base moved on and the dialect stayed behind');
});

// A list the dialect trims loses what the base gained — the lag in its commonest shape.
test('the dialect keeps every list entry the base carries, or declares the key', () => {
  const lost = [];
  for (const [key, value] of Object.entries(base)) {
    if (key in DECLARED || !Array.isArray(value)) continue;
    const held = new Set((dialect[key] || []).map(shape));
    for (const entry of value) if (!held.has(shape(entry))) lost.push(`${key}: ${shape(entry)}`);
  }
  assert.deepStrictEqual(lost, [], 'entr(ies) the base carries and the dialect dropped');
});

// A reason nothing needs stops explaining anything, the way a stale relation does.
test('every declared reason answers to a real difference', () => {
  const idle = Object.keys(DECLARED).filter((k) => shape(base[k]) === shape(dialect[k]));
  assert.deepStrictEqual(idle, [], 'declared difference(s) that no longer differ');
});

// The lag actually bit the word pattern, so this holds it to the outcome rather than to the
// string: a `.mem` file holds wikitext, and a system title reads as one word in both.
test('both take a system title whole', () => {
  for (const [name, config] of [['base', base], ['dialect', dialect]]) {
    const match = new RegExp(config.wordPattern).exec('$:/core/Something');
    assert.strictEqual(match && match[0], '$:/core/Something', `${name} breaks a system title into pieces`);
  }
});

// A snippet set answers the same way. `snippets/snippets.json` hands a learner 125 wikitext
// constructs to start from — the pragmas, the widgets, the filter shapes — and the dialect claims to
// hold wikitext entire. It carried the grammar and the configuration and not these, so an author
// writing a `.mem` reached for a widget snippet and met nothing, with no error anywhere to name the
// absence.
test('the dialect carries the base language\'s snippets', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const forLanguage = (id) => new Set((pkg.contributes.snippets || [])
    .filter((s) => s.language === id).map((s) => s.path));
  const base = forLanguage('tiddlywiki5');
  const dialect = forLanguage('memetic-wikitext');
  const missing = [...base].filter((p) => !dialect.has(p));
  assert.deepStrictEqual(missing, [],
    'snippet set(s) the base offers and the dialect does not — the dialect holds wikitext entire');
});

// The fixture language stands apart, and this says so rather than leaving the absence unexplained.
// A `.tw5.test` body carries wikitext under assertion comments that pin every token of it, so a
// snippet inserted there moves the very columns the file exists to name.
test('the syntax-test language takes no snippets, by ruling', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const attached = (pkg.contributes.snippets || []).filter((s) => s.language === 'tiddlywiki5.test');
  assert.deepStrictEqual(attached, [],
    'the syntax-test language took snippets; a snippet there moves the columns an assertion pins');
});
