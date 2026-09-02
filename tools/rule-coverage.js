#!/usr/bin/env node
// Every wikitext rule TiddlyWiki stands, this grammar reads.
//
// The host registers its parser rules and says so: `$tw.modules.types.wikirule` names all of them,
// and the harvest in the edition records that answer for the version it booted against. A rule the
// host adds and this grammar never learns simply reads as prose — no gate here would notice, since
// the grammar does everything it does correctly.
//
// So the harvest drives the comparison. A rule counts as read when a repository entry carries its
// name, or a scope somewhere names it, or a line below says which name it wears instead. An alias
// that stops answering to a rule fails the gate the same way a missing rule does, so the list
// cannot outlive what it explains.
//
//   node tools/rule-coverage.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readData } = require('./wiki-data.js');

const ROOT = path.resolve(__dirname, '..');
const HARVEST = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const verbose = process.argv.includes('--verbose');

// A rule this grammar reads under another name, and the name it wears.
const ALIAS = {
  commentblock: 'comment.block.html.tiddlywiki5 — the grammar names a comment by what it IS, never by the rule that reads it',
  commentinline: 'comment.block.html.tiddlywiki5 — TiddlyWiki splits a comment by position; a reader meets one thing',
  wikilinkprefix: 'meta.link.suppressed.wikilink.tiddlywiki5 — the rule declines a link, and the scope names the declining'
};

if (!fs.existsSync(HARVEST)) {
  console.error('  no harvest stands — run `npm run signals` against the TiddlyWiki this repo answers to');
  process.exit(2);
}
const { fields, data: signals } = readData('GrammarSignals.tid');
const version = fields['tw5-version'] ?? 'unknown';
const grammar = JSON.parse(fs.readFileSync(GRAMMAR, 'utf8'));

const keys = new Set(Object.keys(grammar.repository).map((k) => k.toLowerCase()));
const blob = JSON.stringify(grammar).toLowerCase();

const read = [];
const aliased = [];
const unread = [];
for (const rule of signals.wikiRules) {
  const lower = rule.toLowerCase();
  if (keys.has(lower) || blob.includes(lower)) read.push(rule);
  else if (ALIAS[rule]) aliased.push(rule);
  else unread.push(rule);
}
// A reason that no longer answers to anything stops explaining, the way a stale relation does.
const idle = Object.keys(ALIAS).filter((r) => !signals.wikiRules.includes(r) || read.includes(r));

if (verbose) {
  for (const rule of aliased) console.log(`  ${rule.padEnd(20)}${ALIAS[rule]}`);
}
for (const rule of unread) {
  console.error(`  TiddlyWiki ${version} stands a "${rule}" rule this grammar never names — a construct that reads as prose`);
}
for (const rule of idle) {
  console.error(`  "${rule}" carries a reason nothing needs — the grammar names it, or the host no longer stands it`);
}
console.log(`rule-coverage  TiddlyWiki ${version}: ${signals.wikiRules.length} rule(s), `
  + `${read.length} read, ${aliased.length} under another name, ${unread.length + idle.length} unaccounted`);
process.exit(unread.length + idle.length === 0 ? 0 : 1);
