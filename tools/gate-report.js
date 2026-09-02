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
//   node tools/gate-report.js [--check]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GateReport.tid');
const check = process.argv.includes('--check');

// A script that runs a tool and renders a VERDICT. The manifest names them; these stand aside:
// a builder, a server, a reporting tool that answers a question rather than judging one, and the
// per-scope snapshot runs that `snap` already carries whole.
const SKIP = /^(bench|edition|snap-update|snap-[a-z]|signals$|test|tests-|vscode|package|watch|compile|lint|corpus-verbose|rule-inventory|theme-paint|tw5-oracle|overreach-corpus-files)/;

const scripts = require(path.join(ROOT, 'package.json')).scripts;
const gates = Object.entries(scripts)
  .filter(([name, body]) => !SKIP.test(name) && /^node \.\/tools\/|^bash \.\/tools\//.test(body))
  .map(([name]) => name)
  .sort();

if (!gates.length) {
  console.error('  the manifest registers no gate this could run');
  process.exit(2);
}

const results = [];
for (const gate of gates) {
  let out = '';
  let code = 0;
  try {
    out = execFileSync('npm', ['run', gate, '--silent'], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
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
  + `\n${JSON.stringify(body, null, 4)}\n`;

const standing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (check) {
  const same = standing === tid;
  for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
  if (!same) console.error('  the report differs from what the gates say now');
  console.log(`gate-report  ${held} of ${results.length} gate(s) hold, the report ${same ? 'current' : 'DRIFTED'}`);
  process.exit(same && held === results.length ? 0 : 1);
}
fs.writeFileSync(OUT, tid);
console.log(`gate-report  ${held} of ${results.length} gate(s) hold, written`);
for (const r of results.filter((x) => !x.held)) console.error(`  ${r.gate} does not hold: ${r.said}`);
process.exit(held === results.length ? 0 : 1);
