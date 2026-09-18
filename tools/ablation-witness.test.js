// The ablation witness asks one question no other gate here asks: does a MARK carry structure?
//
// THE DECIDING HALF TAKES ITS ORACLE AND ITS READER AS ARGUMENTS. A unit test asserting that
// today's grammar over-claims a specific bang would encode a defect as the expected reading and
// break the day somebody repairs it. So the controls below run against a hand-built parser — a few
// lines standing in for TiddlyWiki, wired through the REAL `flatten`/`verdictAt` this codebase
// already trusts — and only the gate test at the foot touches the real grammar and the real host.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool, ROOT } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');
const { flatten, verdictAt } = require('./tw5-oracle.js');
const { ablations, shapeOf, nodeCovering, changesShape, neutral } = require('./ablation-witness.js');

const LEDGER = path.join(ROOT, 'corpus', 'ablation-ledger.txt');
const slow = { timeout: 900000 };

/**
 * A fake oracle over a hand-written `parse`, wired through the SAME `flatten`/`verdictAt` the real
 * oracle uses — so `readAt`'s built/text/opaque reading answers exactly as it would for TiddlyWiki,
 * without booting it.
 */
function fakeOracle(parse) {
  return {
    parse: (text) => ({ tree: parse(text) }),
    readAt: (text, start, end) => verdictAt(flatten(parse(text)), start, end)
  };
}

// A reader claiming one character as a delimiter — `!` in `!word` — the shape every OVERREACH and
// MISS control below reads.
const bangClaimed = async (text) => {
  const scopes = ['text.html.tiddlywiki5'];
  return text.split('').map((ch, i) => ({
    s: i,
    e: i + 1,
    scopes: i === 0 && ch === '!' ? [...scopes, 'punctuation.definition.bang.tiddlywiki5'] : scopes
  }));
};

test('shapeOf ignores text and offsets, and reads type, tag and attribute NAMES', () => {
  const a = [{ type: 'element', tag: 'td', start: 0, end: 5, attributes: { colspan: { value: '2' } }, children: [{ type: 'text', text: 'x' }] }];
  const b = [{ type: 'element', tag: 'td', start: 9, end: 90, attributes: { colspan: { value: '9' } }, children: [{ type: 'text', text: 'a whole different word' }] }];
  assert.deepStrictEqual(shapeOf(a), shapeOf(b));
});

test('shapeOf tells two different tags apart', () => {
  const a = [{ type: 'element', tag: 'td', children: [] }];
  const b = [{ type: 'element', tag: 'th', children: [] }];
  assert.notDeepStrictEqual(shapeOf(a), shapeOf(b));
});

test('neutral never answers with the character it replaces', () => {
  for (const ch of ['!', '<', 'x', 'X', 'q']) assert.notStrictEqual(neutral(ch), ch);
});

test('nodeCovering skips a bare text leaf for the structural node around it', () => {
  const tree = [{ type: 'element', tag: 'p', start: 0, end: 5, children: [{ type: 'text', text: 'abcde', start: 0, end: 5 }] }];
  const node = nodeCovering(tree, 2);
  assert.strictEqual(node.tag, 'p');
});

test('nodeCovering never crosses a restarted coordinate space to a false cover', () => {
  // A child starting BEFORE its parent names a restarted space (parsePragmas nests the whole
  // document after a definition beneath it, rebased to zero) — `flatten(tree, {sameSpace:true})`
  // excludes it, so a large offset the RESTARTED child's own rebased coordinates happen to cover
  // numerically, but which the parent's real, small span never reaches, answers null rather than
  // a false cover.
  const tree = [{ type: 'set', start: 20, end: 40, children: [{ type: 'element', tag: 'p', start: 0, end: 5000, children: [] }] }];
  assert.strictEqual(nodeCovering(tree, 4000), null);
});

// CONTROL: a character the grammar CLAIMS, that the parser never needed.
test('a claimed mark whose ablation changes nothing reads as OVERREACH', async () => {
  // The parser builds the SAME "note" element whether or not the leading `!` stands — an
  // over-claim by construction.
  const oracle = fakeOracle((text) => [{ type: 'element', tag: 'note', rule: 'note', start: 0, end: text.length, children: [] }]);
  const found = await ablations('!word', oracle, bangClaimed);
  assert.deepStrictEqual(found, [{ verdict: 'OVERREACH', line: 1, char: '!', text: '!word' }]);
});

// CONTROL: the SAME claimed mark, where the parser DOES need it.
test('a claimed mark whose ablation changes the shape reports nothing', async () => {
  const oracle = fakeOracle((text) => (text[0] === '!'
    ? [{ type: 'element', tag: 'note', rule: 'note', start: 0, end: text.length, children: [] }]
    : [{ type: 'text', text, start: 0, end: text.length }]));
  assert.deepStrictEqual(await ablations('!word', oracle, bangClaimed), []);
});

// CONTROL: an UNCLAIMED character inside a construct the host built, that the host needs.
test('an unclaimed character whose ablation changes a built shape reads as MISS', async () => {
  const blind = async (text) => [{ s: 0, e: text.length, scopes: ['text.html.tiddlywiki5'] }];
  const oracle = fakeOracle((text) => (text.includes(':')
    ? [{ type: 'element', tag: 'pair', rule: 'pair', start: 0, end: text.length, children: [] }]
    : [{ type: 'element', tag: 'lone', rule: 'lone', start: 0, end: text.length, children: [] }]));
  assert.deepStrictEqual(await ablations('a:b', oracle, blind), [{ verdict: 'MISS', line: 1, char: ':', text: 'a:b' }]);
});

// RED: `neutral()` answers with a LETTER, and a letter can open an identifier where the ablated
// character never could — TiddlyWiki's own lookahead then reads PAST the construct's original
// boundary chasing it (traced: `* [img[ ]]` ablated to `[imgx ]]` carries an attribute list into
// the NEXT line's `[`, building an image the original never held). This parser stands in for that:
// with the marker present it holds two clean siblings; strip it and the first swallows the second,
// growing a nested child that reaches past where the first sibling used to end. The replacement's
// own doing must never read as a MISS.
test('a replacement that builds a construct spilling past the original boundary reads no MISS', async () => {
  const blind = async (text) => [{ s: 0, e: text.length, scopes: ['text.html.tiddlywiki5'] }];
  const oracle = fakeOracle((text) => (text.indexOf('!') === -1
    ? [{ type: 'element', tag: 'li', start: 0, end: text.length, children: [
        { type: 'element', tag: 'phantom', start: 1, end: text.length, children: [] }
      ] }]
    : [
        { type: 'element', tag: 'li', start: 0, end: 3, children: [] },
        { type: 'element', tag: 'li', start: 3, end: text.length, children: [] }
      ]));
  assert.deepStrictEqual(await ablations('a!abbb', oracle, blind), []);
});

// CONTROL: the SAME two-sibling shape, where ablation genuinely DESTROYS the node the original
// held — the first sibling reads as plain prose instead (same width, no growth, no new structure
// underneath it) the way a table row loses its cell when its own `|` goes missing, or a `[[` link
// reads as bare text once its bracket is gone. The MISS must survive.
test('a replacement that destroys a node the original held still reads as MISS', async () => {
  const blind = async (text) => [{ s: 0, e: text.length, scopes: ['text.html.tiddlywiki5'] }];
  const oracle = fakeOracle((text) => (text.includes('!')
    ? [
        { type: 'element', tag: 'li', start: 0, end: 3, children: [] },
        { type: 'element', tag: 'li', start: 3, end: text.length, children: [] }
      ]
    : [
        { type: 'element', tag: 'p', start: 0, end: 3, children: [] },
        { type: 'element', tag: 'li', start: 3, end: text.length, children: [] }
      ]));
  assert.deepStrictEqual(await ablations('a!abbb', oracle, blind), [{ verdict: 'MISS', line: 1, char: '!', text: 'a!abbb' }]);
});

// CONTROL: an unclaimed character the parser never reaches (plain prose) reports nothing, however
// much removing it would matter to a HUMAN reader — the reverse arm asks the host first.
test('an unclaimed character outside anything the host built reports nothing', async () => {
  const blind = async (text) => [{ s: 0, e: text.length, scopes: ['text.html.tiddlywiki5'] }];
  const oracle = fakeOracle((text) => [{ type: 'text', text, start: 0, end: text.length }]);
  assert.deepStrictEqual(await ablations('a:b', oracle, blind), []);
});

// CONTROL: `changesShape` reads the SAME offset fresh in the ablated tree, so a mark whose removal
// moves the construct's own start still reads as a change rather than comparing two unrelated spans.
test('changesShape follows the offset into the ablated tree rather than a fixed span', () => {
  const oracle = fakeOracle((text) => (text[0] === '<'
    ? [{ type: 'element', tag: 'tag', start: 0, end: text.length, children: [] }]
    : [{ type: 'text', text, start: 0, end: text.length }]));
  assert.strictEqual(changesShape('<x>', 0, oracle), true);
});

test('a construct still standing after ablation reads no change', () => {
  const oracle = fakeOracle((text) => [{ type: 'element', tag: 'tag', start: 0, end: text.length, children: [] }]);
  assert.strictEqual(changesShape('<x>', 1, oracle), false);
});

// THE GATE, over the real grammar, the real host and the real carriers.
test('every finding the carriers hold stands declared in corpus/ablation-ledger.txt', slow, () => {
  const { code, out } = runTool('ablation-witness.js');
  assert.match(out, /ablation-witness {2,}\d+ finding\(s\) over \d+ carrier\(s\)/, out.slice(-800));
  assert.strictEqual(code, 0, out.slice(-1200));
});

test('the ledger declares only what the carriers hold', () => {
  assert.ok(fs.existsSync(LEDGER), 'corpus/ablation-ledger.txt stands missing');
});

// SANDBOX PROVOCATION: a ledger line naming a shape no carrier holds reads stale.
test('a declaration explaining nothing reads stale in the sandbox', slow, () => {
  const { code, out } = runInSandbox((sandbox) => {
    const ledger = path.join(sandbox, 'corpus', 'ablation-ledger.txt');
    fs.appendFileSync(ledger,
      'tests/samples/canary-control.tw  ~  OVERREACH  "a line no carrier holds, planted to prove the gate finds it"  # a declaration the gate must refuse\n');
  }, ['tools/ablation-witness.js']);
  assert.match(out, /stale/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a declaration explaining nothing read clean');
});
