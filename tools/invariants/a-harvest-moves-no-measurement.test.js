// A HARVEST DOES NOT MOVE A MEASUREMENT.
//
// The corpus holds what a hand authored. A harvest is derived — the host's answer, or the gates'
// own, written down by a tool and edited by nobody. The two stand apart because a measurement taken
// over authored ground must answer to what a hand wrote there, and a harvest landing inside that
// ground makes the instrument read its own output.
//
// MEASURED, on one tree with nothing else changed. The peer snapshots `gate-report.js` and
// `grammar-signals.js` write stood under `corpus/reader-signals/`. `still.js`'s token walk counts
// every file under `corpus/` that does not end `.txt` or `.md`, so each `.json` snapshot joined the
// ground the ruled share is measured over: 50.2% of corpus tokens ruled with the snapshots present,
// 53.2% with them removed. The same figure then rode into the next harvest's own summary line, so
// the report described a corpus the report had changed.
//
// NEITHER SHOWED AS A FAILURE. It showed as a number nobody could reproduce: one reader reported the
// line wobbling between runs and went looking in the walk order, and a hand had already sorted an
// unsorted walk on suspicion without once reproducing a symptom.
//
// So this asks the question directly, over the ONE name both writers now write to
// (`reader-scope.js`'s `PEER_DIR`): harvest, read the measurement, harvest something else, read it
// again — and require the two readings byte-identical. A guard naming the directory instead would
// pass the day a third writer picks a different one.
//
// `still.js` carries the reading because its walk is the one that counted a harvest. It stands here
// rather than beside the tool because the claim is about the LAYOUT, not about that instrument: any
// measurement over authored ground owes the same answer.
//
//   node --test tools/invariants/a-harvest-moves-no-measurement.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('../grammar-sandbox.js');
const { PEER_DIR } = require('../reader-scope.js');

const ROOT = path.resolve(__dirname, '..', '..');
const live = { timeout: 900000 };

// TWO HARVESTS OF THE SAME THING, DIFFERING IN SIZE — the shape a re-harvest actually takes when the
// host it booted against learned a few more operators. Identical bytes would prove nothing: a
// measurement that cannot see the difference cannot be moved by it.
const harvest = (rows) => `${JSON.stringify({
  harvested: 'a probe standing in for a peer reader\'s snapshot',
  rows: Array.from({ length: rows }, (_, i) => `operator ${i}`)
}, null, 4)}\n`;

// Named the way the real peer snapshots are, so a reader of a failure sees what landed.
const SNAPSHOTS = ['gate-report.0.0.0-probe.json', '0.0.0-probe.json'];

/** The measurement, taken in a sandbox where `rows` worth of harvest stands under `home`. */
function readingWith(home, rows) {
  const land = (sandbox) => {
    const dir = path.join(sandbox, home);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of SNAPSHOTS) fs.writeFileSync(path.join(dir, name), harvest(rows));
  };
  const { out } = runInSandbox(land, ['tools/still.js'], ['--over', 'corpus', '--sample', '4']);
  const line = /^still .*$/m.exec(out);
  assert.ok(line, `the pass printed no summary line to read\n${out.slice(-600)}`);
  return line[0];
}

// The invariant.
test('a harvest does not move a measurement', live, () => {
  const home = path.relative(ROOT, PEER_DIR);
  const first = readingWith(home, 40);
  const second = readingWith(home, 400);
  assert.strictEqual(second, first,
    `a harvest landing under \`${home}\` moved the measurement taken over the corpus, so the next `
    + 'harvest reports a corpus the last harvest changed');
});

// THE PLANTED FAULT. The comparison above reads green either because the harvest stands outside
// measured ground or because the reading cannot see a harvest at all, and the two look identical.
// So the same two harvests land inside the corpus — where every layout measures — and the reading
// must part. A green here would mean the invariant above guards nothing.
test('the same two harvests inside the corpus move it', live, () => {
  const inside = path.join('corpus', 'reader-signals');
  const first = readingWith(inside, 40);
  const second = readingWith(inside, 400);
  assert.notStrictEqual(second, first,
    'two harvests of different size landed inside the corpus and the measurement did not move, so '
    + 'the comparison above cannot see a harvest that moves one');
});
