#!/usr/bin/env node
// Whether a reader's theme reaches a construct at all.
//
// The colour witness asks whether two scopes paint ALIKE. A construct can pass that and still
// paint as nothing: no theme rule reaches it, so it takes the editor's default foreground and
// reads as prose. Measured, a heading did exactly that — 9 of 65 themes coloured its text, while
// the same heading in markdown coloured in all 65 — and every gate read green, because a scope
// stood there and matched its own siblings.
//
// A theme writes rules against the names markup grammars share. Six of the seven bundled markup
// grammars name a heading markup.heading; markdown, asciidoc and mediawiki all name a list marker
// punctuation.definition.list.begin. A grammar spelling a construct its own way asks every theme
// author to have heard of it.
//
// So each construct here stands beside its markdown twin, and both go to every bundled theme.
// Markdown sets the bar because theme authors write for it. A construct falling
// more than the tolerance below its twin reads as a name themes cannot reach.
//
// Some distance stays out of reach: a theme writing `markup.inline.raw.string.markdown` names
// markdown itself, and no other grammar can match it. The tolerance holds that room.
//
//   node tools/theme-parity.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSnapshot } = require('./snapshot-format.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const MARKDOWN = path.join(ROOT, 'node_modules', 'tm-grammars', 'grammars', 'markdown.json');
const verbose = process.argv.includes('--verbose');

// How far below its markdown twin a construct may sit. Themes naming markdown explicitly put
// some distance out of reach, and 20 points holds that room without hiding a wrong name.
const TOLERANCE = 20;

// Each construct, in both languages, with the span whose colour a reader actually looks at.
const CONSTRUCTS = [
  { name: 'heading text',   tw: '! Heading one',              md: '# Heading one',            span: 'Heading one' },
  { name: 'heading marker', tw: '!! Heading two',             md: '## Heading two',           span: '!!', mdSpan: '##' },
  { name: 'bold text',      tw: "A ''bold run'' here.",       md: 'A **bold run** here.',     span: 'bold run' },
  { name: 'italic text',    tw: 'A //italic run// here.',     md: 'A *italic run* here.',     span: 'italic run' },
  { name: 'inline code',    tw: 'A `code span` here.',        md: 'A `code span` here.',      span: 'code span' },
  { name: 'inline tick',    tw: 'A `code span` here.',        md: 'A `code span` here.',      span: '`' },
  { name: 'list marker',    tw: '* a list item',              md: '* a list item',            span: '*' },
  { name: 'list content',   tw: '* a list item',              md: '* a list item',            span: 'a list item' },
  { name: 'link text',      tw: 'A [[WikiLink]] here.',       md: 'A [WikiLink](W) here.',    span: 'WikiLink' }
];

/** A theme's rules, flattened to one selector each. */
function loadTheme(file) {
  const theme = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const rules = [];
  (theme.tokenColors || []).forEach((rule, order) => {
    const scope = rule.scope;
    if (!scope) return;
    for (const selector of (Array.isArray(scope) ? scope : String(scope).split(','))) {
      const parts = selector.trim().split(/\s+/).filter(Boolean);
      if (parts.length) rules.push({ parts, order, settings: rule.settings || {} });
    }
  });
  return rules;
}

// A selector segment matches a scope by whole dot-separated segments, never by prefix of one.
const covers = (selector, scope) => scope === selector || scope.startsWith(`${selector}.`);

/** The rule a theme paints a scope stack with, or null. */
function winner(stack, rules) {
  let best = null;
  for (const rule of rules) {
    const last = rule.parts[rule.parts.length - 1];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!covers(last, stack[i])) continue;
      let ok = true;
      let j = i - 1;
      for (let p = rule.parts.length - 2; p >= 0; p--) {
        while (j >= 0 && !covers(rule.parts[p], stack[j])) j--;
        if (j < 0) { ok = false; break; }
        j--;
      }
      if (!ok) continue;
      const score = last.split('.').length * 1000 + i * 10 + rule.parts.length;
      if (!best || score > best.score || (score === best.score && rule.order > best.order)) {
        best = { score, order: rule.order, foreground: rule.settings.foreground };
      }
      break;
    }
  }
  return best;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-parity-'));
const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
  { encoding: 'utf8', cwd: ROOT }).trim().split('\n').filter(Boolean);

/** Tokenize one line and return its spans. */
function tokenize(text, extension, scope, extra = []) {
  const file = path.join(scratch, `probe-${Math.random().toString(36).slice(2)}${extension}`);
  fs.writeFileSync(file, `${text}\n`);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, ...extra, '-s', scope, '-u', file],
    { cwd: ROOT, stdio: 'ignore' });
  const out = [];
  for (const { source, annotations } of readSnapshot(fs.readFileSync(`${file}.snap`, 'utf8'))) {
    if (!source || !source.trim()) continue;
    for (const a of annotations) out.push({ text: source.slice(a.start, a.end), scopes: a.scopes });
  }
  return out;
}

const themes = fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
  .map((f) => { try { return loadTheme(path.join(THEMES, f)); } catch { return null; } })
  .filter(Boolean);

const reach = (span) => Math.round(themes.filter((t) => winner(span.scopes, t)).length * 100 / themes.length);

// A grammar chooses where a span begins, so the leading space of a heading or a list item lands
// on one side and not the other. The comparison names the construct, not the whitespace.
const spanOf = (spans, want) => spans.find((s) => s.text.trim() === want)
  ?? spans.find((s) => s.text.includes(want));

const findings = [];
const rows = [];
for (const construct of CONSTRUCTS) {
  const ours = spanOf(tokenize(construct.tw, '.tw', 'text.html.tiddlywiki5'), construct.span);
  const theirs = spanOf(tokenize(construct.md, '.md', 'text.html.markdown', ['-g', MARKDOWN]),
    construct.mdSpan ?? construct.span);
  if (!ours || !theirs) {
    findings.push(`${construct.name}: the probe found no span to measure`);
    continue;
  }
  const mine = reach(ours);
  const twin = reach(theirs);
  rows.push({ name: construct.name, mine, twin });
  if (twin - mine > TOLERANCE) {
    findings.push(`${construct.name}: ${mine}% of themes colour it, ${twin}% colour the markdown twin`);
  }
}
fs.rmSync(scratch, { recursive: true, force: true });

if (verbose) {
  for (const row of rows) {
    console.log(`  ${row.name.padEnd(16)}${String(`${row.mine}%`).padStart(5)}   markdown ${row.twin}%`);
  }
}
for (const finding of findings) console.error(`  ${finding}`);
console.log(`theme-parity  ${rows.length} construct(s) across ${themes.length} themes, ${findings.length} that themes reach less than markdown's`);
process.exit(findings.length === 0 ? 0 : 1);
