#!/usr/bin/env node
// The grammar's built-in variable list, held in the wiki and projected into the grammar.
//
// A variable an author writes may come from TiddlyWiki's core or from their own `\define`, and a
// regular expression cannot tell them apart — the name carries no mark. So the grammar matches a
// list, and a list inside a grammar stands where nobody reviews it. This one lives in the edition,
// where an operator weighs an addition against what the core documents, and this tool projects it.
//
// One direction only. The tiddler holds the list; the grammar holds what the tiddler says. Running
// with --check reports drift without writing, so a gate can hold the two together without either
// one quietly becoming the source.
//
//   node tools/builtins-sync.js [--check]

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const check = process.argv.includes('--check');

const { readData } = require('./wiki-data.js');

let list;
try {
  list = readData('BuiltInVariables').data;
} catch (e) {
  console.error(`  ${e.message}`);
  process.exit(2);
}
const exact = [...new Set(list.exact || [])].sort();
const prefixes = [...new Set(list.prefixes || [])].sort();
if (!exact.length && !prefixes.length) {
  console.error('  the tiddler names no built-in variable at all');
  process.exit(2);
}

// A prefix family matches its opening and whatever follows; an exact name matches whole. Longest
// alternatives first, so a name that opens another name cannot take the shorter branch.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const alternation = [
  ...prefixes.map((p) => `${escape(p)}[A-Za-z0-9_.-]*`),
  ...exact.sort((a, b) => b.length - a.length).map(escape)
].join('|');
const WANT = `(?<![A-Za-z0-9_$.-])(?:${alternation})(?![A-Za-z0-9_$.-])`;

const grammar = fs.readFileSync(GRAMMAR, 'utf8');
const parsed = JSON.parse(grammar);
const rule = (parsed.repository || {})['builtin-variable'];

if (!rule) {
  console.error('  the grammar carries no #builtin-variable rule for this list to fill');
  process.exit(check ? 1 : 2);
}

if (rule.match === WANT) {
  console.log(`builtins-sync  ${exact.length} name(s) and ${prefixes.length} prefix(es), the grammar current`);
  process.exit(0);
}
if (check) {
  console.error('  the grammar\'s built-in list differs from the tiddler that holds it');
  console.error(`     tiddler wants: ${WANT.slice(0, 96)}…`);
  console.error(`     grammar holds: ${String(rule.match).slice(0, 96)}…`);
  console.log(`builtins-sync  ${exact.length} name(s) and ${prefixes.length} prefix(es), the grammar DRIFTED`);
  process.exit(1);
}
rule.match = WANT;
fs.writeFileSync(GRAMMAR, `${JSON.stringify(parsed, null, '\t')}\n`);
console.log(`builtins-sync  ${exact.length} name(s) and ${prefixes.length} prefix(es), the grammar written`);
