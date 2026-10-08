// Every gate this repository stands, continuous integration runs — or a ruling says why not.
//
// A gate nobody runs measures nothing, and a green CI over six of twenty-two gates reads as a
// stronger claim than it carries. The workflow named ten npm scripts, which reached six gates
// between them; sixteen stood outside it, seven with nothing in CI exercising their verdict at all.
//
// This holds the workflow to the gate list rather than to a copy of it. The list comes from the
// manifest by way of the report, so a gate added joins without anybody remembering, and the ruling
// beside it lives in the wiki where an operator argues over it.
//
// Three shapes fail here, and the third matters most:
//
//   a gate CI never reaches, with no ruling      — the hole this exists to catch
//   a ruling naming a gate CI runs anyway        — a reason that stopped answering to anything
//   a ruling with no reason                      — a line that names no ruling
//
// TWO ABSENCES, KEPT APART, because one ruling covering both would read as the other. `skipped`
// names a gate CI is CONFIGURED never to run: the tests above hold it to exactly that, and a gate
// named there which CI reaches fails as a stale reason. `standsDown` names the opposite case — a
// gate CI DOES run, which stands down at RUNTIME when the capability it reads is absent, printing
// `<tool>  SKIP — <reason>`, exiting 0, and harvesting as `skipped` state in the gate report. The
// two cannot share a key: a gate CI runs is the thing `skipped` fails on, and a gate CI never runs
// can never print a runtime skip. So `standsDown` answers to the inverse rule — every gate named
// there must be reached by CI, and must carry a self-skip its own instrument can print.
//
// A skip carries a ruling, never a sentence (LEDGER-3.0.0.md). An instrument that can stand down
// with nothing in `CIGates.tid` saying when or why fails here, which is what makes that law true
// rather than stated: before this, a gate could learn to skip silently and the roster would read
// 49 of 49 whether it answered or not.
//
//   node --test tools/invariants/ci-runs-the-gates.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const { gateNames } = require('../gate-report.js');
const { readData } = require('../wiki-data.js');

const scripts = require(path.join(ROOT, 'package.json')).scripts;
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'test.yml'), 'utf8');
const ruling = readData('CIGates.tid').data;

// Every npm script the workflow runs, following one script into the scripts it calls.
//
// A step running `tools/gate-report.js` directly reaches every gate the manifest names, by the
// same construction the report itself runs on — gate-report.js runs `npm run <gate>` for each name
// gateNames() derives, so a workflow step invoking it needs no npm-run line of its own for any of
// them. Naming this here reads the report's OWN reach rather than re-deriving a second list: the
// day the report changes what it iterates, this changes with it because gateNames() is the one
// this calls too.
function reached() {
  const seeds = new Set();
  for (const m of workflow.matchAll(/npm run ([a-z0-9:-]+)/g)) seeds.add(m[1]);
  for (const m of workflow.matchAll(/run: npm test\b/g)) seeds.add('test');
  const seen = new Set();
  if (/\bnode\s+\.?\/?tools\/gate-report\.js\b/.test(workflow)) {
    for (const g of gateNames()) seen.add(g);
  }
  const walk = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const body = scripts[name];
    if (!body) return;
    for (const m of body.matchAll(/npm run ([a-z0-9:-]+)/g)) walk(m[1]);
  };
  for (const s of seeds) walk(s);
  return seen;
}

// Every gate the repository stands: what the report runs, plus the gates its skip pattern hides.
const gates = [...new Set([...gateNames(), ...ruling.alsoGates])];
const skipped = new Map(ruling.skipped.map((r) => [r.gate, r.why]));
const standsDown = new Map((ruling.standsDown ?? []).map((r) => [r.gate, r.why]));

// WHETHER AN INSTRUMENT CAN STAND DOWN, read off the instrument rather than off a list beside it.
// gate-report.js records the third state by matching a summary line — `<tool>  SKIP — <reason>` on
// exit 0 — so the capacity to self-skip reads as: somewhere in the tool this gate runs, a print of
// that shape. Deriving it here means a gate that GAINS a self-skip is caught the moment it does,
// and a ruling for a gate that LOST one reads as the stale reason it has become.
const SELF_SKIP_PRINT = /console\.log\(\s*[`'"][^\n]*?\s{2,}SKIP\s+—/;

/** The tool files a gate's manifest entry runs, in this repository's own `node ./tools/x.js` form. */
function instrumentsOf(gate) {
  const body = scripts[gate] ?? '';
  return [...body.matchAll(/(?:node|bash)\s+\.\/(tools\/[\w./-]+\.(?:js|sh))/g)]
    .map((m) => path.join(ROOT, m[1]))
    .filter((p) => fs.existsSync(p));
}

function canStandDown(gate) {
  return instrumentsOf(gate).some((p) => SELF_SKIP_PRINT.test(fs.readFileSync(p, 'utf8')));
}

test('every gate the report runs, the manifest still names', () => {
  const gone = gates.filter((g) => !scripts[g]);
  assert.deepStrictEqual(gone, [], 'gate(s) named where the manifest holds no script');
});

test('every gate CI never reaches carries a ruling', () => {
  const seen = reached();
  const unheld = gates.filter((g) => !seen.has(g) && !skipped.has(g));
  assert.deepStrictEqual(unheld, [],
    'gate(s) CI never runs and no ruling explains — each one measures nothing until it does');
});

test('a ruling names a gate CI leaves alone', () => {
  const seen = reached();
  const stale = [...skipped.keys()].filter((g) => seen.has(g));
  assert.deepStrictEqual(stale, [],
    'ruling(s) explaining a gate CI runs anyway — a reason that stopped answering to anything');
});

test('every ruling carries a reason, and names a gate', () => {
  for (const entry of ruling.skipped) {
    assert.ok(entry.why && entry.why.length > 40,
      `the ruling for ${entry.gate} carries no reason, so it names no ruling`);
    assert.ok(gates.includes(entry.gate),
      `the ruling names ${entry.gate}, which stands among no gate this repository runs`);
  }
});

test('every gate that can stand down carries a ruling saying when', () => {
  const unruled = gates.filter((g) => canStandDown(g) && !standsDown.has(g));
  assert.deepStrictEqual(unruled, [],
    'gate(s) whose instrument prints a runtime SKIP with no ruling under `standsDown` — '
    + 'a skip carries a ruling, never a sentence');
});

test('every gate ruled as standing down can actually stand down', () => {
  const cannot = [...standsDown.keys()].filter((g) => !canStandDown(g));
  assert.deepStrictEqual(cannot, [],
    'ruling(s) naming a gate whose instrument prints no runtime SKIP — a reason for an absence '
    + 'that cannot occur');
});

test('every gate ruled as standing down is one CI runs', () => {
  const seen = reached();
  const unreached = [...standsDown.keys()].filter((g) => !seen.has(g));
  assert.deepStrictEqual(unreached, [],
    'gate(s) ruled as standing down that CI never runs at all — `skipped` names that case, and a '
    + 'gate cannot stand down from a run nobody makes');
});

test('every ruling under standsDown carries a reason, and names a gate', () => {
  for (const entry of ruling.standsDown ?? []) {
    assert.ok(entry.why && entry.why.length > 40,
      `the standsDown ruling for ${entry.gate} carries no reason, so it names no ruling`);
    assert.ok(gates.includes(entry.gate),
      `the standsDown ruling names ${entry.gate}, which stands among no gate this repository runs`);
  }
});

test('no gate stands under both absences at once', () => {
  const both = [...standsDown.keys()].filter((g) => skipped.has(g));
  assert.deepStrictEqual(both, [],
    'gate(s) ruled both as never run by CI and as standing down inside a CI run');
});

// The harvest's own reading of the same question, from the other side: a gate any reader's harvest
// recorded in the SKIPPED state stood down for that reader, whatever the source scan says.
test('every gate a harvest recorded as skipped carries a ruling', () => {
  const harvests = [path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GateReport.tid')];
  const { PEER_DIR: peers } = require('../reader-scope.js');
  if (fs.existsSync(peers)) {
    for (const f of fs.readdirSync(peers).filter((n) => /^gate-report\..*\.json$/.test(n))) {
      harvests.push(path.join(peers, f));
    }
  }
  const unruled = new Set();
  for (const file of harvests) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const body = JSON.parse(text.slice(text.indexOf('{')));
    for (const r of body.results ?? []) {
      if (r.state === 'skipped' && !standsDown.has(r.gate)) unruled.add(r.gate);
    }
  }
  assert.deepStrictEqual([...unruled], [],
    'gate(s) a harvest records as skipped with no ruling under `standsDown`');
});

test('a gate CI runs only to report still runs', () => {
  const seen = reached();
  const absent = ruling.reporting.filter((g) => !seen.has(g));
  assert.deepStrictEqual(absent, [],
    'gate(s) named as reporting that the workflow never runs at all');
});
