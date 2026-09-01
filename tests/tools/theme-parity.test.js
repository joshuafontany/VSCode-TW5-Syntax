// The parity witness must find a name themes cannot reach, and must not invent one.
//
// A witness reporting zero reads the same whether every construct reaches a theme or the witness
// stopped looking. Both halves get checked: the grammar as it stands passes, and a heading
// renamed back to a scope no theme rules on fails.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { runProvoked } = require('./grammar-sandbox.js');
const fs = require('node:fs');
const os = require('node:os');
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

test('every construct reaches themes the way the comparator panel does', live, () => {
  const { code, out } = run();
  assert.match(out, /0 that themes reach less than the panel does/, out.slice(-500));
  assert.strictEqual(code, 0);
});

// A median over six grammars, not one number from markdown. Markdown carries theme rules naming
// markdown itself, and a small grammar scopes almost nothing; the panel must show both.
test('the panel carries enough comparators to set a median', live, () => {
  const { out } = run();
  assert.match(out, /6 comparator grammars/, out.slice(-300));
  for (const id of ['markd', 'ascii', 'rst', 'org', 'media', 'mdx']) {
    assert.ok(out.includes(id), `the panel must show ${id}`);
  }
});

// The collision runs against a COPY of the working tree, so it exercises the witness as it
// stands now rather than as it stood at the last commit.
test('a heading named where no theme rules on reads as a gap', live, () => {
  const provoked = fs.readFileSync(GRAMMAR, 'utf8')
    .replaceAll('markup.heading.1.tiddlywiki5 meta.heading.heading-1.tiddlywiki5', 'meta.heading.heading-1.tiddlywiki5')
    .replaceAll('"contentName": "entity.name.section.tiddlywiki5",', '');
  const { code, out } = runProvoked(provoked, ['tools/theme-parity.js', '--verbose']);
  assert.match(out, /Heading one: \d+% of themes colour it/, out.slice(-500));
  assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
});
