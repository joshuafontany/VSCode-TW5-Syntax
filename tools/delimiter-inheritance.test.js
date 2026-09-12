// What a delimiter inherits from the content it bounds, held to a ruling.
//
// `contentName` covers the INTERIOR of a region, so a delimiter falls outside the content family
// BY CONSTRUCTION. Nothing downstream notices: the region paints, the content paints, and the mark
// that opened it reads as whatever its own name reaches.
//
// The gate reads the tree and requires a ruling for every parting shape it finds. These provoke it:
// a shape nobody ruled, a ruling for a shape the tree no longer carries, and a ruling that explains
// nothing must each turn it red.
//
//   node --test tools/delimiter-inheritance.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');

const LEDGER = path.join(ROOT, 'corpus', 'delimiter-ledger.txt');

test('every parting shape the tree declares stands ruled', () => {
  const { code, out } = runTool('delimiter-inheritance.js');
  assert.match(out, /\d+ contentName rule\(s\) over \d+ shape\(s\), 0 unruled/, out.slice(-800));
  assert.strictEqual(code, 0, out.slice(-800));
});

test('the reading names each kind and the count under it', () => {
  const { out } = runTool('delimiter-inheritance.js');
  for (const kind of ['inert', 'covering', 'inherits', 'parts', 'unnamed-delimiter']) {
    assert.ok(out.includes(kind), `the reading names no ${kind}`);
  }
  // The inert claim gets MEASURED, never asserted: a `contentName` on a match rule reads identically
  // with and without it, and the control proves the comparison can part two readings that differ.
  assert.match(out, /a contentName on a match rule moves nothing/, 'the inert claim went unmeasured');
  assert.match(out, /control: a contentName on a begin\/end rule moves the reading/, 'no control ran');
});

test('a shape nobody ruled fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const at = lines.findIndex((l) => l.startsWith('parts '));
    assert.notStrictEqual(at, -1, 'the ledger carries no parting ruling to take away');
    lines.splice(at, 1);
    fs.writeFileSync(file, lines.join('\n'));
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /shape\(s\) the tree declares and the ledger rules nowhere/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'an unruled shape held the gate anyway');
});

test('a ruling for a shape the tree no longer carries fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    fs.appendFileSync(file, '\nparts markup.gone <- punctuation.definition   # a shape this tree stopped declaring, left standing in the record\n');
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /ruling\(s\) naming a shape the tree no longer declares/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a stale ruling held the gate anyway');
});

test('a ruling that explains nothing fails the gate', () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'delimiter-ledger.txt');
    const text = fs.readFileSync(file, 'utf8');
    const fixed = text.replace(/^(parts [^#]+#).*$/m, '$1 fine');
    assert.notStrictEqual(fixed, text, 'the provocation shortened no reason');
    fs.writeFileSync(file, fixed);
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, /ruling\(s\) explaining nothing/, out.slice(-800));
  assert.notStrictEqual(code, 0, 'a ruling explaining nothing held the gate anyway');
});

test('the ledger rules the shapes rather than the rules, so it cannot grow per pattern', () => {
  const lines = fs.readFileSync(LEDGER, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.ok(lines.length > 0, 'the ledger rules nothing');
  assert.ok(lines.length < 60, `${lines.length} rulings, which reads as a list per pattern rather than per shape`);
});

// THE DEBT CARRIES A FLOOR. A reason opening OWED records a parting this repository ruled WRONG
// and left standing, so the gate stays green over it and the count stands here instead. A floor
// fails when the debt GROWS, and fails again when it shrinks without somebody lowering the floor,
// so a cure lands with its gain pinned and nothing quietly regrows.
//
// Four stand. A `contentName` on a match rule owes a REMOVAL rather than a cure, and no delimiter
// moves when it lands. The other three owe a RULING: stacking an emphasis run's family onto its own
// marks drops a `construct-legibility` count, and `corpus/legibility-floor.txt` rules that a count
// may rise and may never fall, so the ledger carries the measurement and the operator carries the
// trade.
const OWED_FLOOR = 1;

test('the debt the ledger records stands at its floor', () => {
  const owed = fs.readFileSync(LEDGER, 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .filter((l) => /#\s*OWED/i.test(l));
  const report = owed.map((l) => `\n  ${l.split('#')[0].trim()}`).join('');
  assert.ok(owed.length <= OWED_FLOOR, `${owed.length} ruling(s) owing a cure, floor ${OWED_FLOOR}:${report}`);
  assert.ok(owed.length >= OWED_FLOOR, `${owed.length} owed, under the floor of ${OWED_FLOOR} — lower the floor to pin the gain`);
});

// THE CONTROL. The reading must PART over a debt that is not there, or it agrees with any ledger.
test('a ruling accepting its parting reads as no debt', () => {
  const owing = 'parts markup.x <- punctuation.definition   # OWED the additive cure. A mark outside its run';
  const accepting = 'parts markup.x <- punctuation.definition   # a boundary a reader must see, so the parting serves';
  const debt = (l) => /#\s*OWED/i.test(l);
  assert.ok(debt(owing), 'a reason opening OWED read as no debt');
  assert.ok(!debt(accepting), 'a reason accepting its parting read as debt');
});

// THE CONTROL, AND IT RUNS ON A DELIMITER THAT MUST NOT MOVE. A fence handing its body to a guest
// grammar exists to SHOW the seam, so painting the fence as the guest hides the one thing the fence
// says. The cure that stacks an emphasis run's family onto its marks must therefore read as a
// FINDING when somebody stacks a guest's family onto a fence — a gate that welcomes every stacking
// blesses the wrong ones too.
//
// The provocation derives the fence from the grammar rather than naming a line: it takes the first
// region whose content family the ledger rules as a serving parting and stacks that family onto
// every delimiter capture the region names.
test('stacking a guest family onto a fence that must stay parted reads as a finding', () => {
  const SERVING = 'meta.embedded';
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'syntaxes', 'tiddlywiki5.json');
    const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
    let moved = 0;
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      const content = typeof node.contentName === 'string' ? node.contentName.split(/\s+/)[0] : null;
      if (content && content.split('.').slice(0, 2).join('.') === SERVING && node.begin !== undefined) {
        for (const bound of ['beginCaptures', 'endCaptures']) {
          for (const capture of Object.values(node[bound] || {})) {
            if (typeof capture.name !== 'string') continue;
            capture.name = `${capture.name} ${content}`;
            moved += 1;
          }
        }
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(grammar);
    assert.ok(moved > 0, `no ${SERVING} region offers a delimiter to move, so the provocation plants no fault`);
    fs.writeFileSync(file, JSON.stringify(grammar, null, 4));
  }, ['tools/delimiter-inheritance.js', 'corpus/delimiter-ledger.txt']);
  assert.match(out, new RegExp(`ruling\\(s\\) naming a shape the tree no longer declares[\\s\\S]*parts ${SERVING}`), out.slice(-1200));
  assert.notStrictEqual(code, 0, 'a fence wearing its guest\'s family held the gate anyway');
});
