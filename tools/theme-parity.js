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
// So each construct here stands beside the SAME construct in six other markup grammars, and all
// seven go to every bundled theme. The bar reads as the median of the six, never one grammar's
// number: markdown carries theme rules naming markdown itself, which no other grammar can match,
// and a small grammar like rst scopes almost nothing. The median holds both at arm's length —
// measured, markdown alone put inline code at 88% where the six agree on 63%.
//
// WHERE meta.* BELONGS. Themes rule on markup, entity, string and punctuation; they leave meta
// alone — so it names a region well and names a span a reader looks at badly. Counting it proves nothing on its own — this grammar names 29% of its scopes
// meta, against markdown's 54%, mediawiki's 52% and org's 83%.
//
// The question turns on meta standing INNERMOST where the parser built something. Measured over the
// wikitext specimens, every meta scope that no theme reaches sits where TiddlyWiki builds plain
// text: a paragraph (markdown's reads the same), the content of embedded MathML and SVG, a
// CamelCase word the host does not autolink because the standing rule set omits `wikilink`, and
// the two link forms the parser declines by design. None of them wants colour.
//
//   node tools/theme-parity.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grammarArgs } = require('./tokenizer.js');
const { readSnapshot } = require('./snapshot-format.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const GRAMMARS = path.join(ROOT, 'node_modules', 'tm-grammars', 'grammars');
const verbose = process.argv.includes('--verbose');

// How far below the panel's median a construct may sit. A median already discounts the one
// grammar theme authors name explicitly, so this holds tighter than a comparison to markdown
// alone would.
const TOLERANCE = 15;

// The six comparators, each writing the same constructs its own way. Together they carry the
// vocabulary theme authors write rules against; separately, each one's habits show through.
const COMPARATORS = [
  { id: 'markdown', scope: 'text.html.markdown', ext: '.md',   grammar: 'markdown.json',
    source: '# Heading one\n\nA **bold run** here.\n\nA `code span` here.\n\n* a list item\n\nA [WikiLink](W) here.\n\nA ~~struck run~~ here.\n\n| a | table cell |\n| - | ---------- |\n' },
  { id: 'asciidoc', scope: 'text.asciidoc',      ext: '.adoc', grammar: 'asciidoc.json',
    source: '= Heading one\n\nA *bold run* here.\n\nA `code span` here.\n\n* a list item\n\nA https://x.example[WikiLink] here.\n\nA [.line-through]#struck run# here.\n\n|===\n| a | table cell\n|===\n' },
  { id: 'rst',      scope: 'source.rst',         ext: '.rst',  grammar: 'rst.json',
    source: 'Heading one\n===========\n\nA **bold run** here.\n\nA ``code span`` here.\n\n* a list item\n\nA `WikiLink <http://x>`_ here.\n' },
  { id: 'org',      scope: 'source.org',         ext: '.org',  grammar: 'org.json',
    source: '* Heading one\n\nA *bold run* here.\n\nA ~code span~ here.\n\n- a list item\n\nA [[http://x][WikiLink]] here.\n\nA +struck run+ here.\n\n| a | table cell |\n' },
  { id: 'mediawiki',scope: 'source.wikitext',    ext: '.wiki', grammar: 'wikitext.json',
    source: "== Heading one ==\n\nA \'\'\'bold run\'\'\' here.\n\nA <code>code span</code> here.\n\n* a list item\n\nA [[WikiLink]] here.\n\nA <s>struck run</s> here.\n\n{|\n| a || table cell\n|}\n" },
  { id: 'mdx',      scope: 'source.mdx',         ext: '.mdx',  grammar: 'mdx.json',
    source: '# Heading one\n\nA **bold run** here.\n\nA `code span` here.\n\n* a list item\n\nA [WikiLink](W) here.\n\nA ~~struck run~~ here.\n\n| a | table cell |\n| - | ---------- |\n' }
];

// Our own specimen, carrying every construct the panel measures.
const OURS = "! Heading one\n\nA \'\'bold run\'\' here.\n\nA `code span` here.\n\n* a list item\n\nA [[WikiLink]] here.\n\nA ~~struck run~~ here.\n\n|a|table cell|\n";

// The span a reader looks at, named by its text. Every comparator writes the same words, so one
// name reaches the construct in all seven grammars without a table of per-language spellings.
const CONSTRUCTS = ['Heading one', 'bold run', 'code span', 'a list item', 'WikiLink',
  'struck run', 'table cell'];

const { loadThemes, winner } = require('./theme-model.js');

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-parity-'));
const grammars = grammarArgs();
const comparatorGrammars = COMPARATORS.flatMap((c) => ['-g', path.join(GRAMMARS, c.grammar)]);

/** Every span one specimen tokenizes to, under the grammar its language names. */
function tokenize(source, extension, scope) {
  const file = path.join(scratch, `probe-${extension.slice(1)}${extension}`);
  fs.writeFileSync(file, source);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, ...comparatorGrammars, '-s', scope, '-u', file],
    { cwd: ROOT, stdio: 'ignore' });
  const out = [];
  for (const { source: line, annotations } of readSnapshot(fs.readFileSync(`${file}.snap`, 'utf8'))) {
    if (!line || !line.trim()) continue;
    for (const a of annotations) out.push({ text: line.slice(a.start, a.end), scopes: a.scopes });
  }
  return out;
}

const themes = loadThemes();

const reach = (span) => Math.round(themes.filter((t) => winner(span.scopes, t)).length * 100 / themes.length);

// A grammar chooses where a span begins, so the leading space of a heading or a list item lands
// on one side and not the other. The comparison names the construct, not the whitespace.
const spanOf = (spans, want) => spans.find((s) => s.text.trim() === want)
  ?? spans.find((s) => s.text.includes(want));

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

const ours = tokenize(OURS, '.tw', 'text.html.tiddlywiki5');
const panel = COMPARATORS.map((c) => ({ id: c.id, spans: tokenize(c.source, c.ext, c.scope) }));

const findings = [];
const rows = [];
for (const construct of CONSTRUCTS) {
  const mine = spanOf(ours, construct);
  if (!mine) {
    findings.push(`${construct}: our own probe found no span to measure`);
    continue;
  }
  const theirs = panel
    .map((p) => ({ id: p.id, span: spanOf(p.spans, construct) }))
    .filter((p) => p.span)
    .map((p) => ({ id: p.id, pct: reach(p.span) }));
  if (theirs.length < 3) {
    findings.push(`${construct}: only ${theirs.length} comparator(s) carry it — too few to set a bar`);
    continue;
  }
  const bar = median(theirs.map((t) => t.pct));
  const pct = reach(mine);
  rows.push({ construct, pct, bar, theirs });
  if (bar - pct > TOLERANCE) {
    findings.push(`${construct}: ${pct}% of themes colour it, against a panel median of ${bar}%`);
  }
}
fs.rmSync(scratch, { recursive: true, force: true });

if (verbose) {
  const ids = COMPARATORS.map((c) => c.id);
  console.log(`  construct       ours  median  ${ids.map((i) => i.slice(0, 5).padStart(7)).join('')}`);
  for (const row of rows) {
    const by = Object.fromEntries(row.theirs.map((t) => [t.id, t.pct]));
    console.log(`  ${row.construct.padEnd(14)}${String(`${row.pct}%`).padStart(5)}${String(`${row.bar}%`).padStart(8)}  `
      + ids.map((i) => String(by[i] === undefined ? '—' : `${by[i]}%`).padStart(7)).join(''));
  }
}
for (const finding of findings) console.error(`  ${finding}`);
console.log(`theme-parity  ${rows.length} construct(s) across ${themes.length} themes and ${COMPARATORS.length} comparator grammars, `
  + `${findings.length} that themes reach less than the panel does`);
process.exit(findings.length === 0 ? 0 : 1);
