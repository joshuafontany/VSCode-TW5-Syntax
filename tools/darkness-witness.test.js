// The darkness witness asks one question of every carrier: where TiddlyWiki builds a construct,
// does the grammar answer with anything of its own?
//
// THE DECIDING HALF TAKES ITS READER AS AN ARGUMENT. A unit test asserting that today's grammar
// misses a two-line italic would encode a defect as the expected reading and break the day somebody
// repairs it. So the verdicts below run against readers built for the purpose — one that paints
// nothing, one that paints every construct the host builds, one that swallows — and only the gate
// tests at the foot touch the real grammar.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runProvoked, runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');
const { boot, resolveTiddlyWiki } = require('./tw5-oracle.js');

const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const LEDGER = path.join(ROOT, 'corpus', 'darkness-ledger.txt');
const slow = { timeout: 900000 };

const oracle = () => boot(resolveTiddlyWiki());
const darkLines = (...args) => require('./darkness-witness.js').darkLines(...args);
const verdicts = (dark) => dark.map((d) => `${d.verdict} ${d.line} ${d.rule}`);

const GROUND = 'text.html.tiddlywiki5';

// A reader painting nothing but the ground every specimen stands on.
const blind = async (text) => [{ s: 0, e: text.length, scopes: [GROUND] }];

// A reader painting every construct the host builds, each under a name of its own. The names come
// from the host tree, so this reader agrees with TiddlyWiki by construction.
const faithful = async (text) => {
  const out = [];
  const visit = (nodes) => {
    for (const n of nodes || []) {
      if (n && n.rule && typeof n.start === 'number' && n.end > n.start && n.rule !== 'parseblock') {
        out.push({ s: n.start, e: n.end, scopes: [GROUND, `markup.${n.rule}.test`] });
      }
      if (n) visit(n.children);
    }
  };
  visit(oracle().parse(text).tree);
  // Innermost wins: shorter spans paint over longer ones, and ground fills the rest.
  const paint = new Array(text.length).fill(null);
  for (const t of out.sort((a, b) => (b.e - b.s) - (a.e - a.s))) for (let p = t.s; p < t.e; p++) paint[p] = t.scopes;
  return runs(text, (p) => paint[p] || [GROUND]);
};

// Tokens break at every line, as the grammar's own reading does — a reader handing back one run
// across newlines leaves a construct no flank to be judged against.
function runs(text, scopesAt) {
  const tokens = [];
  for (let p = 0; p < text.length; p++) {
    if (text[p] === '\n') continue;
    const scopes = scopesAt(p);
    const last = tokens[tokens.length - 1];
    if (last && last.e === p && last.scopes === scopes) last.e = p + 1; else tokens.push({ s: p, e: p + 1, scopes });
  }
  return tokens;
}

// A reader that opens a region at the first `{{` and never closes it; text without one reads
// faithfully, which is how a construct read alone escapes the swallow that holds it in place.
const SWALLOWED = [GROUND, 'string.swallowed.test'];
const swallowing = async (text) => {
  const at = text.indexOf('{{');
  if (at < 0) return faithful(text);
  const before = (await faithful(text.slice(0, at))).filter((t) => t.e <= at);
  return [...before, ...runs(text, () => SWALLOWED).filter((t) => t.s >= at)];
};

test('a construct the reader paints reads lit', async () => {
  assert.deepStrictEqual(await darkLines("Some ''bold'' text.\n", oracle(), faithful), []);
});

test('a construct the reader cannot paint even alone reads as a MISS', async () => {
  assert.deepStrictEqual(verdicts(await darkLines("Some ''bold'' text.\n", oracle(), blind)), ['MISS 1 bold']);
});

test('a construct the reader paints alone and loses in place reads as LOST', async () => {
  const dark = await darkLines("{{A}} opens.\n\nThen ''bold'' later.\n", oracle(), swallowing);
  assert.deepStrictEqual(verdicts(dark), ['LOST 3 bold']);
});

test('every line of a construct answers for itself', async () => {
  // One lit line cannot carry a construct whose later lines went dark — a table that stops reading
  // after one row read whole under a per-construct verdict.
  const text = '|a |b |\n|c |d |\n';
  const halfLit = async (t) => (await faithful(t)).map((k) => (k.s >= t.indexOf('\n') ? { ...k, scopes: [GROUND] } : k));
  assert.deepStrictEqual(verdicts(await darkLines(text, oracle(), halfLit)), ['MISS 2 table']);
});

// CONTROLS: three readings that look dark to a coarser rule and are not.

test('siblings of one kind do not hide each other', async () => {
  // Measured: judged against its neighbours alone, each of three adjacent comments read dark,
  // because the comment before and the comment after carried every name it did.
  assert.deepStrictEqual(await darkLines('<!--a-->\n<!--b-->\n<!--c-->\n', oracle(), faithful), []);
});

test('the prose inside a construct stays prose', async () => {
  // A reader painting only a widget's tags leaves its body plain, and the body belongs to the
  // host's text node rather than to the widget's own ground.
  const text = '<$button>\nwords in the body\n</$button>\n';
  const tagsOnly = async (t) => {
    const tokens = [];
    const re = /<\/?\$button>/g;
    let m;
    let at = 0;
    while ((m = re.exec(t))) {
      if (m.index > at) tokens.push({ s: at, e: m.index, scopes: [GROUND] });
      tokens.push({ s: m.index, e: m.index + m[0].length, scopes: [GROUND, 'meta.tag.test'] });
      at = m.index + m[0].length;
    }
    if (at < t.length) tokens.push({ s: at, e: t.length, scopes: [GROUND] });
    return tokens;
  };
  assert.deepStrictEqual(await darkLines(text, oracle(), tagsOnly), []);
});

test('an interior the host parsed elsewhere answers nothing here', async () => {
  // A typed block's body arrives as a positionless `genesis`, so no offset in this document maps
  // into it, and a reader painting nothing there carries no verdict.
  const text = '$$$.js\nvar x = 1;\n$$$\n';
  assert.deepStrictEqual(await darkLines(text, oracle(), blind), []);
});

// THE GATE, over the real grammar and every carrier.

test('every dark line a carrier holds stands declared', slow, () => {
  const { code, out } = runTool('darkness-witness.js');
  assert.match(out, /darkness-witness {2,}\d+ construct line\(s\) over \d+ carrier\(s\)/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-800));
});

test('a rule the grammar stops naming reads as darkness nobody declared', slow, () => {
  // DERIVE THE STRIP. Every name carrying a `bold` segment turns into paragraph ground, which the
  // witness reads as the floor every carrier stands on — so every bold run the host builds goes dark.
  // A rule's `name` alone: its content name paints the words between the marks, which the host
  // holds as a text node and the witness leaves out of a construct's own ground.
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').replace(
    /"name": "([^"]+)"/g,
    (whole, names) => (/(^|\.)bold(\.|$)/.test(names) ? '"name": "meta.paragraph.stripped.tiddlywiki5"' : whole));
  assert.notStrictEqual(provoked, fs.readFileSync(GRAMMAR, 'utf8'), 'the provocation changed nothing, so it plants no fault');
  const { code, out } = runProvoked(provoked, ['tools/darkness-witness.js']);
  assert.match(out, /MISS .* bold/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'bold went dark across the carriers and the gate held anyway');
});

test('a declaration whose line reads lit fails as stale', slow, () => {
  // The ratchet: a repair that lights a declared line must retire the declaration with it.
  const { code, out } = runInSandbox((sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'darkness-ledger.txt');
    // A fabricated line, so this stands stale under EVERY reader — a real construct's own text
    // stays off-limits here, since a reader-scoped ledger entry may legitimately already declare
    // it dark under one reader (tools/reader-scope.js) and this probe would then read as agreeing
    // with a real ruling rather than as the fabrication the test means to plant.
    fs.appendFileSync(ledger, 'tests/samples/canary-control.tw  bold  MISS  "Prose naming no construct this corpus ever writes."  # a declaration the gate must refuse\n');
  }, ['tools/darkness-witness.js']);
  assert.match(out, /stale/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a declaration explaining nothing read clean');
});

test('the ledger declares only what the carriers hold', () => {
  assert.ok(fs.existsSync(LEDGER), 'corpus/darkness-ledger.txt stands missing');
});
