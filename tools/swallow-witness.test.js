// The witness must find a swallow, and must not invent one.
//
// A witness reporting zero reads the same whether the grammar holds every bound or the witness
// stopped looking. Both halves get checked here: the corpus as it stands must leave nothing
// unruled, and a grammar stripped of its bounds must draw reports the ledger does not cover.

const test = require('node:test');
const assert = require('node:assert');
const { runProvoked } = require('./grammar-sandbox.js');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const WITNESS = path.join(ROOT, 'tools', 'swallow-witness.js');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');

const run = () => runTool(WITNESS, ['--verbose']);

const live = { skip: fs.existsSync(WITNESS) ? false : 'no witness', timeout: 600000 };

test('every corpus cut reads its block boundary as the parser reads it, or stands ruled', live, () => {
  const { code, out } = run();
  assert.match(out, /0 unruled/, out.slice(-600));
  assert.strictEqual(code, 0);
});

// The battery comes from the corpus rather than from a table, so it has to actually cut. A
// witness that read one file, or none, would report zero as loudly as a sound one.
test('the battery cuts real text, at every line of every corpus file', live, () => {
  const { out } = run();
  const cuts = /(\d+) cut\(s\) across (\d+) corpus file\(s\)/.exec(out);
  assert.ok(cuts, out.slice(-400));
  assert.ok(Number(cuts[1]) > 300, `only ${cuts[1]} cut(s) — the sweep stopped early`);
  assert.ok(Number(cuts[2]) > 15, `only ${cuts[2]} file(s) — the corpus went unread`);
});

// The other direction. A bound that contains a runaway can cut a construct the parser carries
// whole — measured, one landed here and cost 1004 spans their filter scoping.
test('both directions get asked of the same cuts', live, () => {
  const { out } = run();
  assert.match(out, /overbound/, 'the witness must report where the grammar stops short too');
  assert.match(out, /runaway/, 'and where it reads on');
});

// A ruling stands only where TiddlyWiki's own behaviour puts it, so each one names a reason.
test('every ledger line carries a reason', () => {
  const ledger = fs.readFileSync(path.join(ROOT, 'corpus', 'swallow-ledger.txt'), 'utf8');
  for (const raw of ledger.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [body, ...rest] = line.split('#');
    assert.ok(rest.join('#').trim().length > 40,
      `a ruling with no reason rules nothing: ${JSON.stringify(body.trim())}`);
    assert.match(body.trim(), /^(runaway|overbound)\s+\S+$/, `unreadable ledger line: ${line}`);
  }
});

// The collision runs against a COPY of the working tree, so it exercises the witness as it
// stands now rather than as it stood at the last commit.
test('a grammar stripped of its bounds reads as a swallow', live, () => {
  // Every block bound at once, not one rule's. Stripping a single rule stopped provoking the
  // moment a second rule bounded the same opener, and the collision then proved nothing while
  // reading green — measured on the inline style run, which the style BLOCK also bounds.
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').split('|(?=^$)').join('');
  const { code, out } = runProvoked(provoked, ['tools/swallow-witness.js']);
  assert.match(out, /[1-9]\d* unruled/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
});
