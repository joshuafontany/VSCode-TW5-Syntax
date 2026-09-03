// The parity witness must find a name themes cannot reach, and must not invent one.
//
// A witness reporting zero reads the same whether every construct reaches a theme or the witness
// stopped looking. Both halves get checked: the grammar as it stands passes, and a heading
// renamed back to a scope no theme rules on fails.

const test = require('node:test');
const assert = require('node:assert');
const { runProvoked } = require('./grammar-sandbox.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const WITNESS = path.join(ROOT, 'tools', 'theme-parity.js');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

const run = () => runTool(WITNESS, ['--verbose']);

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

// PATTERN INTEGRITY: an exemption answers to what it exempts — and so does a panel member.
//
// The bar this gate holds our grammar to comes from a median over six comparators. A comparator
// carrying nothing still sits in the list, still gets counted in the summary, and quietly leaves the
// median to whoever remains. Measured: rst names a heading on the UNDERLINE rather than on the text
// and splits its emphasis runs where the construct's own words do not stand alone, so it carries two
// constructs of seven. The summary says so now, per comparator, rather than naming six.
test('the summary counts what each comparator actually carried', live, () => {
  const { code, out } = run();
  assert.strictEqual(code, 0, out.slice(-400));
  const summary = out.split('\n').find((l) => l.startsWith('theme-parity'));
  assert.ok(summary, out.slice(-300));
  const counts = [...summary.matchAll(/(markdown|asciidoc|rst|org|mediawiki|mdx) (\d+)/g)]
    .map(([, id, n]) => ({ id, n: Number(n) }));
  assert.strictEqual(counts.length, 6, `the summary named ${counts.length} comparator(s) of six`);
  const empty = counts.filter((c) => c.n === 0);
  assert.deepStrictEqual(empty, [], 'comparator(s) carrying nothing while the panel counts them');
});

test('a construct the panel barely carries still answers to three comparators', live, () => {
  const { out } = run();
  const rows = out.split('\n').filter((l) => /^\s{2}\S.*%\s+\d+%\s+\d/.test(l));
  assert.ok(rows.length >= 5, `the verbose table read ${rows.length} row(s)`);
  for (const row of rows) {
    const panel = Number(/%\s+(\d+)\s{2}/.exec(row)[1]);
    assert.ok(panel >= 3, `a construct took its bar from ${panel} comparator(s): ${row.trim()}`);
  }
});
