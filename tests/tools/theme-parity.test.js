// The parity witness must find a name themes cannot reach, and must not invent one.
//
// A witness reporting zero reads the same whether every construct reaches a theme or the witness
// stopped looking. Both halves get checked: the grammar as it stands passes, and a heading
// renamed back to a scope no theme rules on fails.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const WITNESS = path.join(ROOT, 'tools', 'theme-parity.js');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

const run = () => {
  try {
    return { code: 0, out: execFileSync('node', [WITNESS, '--verbose'], { encoding: 'utf8', cwd: ROOT }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const live = { skip: fs.existsSync(THEMES) ? false : 'no bundled themes', timeout: 600000 };

test('every construct reaches themes the way its markdown twin does', live, () => {
  const { code, out } = run();
  assert.match(out, /0 that themes reach less than markdown's/, out.slice(-500));
  assert.strictEqual(code, 0);
});

test('a heading named where no theme rules on reads as a gap', live, () => {
  const original = fs.readFileSync(GRAMMAR, 'utf8');
  try {
    fs.writeFileSync(GRAMMAR, original
      .replaceAll('markup.heading.1.tiddlywiki5 meta.heading.heading-1.tiddlywiki5', 'meta.heading.heading-1.tiddlywiki5')
      .replaceAll('"contentName": "entity.name.section.tiddlywiki5",', ''));
    const { code, out } = run();
    assert.match(out, /heading text: \d+% of themes colour it/, out.slice(-500));
    assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
  } finally {
    fs.writeFileSync(GRAMMAR, original);
  }
});
