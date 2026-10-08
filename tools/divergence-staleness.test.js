// A ruling in corpus/expected-divergence.txt stands stale only when EVERY overreach-check run
// leaves it explaining zero spans — a ruling idle in one run can still be earning its place in
// another, so the reader has to take the UNION before it says a ruling explains nothing.
//
// THE DECIDING HALF TAKES ITS RUN RESULTS AS DATA. `staleness` never spawns a process, so the
// control below runs in milliseconds and states the law plainly: the first ruling stays because
// some run used it, the second is reported stale because none did.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { runTool, ROOT } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');
const { rulingLines, derivedRuns, staleness, EXPECTED_REL } = require('./divergence-staleness.js');

const slow = { timeout: 900000 };

// CONTROL: a ruling one run explains stays; a ruling no run explains reads stale.
test('a ruling some run explains stays; a ruling no run explains reads stale', () => {
  const { union, stale } = staleness(2, [
    { name: 'overreach', used: [0] },
    { name: 'overreach-host', used: [] }
  ]);
  assert.deepStrictEqual([...union].sort(), [0]);
  assert.deepStrictEqual(stale, [1]);
});

// A ruling idle in one run and used in another stays — the UNION, not any single run, decides.
test('a ruling idle in one run and used in another still stays', () => {
  const { stale } = staleness(3, [
    { name: 'overreach', used: [0] },
    { name: 'overreach-corpus-files', used: [1] },
    { name: 'overreach-host', used: [] }
  ]);
  assert.deepStrictEqual(stale, [2]);
});

// A ruling no run ever explains, over runs that between them explain nothing at all.
test('every ruling stale when no run explains any of them', () => {
  const { stale } = staleness(2, [{ name: 'overreach', used: [] }, { name: 'overreach-host', used: [] }]);
  assert.deepStrictEqual(stale, [0, 1]);
});

test('rulingLines skips blank lines and comments, keeping a ruling\'s own index', () => {
  const text = '# a comment\n\nmeta.link.wikilink   # reason one\n\n*.memetic-wikitext   # reason two\n';
  assert.deepStrictEqual(rulingLines(text), [
    'meta.link.wikilink   # reason one',
    '*.memetic-wikitext   # reason two'
  ]);
});

test('derivedRuns finds every script over expected-divergence.txt and nothing else', () => {
  const scripts = {
    overreach: `node ./tools/overreach-check.js './tests/samples/*.tw' --expected=${EXPECTED_REL}`,
    'overreach-host': `node ./tools/overreach-check.js --corpus 400 --expected=${EXPECTED_REL}`,
    // A script naming overreach-check.js but pointed at another file answers a different question.
    'overreach-elsewhere': "node ./tools/overreach-check.js './x/*.tw' --expected=corpus/other-ledger.txt",
    // A script that runs a DIFFERENT tool never joins, however similar its name reads.
    darkness: 'node ./tools/darkness-witness.js',
    // A script that only CALLS overreach still answers, in real package.json bodies, through a
    // shell composing several `npm run` calls — derivedRuns reads bodies literally, so a caller
    // testing that composition drives it through the manifest itself, in the slow gate test below.
    gates: 'node ./tools/gate-report.js'
  };
  assert.deepStrictEqual(derivedRuns(scripts).map((r) => r.name), ['overreach', 'overreach-host']);
});

// THE GATE, over the real manifest and the real corpus/expected-divergence.txt.
test('every run this repository stands over expected-divergence.txt derives at least the overreach family', slow, () => {
  const scripts = require(path.join(ROOT, 'package.json')).scripts;
  const names = derivedRuns(scripts).map((r) => r.name);
  for (const expected of ['overreach', 'overreach-corpus-files', 'overreach-corpus-memetic', 'overreach-host', 'overreach-cut']) {
    assert.ok(names.includes(expected), `derivedRuns missed ${expected}, which invokes overreach-check.js against ${EXPECTED_REL}`);
  }
});

test('the gate reads every derived run and reports what it found', slow, () => {
  const { code, out } = runTool('divergence-staleness.js', ['--verbose']);
  assert.match(out, /divergence-staleness  \d+ run\(s\) over \d+ ruling\(s\): \d+ stale/, out.slice(-800));
  assert.ok(code === 0 || code === 1, out.slice(-800));
});

// SANDBOX ARM: a ruling appended to a real copy of the file, matching a scope no carrier ever
// paints, must be reported stale — no run anywhere can have explained it.
test('a ruling matching nothing anywhere reads stale in the sandbox', slow, () => {
  const { code, out } = runInSandbox((sandbox) => {
    const file = path.join(sandbox, 'corpus', 'expected-divergence.txt');
    fs.appendFileSync(file,
      '\nzzz.nothing.no-carrier-ever-paints-this.tiddlywiki5   # a ruling planted to prove the gate finds it\n');
  }, ['tools/divergence-staleness.js'], ['--verbose']);
  assert.match(out, /STALE {2}zzz\.nothing\.no-carrier-ever-paints-this\.tiddlywiki5/, out.slice(-1200));
  assert.notStrictEqual(code, 0, 'a ruling explaining nothing anywhere read clean');
});
