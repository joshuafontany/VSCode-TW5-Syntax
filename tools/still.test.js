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
test('a ledger key that broadened fails the gate', live, () => {
  const ledger = path.join(ROOT, 'corpus', 'swallow-ledger.txt');
  const before = fs.readFileSync(ledger, 'utf8');
  try {
    // Widened to a key naming NO kind, so the migration reading cannot excuse it, and standing on
    // far more ground than the one it replaces.
    fs.writeFileSync(ledger, before.replace(/^runaway comment\.\*/m, 'runaway meta.*'));
    const { code, out } = runTool('still.js', ['--over', path.join(ROOT, 'corpus'), '--sample', '4']);
    assert.match(out, /broadened|reaches further/, out.slice(-600));
    assert.notStrictEqual(code, 0, 'a ledger key widened and the gate held anyway');
  } finally {
    fs.writeFileSync(ledger, before);
  }
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
