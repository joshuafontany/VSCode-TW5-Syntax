#!/usr/bin/env node
// What every gate says, gathered where a reader can open it.
//
// The gates stand here, each one printing a line nobody keeps — the manifest names how many, so
// this sentence never counts them. A reader who wants the grammar's state runs them all and reads
// scrollback; a reader who opens the wiki sees the rulings that govern them and nothing about
// whether they hold.
//
// This runs each gate the manifest registers and writes down what it said. A HARVEST, so no hand
// edits it and it goes stale the moment the tree moves — which serves the reader: a report that
// agrees with a tree it no longer describes offers reassurance rather than a reading.
//
// The gate list comes from the manifest, never from here. A gate somebody adds joins the page
// without anybody remembering, and a gate that leaves drops out of the report rather than
// reporting a stale pass.
//
//   node tools/gate-report.js [--check]
//
// A `--in-process` spike once stood here, sharing two oracle-booting gates' TiddlyWiki boot
// across an in-process call rather than a spawned `npm run <gate>` — measured at 58s of 416s
// (~14%) on the two gates it covered, at the cost of a shared process (TW5_PATH,
// process.exitCode, module caches, lost crash isolation). tw5-oracle.js's own in-process parse
// memo (see its own doc comment) now delivers roughly double that win, across every
// oracle-touching gate rather than two, without sharing a process — so the flag is gone. See
// `LEDGER-3.0.0.md` under Tooling and process for the measured numbers.

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GateReport.tid');
const check = process.argv.includes('--check');

// KEYED ON THE READER (tools/reader-scope.js's own generalisation, applied here the way
// grammar-signals.js already applies it to its own harvest). Several gates' own SUMMARY lines name
// the TiddlyWiki they booted against — recovery-witness prints its version in a SKIP reason,
// grammar-signals prints it outright — so the harvested report differs by reader even where every
// gate holds. `GateReport.tid` stays the reader that last wrote it with no `--check`; every OTHER
// reader gets a peer snapshot under reader-signals/, so `--check` compares each reader against ITS
// OWN baseline rather than reading a true 49-of-49 as DRIFTED. The home and the version flattening
// both come from `reader-scope.js`, which carries the one name for them: a peer snapshot is DERIVED
// and stands outside `corpus/`, which holds what a hand authored — a snapshot inside it joined the
// ground `still.js` measures the ruled share over, so a harvest moved a measurement.
const currentVersion = (() => {
  const tw = resolveTiddlyWiki();
  return tw ? boot(tw).$tw.version : null;
})();
const { PEER_DIR, sanitizeVersion } = require('./reader-scope.js');
const primaryVersion = (() => {
  if (!fs.existsSync(OUT)) return null;
  const m = /^tw5-version:\s*(.+)$/m.exec(fs.readFileSync(OUT, 'utf8'));
  return m ? m[1].trim() : null;
})();

// A script that runs a tool and renders a VERDICT. The manifest names them; these stand aside:
// a builder, a server, a reporting tool that answers a question rather than judging one — the family
// atlas reads what themes rule on and refuses nothing — and the
// per-scope runs of a gathering script that is not itself a gate.
// `gates` names this tool, which would run itself and never stop.
//
// AND EVERY HARVEST'S WRITING ARM, DERIVED FROM ITS NAME. A harvest answers in two arms: one READS
// and renders a verdict, one WRITES the tracked file the reading compares against. The reading arm
// belongs among the gates; the writing arm never does, because a gate that writes dirties the tree
// on every sweep — including under this tool's own `--check`, where a clean tree is the evidence.
//
// THE BARE NAME READS AND `:write` MUTATES, so a write arm needs no entry in any list: `WRITE_ARM`
// below reads it off the suffix. `ceiling`/`ceiling:write`, `builtins`/`builtins:write`,
// `signals`/`signals:write`, `edition`/`edition:write` all answer that one derivation, after the
// four pairs spelled the direction four ways between them and two of them spelled it backwards.
// `ceiling` carried `--write` in its BARE name and rewrote `TextMateCeiling.tid` on every pass;
// `builtins` ran bare with no `--check`, which writes the SHIPPED `syntaxes/tiddlywiki5.json`
// wherever it parts from the tiddler and then reports success — so that gate repaired the drift it
// stands to report, and no run could fail on it. Naming the write arms one by one re-created at the
// NAMING layer exactly the hazard a hand-kept list carries: a pair added tomorrow is skipped only if
// somebody remembers. The suffix never forgets.
//
// `NOT_A_GATE` keeps the rest, anchored one by one — a builder, a server, a reporting tool that
// answers a question rather than judging one, the per-scope runs of a gathering script, and `gates`
// itself, which would run this tool inside itself and never stop. These leave the gate set for
// reasons a suffix cannot carry, and hiding two CI instruments behind a loose prefix is what
// `CIGates.tid` now answers for: adding a name here means adding it to that ruling's reasons too.
// `edition` stands here among them and NOT as a write arm — its reading arm blocks a merge from
// CI's own step, outside this report, under `alsoGates`.
const WRITE_ARM = /:write$/;
const NOT_A_GATE = /^(gates$|bench|edition$|test|tests-|vscode|package|watch|compile|lint|corpus-verbose|rule-inventory|theme-paint|family-atlas|reading-recipe|page-palette|tw5-oracle|uri-span-measure|uri-span-compare)/;
const SKIP = new RegExp(`${WRITE_ARM.source}|${NOT_A_GATE.source}`);

const scripts = require(path.join(ROOT, 'package.json')).scripts;

/** The gates the manifest names, derived once so a caller never derives it a second way. */
function gateNames() {
  return Object.entries(scripts)
    .filter(([name, body]) => !SKIP.test(name) && /^node \.\/tools\/|^bash \.\/tools\//.test(body))
    .map(([name]) => name)
    .sort();
}

// A SELF-SKIP, under the one house-wide convention this gate report ENFORCES rather than invents
// (D3): a gate's summary line reading `<tool>  SKIP — <reason>` and exiting 0 is recorded as
// SKIPPED, with its reason, never as a verdict — the same shape `recovery-witness.js:107` already
// prints and this reader already picks up as a summary line. Any later optional-tool gate earns the
// third state for free by printing its own summary this way; nothing here is must-flag-specific.
//
// A SKIP CARRIES A RULING. `CIGates.tid` holds a gate that may stand down under `standsDown`, with
// the capability it reads and the reason — kept apart from `skipped`, which rules a gate CI never
// runs at all. `ci-runs-the-gates.test.js` reads this shape out of each instrument and fails one
// that gains a self-skip with nothing ruling it there, so a gate cannot learn to stand down in
// silence while the roster still reads every gate holding.
const SELF_SKIP = /^\S+\s{2,}SKIP\s+—\s+\S/;

/** held / failed / skipped, from a gate's own exit code and its own summary line. A skip still
 * exits 0 (it is not a failure), so `held` stays true for it — `skipped` is the finer reading a
 * caller wanting the third state asks for instead. */
function classify(held, said) {
  if (held && SELF_SKIP.test(said)) return 'skipped';
  return held ? 'held' : 'failed';
}

/** The whole-harvest TEXT (a `.tid` with a header, or a bare peer JSON) split at its JSON body, so
 * a caller can compare the header bytes and the body structure separately. */
function splitHarvest(text) {
  const at = text.indexOf('{');
  return at < 0 ? { head: text, body: null } : { head: text.slice(0, at), body: text.slice(at) };
}

// WHICH GATES A RULING LICENSES TO STAND DOWN, read from the ruling rather than from a list here.
// `CIGates.tid`'s `standsDown` names each gate CI runs that answers "not here" where the capability
// it reads is absent, with that capability and the reason. A gate not named there earns nothing
// below.
const STANDS_DOWN = new Set((() => {
  try { return (require('./wiki-data.js').readData('CIGates.tid').data.standsDown ?? []).map((r) => r.gate); }
  catch { return []; }
})());

/** A report body, projected for COMPARISON ONLY.
 *
 * A SKIPPED gate's reason names the environment (a TiddlyWiki version, a missing CLI) that no two
 * readers reproduce, so its `said` text must never drift the comparison — only its STATE does.
 *
 * AND FOR A GATE A RULING LICENSES TO STAND DOWN, NOT EVEN ITS STATE. The baseline records ONE
 * reader's run, so a gate whose capability stands there harvests as `held` carrying its full
 * verdict, and the same gate reads `skipped` wherever the capability is absent — which is exactly
 * CI, where no `lares` CLI stands. Measured: `--check` under the fork reader with the CLI stripped
 * from PATH read `must-flag` SKIPPED and reported DRIFTED, exit 1, with every gate holding. No
 * baseline can record both answers, and recording either one makes the other a fault nobody has.
 * So a ruled gate compares by its NAME and by holding, which exit 0 already carries.
 *
 * This cannot manufacture the green that means "did not run": the licence comes from a RULING in
 * the wiki naming the capability, an UNRULED gate that skips still drifts the comparison, the
 * `skipped` count still counts every unruled skip, `ci-runs-the-gates.test.js` fails any instrument
 * that gains a self-skip with nothing ruling it, and a ruled gate that FAILS still fails — the
 * ruling excuses an absence, never a verdict.
 *
 * Every other gate still compares by its full summary line, as `--check` always has. */
function comparable(body) {
  return {
    ...body,
    skipped: body.results.filter((r) => r.state === 'skipped' && !STANDS_DOWN.has(r.gate)).length,
    results: body.results.map((r) => {
      if (STANDS_DOWN.has(r.gate)) return { gate: r.gate };
      return r.state === 'skipped' ? { gate: r.gate, state: r.state } : r;
    })
  };
}

module.exports = { SKIP, gateNames, classify, splitHarvest, comparable };

if (require.main !== module) return;

(async () => {

const gates = Object.entries(scripts)
  .filter(([name, body]) => !SKIP.test(name) && /^node \.\/tools\/|^bash \.\/tools\//.test(body))
  .map(([name]) => name)
  .sort();

if (!gates.length) {
  console.error('  the manifest registers no gate this could run');
  process.exitCode = 2;
  return;
}

const results = [];
for (const gate of gates) {
  let out = '';
  let code = 0;
  try {
    out = execFileSync('npm', ['run', gate, '--silent'], {
      encoding: 'utf8',
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Story 0 instrumentation: names the gate on every ORACLE_TRACE line the child writes,
      // so a trace read back afterwards needs no pid-order inference to say which gate paid
      // for which boot/parse. A no-op when ORACLE_TRACE is unset.
      env: { ...process.env, ORACLE_TRACE_GATE: gate }
    });
  } catch (e) {
    code = e.status ?? 1;
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  // A tool's SUMMARY line carries its verdict — its own name, then what it counted. The last
  // line does not: several tools print a grammar-not-found warning after their summary, and
  // reading the last line reported that warning as the verdict.
  const lines = out.trim().split('\n').filter((l) => l.trim());
  const summary = [...lines].reverse().find((l) => /^\S+ {2,}\S/.test(l.trim()));
  const said = (summary ?? lines[lines.length - 1] ?? '').trim();
  const held = code === 0;
  results.push({ gate, held, state: classify(held, said), said: said.trim() });
}

const held = results.filter((r) => r.held).length;
const skipped = results.filter((r) => r.state === 'skipped').length;
const body = { gates: results.length, held, failing: results.length - held, skipped, results };

const tid = 'title: $:/tw5-syntax/GateReport\n'
  + 'type: application/json\n'
  + 'tags: $:/tags/TW5Syntax/GrammarData\n'
  + 'caption: Gate report\n'
  + `description: What each gate said when it last ran — harvested, never hand-written\n`
  + `gates-held: ${held} of ${results.length}\n`
  + `tw5-version: ${currentVersion}\n`
  + `\n${JSON.stringify(body, null, 4)}\n`;

const isPrimary = primaryVersion === null || currentVersion === primaryVersion;
const target = isPrimary ? OUT : path.join(PEER_DIR, `gate-report.${sanitizeVersion(currentVersion)}.json`);
const rendered = isPrimary ? tid : `${JSON.stringify(body, null, 4)}\n`;
const label = isPrimary ? 'the report' : `the peer report (${path.relative(ROOT, target)})`;

const standing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
if (check) {
  // (D3) A SKIPPED gate's reason names the environment — a TiddlyWiki version, a missing CLI —
  // which no two readers reproduce, so `--check` reads its STATE rather than its summary bytes.
  // Every other gate still compares its full summary line, exactly as before. The header (title,
  // tags, gates-held, tw5-version — none of it skip-reason text) still compares literally: only
  // the body's per-result projection is normalized.
  const standingSplit = standing ? splitHarvest(standing) : null;
  const renderedSplit = splitHarvest(rendered);
  let standingBody = null;
  try { standingBody = standingSplit && standingSplit.body ? JSON.parse(standingSplit.body) : null; }
  catch { standingBody = null; }
  const headSame = !!standingSplit && standingSplit.head === renderedSplit.head;
  const bodySame = !!standingBody
    && JSON.stringify(comparable(standingBody)) === JSON.stringify(comparable(body));
  const same = headSame && bodySame;
  for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
  for (const r of results.filter((x) => x.state === 'skipped')) console.log(`  ${r.gate} SKIPPED: ${r.said}`);
  if (!same) console.error(`  ${label} differs from what the gates say now`);
  console.log(`gate-report  ${held} of ${results.length} gate(s) hold (${skipped} skipped), `
    + `${label} ${same ? 'current' : 'DRIFTED'}`);
  process.exitCode = same && held === results.length ? 0 : 1;
  return;
}
if (!isPrimary) fs.mkdirSync(PEER_DIR, { recursive: true });
fs.writeFileSync(target, rendered);
console.log(`gate-report  ${held} of ${results.length} gate(s) hold (${skipped} skipped), ${label} written`);
for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
process.exitCode = held === results.length ? 0 : 1;
return;

})();
