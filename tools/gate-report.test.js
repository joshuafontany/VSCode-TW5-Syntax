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
