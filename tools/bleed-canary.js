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
//   node tools/bleed-canary.js <scope> <glob> [--strict]
//
// `--strict` drops the inheritance reading and reports every sample the grammar colours past its
// end, including the ones TiddlyWiki carries the same way. A reader wanting the whole list asks for
// it; the gate's own collision asks for it too, since a reading that excuses nothing provable
// excuses everything.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
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

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const [scope, pattern] = args.filter((a) => a !== '--strict');
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

// The canary hunts an INLINE run that never closed. A block construct crosses a blank line by
// design — TiddlyWiki carries `@@style@@`, `<<<` quotes and typed blocks the same way — so a
// sample ending inside one inherits legitimately rather than bleeding.
//
// TiddlyWiki decides which sample that names. A prefix list of families reads the grammar's own
// vocabulary back to itself and goes stale silently: `meta.styleblock` arrived under a name no
// prefix there covered, and two samples ending in an unterminated style block read as bleeding for
// it — while TiddlyWiki carried the same text into the same construct and raised a diagnostic
// saying so.
//
// So the question runs to the parser: does TiddlyWiki build a construct covering the appended
// sentence? Where it does, the grammar colouring it agrees. Any quarrel about whether the construct
// SHOULD run that far belongs to overreach, which asks that question of every span.

const sources = listFiles(pattern);
if (sources.length === 0) {
  console.error(`no sources matched ${pattern}`);
  process.exit(2);
}

const host = resolveTiddlyWiki();
if (!host) {
  console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
  process.exit(2);
}
const oracle = boot(host);

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-canary-'));
// The samples where TiddlyWiki itself carries the appended sentence into a construct.
const inherits = new Set();
for (const src of sources) {
  const body = fs.readFileSync(src, 'utf8').replace(/\s*$/, '');
  const staged = `${body}\n\n${SENTINEL}\n`;
  fs.writeFileSync(path.join(scratch, path.basename(src)), staged);
  const at = staged.lastIndexOf(SENTINEL);
  if (!strict && oracle.readAt(staged, at, at + SENTINEL.length).kind === 'built') inherits.add(src);
}

const grammars = grammarArgs();

const staged = sources.map((src) => path.join(scratch, path.basename(src)));
execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...staged], {
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: process.platform === 'win32'
});

let bleeding = 0;
let inherited = 0;
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
    carried = m[1].split(/\s+/).filter((s) => s && !PLAIN.has(s));
    break;
  }
  if (carried && carried.length && inherits.has(src)) {
    inherited++;
    continue;
  }
  if (carried && carried.length) {
    bleeding++;
    console.error(`  ${src} bleeds onto text that stands outside every construct:`);
    console.error(`      ${carried.join(' ')}`);
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
const carried = inherited ? `, ${inherited} ending inside a construct TiddlyWiki also carries` : '';
console.log(`bleed-canary  ${scope}  ${sources.length} samples, ${bleeding} bleeding${carried}`);
process.exit(bleeding ? 1 : 0);
