#!/usr/bin/env node
// Where TiddlyWiki recovers out loud, does the grammar show a reader the wound?
//
// Every other witness here asks whether the two readers AGREE. This asks something neither of them
// alone can answer: the host's parser recovers from an unterminated construct and RECORDS the
// recovery — `WikiParser.addDiagnostic` normalises `{from, to, severity, source, code, message}`,
// and seventeen wiki rules raise one. A reader gets none of it. An unterminated `''bold` paints
// exactly like a bold that closed, and the wiki renders the rest of the tiddler in bold.
//
// THE POPULATION COMES FROM THE HOST. `parse-diagnostics.js` reads the same array through a filter
// operator, so a code this repository never met still reaches this reading the day some carrier
// raises it. A list of codes written here would go stale the next time a rule learns to recover.
//
// THE SILENCE IS OFTEN CORRECT, AND MUST STILL BE RULED. A line-local pattern cannot know that a
// closer never arrives anywhere ahead — that names the `whole-document lookahead` ceiling this
// repository already measured. So a silent code reads as a FINDING that must name where its answer
// lives, never as a defect on its own. Every ruling here hands a line item to the language server
// with the host's own vocabulary on it, which is worth more than a ceiling derived by hand: the
// eight in `textmate-ceiling.js` came from this repository's reading of the host, and these come
// from the host's own account of itself.
//
// FORK-ONLY FEATURE. `WikiParser.addDiagnostic` is this repository's own fork's own addition; the
// pinned devDependency's parser carries no such array. Feature-detected below rather than read off
// `$tw.version`, so a reader without it gets SKIP — visible in gate-report.js's harvest — never a
// false PASS (0 silent codes answers nothing this witness asked) or a false FAIL (every ruling
// reading as stale because nothing this reader ever raises could match one).
//
//   node tools/recovery-witness.js [--verbose] [--host N]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { READINGS, DEFAULT_TYPE } = require('./carrier-reading.js');
const { walkFiles } = require('./walk.js');

const LEDGER = path.join(ROOT, 'corpus', 'recovery-ledger.txt');
const verbose = process.argv.includes('--verbose');
const hostArg = process.argv.indexOf('--host');
const hostSample = hostArg >= 0 ? Number(process.argv[hostArg + 1]) || 60 : 0;

const oracle = boot(resolveTiddlyWiki(), {});

/** A mark a reader SEES: the grammar saying this span went wrong. */
const MARKS = /^invalid\./;

/** The rulings, as a code and the reason it stands silent. */
function ledger() {
  const out = new Map();
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [body, ...rest] = line.split('#');
    const m = /^silent\s+(\S+)$/.exec(body.trim());
    if (m) out.set(m[1], rest.join('#').trim());
  }
  return out;
}

/** Every carrier this sweep reads: the corpus always, host ground on request. */
function carriers() {
  const exts = ['.tw', '.mem', '.tid', '.meta', '.multids'];
  const out = walkFiles(path.join(ROOT, 'corpus')).filter((f) => exts.includes(path.extname(f)));
  if (hostSample) {
    const host = walkFiles(path.join(resolveTiddlyWiki(), 'editions')).filter((f) => f.endsWith('.tid')).sort();
    // A DETERMINISTIC DRAW. A random sample reports a different number every run, and a ratchet
    // over a wandering number guards nothing.
    const step = Math.max(1, Math.floor(host.length / hostSample));
    for (let i = 0; i < host.length && out.length < hostSample + 1000; i += step) out.push(host[i]);
  }
  return out;
}

/** The scopes the grammar puts across one span, from a tokenization keyed by line. */
function scopesAcross(text, tokens, from, to) {
  const seen = new Set();
  let offset = 0;
  text.split('\n').forEach((line, i) => {
    const end = offset + line.length;
    if (end >= from && offset <= to) {
      for (const token of tokens[i] || []) {
        const start = offset + token.startIndex;
        const stop = offset + token.endIndex;
        if (stop > from && start < to) for (const scope of token.scopes) seen.add(scope);
      }
    }
    offset = end + 1;
  });
  return seen;
}

// FEATURE-DETECTED, NEVER VERSION-SNIFFED. `WikiParser.addDiagnostic` is this repository's own
// fork's own addition — the pinned 5.4.1 devDependency's `parseText` carries no `diagnostics`
// property at all, not even an empty array, on ANY input. Asking the API directly rather than
// checking `$tw.version` means a future release that back-ports the feature is met correctly with
// no edit here.
const supportsDiagnostics = Array.isArray(oracle.parse('x').diagnostics);

(async () => {
  if (!supportsDiagnostics) {
    // Neither PASS nor FAIL: a reader without the diagnostics API answers no question this
    // witness asks, so reporting 0 silent codes here would read as agreement the reader never
    // gave. gate-report.js's own summary line picks up SKIP, so a reader who only sees the
    // harvest still learns why.
    console.log(`recovery-witness  SKIP — TiddlyWiki ${oracle.$tw.version} carries no parser `
      + 'diagnostics API (WikiParser.addDiagnostic); this witness needs the `diagnostics` field '
      + 'tools/tw5-oracle.js reads back, which only this repository\'s own fork exposes');
    process.exitCode = 0;
    return;
  }
  const rulings = ledger();
  const files = carriers();
  const byCode = new Map();
  let total = 0;
  let read = 0;

  for (const file of files) {
    const reading = READINGS[path.extname(file)];
    if (!reading) continue;
    const text = fs.readFileSync(file, 'utf8');
    const body = reading.body ? reading.body(text) : text;
    const type = reading.type ? reading.type(text) : DEFAULT_TYPE;
    let diagnostics;
    try { diagnostics = oracle.parseAs(type, body).diagnostics || []; } catch { continue; }
    read += 1;
    if (!diagnostics.length) continue;
    const tokens = await tokenize(reading.scope, text);
    // The grammar reads the WHOLE carrier and the host reads its body, so a `.tid` header shifts
    // every offset. Measuring the shift beats assuming it: a header that grows moves the whole body.
    const shift = text.length - body.length;
    for (const d of diagnostics) {
      total += 1;
      const scopes = scopesAcross(text, tokens, d.from + shift, d.to + shift);
      const marks = [...scopes].filter((s) => MARKS.test(s));
      if (!byCode.has(d.code)) byCode.set(d.code, { marked: 0, silent: 0, severity: d.severity, file, from: d.from });
      const seen = byCode.get(d.code);
      if (marks.length) seen.marked += 1; else seen.silent += 1;
    }
  }

  const silent = [...byCode].filter(([, v]) => v.silent > 0).map(([k]) => k);
  const unruled = silent.filter((c) => !rulings.has(c));
  const stale = [...rulings.keys()].filter((c) => !byCode.has(c));

  if (verbose) {
    for (const [code, v] of [...byCode].sort((a, b) => b[1].silent - a[1].silent)) {
      console.log(`  ${String(v.silent).padStart(4)} silent  ${String(v.marked).padStart(3)} marked  ${v.severity.padEnd(8)} ${code}`
        + `   e.g. ${path.basename(v.file)}@${v.from}`);
    }
  }
  for (const code of unruled) {
    const v = byCode.get(code);
    console.error(`  the host recovers and the grammar shows a reader nothing: ${code}`
      + ` (${v.silent} span(s), e.g. ${path.basename(v.file)}@${v.from}) — no ruling stands`);
  }
  for (const code of stale) console.error(`  a ruling explaining nothing: ${code} — no carrier raises it`);

  console.log(`recovery-witness  ${total} diagnostic(s) across ${read} carrier(s), ${byCode.size} code(s), `
    + `${silent.length} standing silent, ${unruled.length} unruled, ${stale.length} explaining nothing`);
  process.exitCode = unruled.length === 0 && stale.length === 0 ? 0 : 1;
  return;
})();
