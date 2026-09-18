#!/usr/bin/env node
// The red a bracket takes when VS Code's own matcher reads it as unmatched.
//
// No theme and no scope decides this colour. The editor matches the pairs a language configuration
// names in `brackets`, paints a closer with no opener — and an opener nothing closes — in the theme's
// unexpected-bracket colour, and does so over whatever colour the grammar and theme agreed on. The
// token inspector shows the agreed colour and "No theme selector", so a reader chasing the red through
// scopes finds nothing. `colorizedBracketPairs: []` hands back the DEPTH colours only; the matching,
// and its red, run on every pair `brackets` names.
//
// TWO INPUTS DECIDE IT, and this repository owns both: each language configuration's `brackets`, and
// the grammar's token families. vscode-textmate types a token by the innermost of
// comment|string|regex|meta.embedded among its scopes, `meta.embedded` resetting the type to Other,
// and the matcher reads brackets in Other tokens alone — so a grammar naming a span a string takes
// its brackets out of the matching, and that is the one lever a grammar holds over the red.
//
// THE RULE, as the editor runs it: a closer closes the nearest open opener of its own kind anywhere
// on the stack, and every opener it passes stays unclosed; a closer finding none reads red; an opener
// open at the end of the file reads red.
//
// Every red a carrier holds stands declared in corpus/bracket-ledger.txt with its reason, and a
// declaration whose bracket reads matched fails as stale. A degenerate carrier exists to leave
// constructs open, and its reds stand counted rather than declared.
//
//   node tools/bracket-witness.js [--verbose] [--list]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { parseJsonc } = require('./jsonc.js');

const LEDGER = path.join(ROOT, 'corpus', 'bracket-ledger.txt');
const CARRIER_DIRS = [path.join(ROOT, 'tests', 'samples'), path.join(ROOT, 'corpus')];
const DEGENERATE = /^degenerate\./;

/** The type vscode-textmate gives a token: the innermost family among its scopes, embedded as Other. */
function tokenType(scopes) {
  let type = 'Other';
  for (const scope of scopes) {
    const m = /\b(comment|string|regex|meta\.embedded)\b/.exec(scope);
    if (m) type = m[1] === 'meta.embedded' ? 'Other' : m[1];
  }
  return type;
}

/**
 * The brackets VS Code paints red, reading a text as the editor reads it.
 *
 * @param {string[]} lines
 * @param {{startIndex:number,endIndex:number,scopes:string[]}[][]} tokens  one list per line
 * @param {[string,string][]} pairs  the configuration's `brackets`
 * @returns {{line:number, col:number, text:string, kind:'open'|'close'}[]}  one-based
 */
function redBrackets(lines, tokens, pairs) {
  const closerOf = new Map(pairs.map(([open, close]) => [open, close]));
  const openers = new Set(pairs.map(([open]) => open));
  const closers = new Set(pairs.map(([, close]) => close));
  const spellings = [...openers, ...closers].sort((a, b) => b.length - a.length);
  const stack = [];
  const red = [];
  lines.forEach((line, i) => {
    for (const t of tokens[i] || []) {
      if (tokenType(t.scopes) !== 'Other') continue;
      const end = Math.min(t.endIndex, line.length);
      for (let c = t.startIndex; c < end;) {
        const text = spellings.find((s) => c + s.length <= end && line.startsWith(s, c));
        if (!text) { c++; continue; }
        const at = { line: i + 1, col: c + 1, text };
        if (openers.has(text)) {
          stack.push(at);
        } else {
          let k = stack.length - 1;
          while (k >= 0 && closerOf.get(stack[k].text) !== text) k--;
          if (k < 0) red.push({ ...at, kind: 'close' });
          else for (const passed of stack.splice(k).slice(1)) red.push({ ...passed, kind: 'open' });
        }
        c += text.length;
      }
    }
  });
  for (const open of stack) red.push({ ...open, kind: 'open' });
  return red.sort((a, b) => a.line - b.line || a.col - b.col);
}

/** Each language this extension configures: its extensions, its grammar, and its bracket pairs. */
function languages() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const grammarOf = new Map(pkg.contributes.grammars.filter((g) => g.language).map((g) => [g.language, g.scopeName]));
  return pkg.contributes.languages
    .filter((l) => l.configuration && grammarOf.has(l.id))
    .map((l) => ({
      id: l.id,
      extensions: l.extensions || [],
      scope: grammarOf.get(l.id),
      pairs: parseJsonc(fs.readFileSync(path.join(ROOT, l.configuration), 'utf8')).brackets || []
    }));
}

/** Every carrier a configured language claims, derived from the directories that hold them. */
function carriers(langs) {
  const out = [];
  const claim = (file) => {
    const matches = langs.flatMap((l) => l.extensions.filter((e) => file.endsWith(e)).map((e) => ({ l, e })));
    return matches.sort((a, b) => b.e.length - a.e.length)[0]?.l;
  };
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const lang = claim(entry.name);
      if (lang) out.push({ file, lang });
    }
  };
  CARRIER_DIRS.forEach(walk);
  return out;
}

/** The key a red and its declaration share: the line's own text rather than its number. */
const keyOf = (file, col, text, kind, line) => `${file}  ${col}  ${text}  ${kind}  ${JSON.stringify(line)}`;

function readLedger() {
  const declared = new Map();
  if (!fs.existsSync(LEDGER)) return declared;
  const shape = /^(\S+)\s+(\d+)\s+(\S+)\s+(open|close)\s+("(?:[^"\\]|\\.)*")\s*#\s?(.*)$/;
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = shape.exec(line);
    if (!m) { declared.set(`unreadable: ${line}`, null); continue; }
    declared.set(keyOf(m[1], Number(m[2]), m[3], m[4], JSON.parse(m[5])), m[6]);
  }
  return declared;
}

module.exports = { redBrackets, tokenType, languages };

if (require.main !== module) return;

(async () => {
  const verbose = process.argv.includes('--verbose');
  const list = process.argv.includes('--list');
  const langs = languages();
  const declared = readLedger();
  const found = [];
  let degenerate = 0;
  const files = carriers(langs);
  for (const { file, lang } of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const red = redBrackets(lines, await tokenize(lang.scope, text), lang.pairs);
    if (DEGENERATE.test(path.basename(file))) { degenerate += red.length; continue; }
    for (const r of red) found.push({ ...r, file: rel, key: keyOf(rel, r.col, r.text, r.kind, lines[r.line - 1]) });
  }
  if (list) {
    for (const r of found) process.stdout.write(`${r.key}  # ${declared.get(r.key) || 'REASON OWED'}\n`);
    return;
  }
  const undeclared = found.filter((r) => !declared.has(r.key));
  const keys = new Set(found.map((r) => r.key));
  const unreadable = [...declared.keys()].filter((k) => k.startsWith('unreadable: '));
  const stale = [...declared.keys()].filter((k) => !k.startsWith('unreadable: ') && !keys.has(k));
  const owed = found.filter((r) => /^OWED\b/.test(declared.get(r.key) || '')).length;
  for (const r of undeclared.slice(0, verbose ? undeclared.length : 12)) {
    console.log(`  RED ${r.file}:${r.line}:${r.col}  ${r.text} ${r.kind === 'open' ? 'opens and nothing closes it' : 'closes nothing'}`);
  }
  if (!verbose && undeclared.length > 12) console.log(`  … ${undeclared.length - 12} more; --verbose lists them all`);
  for (const k of stale) console.log(`  ${k} — a declaration explaining nothing: the bracket no longer reads red (stale)`);
  for (const k of unreadable) console.log(`  ${k.slice(12)} — a ledger line this cannot read`);
  console.log(`bracket-witness  ${files.length} carrier(s), ${found.length} red bracket(s): `
    + `${found.length - undeclared.length} declared (${owed} owed), ${undeclared.length} undeclared, ${stale.length} stale; `
    + `${degenerate} in degenerate carrier(s)`);
  process.exitCode = undeclared.length || stale.length || unreadable.length ? 1 : 0;
})();
