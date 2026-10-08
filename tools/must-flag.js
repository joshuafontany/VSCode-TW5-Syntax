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
// So the exemption carries a declaration, and the declaration gets measured — but a THIRD state
// sits between "passes" and "the control went dark": an undeclared trip REPORTS, ATTRIBUTES, and
// does NOT BLOCK, the shape Pact calls a PENDING pact — "any mismatches during verification will
// not cause the overall verification task to fail" until an operator adjudicates them into the
// declaration one way or the other. Only a MISSING declared fault still blocks: a control that
// stopped controlling fails the gate, because nothing else here would ever say so.
//   - missing (declared, not tripped)      -> BLOCKS. The checker went blind, or the fixture went tame.
//   - extra   (tripped, not declared, on a DECLARED specimen) -> PENDING, reported, does not block.
//   - undeclared specimen tripping anything                   -> PENDING, reported, does not block.
// Both pending halves count toward the summary line's pending total, so the count stays visible
// rather than merely non-fatal — a silent "pending" would read exactly like the "letting the count
// fall by ledger growth" shape the house has already ruled out once (W5 of the consolidation plan):
// widening the declaration to absorb a pending trip reads identical to repairing it. The declaration
// is touched only by an operator adjudicating a pending trip into `faults=`, never by this tool.
//
// HELD APART FROM `must-fail.txt`. That ledger measures the TextMate GRAMMAR against specimens
// written to bleed; this measures `lares meme check`, a SEPARATE reader with its own refusal
// vocabulary, against specimens written to be torn. A grammar fixture owing the carrier checker
// cleanliness was left as "a separate ruling nobody has made" when `carriers-and-uris.mem` and
// `sigils.mem` were repaired (see LEDGER-3.0.0.md) — this is that ruling.
//
// THE VERSION SLOT. pytest's `importorskip(reason, minversion=...)` leaves a floor nobody here had
// written: a declaration ledger that names what it was adjudicated AGAINST, so a sibling that moved
// underneath it reports rather than silently re-passing or silently re-failing. `corpus/must-flag.txt`
// carries one file-level floor line, `lares-version <text>`, rather than a per-specimen field — the
// declaration measures the CHECKER's vocabulary as a whole (one `FAULT_PATTERNS` table serves every
// specimen), so one floor serves it the same way. `resolveLares()` already called `lares --version`
// and threw the answer away; it now keeps the literal text the CLI hands back. Today's live CLI
// carries NO `--version` subcommand at all — it answers `unknown command "--version"` — so the
// recorded floor is literally that refusal, captured once and compared going forward: a change in
// what the CLI answers (a real version arriving, or a different refusal) is itself the fact this
// slot exists to catch, and it reports as a PENDING mismatch — named, attributed, non-blocking —
// never as a silent pass and never as a block. The day the sibling gains a true `--version`, the
// first mismatch here is exactly the signal to re-adjudicate the floor line to the real string.
//
// A STABLE FAULT IDENTIFIER, NOTED FOR THE SIBLING. `FAULT_PATTERNS` matches the reading's PROSE —
// the current live pending trip ("2 live headings stand where a file frames one carrier…") is
// literally a prose line this ledger has never named. `lares meme check` would stop costing this
// ledger a rewording the day it printed a stable short code beside each `✗` line (the way
// `WikiParser.addDiagnostic`'s `code` field already does on the TiddlyWiki side) — this file does
// not change the sibling to add one, but a reader landing that code should fold it into
// `FAULT_PATTERNS` by code rather than by prose.
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
 * a grammar gate that finds no checkout beside it. Returns the literal text `lares --version`
 * handed back (trimmed), kept rather than thrown away so the declaration's floor line has
 * something real to compare against — or `null` when no `lares` stands on PATH at all. */
function resolveLares() {
  try {
    const out = execFileSync('lares', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return out.trim() || '(empty answer)';
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    // Found, but `--version` itself refused (an older build, a seat not yet bootstrapped, or —
    // today — a CLI that carries no such subcommand at all) — the CLI stands, so a caller still
    // asks it the real question and reads what it said, refusal and all.
    return `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() || '(refused with no output)';
  }
}

const VERSION_LINE = /^lares-version\s+(.+)$/;

/** The specimen declarations, and the one file-level floor line (`declarations()`'s own version
 * slot) the ledger was last adjudicated against — `null` where the ledger carries none yet. */
function declarations() {
  const out = [];
  let version = null;
  for (const raw of fs.readFileSync(DECLARATION, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const bare = line.split('#')[0].trim();
    const vm = VERSION_LINE.exec(bare);
    if (vm) { version = vm[1].trim(); continue; }
    const [name, faultsField] = bare.split(/\s+/);
    if (!name || !faultsField) continue;
    out.push({ name, faults: faultsField.split(',').filter(Boolean) });
  }
  return { declared: out, version };
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
  const answer = resolveLares();
  if (answer === null) {
    console.log('must-flag  SKIP — no `lares` CLI stands on PATH, so no carrier-checker reading answers');
    process.exitCode = 0;
    return;
  }

  const { declared, version } = declarations();
  const failures = [];
  const pending = [];

  if (version !== null && version !== answer) {
    pending.push(`  the declaration was adjudicated against lares answering ${JSON.stringify(version)}; `
      + `it now answers ${JSON.stringify(answer)} — re-adjudicate the \`lares-version\` line once this is read`);
  }

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
      // An UNDECLARED trip on a DECLARED specimen: reported, attributed, pending adjudication —
      // never a block. Widening `faults=` to absorb this is the move the house ruled out (W5):
      // it would read identical to a repair while meaning the opposite.
      pending.push(`  ${name} trips ${extra.join(',')}, which no declaration names — PENDING, not blocking`);
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
  // `corpus-check` and the gate sweep both read well-formed text as their only ground. An
  // UNDECLARED SPECIMEN tripping anything is the other pending half: reported, attributed, and
  // non-blocking until an operator adjudicates it into `corpus/must-flag.txt` one way or the other.
  const memeticDir = path.join(ROOT, 'corpus', 'memetic');
  for (const entry of fs.readdirSync(memeticDir)) {
    if (!entry.endsWith('.mem')) continue;
    if (declared.some((d) => d.name === entry)) continue;
    const { tripped } = faultsOf(path.join(memeticDir, entry));
    if (tripped.size) {
      pending.push(`  ${entry} trips ${[...tripped].join(',')} and carries no declaration in `
        + `${path.relative(ROOT, DECLARATION)} — PENDING, not blocking`);
    }
  }

  for (const f of failures) console.error(f);
  // PENDING never fails the gate, so it prints to stdout — `run-tool.js`'s own `runNode` only
  // captures stderr on a NON-ZERO exit, and a pending report must stay readable on the green runs
  // it stands beside.
  for (const p of pending) console.log(p);
  console.log(`must-flag  ${declared.length} declaration(s), ${failures.length} blocking, `
    + `${pending.length} pending (undeclared, not blocking)`);
  process.exitCode = failures.length === 0 ? 0 : 1;
  return;
})();
