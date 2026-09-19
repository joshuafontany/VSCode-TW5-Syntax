#!/usr/bin/env node
// Where TiddlyWiki builds a construct and the grammar answers with nothing of its own.
//
// Two faults leave a reader facing plain text where markup stands, and every other gate here reads
// past both. A SWALLOW holds a region open, so the constructs after it take the region's names in
// place of their own; `bleed-canary` asks that at the end of a file and `swallow-witness` at every
// cut. A MISS finds no rule at all, so a construct the host builds reads as ground. `dark-construct`
// asks whether themes paint the names a grammar EMITS, and a construct the grammar never names
// emits nothing for it to ask about. No instrument asked the question a reader's eye asks: here
// the host sees markup — does the grammar?
//
// THE POPULATION COMES FROM THE HOST. Every node carrying a rule TiddlyWiki stands (its own
// `activeRules`) names a construct a reader should see. A hand list of markup probes what its
// author remembers.
//
// EVERY LINE ANSWERS FOR ITSELF. A table forms ONE host construct, so a verdict per construct lets
// one lit row carry a table that stopped reading after it.
//
// A CONSTRUCT'S OWN GROUND. Its span, less every construct nested in it and every run of prose —
// the text a paragraph or a cell holds belongs to the text node, and reads plain by design. The
// rule-less elements a rule builds from its own marks stay: a table's `|` lives inside its `<tr>`.
//
// A LINE READS LIT when its names, in place, either share one with the construct read ALONE, or
// carry one neither flanking token carries. Each arm covers what the other misjudges:
//   ALONE alone calls a context-rich reading dark — a template separator inside a list-held
//     transclusion reads its own punctuation in place and something else stripped of the list.
//   FLANKS alone call siblings dark — three adjacent comments each carry every name the comment
//     before and after carry.
// A swallowed construct fails both: in place its names belong to the region around it, and read
// alone it reads as itself.
//
//   MISS  the grammar reads nothing of this line even with the construct standing alone
//   LOST  it reads the construct alone and loses this line in place — text before it holds a region
//
// Every dark line stands declared in corpus/darkness-ledger.txt with its reason, and a declaration
// whose line reads lit fails as stale, so a repair retires the debt it paid.
//
// A reason opening `READER <version>` (tools/reader-scope.js) answers for ONE reader alone — an
// unterminated inline run recovers to a different point under the pinned devDependency than under
// this repository's own fork, so the line reads dark under one and lit under the other. Scoped that
// way it neither fails nor reads stale under the reader it does not name.
//
//   node tools/darkness-witness.js [--verbose] [--list]
//
// `--list` prints every dark line in the ledger's own form, the keys derived and the reasons left
// for a reader to write.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { boot, resolveTiddlyWiki, isPlainText, flatten } = require('./tw5-oracle.js');
const { readerOf, appliesToReader } = require('./reader-scope.js');

const SCOPE = 'text.html.tiddlywiki5';
const LEDGER = path.join(ROOT, 'corpus', 'darkness-ledger.txt');
const CARRIER_DIRS = [path.join(ROOT, 'corpus', 'wikitext'), path.join(ROOT, 'tests', 'samples')];

/** The ground every carrier stands on, rather than a construct: the grammar's root and a paragraph. */
const isGround = (scope) => scope === SCOPE || /^meta\.paragraph\./.test(scope);

/** The grammar's reading as one token list over absolute offsets, one run per line at most. */
async function placed(text) {
  const lines = text.split('\n');
  const read = await tokenize(SCOPE, text);
  const out = [];
  let offset = 0;
  lines.forEach((line, i) => {
    for (const t of read[i]) {
      const s = offset + t.startIndex;
      const e = offset + Math.min(t.endIndex, line.length);
      if (e > s) out.push({ s, e, scopes: t.scopes });
    }
    offset += line.length + 1;
  });
  return out;
}

/** Non-ground names the reading carries over the visible offsets `at` admits. */
function namesOver(tokens, text, at) {
  const out = new Set();
  for (const t of tokens) {
    for (let p = t.s; p < t.e; p++) {
      if (!at(p) || /\s/.test(text[p])) continue;
      for (const scope of t.scopes) if (!isGround(scope)) out.add(scope);
      break;
    }
  }
  return out;
}

/**
 * The lines of host constructs the reader answers with nothing of their own.
 *
 * @param {string} text
 * @param {{parse: Function, activeRules: Function}} oracle
 * @param {(text: string) => Promise<{s:number,e:number,scopes:string[]}[]>} [read]  the grammar, unless a caller hands in another reader
 * @returns {Promise<{verdict: 'MISS'|'LOST', line: number, rule: string, text: string}[]>}
 */
async function darkLines(text, oracle, read = placed) {
  const active = new Set(Object.values(oracle.activeRules()).flat());
  const all = flatten(oracle.parse(text).tree, { sameSpace: true })
    .filter((n) => typeof n.start === 'number' && typeof n.end === 'number' && n.end > n.start);
  // A node whose children carry no position here had its interior parsed elsewhere — a typed
  // block's body arrives as a positionless `genesis` — so no line of it answers in this space.
  const elsewhere = (n) => (n.children || []).length > 0 && n.children.every((c) => typeof c.start !== 'number');
  const constructs = all.filter((n) => active.has(n.rule) && !isPlainText(n) && !elsewhere(n));
  const tokens = await read(text);
  const visible = (t) => /\S/.test(text.slice(t.s, t.e));
  const lineOf = (p) => text.slice(0, p).split('\n').length;
  const aloneCache = new Map();
  const found = [];
  const seen = new Set();
  for (const n of constructs) {
    const nested = all.filter((m) => m !== n && (m.rule || isPlainText(m))
      && m.start >= n.start && m.end <= n.end && (m.start > n.start || m.end < n.end));
    const own = (p) => p >= n.start && p < n.end && !nested.some((m) => p >= m.start && p < m.end);
    const col = n.start - (text.lastIndexOf('\n', n.start - 1) + 1);
    const alone = ' '.repeat(col) + text.slice(n.start, n.end);
    if (!aloneCache.has(alone)) aloneCache.set(alone, await read(alone));
    const aloneTokens = aloneCache.get(alone);
    const shift = n.start - col;
    const before = tokens.findLast((t) => t.e <= n.start && visible(t));
    const after = tokens.find((t) => t.s >= n.end && visible(t));
    const flank = before && after
      ? before.scopes.filter((s) => after.scopes.includes(s))
      : (before || after || { scopes: [] }).scopes;
    for (let lineStart = n.start - col; lineStart < n.end;) {
      let lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd < 0) lineEnd = text.length;
      const here = (p) => p >= lineStart && p < lineEnd && own(p);
      let shows = false;
      for (let p = lineStart; p < lineEnd; p++) if (here(p) && /\S/.test(text[p])) { shows = true; break; }
      if (shows) {
        const inPlace = namesOver(tokens, text, here);
        const alone_ = namesOver(aloneTokens, alone, (q) => here(q + shift));
        const lit = [...inPlace].some((s) => alone_.has(s) || !flank.includes(s));
        if (!lit) {
          const verdict = alone_.size ? 'LOST' : 'MISS';
          const line = lineOf(lineStart);
          const key = `${verdict} ${line} ${n.rule}`;
          if (!seen.has(key)) {
            seen.add(key);
            found.push({ verdict, line, rule: n.rule, text: text.slice(lineStart, lineEnd).trim() });
          }
        }
      }
      lineStart = lineEnd + 1;
    }
  }
  return found.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

/** The key a ledger line and a dark line share. */
const keyOf = (file, rule, verdict, text) => `${file}  ${rule}  ${verdict}  ${JSON.stringify(text)}`;

/** Declarations, keyed as dark lines key, each carrying its reason. */
function readLedger() {
  const declared = new Map();
  if (!fs.existsSync(LEDGER)) return declared;
  const shape = /^(\S+)\s+(\S+)\s+(MISS|LOST)\s+("(?:[^"\\]|\\.)*")\s*#\s?(.*)$/;
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = shape.exec(line);
    if (!m) { declared.set(`unreadable: ${line}`, null); continue; }
    declared.set(keyOf(m[1], m[2], m[3], JSON.parse(m[4])), m[5]);
  }
  return declared;
}

/** Every wikitext carrier, derived from the directories that hold them. */
function carriers() {
  return CARRIER_DIRS.flatMap((dir) => (fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.tw')).sort().map((f) => path.join(dir, f))
    : []));
}

module.exports = { darkLines, placed, isGround, keyOf };

if (require.main !== module) return;

(async () => {
  const verbose = process.argv.includes('--verbose');
  const list = process.argv.includes('--list');
  const oracle = boot(resolveTiddlyWiki());
  const current = oracle.$tw.version;
  const declared = readLedger();
  const unreadable = [...declared.keys()].filter((k) => k.startsWith('unreadable: '));
  const files = carriers();
  const dark = [];
  let judged = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    for (const d of await darkLines(text, oracle)) dark.push({ ...d, file: rel, key: keyOf(rel, d.rule, d.verdict, d.text) });
    judged++;
  }
  if (list) {
    for (const d of dark) process.stdout.write(`${d.key}  # ${declared.get(d.key) || 'REASON OWED'}\n`);
    return;
  }
  // A declaration NAMING A READER answers only for that one — a divergence this reader never
  // meets stays undeclared here exactly as if nothing named it, and a divergence it DOES meet
  // still needs the declaration to name this reader (or none at all).
  const undeclared = dark.filter((d) => {
    if (!declared.has(d.key)) return true;
    return !appliesToReader(readerOf(declared.get(d.key)).version, current);
  });
  const darkKeys = new Set(dark.map((d) => d.key));
  // A declaration scoped to a DIFFERENT reader is expected to stand idle here — that is the
  // reader-specificity the declaration names, never staleness.
  const stale = [...declared.keys()].filter((k) => !k.startsWith('unreadable: ') && !darkKeys.has(k)
    && appliesToReader(readerOf(declared.get(k)).version, current));
  const owed = dark.filter((d) => declared.has(d.key) && /^OWED\b/.test(readerOf(declared.get(d.key)).rest)).length;
  for (const d of undeclared.slice(0, verbose ? undeclared.length : 12)) {
    console.log(`  ${d.verdict} ${d.file}:${d.line} ${d.rule}  ${JSON.stringify(d.text.slice(0, 70))}`);
  }
  if (!verbose && undeclared.length > 12) console.log(`  … ${undeclared.length - 12} more; --verbose lists them all`);
  for (const k of stale) console.log(`  ${k} — a declaration explaining nothing: the line no longer reads dark (stale)`);
  for (const k of unreadable) console.log(`  ${k.slice(12)} — a ledger line this cannot read`);
  console.log(`darkness-witness  ${dark.length} construct line(s) over ${judged} carrier(s) read dark: ${dark.length - undeclared.length} declared (${owed} owed), ${undeclared.length} undeclared, ${stale.length} stale`);
  process.exitCode = undeclared.length || stale.length || unreadable.length ? 1 : 0;
})();
