// The kind TiddlyWiki assigned, and the kind this grammar names.
//
// parseutils.js declares what an attribute value may look like — a string, a text reference, a
// filter, a macro call, a substitution — and this grammar spells all five again in its own
// patterns. Nothing compared the two readings, so a value the grammar reads as one kind and the
// parser reads as another passes every gate here: the scope exists, the corpus reaches it, the
// block boundary holds, and the reading still disagrees with the host.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the grammar names the kind TiddlyWiki assigned, within the ceiling', live, () => {
  const { code, out } = runTool('attribute-witness.js');
  assert.match(out, /attribute-witness  \d+ attribute\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The population comes from the host and has to be large, or a zero means nothing.
test('the population comes from TiddlyWiki, and every type it assigns has a reading', live, () => {
  const { out } = runTool('attribute-witness.js');
  const m = /(\d+) attribute\(s\) across (\d+) type\(s\)/.exec(out);
  assert.ok(m, out.slice(-400));
  assert.ok(Number(m[1]) > 2000, `only ${m[1]} attributes — the corpus went unread`);
  assert.ok(Number(m[2]) >= 5, `only ${m[2]} types — parseutils declares five`);
});

// A type the host assigns and this reading has no entry for must fail loudly rather than count
// as agreement, which is how a hand-kept map goes stale.
test('a type with no reading fails the gate', live, () => {
  const blind = (sandbox) => {
    const file = path.join(sandbox, 'tools', 'attribute-witness.js');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^ {2}indirect:.*$/m, ''));
  };
  const { code, out } = runInSandbox(blind, ['tools/attribute-witness.js']);
  assert.match(out, /indirect/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a type lost its reading and the gate held anyway');
});

test('a ceiling lowered past the disagreements fails the gate', live, () => {
  const lower = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'attribute-kind-ceiling.txt');
    const text = fs.readFileSync(file, 'utf8');
    const now = Number(text.split('\n')[0]);
    fs.writeFileSync(file, text.replace(String(now), String(Math.max(0, now - 10))));
  };
  const { code, out } = runInSandbox(lower, ['tools/attribute-witness.js']);
  assert.match(out, /above the ceiling/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the ceiling fell below the disagreements and the gate held anyway');
});

// A COMMENT THE PRAGMA ZONE HOLDS ENDS MID-LINE, and whatever follows on that line stands OUTSIDE
// the zone. TiddlyWiki reads commentblock in pragma mode, so a comment opening a tiddler sits
// inside it; parsePragmas() consumes the comment, looks again from wherever it ended, finds no
// pragma and hands the rest to parseBlocks(). Eight of TiddlyWiki's own core templates open exactly
// that way. A zone that can only close at a line START keeps them, and every attribute after the
// `-->` goes unpainted while the parser places all of them.
test('a pragma zone that can only close at a line start loses a comment\'s own tail', live, () => {
  const held = (sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
    const zone = grammar.repository['pragma-zone'];
    const before = zone.end;
    // Back to the line-start-only close: drop the mid-line alternative and its wrapper.
    zone.end = before.replace(/^\(\?:/, '').replace(/\|\(\?<=-->\)\(\?!.*\)\)$/, '');
    assert.notStrictEqual(zone.end, before, 'the provocation changed nothing, so it plants no fault');
    assert.match(zone.end, /^\^\(\?!/, `the provocation left ${zone.end}`);
    fs.writeFileSync(file, JSON.stringify(grammar, null, 4));
  };
  const clean = /(\d+) reading the kind TiddlyWiki assigned \(ceiling (\d+)\)/.exec(runTool('attribute-witness.js').out);
  assert.ok(clean, 'no reading stands to collide against');
  const { out } = runInSandbox(held, ['tools/attribute-witness.js']);
  const provoked = /(\d+) reading the kind TiddlyWiki assigned/.exec(out);
  assert.ok(provoked, out.slice(-600));
  assert.ok(Number(provoked[1]) < Number(clean[1]),
    `the zone kept the tail and the same ${provoked[1]} attributes still read their kind, so the close proves nothing`);
});

// EVERY DISAGREEMENT WANTS A NAMED CAUSE. A residue counted but not partitioned reads like a
// measurement and carries none: a class that grows and a class that shrinks cancel in the total,
// and the ceiling holds while the grammar moves underneath it. So each disagreement keys to the
// structure that produced it, and one keying to nothing fails the gate.
test('every disagreement keys to a named class', live, () => {
  const { code, out } = runTool('attribute-witness.js');
  const m = /(\d+) disagreement\(s\) across (\d+) named class\(es\), (\d+) unclassified/.exec(out);
  assert.ok(m, out.slice(-600));
  assert.strictEqual(Number(m[3]), 0, `${m[3]} disagreement(s) key to no class`);
  assert.strictEqual(code, 0, out.slice(-600));
});

// THE CONTROL: a class the reading loses must surface as unclassified rather than fold into a
// neighbour. A ladder whose last rung catches everything reports zero forever.
test('a class lost from the reading fails the gate', live, () => {
  const blind = (sandbox) => {
    const file = path.join(sandbox, 'tools', 'attribute-witness.js');
    const text = fs.readFileSync(file, 'utf8');
    const cut = text.replace(/^ *\['a start tag broken across a blank line'.*$/m, '');
    assert.notStrictEqual(cut, text, 'the provocation changed nothing, so it plants no fault');
    fs.writeFileSync(file, cut);
  };
  const { code, out } = runInSandbox(blind, ['tools/attribute-witness.js']);
  const m = /(\d+) unclassified/.exec(out);
  assert.ok(m, out.slice(-600));
  assert.ok(Number(m[1]) > 0, 'a class went missing and every disagreement still found one');
  assert.notStrictEqual(code, 0, 'a disagreement keyed to nothing and the gate held anyway');
});
