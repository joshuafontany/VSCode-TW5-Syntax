// The wiki holds the list; the grammar holds what the wiki says.
//
// A list inside a grammar stands where nobody reviews it. This one lives in the edition, where an
// operator weighs an addition against what TiddlyWiki's core documents — and a projection with no
// gate drifts the moment somebody edits the far end. So the tool runs in check mode here, and the
// tiddler's own shape gets held too: a name that turns out to belong to an author paints their
// variable as the language's, which tells a reader a lie about whose thing it names.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { readData } = require('./wiki-data.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');
const TIDDLER = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'BuiltInVariables.tid');

const run = (args) => runTool('builtins-sync.js', args);

const body = () => {
  return readData('BuiltInVariables.tid').data;
};

test('the grammar carries what the tiddler says', () => {
  const { code, out } = run(['--check']);
  assert.match(out, /the grammar current/, out.slice(-400));
  assert.strictEqual(code, 0);
});

test('the tiddler names something, and names it once', () => {
  const list = body();
  assert.ok(list.exact.length >= 5, `${list.exact.length} exact name(s) — too few to read as a curated list`);
  assert.deepStrictEqual([...new Set(list.exact)], list.exact, 'a name stands twice');
  assert.deepStrictEqual([...list.exact].sort(), list.exact, 'the names stand out of order, which hides a duplicate');
  assert.ok(list.prefixes.every((p) => p.endsWith('-')), 'a prefix that does not end on its separator swallows names beside it');
});

// Every name here claims a construct the core owns. A name TiddlyWiki does not define paints an
// author's variable as the language's own.
test('every name the tiddler claims, TiddlyWiki defines', () => {
      const host = resolveTiddlyWiki();
      if (!host) return; // no TiddlyWiki resolved on this machine
  const docs = path.join(host, 'editions', 'tw5.com', 'tiddlers', 'variables');
  if (!fs.existsSync(docs)) return; // the host's own documentation stands elsewhere on this machine
  const documented = fs.readdirSync(docs).join('\n');
  const unfounded = body().exact.filter((name) => !documented.includes(name));
  assert.deepStrictEqual(unfounded, [],
    "name(s) this grammar calls the core's that TiddlyWiki's own variable documentation never names");
});

// The wiki serves an operator, never the editor. Shipping it would carry a second copy of the
// list into every install, where nothing reads it and nothing keeps it current.
test('the edition stays out of the packaged extension', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.vscodeignore'), 'utf8');
  assert.match(ignore, /^editions\/\*\*$/m, 'the edition would ship inside the extension');
});

test('a tiddler the tool cannot read stops it, rather than emptying the grammar', () => {
  const original = fs.readFileSync(TIDDLER, 'utf8');
  try {
    fs.writeFileSync(TIDDLER, original.replace('type: application/json', 'type: text/plain'));
    const { code, out } = run(['--check']);
    assert.match(out, /declares type text\/plain/, out.slice(-300));
    assert.strictEqual(code, 2, 'a tool that cannot read its source must stop, not report drift');
  } finally {
    fs.writeFileSync(TIDDLER, original);
  }
});
