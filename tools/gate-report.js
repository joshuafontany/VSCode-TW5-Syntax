#!/usr/bin/env node
// What every gate says, gathered where a reader can open it.
//
// Seventeen gates stand here and each one prints a line nobody keeps. A reader who wants the
// grammar's state runs them all and reads scrollback; a reader who opens the wiki sees the
// rulings that govern them and nothing about whether they hold.
//
// This runs each gate the manifest registers and writes down what it said. A HARVEST, so no hand
// edits it and it goes stale the moment the tree moves — which serves the reader: a report that
// agrees with a tree it no longer describes offers reassurance rather than a reading.
//
// The gate list comes from the manifest, never from here. A gate somebody adds joins the page
// without anybody remembering, and a gate that leaves drops out of the report rather than
// reporting a stale pass.
//
//   node tools/gate-report.js [--check] [--in-process]
//
// `--in-process` is a SPIKE, not the default. It runs a handful of oracle-booting gates by
// requiring their module and calling the `run(argv)` they export instead of spawning `npm run
// <gate>` for them — sharing tw5-oracle.js's own boot memo across those gates the way nothing run
// as separate `npm run` children ever could, since each child pays a fresh boot. Every OTHER gate
// still spawns exactly as it always has; this never changes what a caller not passing the flag
// sees. See tools/invariants for the coverage this stands beside, and the commit that added this
// flag for the measured numbers both ways and the operator's open question on the default.

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GateReport.tid');
const check = process.argv.includes('--check');
const inProcess = process.argv.includes('--in-process');

// Gates whose tool exports a `run(argv)` returning its own exit code, refactored so gate-report.js
// calls the SAME body their own CLI does rather than a second copy of it — the one-implementation
// law this repository already holds tools/walk.js and tools/ledger-shape.js to. Both gates named
// here boot TiddlyWiki with the SAME empty rule set (`boot(tw, {})`), the same key tw5-oracle.js's
// own memo already uses, so running them back to back in this process shares one boot rather than
// paying it twice — the saving `--in-process` exists to measure. A gate whose tool has not been
// refactored this way is absent here and always spawns, flag or not.
const IN_PROCESS_GATES = {
  darkness: './darkness-witness.js',
  ablation: './ablation-witness.js'
};

/**
 * Run an in-process gate, capturing what it would have printed to a child's stdout/stderr the
 * same way `execFileSync` hands it back — so the summary-line reading below works unchanged
 * whichever path produced `out`. A thrown error renders the same way a non-zero exit from a spawned
 * gate always has: a non-zero code and the failure's own text as `out`, never an uncaught throw
 * that would take the whole report down for one gate's fault.
 *
 * @param {string} modulePath
 * @returns {{code: number, out: string}}
 */
function runInProcess(modulePath) {
  const mod = require(modulePath);
  const chunks = [];
  const captured = (s) => { chunks.push(s); return true; };
  const realLog = console.log;
  const realError = console.error;
  const realWrite = process.stdout.write;
  const realErrWrite = process.stderr.write;
  console.log = (...args) => captured(`${args.join(' ')}\n`);
  console.error = (...args) => captured(`${args.join(' ')}\n`);
  process.stdout.write = (s) => captured(String(s));
  process.stderr.write = (s) => captured(String(s));
  let code = 0;
  return Promise.resolve(mod.run([]))
    .catch((err) => { captured(`${err && err.stack ? err.stack : err}\n`); code = 1; return code; })
    .then((c) => {
      console.log = realLog;
      console.error = realError;
      process.stdout.write = realWrite;
      process.stderr.write = realErrWrite;
      return { code: code || c || 0, out: chunks.join('') };
    });
}

// KEYED ON THE READER (tools/reader-scope.js's own generalisation, applied here the way
// grammar-signals.js already applies it to its own harvest). Several gates' own SUMMARY lines name
// the TiddlyWiki they booted against — recovery-witness prints its version in a SKIP reason,
// grammar-signals prints it outright — so the harvested report differs by reader even where every
// gate holds. `GateReport.tid` stays the reader that last wrote it with no `--check`; every OTHER
// reader gets a peer snapshot under corpus/reader-signals/, so `--check` compares each reader
// against ITS OWN baseline rather than reading a true 49-of-49 as DRIFTED.
const currentVersion = (() => {
  const tw = resolveTiddlyWiki();
  return tw ? boot(tw).$tw.version : null;
})();
const PEER_DIR = path.join(ROOT, 'corpus', 'reader-signals');
const sanitizeVersion = (v) => v.replace(/[^A-Za-z0-9.+-]/g, '_');
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
const SKIP = /^(gates$|bench|edition|snap-update|signals$|test|tests-|vscode|package|watch|compile|lint|corpus-verbose|rule-inventory|theme-paint|family-atlas|reading-recipe|page-palette|tw5-oracle)/;

const scripts = require(path.join(ROOT, 'package.json')).scripts;

/** The gates the manifest names, derived once so a caller never derives it a second way. */
function gateNames() {
  return Object.entries(scripts)
    .filter(([name, body]) => !SKIP.test(name) && /^node \.\/tools\/|^bash \.\/tools\//.test(body))
    .map(([name]) => name)
    .sort();
}

module.exports = { SKIP, gateNames };

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
  const spike = inProcess && IN_PROCESS_GATES[gate];
  try {
    if (spike) {
      ({ code, out } = await runInProcess(IN_PROCESS_GATES[gate]));
    } else {
      out = execFileSync('npm', ['run', gate, '--silent'], {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Story 0 instrumentation: names the gate on every ORACLE_TRACE line the child writes,
        // so a trace read back afterwards needs no pid-order inference to say which gate paid
        // for which boot/parse. A no-op when ORACLE_TRACE is unset.
        env: { ...process.env, ORACLE_TRACE_GATE: gate }
      });
    }
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
  results.push({ gate, held: code === 0, said: said.trim() });
}

const held = results.filter((r) => r.held).length;
const body = { gates: results.length, held, failing: results.length - held, results };

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
  const same = standing === rendered;
  for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
  if (!same) console.error(`  ${label} differs from what the gates say now`);
  console.log(`gate-report  ${held} of ${results.length} gate(s) hold, ${label} ${same ? 'current' : 'DRIFTED'}`);
  process.exitCode = same && held === results.length ? 0 : 1;
  return;
}
if (!isPrimary) fs.mkdirSync(PEER_DIR, { recursive: true });
fs.writeFileSync(target, rendered);
console.log(`gate-report  ${held} of ${results.length} gate(s) hold, ${label} written`);
for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
process.exitCode = held === results.length ? 0 : 1;
return;

})();
