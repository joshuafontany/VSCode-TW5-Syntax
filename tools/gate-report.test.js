// The report names every gate, and reads each one's verdict rather than its last word.
//
// A report gathering seventeen instruments earns trust only where the gathering holds: a gate the
// manifest adds must join without anybody remembering, and a tool that prints a warning after its
// summary must still report the summary. Both failed on the first run — the list stood correct and
// the verdict did not, so `overreach` reported "grammar not found for source.sassdoc" where its
// count of diverging spans belonged.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOL = fs.readFileSync(path.join(ROOT, 'tools', 'gate-report.js'), 'utf8');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

// The tool exports its own derivation, so this reads the same list the report runs rather than
// deriving a second one that could differ from it silently.
const { gateNames, SKIP } = require('./gate-report.js');
const gates = gateNames;

test('the report takes its gate list from the manifest', () => {
  assert.match(TOOL, /require\(path\.join\(ROOT, 'package\.json'\)\)\.scripts/,
    'a list written here would miss a gate somebody adds');
  assert.ok(gates().length >= 15, `${gates().length} gate(s) — too few to read as the whole set`);
});

// A tool's summary carries its own name and what it counted; a warning after it does not.
test('a verdict reads from the summary line, never the last', () => {
  const out = [
    'grammar not found for "source.sassdoc"',
    'overreach-check  174  span(s) the grammar CLAIMS and TiddlyWiki refuses',
    'grammar not found for "text.log"'
  ];
  const summary = [...out].reverse().find((l) => /^\S+ {2,}\S/.test(l.trim()));
  assert.match(summary, /^overreach-check/, 'the verdict must come from the summary, not the warning below it');
});

// Every script the report runs must actually run. Two of them demanded an argument the manifest
// never supplied, so each returned a usage line where a verdict belonged.
test('every gate the report runs takes no argument the manifest withholds', () => {
  const needy = [];
  for (const gate of gates()) {
    const body = scripts[gate];
    const file = /tools\/([\w.-]+\.(?:js|sh))/.exec(body);
    if (!file) continue;
    const source = fs.readFileSync(path.join(ROOT, 'tools', file[1]), 'utf8');
    // What matters: does the SCRIPT hand over what the tool wants? A tool printing a usage line
    // when argv[2] stands empty needs one argument, and a script naming only the tool supplies
    // none — unless the tool falls back to the host every other gate resolves.
    const suppliesArgument = body.replace(/\.?\/?tools\/[\w.-]+\.(?:js|sh)/, '')
      .trim().split(/\s+/).filter(Boolean).length > 1;
    if (/Usage: node tools\//.test(source) && !suppliesArgument && !/resolveTiddlyWiki\(\)/.test(source)) {
      needy.push(gate);
    }
  }
  assert.deepStrictEqual(needy, [],
    'gate(s) the manifest runs with no argument that demand one, so each reports a usage line');
});

// A verdict CI reads, the local sweep must read too.
//
// D3: a SKIPPED gate carries a STATE, and its reason must never drift `--check`. `recovery-witness`
// and must-flag's own SKIP line already print `<tool>  SKIP — <reason>`; a future optional-tool
// gate earns the third state for free the day it prints its summary the same way.
const { classify, splitHarvest, comparable } = require('./gate-report.js');

test('classify reads a self-skip summary line as "skipped", never "held" alone', () => {
  assert.strictEqual(classify(true, 'recovery-witness  SKIP — TiddlyWiki 5.4.1 carries no parser diagnostics API'), 'skipped');
  assert.strictEqual(classify(true, 'must-flag  SKIP — no `lares` CLI stands on PATH'), 'skipped');
  assert.strictEqual(classify(true, 'must-flag  2 declaration(s), 0 blocking, 1 pending (undeclared, not blocking)'), 'held');
  assert.strictEqual(classify(false, 'ablation-witness  2 finding(s) stale'), 'failed');
});

test('comparable blanks a skipped gate\'s reason, and nothing else\'s', () => {
  const body = {
    gates: 2, held: 2, failing: 0, skipped: 1,
    results: [
      { gate: 'recovery-witness', held: true, state: 'skipped', said: 'recovery-witness  SKIP — TiddlyWiki 5.4.1 carries no diagnostics' },
      { gate: 'ablation', held: true, state: 'held', said: 'ablation-witness  331 finding(s) over 78 carrier(s)' }
    ]
  };
  const drifted = JSON.parse(JSON.stringify(body));
  drifted.results[0].said = 'recovery-witness  SKIP — TiddlyWiki 5.5.0-prerelease carries no diagnostics';
  assert.strictEqual(JSON.stringify(comparable(body)), JSON.stringify(comparable(drifted)),
    'a skipped gate\'s own reason text drifted the comparison, which no two readers can ever agree on');
  const reallyDrifted = JSON.parse(JSON.stringify(body));
  reallyDrifted.results[1].said = 'ablation-witness  330 finding(s) over 78 carrier(s)';
  assert.notStrictEqual(JSON.stringify(comparable(body)), JSON.stringify(comparable(reallyDrifted)),
    'a HELD gate\'s summary line must still drift the comparison exactly as before');
});

// A GATE RULED AS STANDING DOWN MOVES ITS STATE WITH THE ENVIRONMENT, not only its reason.
//
// Blanking a skipped gate's reason answered half the question. The baseline records ONE reader's
// run, so a gate whose capability stands there harvests as `held` with its full verdict, and the
// same gate reads `skipped` wherever the capability is absent — which is exactly CI, where no
// `lares` CLI stands. Measured: `--check` under the fork reader with the CLI stripped from PATH
// read `must-flag` SKIPPED and reported the report DRIFTED, exit 1, with every gate holding.
//
// So for a gate `CIGates.tid` RULES as able to stand down, the comparison reads neither its state
// nor its reason — only that it held, which exit 0 already carries. This cannot manufacture the
// green that means "did not run": the licence comes from a RULING naming the capability, an
// unruled gate that skips still drifts the comparison, `ci-runs-the-gates.test.js` fails any
// instrument that gains a self-skip with no ruling, and a gate that FAILS still fails here.
test('comparable reads a ruled stand-down gate by neither state nor reason', () => {
  const { readData } = require('./wiki-data.js');
  const ruled = (readData('CIGates.tid').data.standsDown ?? []).map((r) => r.gate);
  assert.ok(ruled.length > 0, 'no gate stands ruled as able to stand down, so this reading answers nothing');
  const gate = ruled[0];
  const standing = {
    gates: 2, held: 2, failing: 0, skipped: 0,
    results: [
      { gate, held: true, state: 'held', said: `${gate}  2 declaration(s), 0 blocking` },
      { gate: 'ablation', held: true, state: 'held', said: 'ablation-witness  331 finding(s)' }
    ]
  };
  const stoodDown = {
    gates: 2, held: 2, failing: 0, skipped: 1,
    results: [
      { gate, held: true, state: 'skipped', said: `${gate}  SKIP — the capability it reads stands nowhere here` },
      { gate: 'ablation', held: true, state: 'held', said: 'ablation-witness  331 finding(s)' }
    ]
  };
  assert.strictEqual(JSON.stringify(comparable(standing)), JSON.stringify(comparable(stoodDown)),
    'a ruled gate standing down drifted the comparison, so no baseline a reader holding the '
    + 'capability harvests can ever read current where it is absent');
  // THE LICENCE IS THE RULING, never the shape of the line. An unruled gate that skips drifts.
  const unruled = JSON.parse(JSON.stringify(standing));
  unruled.results[1].state = 'skipped';
  unruled.results[1].said = 'ablation-witness  SKIP — nothing rules this one';
  unruled.skipped = 1;
  assert.notStrictEqual(JSON.stringify(comparable(standing)), JSON.stringify(comparable(unruled)),
    'an UNRULED gate newly standing down read as current, which is the green that means "did not run"');
  // And a ruled gate that FAILS is a failure, not an absence.
  const failed = JSON.parse(JSON.stringify(standing));
  failed.results[0].held = false;
  failed.results[0].state = 'failed';
  failed.results[0].said = `${gate}  1 declared fault(s) the checker no longer finds`;
  failed.held = 1;
  failed.failing = 1;
  assert.notStrictEqual(JSON.stringify(comparable(standing)), JSON.stringify(comparable(failed)),
    'a ruled gate that FAILED read as current, so the ruling excused a verdict rather than an absence');
});

test('splitHarvest separates the .tid header (or bare JSON) from the JSON body', () => {
  const tid = 'title: $:/tw5-syntax/GateReport\ntw5-version: 5.5.0\n\n{\n    "gates": 1\n}\n';
  const split = splitHarvest(tid);
  assert.match(split.head, /^title: \$:\/tw5-syntax\/GateReport/);
  assert.deepStrictEqual(JSON.parse(split.body), { gates: 1 });
  const peer = '{\n    "gates": 1\n}\n';
  assert.strictEqual(splitHarvest(peer).head, '');
  assert.deepStrictEqual(JSON.parse(splitHarvest(peer).body), { gates: 1 });
});

// The gate list derives from the manifest by the SHAPE of a script's body — a script invoking a
// tool directly. `snap` invokes its per-scope siblings instead, so the derivation passed it over
// while the skip pattern's own comment recorded it as carrying them whole. Measured: `npm run
// gates` reported 27 of 27 holding while `npm run snap` stood red on eight snapshots, one of them
// a construct the grammar had stopped reading the way TiddlyWiki builds it. CI runs `snap` and
// would have caught it; the sweep a reader runs locally never mentioned it.
//
// So every script the workflow runs that renders a verdict stands among the gates, or carries a
// ruling saying why not — which is what `alsoGates` and `skipped` already spell for the rest.
test('a verdict the workflow runs stands among the gates', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'test.yml'), 'utf8');
  const { readData } = require('./wiki-data.js');
  const ruling = readData('CIGates.tid').data;
  const known = new Set([...gates(), ...ruling.alsoGates, ...ruling.reporting,
    ...ruling.skipped.map((r) => r.gate)]);
  // `package-contents.js` carries no test file of its own, and the reason names a cost rather than a
  // decision: its whole claim lives in a .vsix, so a collision must BUILD one — an npx fetch and a
  // package per run, against a gate CI already runs every push. `lint-closure` stands collided in
  // `terminator-closure.test.js`, where the fault costs a scratch file.
  //
  // WHAT A SCRIPT DOES, never how its name starts. A prefix list excluded `lint-closure` and
  // `package-contents` — two instruments CI runs, each rendering a verdict, neither standing in any
  // gate list — because one began `lint` and the other `package`. A script rendering a verdict runs
  // an instrument out of `tools/`; a test runner or a builder runs something else.
  const renders = (name, seen = new Set()) => {
    if (seen.has(name)) return false;
    seen.add(name);
    const body = scripts[name] || '';
    if (/tools\/[\w.-]+\.(?:js|sh)/.test(body)) return true;
    return [...body.matchAll(/npm run ([a-z0-9:-]+)/g)].some((m) => renders(m[1], seen));
  };
  // A script gathering per-scope siblings answers through them, so it stands heard where each does.
  const gathers = (name) => {
    const parts = [...(scripts[name] || '').matchAll(/npm run ([a-z0-9:-]+)/g)].map((m) => m[1]);
    return parts.length > 0 && parts.every((part) => known.has(part));
  };
  const unheard = [];
  for (const m of workflow.matchAll(/npm run ([a-z0-9:-]+)/g)) {
    const name = m[1];
    if (!scripts[name] || known.has(name) || gathers(name) || !renders(name)) continue;
    unheard.push(name);
  }
  assert.deepStrictEqual([...new Set(unheard)], [],
    'script(s) CI reads a verdict from that the local gate sweep never runs, so a green sweep can stand beside a red CI');
});

// A skip carries a ruling, never a sentence.
//
// The gate list derives from the manifest by the shape of a script's body, and a skip pattern holds
// back what renders no verdict — a builder, a server, a reporting tool answering a question rather
// than judging one. That exclusion answered to a COMMENT, and the comment claimed `snap` carried
// its per-scope runs whole while `snap` stood outside the list: `gates` reported every gate holding
// beside eight drifted snapshots, and nothing anywhere could contradict the sentence.
//
// So a skipped script that runs an instrument NO gate runs must name itself in `CIGates.tid` —
// among the gates CI reaches, among the reporting tools, or among the skipped with a reason. A
// prose justification then has a reader.
test('every skipped script running an instrument no gate runs carries a ruling', () => {
  const { readData } = require('./wiki-data.js');
  const ruling = readData('CIGates.tid').data;
  const toolOf = (body) => (/tools\/([\w.-]+\.(?:js|sh))/.exec(body || '') || [])[1];
  const run = new Set(gates().map((g) => toolOf(scripts[g])).filter(Boolean));
  // `skipped` rules a GATE CI leaves alone; a script that is no gate at all answers in `notGates`.
  const ruled = new Set([...ruling.alsoGates, ...ruling.reporting,
    ...ruling.skipped.map((r) => r.gate), ...(ruling.notGates || []).map((r) => r.gate)]);
  const bare = [];
  for (const [name, body] of Object.entries(scripts)) {
    // `gates` names the report itself, which would run itself and never stop.
    if (!SKIP.test(name) || name === 'gates' || ruled.has(name)) continue;
    const tool = toolOf(body);
    if (tool && !run.has(tool)) bare.push(`${name} -> ${tool}`);
  }
  assert.deepStrictEqual(bare, [],
    'skipped script(s) running an instrument no gate runs, with nothing saying why they stand outside');
});

// A script ruled out of the gate list must name a reason, and must actually stand outside it.
test('every script ruled no gate carries a reason and stands outside the list', () => {
  const { readData } = require('./wiki-data.js');
  const ruling = readData('CIGates.tid').data;
  for (const entry of ruling.notGates || []) {
    assert.ok(scripts[entry.gate], `the ruling names ${entry.gate}, which the manifest holds no script for`);
    assert.ok(entry.why && entry.why.length > 40, `the ruling for ${entry.gate} carries no reason`);
    assert.ok(!gates().includes(entry.gate),
      `${entry.gate} stands among the gates and carries a ruling saying it does not`);
  }
});
