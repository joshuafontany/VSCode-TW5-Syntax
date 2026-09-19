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
const crypto = require('node:crypto');
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
    const marked = text.replace(/^(runaway comment\.\*\s+#)/m, '$1 OWED —');
    assert.notStrictEqual(marked, text, 'the ledger holds no comment ruling to mark owed, so nothing gets planted');
    fs.writeFileSync(file, marked);
  };
  const { code, out } = runInSandbox(swap, ['tools/light-cone.js']);
  assert.match(out, /comment\.[\s\S]*reaching out|reaches past the grammar/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'an owed entry reached past the grammar and the gate held anyway');
});

// THE THIRD ARM — a reader's own typing.
//
// The forward arm hands back removed text and the backward arm strikes pragma lines. Both alter
// something a reader never types. A person inserts a space, or a stray character, in the middle of
// what they already wrote — and where a one-character perturbation moves the parser's verdict at
// the sentinel, the DECIDING evidence sits at that character.
//
// THE ARM DIAGNOSES AND NEVER PROVES. A forward move shows the parser deciding on text past the
// sentinel and a backward move on a rule set no stack carries — both beyond any pattern. A typo
// sits INSIDE the head, which the grammar's stack reads, so its movement shows SENSITIVITY rather
// than reach, and it may not move a class out of `unproven`.
//
// THE DISTANCE INFORMS THE RULING WITHOUT SETTLING IT. Evidence one line back may sit inside a
// region a begin/end pair already carries; evidence fifty lines back wants a region spanning fifty
// lines. Neither existing arm reports a distance at all, and reading one as a verdict would state
// more than the arm measured.
test('the typo arm reports how far the deciding evidence sits from the cut', live, () => {
  const { out } = runTool('light-cone.js');
  assert.match(out, /typo arm moved \d+/, out.slice(-600));
});

// A PERTURBATION MUST DERIVE, AND MUST NOT WANDER. A reading that samples differently each run
// reports a different verdict to whoever looked last, and this house already retired one gauge for
// that. The positions come from the carrier's own bytes, so two runs read alike.
//
// A CORPUS EDIT DURING THE PAIR READS EXACTLY LIKE A WANDERING ARM. The arm derives its positions
// from a carrier's bytes, so changing those bytes between the two runs moves the count honestly —
// and a bare inequality then accuses the arm of the one fault it stands here to refuse. Measured:
// three lines landing mid-corpus moved the count by one, and the failure named the arm. So the
// corpus reports its own digest around the pair, and a moved digest names the edit instead.
test('two runs of the typo arm read the same verdict', live, () => {
  const digest = () => {
    const h = crypto.createHash('sha256');
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(file); continue; }
        h.update(file).update(fs.readFileSync(file));
      }
    };
    walk(path.join(ROOT, 'corpus'));
    return h.digest('hex');
  };
  const before = digest();
  const first = runTool('light-cone.js');
  const second = runTool('light-cone.js');
  const after = digest();
  assert.strictEqual(before, after,
    'the corpus changed while the pair ran, so the two runs read two different texts');
  const moved = (o) => /typo arm moved (\d+)/.exec(o)[1];
  assert.strictEqual(moved(first.out), moved(second.out), 'the arm wandered between runs');
});

// The guard on the arm's own ambition: a class no reaching arm moved stays unproven however loudly
// a reader's typing moves it. Counting sensitivity as reach states the verdict this probe retired.
//
// THE EXAMPLE CLASS IS READER-KEYED (tools/reader-scope.js). The nested-fence divergence
// corpus/swallow-ledger.txt's `overbound codeblock` and `overbound codeinline` rulings both name
// lands on `codeblock` under this repository's own fork and on `codeinline` under the pinned 5.4.1
// devDependency — measured under both, so either name proves the guard.
test('the typo arm moves no class out of unproven', live, () => {
  const { out } = runTool('light-cone.js');
  const moved = Number(/typo arm moved (\d+)/.exec(out)[1]);
  assert.ok(moved > 0, 'the arm proved nothing at all, so this guard guards nothing');
  assert.match(out, /ruled without proof: overbound code(?:block|inline)/,
    'a class only the typo arm moved left `unproven`, so sensitivity read as reach');
});
