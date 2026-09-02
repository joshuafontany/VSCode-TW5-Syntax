#!/usr/bin/env node
// Bleed canary.
//
// TextMate grammars fail in one characteristic way: a construct that opens and never
// closes wins, and colours everything after it. An unclosed child also blocks its
// parent's end, so the damage compounds outward to the end of the file.
//
// The canary appends an ordinary sentence to a copy of every sample and asserts the
// sentence still carries nothing but its base scopes. One assertion per sample, written
// by nobody, catching a whole family — and it grows by dropping a file into tests/samples.
//
//   node tools/bleed-canary.js <scope> <glob>

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grammarArgs } = require('./tokenizer.js');

// Node 22 added fs.globSync and Windows disagrees with a forward-slash glob, so the
// listing happens here: every pattern this repository uses reads `dir/*.ext`.
function listFiles(pattern) {
  // cmd.exe hands a single-quoted argument through with its quotes attached.
  pattern = pattern.replace(/^['"]|['"]$/g, '');
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  const suffix = base.startsWith('*') ? base.slice(1) : null;
  return fs
    .readdirSync(dir)
    .filter((f) => (suffix ? f.endsWith(suffix) : f === base))
    .sort()
    .map((f) => path.join(dir, f));
}

const [scope, pattern] = process.argv.slice(2);
if (!scope || !pattern) {
  console.error('Usage: node tools/bleed-canary.js <scope> <glob>');
  process.exit(2);
}

const SENTINEL = 'SENTINEL the canary reads as ordinary paragraph text.';
// Scopes a sentence may stand in and still count as plain: the document, the zone a
// carrier's text rides in, and the paragraph itself.
const PLAIN = new Set([
  scope,
  'text.html.tiddlywiki5',
  'meta.text.tiddler.text.tiddlywiki5',
  'meta.text.html.tiddlywiki5',
  'meta.paragraph.tiddlywiki5',
  'markup.other.paragraph.tiddlywiki5',
  'field.value.text.html.tiddlywiki5'
]);

// The canary hunts an INLINE run that never closed. A block construct crosses a blank
// line by design — TiddlyWiki carries `@@style@@`, `<<<` quotes and typed blocks the
// same way — so a sample ending inside one inherits legitimately rather than bleeding.
// A prefix here names a family the canary passes over; everything else it reports.
const SPANS_BY_DESIGN = [
  'markup.other.style',
  'markup.quote',
  'meta.quote',
  'meta.typedblock'
];
const spanning = (s) => SPANS_BY_DESIGN.some((p) => s.startsWith(p));

const sources = listFiles(pattern);
if (sources.length === 0) {
  console.error(`no sources matched ${pattern}`);
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-canary-'));
for (const src of sources) {
  const body = fs.readFileSync(src, 'utf8').replace(/\s*$/, '');
  fs.writeFileSync(path.join(scratch, path.basename(src)), `${body}\n\n${SENTINEL}\n`);
}

const grammars = grammarArgs();

const staged = sources.map((src) => path.join(scratch, path.basename(src)));
execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...staged], {
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: process.platform === 'win32'
});

let bleeding = 0;
for (const src of sources) {
  const snap = path.join(scratch, `${path.basename(src)}.snap`);
  if (!fs.existsSync(snap)) {
    console.error(`  no snapshot produced for ${src}`);
    bleeding++;
    continue;
  }
  const lines = fs.readFileSync(snap, 'utf8').split('\n');
  const at = lines.findIndex((l) => l.startsWith(`>${SENTINEL.slice(0, 8)}`));
  if (at < 0) continue;
  let carried = null;
  for (let i = at + 1; i < Math.min(at + 4, lines.length); i++) {
    const m = /^#\s*\^+\s+(.*)$/.exec(lines[i]);
    if (!m) continue;
    carried = m[1].split(/\s+/).filter((s) => s && !PLAIN.has(s) && !spanning(s));
    break;
  }
  if (carried && carried.length) {
    bleeding++;
    console.error(`  ${src} bleeds onto text that stands outside every construct:`);
    console.error(`      ${carried.join(' ')}`);
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`bleed-canary  ${scope}  ${sources.length} samples, ${bleeding} bleeding`);
process.exit(bleeding ? 1 : 0);
