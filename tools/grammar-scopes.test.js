// The collector, and the two questions it answers about a region.
//
// `declaredScopes` names what a grammar declares. `unboundedRegions` names which of those regions
// can outlive their own line — and a gate ratchets on that count, so a region misread as unbounded
// inflates the debt while a bound misread as absent hides it. Both directions get provoked here.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { unboundedRegions, regionsEndingOn } = require('./grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');

/** A throwaway grammar carrying exactly the regions a case needs. */
function grammarOf(regions) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scopes-')), 'g.json');
  fs.writeFileSync(file, JSON.stringify({ scopeName: 'source.probe', patterns: regions }));
  return file;
}

// TiddlyWiki's inline emphasis opens only where a closer stands later on the SAME line — the begin
// carries `(?=[^\n]*'')` — and its end breaks at `(?=$)`. Neither half lets it outlive its line.
test('a region ending at end-of-line stands bounded', () => {
  const unbounded = unboundedRegions(GRAMMAR).map((r) => r.name);
  for (const name of ['markup.bold.tiddlywiki5', 'markup.italic.tiddlywiki5',
    'markup.underline.tiddlywiki5', 'markup.superscript.tiddlywiki5', 'markup.subscript.tiddlywiki5']) {
    assert.ok(!unbounded.includes(name), `${name} ends at (?=$) and cannot outlive its line`);
  }
});

// The paragraph rule spells the same bound without a lookahead around it.
test('a bare ^$ alternative counts as a bound', () => {
  const unbounded = unboundedRegions(GRAMMAR).map((r) => r.name);
  assert.ok(!unbounded.includes('meta.paragraph.tiddlywiki5'),
    'meta.paragraph ends on `^$|…` and stops at a blank line');
});

// The control. A reader matching any dollar at all would call every one of these bounded, and the
// count would then report a grammar with no runaway anywhere — green, and blind.
test('an escaped or classed dollar names no bound', () => {
  const file = grammarOf([
    { name: 'probe.escaped', begin: 'a', end: '(<\\/)(\\$)(x)' },
    { name: 'probe.classed', begin: 'b', end: '[$]' },
    { name: 'probe.plain', begin: 'c', end: 'z' },
    { name: 'probe.real', begin: 'd', end: 'z|(?=$)' }
  ]);
  const unbounded = unboundedRegions(file).map((r) => r.name).sort();
  assert.deepStrictEqual(unbounded, ['probe.classed', 'probe.escaped', 'probe.plain'],
    'only a dollar standing as an anchor bounds a region');
});

// A back-reference in the name arrives filled in from the begin match, so the matcher has to admit
// whatever a tag or attribute name puts there.
test('a name carrying a back-reference matches what TextMate fills in', () => {
  const region = unboundedRegions(GRAMMAR).find((r) => r.name.includes('$'));
  assert.ok(region, 'the grammar carries at least one region named with a back-reference');
  const filled = region.name.replace(/\$\d/g, 'div');
  assert.ok(region.re.test(filled), `${region.name} must match ${filled}`);
});

// A PROBE ANSWERS FOR NOTHING A REGION ESCAPES ON. A witness appending a probe asks whether an open
// region carries past a block boundary; a region whose own end escapes at the probe's opener answers
// with the escape rather than its bound, and a witness reading that as a bound reads the probe back.
// The probe's own construct stands apart — a region opening on the marker closes on it by definition.
test('a region ending where a probe opens stands named, and the construct the probe itself opens does not', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ends-on-')), 'g.json');
  fs.writeFileSync(file, JSON.stringify({
    scopeName: 'text.test',
    patterns: [
      { begin: '\\{\\{', end: '(\\}\\})|(?=^(?:!|<<<))', name: 'meta.escapes.test' },
      { begin: '^(<<<)', end: '^(<<<)', name: 'markup.quote.test' },
      { begin: '@@', end: '@@|(?=^$)', name: 'meta.bounded.test' }
    ]
  }));
  assert.deepStrictEqual(regionsEndingOn(file, '<<<'), ['meta.escapes.test']);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});
