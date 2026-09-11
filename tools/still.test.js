// Does the base hold still?
//
// A full pass over carrier ground surfaces divergences. Instances of a class the ledgers already
// name say the base held and the ground merely widened; a class NOBODY has named says the base
// still moves. That distinction decides when healing yields the priority to designing,
// so it answers to a measurement rather than to a count of quiet weeks.
//
// ⚠ AND THE CONDITION CAN BE MET BY RULING GENEROUSLY. Widen a ledger key far enough and every
// finding falls inside it, which reads identical to a base that settled. So the key's REACH gets
// gated too: a ruling may gain entries and may not gain breadth.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runTool } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the pass reads carrier ground and names every class it finds', live, () => {
  const { code, out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '12']);
  assert.match(out, /still  \d+ of \d+ carrier\(s\) at seed \d+, \d+ quote\(s\) closed to ask, \d+ divergence\(s\) across \d+ class\(es\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

test('a class no ledger names reads as the base still moving', live, () => {
  const { out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '12', '--verbose']);
  assert.match(out, /named by a ledger|unnamed/, out.slice(-500));
});

// The guard the floor asked for: a ruling may gain entries and may not gain reach.
// THE FAULT GETS PLANTED IN A SANDBOX, never in the tree this suite runs against. A collision that
// writes a ledger in place and restores it in `finally` leaves the shared tree wrong for as long as
// the tool runs, and a second reader — another gate, another agent — meets the planted fault as
// though it stood. One such race left a floor file holding a provoked value and failed the next gate
// run for no reason in the tree at all.
test('a ledger key that broadened fails the gate', live, () => {
  const widen = (sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'swallow-ledger.txt');
    const before = fs.readFileSync(ledger, 'utf8');
    // Widened to a key naming NO kind, so the migration reading cannot excuse it, and standing on
    // far more ground than the one it replaces.
    const after = before.replace(/^runaway comment\.\*/m, 'runaway meta.*');
    assert.notStrictEqual(after, before, 'the ledger holds no comment ruling to widen, so nothing gets planted');
    fs.writeFileSync(ledger, after);
  };
  const { code, out } = runInSandbox(widen, ['tools/still.js'], ['--over', 'corpus', '--sample', '4']);
  assert.match(out, /broadened|reaches further/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a ledger key widened and the gate held anyway');
});

// A RULING'S BREADTH ANSWERS TO HOW MANY CAUSES IT CAN ABSORB, never to how much ground it covers.
//
// The token-share ratchet re-seated three times in one session — 55.8, 56.6, 57.2, 60.0 — and every
// reason was true: the corpus is AUTHORED, and this house authors into it constantly. A key's share
// rises when somebody writes more of what already stands ruled, so the number tracks authoring and
// not generosity, and a guard that re-seats on every honest change has stopped guarding.
//
// The hazard it was built for reads: widen a key far enough and every finding falls inside it. That
// names CAUSES, and `region-kind.js` already spells the causes. So a key that spans ONE kind names
// one cause however common that cause runs; a key spanning several absorbs findings nobody reasoned
// about. Authoring a thousand carriers moves neither count.
test('a ruling spans one cause, and the widest stands ratcheted', async () => {
  const { widestRuling, BREADTH_CEILING } = require('./still.js');
  const widest = await widestRuling();
  assert.ok(widest.kinds >= 1, `the widest ruling spans ${widest.kinds} kind(s), so the reading found no ruling at all`);
  assert.ok(widest.kinds <= BREADTH_CEILING,
    `\`${widest.key}\` spans ${widest.kinds} cause(s) against a ceiling of ${BREADTH_CEILING}`);
});

// The fault the ceiling exists for: a key wide enough to swallow causes nobody reasoned about.
test('a key spanning several causes reads wider than one spanning a common cause', async () => {
  const { kindsSpanned } = require('./still.js');
  const wide = await kindsSpanned('meta.*');
  const precise = await kindsSpanned('meta.variable.call.*');
  assert.ok(wide > precise, `a key over every meta scope spans ${wide} cause(s) where a call spans ${precise}`);
  assert.strictEqual(precise, 1, `a call ruling spans ${precise} cause(s), where it names exactly one`);
});

// And the reading stays authoring-invariant, which is the whole point of the move.
test('the breadth of a ruling never moves when the corpus grows', async () => {
  const { kindsSpanned } = require('./still.js');
  const before = await kindsSpanned('meta.variable.call.*');
  const { runInSandbox } = require('./grammar-sandbox.js');
  const { out } = runInSandbox(
    (sandbox) => {
      const file = path.join(sandbox, 'corpus', 'memetic', 'sigils.mem');
      fs.appendFileSync(file, '\n' + '<<~ loulou "lar:///a.b.c">>\n'.repeat(40));
    },
    ['tools/still-breadth.js'], ['meta.variable.call.*']);
  // `still-breadth.js` carries no test file of its own BY DESIGN: it prints one number and nothing
  // else, and the number only means anything from INSIDE a sandbox where the grown corpus stands.
  // A test beside it could only read what this reading already reads.
  assert.strictEqual(Number(out.trim().split('\n').pop()), before,
    'forty more calls in the corpus moved a ruling\'s breadth, so it reads authoring rather than generosity');
});

// One cause, one key — whatever encloses it.
//
// A runaway got keyed on the first meta./source./string. scope in the token's stack, which stands
// OUTERMOST, so the same fault filed under `meta.variable.call.block` where a call opened a block
// and under `meta.paragraph` where the same call opened inside prose. Two keys, one cause, and the
// second stands on 18% of the corpus while naming a fault that reaches one construct.
//
// `attribute-witness` met innermost-versus-outermost three times and the house ruled it: read a
// KIND vocabulary, never a position. This reads the same way.
test('one cause keys the same however it stands enclosed', () => {
  const { kindOf } = require('./still.js');
  const inProse = ['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5',
    'meta.variable.call.inline.tiddlywiki5', 'meta.variable.macrocallinline.tiddlywiki5',
    'meta.variable.call.parameter.tw-.tiddlywiki5', 'string.unquoted.html.tiddlywiki5'];
  const atBlock = ['text.html.tiddlywiki5', 'meta.variable.call.block.tiddlywiki5',
    'meta.variable.macrocallblock.tiddlywiki5', 'meta.variable.call.parameters.tiddlywiki5'];
  assert.strictEqual(kindOf(inProse), kindOf(atBlock),
    'the same open region keys two ways depending on what encloses it');
  assert.match(kindOf(inProse), /call/, `a call keyed as ${kindOf(inProse)}`);
});

// A stack no kind claims must SAY SO. Falling back to whatever scope sits first hands back a key
// that reads like a classification, and the ledger then holds a ruling about a container.
test('a stack no kind claims reads as unclassified rather than as its container', () => {
  const { kindOf } = require('./still.js');
  const key = kindOf(['text.html.tiddlywiki5', 'meta.nothing.here.tiddlywiki5']);
  assert.match(key, /unclassified/, `an unclaimed stack keyed as ${key}`);
});

// The pass must cross ground THIS REPOSITORY DOES NOT HOLD.
//
// The instrument exists for exactly that: a class the ledgers already name says the base held and
// the ground merely widened, and ground the corpus holds cannot widen anything. Measured with the
// gate pointed at `./corpus`: 8 classes, every one already named, and `swallow-witness` finds the
// same 8 over the same 38 files with the same comparison. The pass reported `0 unnamed` — which
// reads as a stopping-condition verdict — while measuring what another gate had already measured.
//
// The host's own tiddlers stand outside this corpus and inside every checkout a gate already needs,
// so the manifest points there.
test('the gate passes over ground the corpus does not hold', () => {
  const body = require(path.join(ROOT, 'package.json')).scripts.still;
  assert.ok(body, 'the manifest names no still gate');
  assert.ok(!/--over\s+\.?\/?corpus\b/.test(body),
    `the gate passes over this repository's own corpus, where swallow-witness already rules: ${body}`);
  assert.match(body, /--host\b/, `the gate names no ground outside the corpus: ${body}`);
});

// A GREEN RUN AT SAMPLE 25 SAYS ALMOST NOTHING. Measured over the whole host ground: 4403 carriers,
// of which 23 carry a divergence class no ledger names. A draw of 25 misses all 23 about seven
// times in eight, so seeds 1, 2, 9 and 13 read green and seed 5 read red off the same tree. The
// verdict rested on the draw, and a ratchet answers to a number that may rise and may never fall.
test('the pass reports the reach its verdict rests on', live, () => {
  const { code, out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--reach']);
  assert.match(out, /reach  \d+ of \d+ carrier\(s\) stand fully named, [\d.]+% \(floor [\d.]+%\)/, out.slice(-800));
  // A carrier no cut reads rides the OTHER side of the denominator. Counting it as named would
  // raise the reach by adding ground nobody crossed.
  assert.match(out, /\d+ carrier\(s\) no cut reads/, out.slice(-800));
  assert.strictEqual(code, 0, out.slice(-800));
});

// The gate itself crosses the HOST ground, where the corpus cannot widen anything.
test('the reach gate crosses ground the corpus does not hold', () => {
  const body = require(path.join(ROOT, 'package.json')).scripts['still-reach'];
  assert.ok(body, 'the manifest names no reach gate');
  assert.match(body, /--host\b/, `the reach gate names no ground outside the corpus: ${body}`);
  assert.match(body, /--reach\b/, `the reach gate takes a draw rather than the ground: ${body}`);
});

test('the reach floor stands where the pass can read it', () => {
  const { REACH_FLOOR, underFloor } = require('./still.js');
  assert.ok(REACH_FLOOR > 0.9, `a floor of ${REACH_FLOOR} guards nothing`);
  assert.ok(underFloor(REACH_FLOOR - 0.01), 'a share below the floor reads as holding');
  assert.ok(!underFloor(REACH_FLOOR), 'the floor reads as under itself');
});

// A ratchet nobody can trip guards nothing.
//
// Collided by taking a ruling AWAY rather than by moving the floor: a floor raised by hand tests
// arithmetic, where a ruling withdrawn tests the thing the floor stands for — carriers falling out
// of the named share. IN A SANDBOX, because the fault lives in a corpus file two other gates read:
// a write into the shared tree that loses a race leaves the ledger commented out behind it, and
// every run after that reads a ledger nobody wrote.
test('a ruling withdrawn drops the reach below the floor', live, () => {
  const { runInSandbox } = require('./grammar-sandbox.js');
  const control = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--reach']);
  assert.strictEqual(control.code, 0,
    `the ground reads below the floor before anything moves: ${control.out.slice(-600)}`);
  const { code, out } = runInSandbox((sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'swallow-ledger.txt');
    const text = fs.readFileSync(ledger, 'utf8');
    fs.writeFileSync(ledger, text.split('\n').map((l) => (/^runaway |^overbound /.test(l) ? `# ${l}` : l)).join('\n'));
  }, ['tools/still.js'], ['--over', 'corpus', '--reach']);
  assert.match(out, /below the floor/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'every corpus ruling withdrew and the reach held anyway');
});

// THE READING COLLAPSED, SO IT WANTS COLLIDING. `divergencesIn` reads a carrier ONCE and resumes
// each cut from the stack that cut's head ends on, where the reading it replaces re-tokenized the
// whole head at every cut. The two agree only if a grammar's stack after a line depends on nothing
// after it — true of a left-to-right reader, and worth measuring rather than asserting: the same
// collapse over a `.tid` also has to survive the header the file's own reading covers and the cut's
// reading does not.
test('one reading per carrier finds the cuts that re-reading each head finds', live, async () => {
  const { divergencesIn, carriers, READINGS } = require('./still.js');
  const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
  const { tokenize } = require('./tokenizer.js');
  const { kindOf } = require('./region-kind.js');
  const tw = resolveTiddlyWiki();
  if (!tw) return;                                   // the pass itself stands down with no checkout
  const oracle = boot(tw, {});
  const SENTINEL = '<<<\nQuoted\n<<<\n';

  /** The reading the collapse replaces: the whole head, tokenized again at every cut. */
  const slowly = async (file) => {
    const reading = READINGS[path.extname(file)];
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    if (/^\\rules /m.test(text) || lines.length > 400) return null;
    const found = [];
    for (let cut = 1; cut <= lines.length; cut += 1) {
      const head = lines.slice(0, cut).join('\n').replace(/\n+$/, '');
      if (!head.trim()) continue;
      const specimen = `${head}\n\n${SENTINEL}`;
      const read = reading.body ? reading.body(specimen) : specimen;
      const at = read.lastIndexOf(SENTINEL);
      const line = specimen.split('\n').length - 4;
      if (at < 0) continue;
      const tokens = (await tokenize(reading.scope, specimen))[line] ?? [];
      const tree = flatten(oracle.parse(read).tree, { sameSpace: true });
      const parser = tree.some((n) => n.rule === 'quoteblock' && n.start === at);
      const grammar = tokens
        .some((t) => t.scopes.some((s) => s.startsWith('punctuation.definition.markup.quote.quoteblock.begin')));
      if (parser === grammar) continue;
      const scopes = tokens.flatMap((t) => t.scopes)
        .filter((s) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(s) && !/quoteblock/.test(s));
      const key = parser ? kindOf(scopes) : (() => {
        const covering = tree.filter((n) => typeof n.start === 'number' && n.start <= at && n.end >= at && n.rule);
        return covering.length ? covering[covering.length - 1].rule : '(nothing)';
      })();
      found.push({ cut, id: `${parser ? 'runaway' : 'overbound'} ${key}` });
    }
    return found;
  };

  const files = carriers(path.join(tw, 'editions'));
  let state = 7;
  const roll = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const shuffled = files.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(roll() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let cuts = 0;
  for (const file of shuffled.slice(0, 40)) {
    const fast = await divergencesIn(file);
    const slow = await slowly(file);
    assert.deepStrictEqual(fast, slow, `the two readings part over ${file}`);
    cuts += (fast ?? []).length;
  }
  // THE CONTROL. Two readings that both find nothing agree perfectly and prove nothing.
  assert.ok(cuts > 0, 'no carrier in the draw diverges at any cut, so the two readings agree over nothing');
});

// The probe's sentinel answers in `tools/sentinel.test.js`, beside the module that spells it: the
// width rule, the closer order, and the head that leaves a quote open. This pass CONSUMES that
// reading rather than deciding it.
