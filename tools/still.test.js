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
  assert.match(out, /still  \d+ of \d+ carrier\(s\) at seed \d+, \d+ divergence\(s\) across \d+ class\(es\)/, out.slice(-600));
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

// A ruling's breadth answers to the GROUND it stands on, never to the punctuation in its name.
//
// The tool's own warning says the condition can be met by ruling generously, and the guard written
// against that scored a key's SHAPE — wildcards and segment count. Measured over the corpus:
// `meta.codeblock.*` scored widest and stands on 3.5% of tokens, `meta.paragraph.tiddlywiki5`
// scored narrowest and stands on 18.2%. Exactly backwards, and a ruling on the second passed.
test('a key standing on more ground reaches further than one standing on less', async () => {
  const { groundOf } = require('./still.js');
  const wide = await groundOf('meta.paragraph.tiddlywiki5');
  const narrow = await groundOf('meta.codeblock.*');
  assert.ok(wide > 0 && narrow > 0, `the corpus reaches neither key: ${wide} / ${narrow}`);
  assert.ok(wide > narrow,
    `a key on ${(100 * wide).toFixed(1)}% of the corpus reads narrower than one on ${(100 * narrow).toFixed(1)}%`);
});

// The guard examined only keys that VANISHED, pairing an old key with a new one that covers it. A
// key nobody replaced — an ADDITION — passed unweighed however much ground it claimed, which is the
// shape a generous ruling actually takes.
test('the ground every ruling claims stands measured and ratcheted', async () => {
  const { ruledGround, GROUND_CEILING, overCeiling } = require('./still.js');
  const share = await ruledGround();
  assert.ok(share > 0, 'the ledgers rule no ground at all, so the ceiling guards nothing');
  assert.ok(!overCeiling(share),
    `the ledgers rule ${(100 * share).toFixed(1)}% of corpus tokens against a ceiling of ${(100 * GROUND_CEILING).toFixed(1)}%`);
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
