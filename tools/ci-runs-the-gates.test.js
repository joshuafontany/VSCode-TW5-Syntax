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
//   node --test tools/ci-runs-the-gates.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { gateNames } = require('./gate-report.js');
const { readData } = require('./wiki-data.js');

const scripts = require(path.join(ROOT, 'package.json')).scripts;
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'test.yml'), 'utf8');
const ruling = readData('CIGates.tid').data;

// Every npm script the workflow runs, following one script into the scripts it calls.
function reached() {
  const seeds = new Set();
  for (const m of workflow.matchAll(/npm run ([a-z0-9:-]+)/g)) seeds.add(m[1]);
  for (const m of workflow.matchAll(/run: npm test\b/g)) seeds.add('test');
  const seen = new Set();
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

test('a gate CI runs only to report still runs', () => {
  const seen = reached();
  const absent = ruling.reporting.filter((g) => !seen.has(g));
  assert.deepStrictEqual(absent, [],
    'gate(s) named as reporting that the workflow never runs at all');
});
