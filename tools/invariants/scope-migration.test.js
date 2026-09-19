// The migration record answers to the grammars it describes.
//
// A scope name a theme rule names is the whole contract between this grammar and a reader's
// `editor.tokenColorCustomizations`. When a name moves, VS Code reports nothing: the rule stops
// matching and the construct goes the colour of prose. Only a record carries the difference.
//
// A RECORD THAT STOPS AGREEING WITH THE GRAMMAR MISLEADS HARDER THAN NO RECORD. A reader following
// it lands on a name nothing emits and reads their own configuration as the fault. So this holds
// `MIGRATION.md` to both grammars rather than to a reading of it:
//
//   every name the record calls gone stands GONE — the grammar declares it nowhere
//   every replacement the record names, the grammar DECLARES
//   every name gone between the two versions, the record ACCOUNTS FOR — moved or retired
//
// The third one carries the weight. The first two hold over an empty record.
//
//   node --test tools/invariants/scope-migration.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { declaredScopesIn } = require('../grammar-scopes.js');

const ROOT = path.resolve(__dirname, '..', '..');
const RECORD = path.join(ROOT, 'MIGRATION.md');
const PUBLISHED = 'v2.2.1';

/** The published grammars, checked out where a reader cannot disturb them. */
let published = null;
function publishedScopes() {
  if (published) return published;
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'published-'));
  try {
    const listing = execFileSync('git', ['ls-tree', PUBLISHED, 'syntaxes/', '--name-only'],
      { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
    assert.ok(listing.length > 0, `${PUBLISHED} holds no grammar, so this reading measures nothing`);
    for (const file of listing) {
      fs.writeFileSync(path.join(scratch, path.basename(file)),
        execFileSync('git', ['show', `${PUBLISHED}:${file}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
    }
    published = declaredScopesIn(scratch);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return published;
}

const declared = () => declaredScopesIn(path.join(ROOT, 'syntaxes'));

/** Every row the record states, as the names its two name columns hold. */
function rows() {
  const found = [];
  for (const line of fs.readFileSync(RECORD, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 3 || !/^`[a-z]/.test(cells[1])) continue;
    const name = (cell) => (/^`([A-Za-z0-9.$_-]+)`$/.exec(cell) || [])[1] || null;
    found.push({ from: name(cells[1]), to: name(cells[2]) });
  }
  return found;
}

test('the record states rows a reader can follow', () => {
  const found = rows();
  assert.ok(found.length > 50, `the record states ${found.length} row(s), so its agreement proves little`);
  assert.ok(found.every((r) => r.from), 'row(s) naming nothing in the gone column');
  assert.ok(found.some((r) => r.to), 'no row names a replacement, so the record only retires');
});

test('every name the record calls gone, the grammars declare nowhere', () => {
  const now = declared();
  const standing = rows().map((r) => r.from).filter((n) => now.has(n));
  assert.deepStrictEqual(standing, [],
    'name(s) the record calls gone that the grammars still declare — a reader renames a rule that worked');
});

test('every replacement the record names, the grammars declare', () => {
  const now = declared();
  const absent = rows().map((r) => r.to).filter((n) => n && !now.has(n));
  assert.deepStrictEqual(absent, [],
    'replacement(s) nothing emits — a reader follows the record onto a name that paints nothing');
});

// THE ONE THAT CARRIES THE WEIGHT. A record naming half the moves reads exactly like a complete one.
test('every name gone since the published version, the record accounts for', () => {
  const now = declared();
  const gone = [...publishedScopes()].filter((s) => !now.has(s)).sort();
  assert.ok(gone.length > 0, 'nothing moved since the published version, so this record answers to nothing');
  const accounted = new Set(rows().map((r) => r.from));
  assert.deepStrictEqual(gone.filter((s) => !accounted.has(s)), [],
    'scope name(s) gone since the published version that the record never mentions — a reader loses that colour with no message anywhere');
});

// THE HEADLINE PARAGRAPH IS A READING TOO. It states the same four counts the row-by-row checks
// above already derive — a reader trusts the number before counting rows, so a paragraph that
// drifts from the grammars it summarizes misleads exactly like a stale row would, and nothing
// else here would catch it.
test('the headline paragraph states what the grammars now measure', () => {
  const now = declared();
  const pub = publishedScopes();
  const gone = [...pub].filter((s) => !now.has(s));
  const added = [...now].filter((s) => !pub.has(s));
  const text = fs.readFileSync(RECORD, 'utf8');
  const bold = [...text.matchAll(/\*\*(\d+)\*\*/g)].map((m) => Number(m[1]));
  assert.deepStrictEqual(bold.slice(0, 4), [pub.size, now.size, gone.length, added.length],
    `the headline paragraph's four bold numbers must read [published, now, gone, new] = ` +
    `[${pub.size}, ${now.size}, ${gone.length}, ${added.length}], the same reading every row-by-row check above answers to`);
});

// The reader who follows a row must land somewhere BETTER. A replacement carrying its qualifier in
// front of its family root repeats the fault the record exists to describe.
test('a replacement puts a family root where a selector reaches it', () => {
  const ROOTS = ['punctuation', 'markup', 'meta', 'entity', 'keyword', 'variable', 'string',
    'comment', 'constant', 'support', 'invalid', 'text', 'source', 'storage'];
  const inverted = rows().filter((r) => r.to)
    .filter((r) => !ROOTS.includes(r.to.split('.')[0]))
    .map((r) => r.to);
  assert.deepStrictEqual(inverted, [],
    'replacement(s) carrying a qualifier in front of the family root — no theme root selector reaches them either');
});

// THE COLLISION. The readings above must PART over a record that names the wrong thing, or they
// agree with any record at all.
test('a record naming a standing scope, or an absent replacement, reads as a finding', () => {
  const now = declared();
  const standing = [...now][0];
  const parse = (text) => {
    const found = [];
    for (const line of text.split('\n')) {
      const cells = line.split('|').map((c) => c.trim());
      if (cells.length < 3 || !/^`[a-z]/.test(cells[1])) continue;
      const name = (cell) => (/^`([A-Za-z0-9.$_-]+)`$/.exec(cell) || [])[1] || null;
      found.push({ from: name(cells[1]), to: name(cells[2]) });
    }
    return found;
  };
  const planted = parse([
    '| gone | stands as | why |',
    '| --- | --- | --- |',
    `| \`${standing}\` | \`markup.bold.tiddlywiki5\` | a name that never left |`,
    '| `gone.name.tiddlywiki5` | `no.such.scope.tiddlywiki5` | a replacement nothing emits |'
  ].join('\n'));
  assert.strictEqual(planted.length, 2, 'the reading took none of the planted rows');
  assert.deepStrictEqual(planted.map((r) => r.from).filter((n) => now.has(n)), [standing],
    'a record calling a standing scope gone passed unnoticed');
  assert.deepStrictEqual(planted.map((r) => r.to).filter((n) => n && !now.has(n)), ['no.such.scope.tiddlywiki5'],
    'a record naming a replacement nothing emits passed unnoticed');
});
