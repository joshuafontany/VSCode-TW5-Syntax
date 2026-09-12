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
  macrodef: 'meta.directive.variable.macro.tiddlywiki5 — the grammar names the directive an author writes, \\define, where TiddlyWiki names the rule module',
  fnprocdef: 'meta.directive.variable.{function,procedure,widget}.tiddlywiki5 — one rule upstream reads three directives, and each carries its own name here',
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
// A comment naming a rule does not READ it. The grammar's own prose names the eight rules
// TiddlyWiki reads in pragma mode, and reading that as coverage marked a rule read whose scope
// nothing emits — so the search runs over the grammar with its comments taken out.
const withoutComments = (node) => {
  if (Array.isArray(node)) return node.map(withoutComments);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'comment') continue;
    out[key] = withoutComments(value);
  }
  return out;
};
const blob = JSON.stringify(withoutComments(grammar)).toLowerCase();

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

// ── THE PRAGMA ZONE ──────────────────────────────────────────────────────────────────────────
//
// A grammar guards the pragma zone with a keyword list, and no structural reading can replace it:
// the zone has to tell a directive line from a line of prose, which turns on the keyword itself.
// So the list goes stale on the release that adds a ninth pragma, and it fails quietly — a keyword
// missing from the guard closes the zone on the line carrying it, and every directive below reads
// as prose.
//
// The guard finds itself. Whichever pattern names the most harvested keywords IS the guard, so no
// path or rule name written here points at the wrong one, and the guard must then name them ALL.
//
// The keyword reads as a WORD rather than as the token a rule spells: a guard carries several
// directives in one alternation — `\\(?:function|procedure|widget)` — where the backslash stands
// once for all three, and a reader demanding the whole token finds none of them.
const patterns = [];
const collect = (node) => {
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (!node || typeof node !== 'object') return;
  for (const key of ['begin', 'end', 'match']) if (typeof node[key] === 'string') patterns.push(node[key]);
  for (const value of Object.values(node)) collect(value);
};
collect(grammar);

// Every pragma the host stands carries a token, or the guard gets checked against a short list
// and passes on the strength of what nobody harvested.
const tokensByRule = signals.pragmaTokens ?? {};
const tokenless = (signals.pragmaRules ?? []).filter((rule) => !(tokensByRule[rule] ?? []).length);
for (const rule of tokenless) {
  console.error(`  the "${rule}" pragma reaches the harvest carrying no token, so the guard answers for one rule fewer`);
}
const tokens = Object.values(tokensByRule).flat();
// The keyword stands on its own: a guard carrying `parsermodex` names no pragma, and a reader
// asking whether one string sits inside another calls it named.
const names = (pattern, token) => {
  const word = token.replace(/^\\/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z])${word}(?![A-Za-z])`).test(pattern);
};
const scores = patterns.map((p) => tokens.filter((t) => names(p, t)).length);
const guard = patterns[scores.indexOf(Math.max(0, ...scores))] ?? '';
const unguarded = tokens.filter((t) => !names(guard, t));

for (const token of unguarded) {
  console.error(`  the pragma zone never names "${token}", so it closes on the line that carries one`);
}

if (verbose) {
  for (const rule of aliased) console.log(`  ${rule.padEnd(20)}${ALIAS[rule]}`);
}
for (const rule of unread) {
  console.error(`  TiddlyWiki ${version} stands a "${rule}" rule this grammar never names — a construct that reads as prose`);
}
for (const rule of idle) {
  console.error(`  "${rule}" carries a reason nothing needs — the grammar names it, or the host no longer stands it`);
}

// THE WIKI THIS HOUSE BOOTS, not only a stock TiddlyWiki. `$tw.modules.types.wikirule` names the
// rules the vendored host ships, and the house's own plugin registers more — measured,
// `lar-declaration` consumes a doctype line and returns it as literal TEXT where the grammar reads a
// macro call, and this gate read 0 unaccounted over a population that never held it.
//
// A HOUSE RULE COUNTS AS READ the way a host rule does: some repository entry or scope names it, or a
// ruling here says which name it wears instead. The population derives from the plugin's own source,
// so a rule the house adds reaches this reading the day it lands, and a shared helper exporting no
// rule name registers nothing and stands out of the count.
const HOUSE_DIR = path.resolve(ROOT, '..', 'packages', 'lararium-tw5', 'src', 'wikirules');
const HOUSE_RULING = {
  'lar-declaration': 'the doctype line, which the grammar reads through the base call vocabulary — '
    + 'the house rule returns it as literal text, so a reader meets colour where the wiki meets none',
  'lar-sigil': 'a sigil, which this rule builds as a `transclude` exactly as the host\'s own macrocall '
    + 'rule does, so the grammar mirroring that rule mirrors this one',
  'lar-sigil-pragma': 'a sigil standing in the pragma zone, which the grammar reads through the same '
    + 'call vocabulary and the zone anchors already bound',
};
const houseRules = fs.existsSync(HOUSE_DIR)
  ? fs.readdirSync(HOUSE_DIR).filter((f) => f.endsWith('.ts'))
      .filter((f) => /^export const name\s*=/m.test(fs.readFileSync(path.join(HOUSE_DIR, f), 'utf8')))
      .map((f) => f.replace(/\.ts$/, ''))
  : [];
const houseUnruled = houseRules.filter((r) => !HOUSE_RULING[r]);
for (const rule of houseUnruled) {
  console.error(`  the house plugin registers "${rule}" and nothing here says how the grammar reads it`);
}
const houseIdle = Object.keys(HOUSE_RULING).filter((r) => !houseRules.includes(r));
for (const rule of houseIdle) {
  console.error(`  "${rule}" carries a ruling and the plugin registers no such rule`);
}

if (verbose) for (const rule of houseRules) console.log(`  ${rule.padEnd(20)}${HOUSE_RULING[rule] ?? '(no ruling)'}`);
console.log(`rule-coverage  TiddlyWiki ${version}: ${signals.wikiRules.length} rule(s), `
  + `${houseRules.length} house rule(s) all ruled, `
  + `${read.length} read, ${aliased.length} under another name, ${unread.length + idle.length} unaccounted; `
  + `${tokens.length} pragma keyword(s) guarded across ${(signals.pragmaRules ?? []).length} rule(s)`);
process.exit(unread.length + idle.length + unguarded.length + tokenless.length
  + houseUnruled.length + houseIdle.length === 0 ? 0 : 1);
