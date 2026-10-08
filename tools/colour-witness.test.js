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
const { colourOf, declaredScopes, openerCloserPairs } = require('./colour-witness.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const live = { skip: fs.existsSync(THEMES) ? false : 'no bundled themes — run npm install' };

const themes = fs.existsSync(THEMES)
  ? fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
      .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(THEMES, f), 'utf8')); } catch { return null; } })
      .filter(Boolean)
  : [];

test('the resolver reads a theme the way a theme reads a scope', live, () => {
  // A rule reaching further wins, and A DESCENDANT SELECTOR ANSWERS ONLY WHERE ITS ANCESTOR STANDS.
  // `meta.thing keyword.other` names a keyword INSIDE a `meta.thing`; matching it on its last
  // element alone paints every `keyword.other` in the tree from a rule written for one place.
  const theme = { tokenColors: [
    { scope: 'keyword', settings: { foreground: '#111111' } },
    { scope: 'keyword.control', settings: { foreground: '#222222' } },
    { scope: 'meta.thing keyword.other', settings: { foreground: '#333333' } }
  ] };
  assert.strictEqual(colourOf(theme, 'keyword.operator.x'), '#111111');
  assert.strictEqual(colourOf(theme, 'keyword.control.directive.x'), '#222222');
  // ASKED ALONE, with no `meta.thing` anywhere above it, the descendant rule reaches nothing and
  // the answer falls to `keyword`.
  assert.strictEqual(colourOf(theme, 'keyword.other.x'), '#111111',
    'a descendant selector answered without its ancestor');
  // THE CONTROL: hand over the ancestor and the same rule wins.
  assert.strictEqual(colourOf(theme, ['meta.thing', 'keyword.other.x']), '#333333',
    'a descendant selector refused its own stack');
  assert.strictEqual(colourOf(theme, 'string.quoted'), null, 'a scope no rule reaches paints as the editor foreground');
});

test('the witness answers for every relation it holds', live, () => {
  // THE WITNESS ANSWERS, AND THIS READS ITS ANSWER. Each family's reading resolves a STACK harvested
  // from a specimen or from the corpus, and which grammar a specimen opens under is part of that
  // resolution — a copy of the logic here cannot know it, and one did not: a dialect relation read
  // green in this file while the witness refused it, because the copy asked the base grammar for a
  // construct only the dialect builds. So the tool reports and this holds the report to zero.
  const { code, out } = runTool('colour-witness.js', ['--verbose']);
  for (const line of [
    /0\s+thing\(s\) a reader meets as one and a theme paints apart/,
    /0\s+declared distinction\(s\) too few themes can show/,
    /0\s+declared unity\(ies\) too few themes can show/,
    /0\s+relation\(s\) that stopped checking anything/,
    /0\s+pair\(s\) no carrier exercises/
  ]) assert.match(out, line, out.slice(-900));
  assert.strictEqual(code, 0, out.slice(-900));
});

// A PAIR LIST THAT SHRINKS STOPS CHECKING, and reads clean while it does.
test('the pairs a reader meets stand above their floor', live, () => {
  const pairs = openerCloserPairs(declaredScopes());
  const floorFile = path.join(ROOT, 'corpus', 'colour-pair-floor.txt');
  const floor = fs.existsSync(floorFile) ? Number(fs.readFileSync(floorFile, 'utf8').split('\n')[0].trim()) : 0;
  assert.ok(pairs.length >= floor, `${pairs.length} opener/closer pair(s), below the floor of ${floor}`);
});
