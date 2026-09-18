#!/usr/bin/env node
// A ruling in corpus/expected-divergence.txt stands STALE only when EVERY run leaves it
// explaining zero spans.
//
// The file reads as one list, but the rulings inside it answer to several separate
// overreach-check runs — the samples, the corpus files, the memetic corpus, the host, and the host
// cut — and a ruling idle in one run can still be earning its place in another. darkness-witness and
// bracket-witness both carry a stale check of their own kind; this file had none, so a fix that
// closed the last divergence a ruling explained left the line standing forever, explaining nothing
// to anyone who read it.
//
// THE RUNS COME FROM THE MANIFEST, never from a list kept here. Every script invoking
// tools/overreach-check.js against corpus/expected-divergence.txt IS a run this file answers to,
// so a sixth one joins without anybody remembering to add it here.
//
// Each derived run takes --rulings-used=<file>, a flag overreach-check.js answers by writing, as
// JSON, which of the file's rulings — by their 0-based index among its non-blank, non-comment
// lines — explained at least one span that run read. This tool runs every derived script once,
// takes the UNION of what came back, and reports every ruling none of them explained.
//
//   node tools/divergence-staleness.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT } = require('./run-tool.js');

const EXPECTED_REL = 'corpus/expected-divergence.txt';
const EXPECTED = path.join(ROOT, ...EXPECTED_REL.split('/'));

/** Every ruling a file carries, in the order overreach-check.js's readExpected assigns them. */
function rulingLines(text) {
  return text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
}

/**
 * Every npm script this repository stands that runs overreach-check.js against the shared ruling
 * file, DERIVED from the manifest rather than hand-listed.
 *
 * @param {Record<string,string>} scripts  package.json's own `scripts`
 * @returns {{name:string, body:string}[]}
 */
function derivedRuns(scripts) {
  return Object.entries(scripts)
    .filter(([, body]) => /overreach-check\.js/.test(body) && body.includes(`--expected=${EXPECTED_REL}`))
    .map(([name, body]) => ({ name, body }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The union of what every run explained, and the rulings none of them touched.
 *
 * @param {number} total
 * @param {{name:string, used:number[]}[]} results
 * @returns {{union:Set<number>, stale:number[]}}
 */
function staleness(total, results) {
  const union = new Set();
  for (const r of results) for (const i of r.used) union.add(i);
  const stale = [];
  for (let i = 0; i < total; i += 1) if (!union.has(i)) stale.push(i);
  return { union, stale };
}

/**
 * Run one derived script for real, asking it which rulings it used.
 *
 * A run's own body already names its expected file; this REPLACES that reference so a caller —
 * the sandbox arm, chiefly — can point every run at a ruling file that is not the one on disk.
 *
 * @param {{name:string, body:string}} run
 * @param {string} cwd
 * @param {string} [expectedArg]  overrides the --expected= value the script body carries
 * @returns {{name:string, used:number[], code:number}}
 */
function execute(run, cwd, expectedArg = EXPECTED_REL) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'divergence-staleness-'));
  const rulingsUsedFile = path.join(scratch, 'used.json');
  const command = `${run.body.replace(`--expected=${EXPECTED_REL}`, `--expected=${expectedArg}`)} --rulings-used=${rulingsUsedFile}`;
  let code = 0;
  try {
    execFileSync('bash', ['-c', command], { cwd, stdio: 'ignore', env: process.env });
  } catch (e) {
    code = e.status ?? 1;
  }
  if (!fs.existsSync(rulingsUsedFile)) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw new Error(`${run.name} wrote no rulings-used file — it never reached the point overreach-check.js writes one (exit ${code})`);
  }
  const { used } = JSON.parse(fs.readFileSync(rulingsUsedFile, 'utf8'));
  fs.rmSync(scratch, { recursive: true, force: true });
  return { name: run.name, used, code };
}

module.exports = { rulingLines, derivedRuns, staleness, execute, EXPECTED_REL, EXPECTED };

if (require.main !== module) return;

(async () => {
  const verbose = process.argv.includes('--verbose');
  const scripts = require(path.join(ROOT, 'package.json')).scripts;
  const runs = derivedRuns(scripts);
  if (runs.length === 0) {
    console.error('  the manifest names no run over corpus/expected-divergence.txt — nothing to check');
    process.exitCode = 2;
    return;
  }
  const lines = rulingLines(fs.readFileSync(EXPECTED, 'utf8'));
  const results = [];
  for (const run of runs) {
    if (verbose) process.stderr.write(`  running ${run.name}...\n`);
    results.push(execute(run, ROOT));
  }
  const { stale } = staleness(lines.length, results);
  for (const i of stale) console.log(`  STALE  ${lines[i]}`);
  if (verbose) for (const r of results) console.log(`  ${r.name}  ${r.used.length} ruling(s) used, exit ${r.code}`);
  console.log(`divergence-staleness  ${runs.length} run(s) over ${lines.length} ruling(s): ${stale.length} stale`);
  process.exitCode = stale.length ? 1 : 0;
})();
