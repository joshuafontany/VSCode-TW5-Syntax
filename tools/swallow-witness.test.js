// The witness must find a swallow, and must not invent one.
//
// A witness reporting zero reads the same whether the grammar holds every bound or the witness
// stopped looking. Both halves get checked here: the corpus as it stands must leave nothing
// unruled, and a grammar stripped of its bounds must draw reports the ledger does not cover.

const test = require('node:test');
const assert = require('node:assert');
const { runProvoked, runInSandbox } = require('./grammar-sandbox.js');
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
  // ONE SPELLING OF THE BOUND, across every rule that carries it — never one rule's bound. A
  // single rule's bound provokes nothing wherever a second rule bounds the same opener, and the
  // collision then reads green while proving nothing; the inline style run collides that way,
  // since the style BLOCK bounds it too.
  //
  // The grammar spells the line bound five ways and this reaches one of them on purpose. Stripping
  // all five provokes LESS, not more: the inline emphasis rules then run to the end of the file and
  // swallow every other finding into a single paragraph runaway. Measured — one spelling yields 17
  // divergences and 11 unruled, all five yield 12 and 7.
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').split('|(?=^$)').join('');
  const { code, out } = runProvoked(provoked, ['tools/swallow-witness.js']);
  assert.match(out, /[1-9]\d* unruled/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
});

// A ledger outlives what it explains as easily as any other list. A divergence gets fixed, its
// line stays, and the record then carries more standing debt than the repository does.
test('a ruling explaining no divergence fails the gate', live, () => {
  const invent = (sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'swallow-ledger.txt');
    fs.appendFileSync(ledger,
      '\nrunaway meta.nothing.reads.this.way  # a ruling naming a divergence no cut produces\n');
  };
  const { code, out } = runInSandbox(invent, ['tools/swallow-witness.js']);
  assert.match(out, /explaining nothing|no cut reads that way/, out.slice(-500));
  assert.notStrictEqual(code, 0, 'a stale ruling stood and the gate held anyway');
});

// The third ratchet. A region with no line bound that no specimen opens reads exactly like one
// measured and found sound — both come back green.
test('a ceiling lowered past the regions no cut opens fails the gate', live, () => {
  const lower = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'unasked-regions-ceiling.txt');
    const text = fs.readFileSync(file, 'utf8');
    const now = Number(text.split('\n')[0]);
    fs.writeFileSync(file, text.replace(String(now), String(Math.max(0, now - 5))));
  };
  const { code, out } = runInSandbox(lower, ['tools/swallow-witness.js']);
  assert.match(out, /stand unasked, above the ceiling/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the ceiling fell below what stands unasked and the gate held anyway');
});
