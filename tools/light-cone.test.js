// A divergence classified by reach, never by a reason somebody wrote down.
//
// Two readers stand over one text and neither holds a global now: the parser walks a document, a
// grammar reads a line and whatever its stack carried in. Where a difference turns on evidence
// outside the grammar's reach it stands STRUCTURAL and no work retires it. Where the evidence sat
// within reach it names a DEFECT. The ledger records one of those two for every entry, and this
// asks whether the record matches the measurement.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('no owed entry reaches past the grammar', live, () => {
  const { code, out } = runTool('light-cone.js');
  assert.match(out, /light-cone  \d+ divergence\(s\)/, out.slice(-600));
  assert.match(out, /0 owed but reaching out/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The probe runs ONE-SIDED and says so. A ruling the arms never moved reports as judgement rather
// than as proof, and refuses nothing — an arm that fails to move proves nothing at all.
test('a ruling no arm moved reports as unproven and refuses nothing', live, () => {
  const { code, out } = runTool('light-cone.js');
  assert.match(out, /ruled without proof/, out.slice(-600));
  assert.strictEqual(code, 0, 'an unproven ruling must report, never refuse');
});

// BOTH ARMS, or the probe answers half a question confidently. A forward-only reading calls a
// `\rules` pragma's divergence a defect — measured, its verdict holds under every alteration after
// the line and moves the moment the pragma changes.
test('the probe reaches backward as well as forward', live, () => {
  const { out } = runTool('light-cone.js', ['--verbose']);
  assert.match(out, /forward/, 'the forward arm must report');
  assert.match(out, /backward/, 'the backward arm must report');
});

// A ruling naming the wrong class fails, in both directions: a structural difference filed as owed
// creates work nobody can do, and a defect filed as structural retires a repair by decree.
// Filing a difference as owed when an arm reaches past the grammar names a repair nobody can
// perform, and the ledger then carries impossible work as debt.
test('an owed entry that reaches out fails the gate', live, () => {
  const swap = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'swallow-ledger.txt');
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text.replace(/^(runaway comment\.block\.html\.\*\s+#)/m, '$1 OWED —'));
  };
  const { code, out } = runInSandbox(swap, ['tools/light-cone.js']);
  assert.match(out, /comment\.block[\s\S]*reaching out|reaches past the grammar/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'an owed entry reached past the grammar and the gate held anyway');
});
