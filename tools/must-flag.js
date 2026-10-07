#!/usr/bin/env node
// Specimens written to be refused, and the fault `lares meme check` must still find in each.
//
// Two corpus carriers hold a structure the memetic frame grammar refuses ON PURPOSE —
// `corpus/memetic/control-set.mem` and `corpus/memetic/carriers.blockcheck.mem` — written to
// measure the carrier checker against text that is almost a carrier. The operator ruled they
// stay: the grammar must go on reading past them, and the checker must go on refusing them. A
// specimen like that stands exempt from every gate that measures well-formed carriers, the same
// exemption `must-fail.js` grants a grammar specimen that bleeds on purpose — and the exemption
// carries the same risk. The day `$carrier-sila` or the frame grammar learns to read one of these
// structures as sound, the specimen reports CANONICAL, keeps its exemption, and nothing here would
// ever say so. A control that stopped controlling reports nothing, and reports it in green.
//
// So the exemption carries a declaration, and the declaration gets measured: a specimen asserting
// a fault the checker no longer finds FAILS (the checker went blind, or the fixture went tame), and
// a specimen tripping a fault nobody declared FAILS too (an undeclared structure crept in beside
// the one the file was written to hold).
//
// HELD APART FROM `must-fail.txt`. That ledger measures the TextMate GRAMMAR against specimens
// written to bleed; this measures `lares meme check`, a SEPARATE reader with its own refusal
// vocabulary, against specimens written to be torn. A grammar fixture owing the carrier checker
// cleanliness was left as "a separate ruling nobody has made" when `carriers-and-uris.mem` and
// `sigils.mem` were repaired (see LEDGER-3.0.0.md) — this is that ruling.
//
//   node tools/must-flag.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./tokenizer.js');

const verbose = process.argv.includes('--verbose');
const DECLARATION = path.join(ROOT, 'corpus', 'must-flag.txt');

/**
 * Every fault `lares meme check` names, keyed to a short word this ledger declares by. A line in
 * the checker's own `torn:` block always opens on `✗` followed by the construct in backticks, an
 * em dash, and the reading — matched here by the reading alone, so a rewording of the construct
 * itself (an attribute added, a value changed) never drops a match this ledger still means.
 */
const FAULT_PATTERNS = {
  'frame-grammar': /reads outside the frame grammar/,
  'etb-bare': /carries ETB/
};

/** Whether the `lares` CLI answers at all, so a contributor holding only this checkout skips
 * rather than meets a red gate they cannot fix — the same courtesy `resolveTiddlyWiki` extends
 * a grammar gate that finds no checkout beside it. */
function resolveLares() {
  try {
    execFileSync('lares', ['--version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    // Found, but `--version` itself refused (an older build, a seat not yet bootstrapped) — the
    // CLI stands, so a caller still asks it the real question and reads what it says.
    return true;
  }
}

function declarations() {
  const out = [];
  for (const raw of fs.readFileSync(DECLARATION, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [name, faultsField] = line.split('#')[0].trim().split(/\s+/);
    if (!name || !faultsField) continue;
    out.push({ name, faults: faultsField.split(',').filter(Boolean) });
  }
  return out;
}

/** Every `✗`-marked line `lares meme check` printed for this file, mapped to the fault key this
 * ledger names it by — or to the line's own text, when no declared pattern claims it, so an
 * unrecognised fault still reports AS a mismatch rather than vanishing from the count. */
function faultsOf(file) {
  let out = '';
  try {
    out = execFileSync('lares', ['meme', 'check', file], { encoding: 'utf8', cwd: ROOT });
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const tripped = new Set();
  for (const line of out.split('\n')) {
    const m = /^\s*✗\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = Object.entries(FAULT_PATTERNS).find(([, re]) => re.test(m[1]))?.[0] ?? m[1].trim();
    tripped.add(key);
  }
  return { tripped, out };
}

(() => {
  const lares = resolveLares();
  if (!lares) {
    console.log('must-flag  no `lares` CLI stands on PATH, so no carrier-checker reading answers');
    process.exitCode = 0;
    return;
  }

  const declared = declarations();
  const failures = [];

  for (const { name, faults } of declared) {
    const file = path.join(ROOT, 'corpus', 'memetic', name);
    if (!fs.existsSync(file)) {
      failures.push(`  the declaration names ${name}, and no specimen by that name stands in corpus/memetic`);
      continue;
    }
    const { tripped, out } = faultsOf(file);
    const want = new Set(faults);
    const missing = faults.filter((f) => !tripped.has(f));
    const extra = [...tripped].filter((f) => !want.has(f));
    if (missing.length) {
      failures.push(`  ${name} declares ${missing.join(',')} and the checker no longer finds it — `
        + `a control that stopped controlling, or a checker gone blind`);
    }
    if (extra.length) {
      failures.push(`  ${name} trips ${extra.join(',')}, which no declaration names`);
    }
    if (verbose && !missing.length && !extra.length) {
      console.log(`  ${name.padEnd(32)} ${[...tripped].join(',')}`);
    }
    if ((missing.length || extra.length) && verbose) {
      console.log(out.trim().split('\n').map((l) => `    ${l}`).join('\n'));
    }
  }

  // The other half: every specimen a corpus reader meets under `corpus/memetic` that trips ANY
  // fault `lares meme check` names, and that this declaration does not cover at all. A fixture
  // nobody declared that carries a real fault would otherwise fail silently everywhere else —
  // `corpus-check` and the gate sweep both read well-formed text as their only ground.
  const memeticDir = path.join(ROOT, 'corpus', 'memetic');
  for (const entry of fs.readdirSync(memeticDir)) {
    if (!entry.endsWith('.mem')) continue;
    if (declared.some((d) => d.name === entry)) continue;
    const { tripped } = faultsOf(path.join(memeticDir, entry));
    if (tripped.size) {
      failures.push(`  ${entry} trips ${[...tripped].join(',')} and carries no declaration in ${path.relative(ROOT, DECLARATION)}`);
    }
  }

  for (const f of failures) console.error(f);
  console.log(`must-flag  ${declared.length} declaration(s), ${failures.length} that assert nothing`);
  process.exitCode = failures.length === 0 ? 0 : 1;
  return;
})();
