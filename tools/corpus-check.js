#!/usr/bin/env node
// The corpus, gated on invariants rather than on pinned tokens.
//
// tests/samples holds frozen specimens pinning every token, so a snapshot moves only
// in a commit that moves the sample. This asks a different question of broader ground:
//
//   COVERAGE    — some corpus file reaches every scope the grammar DECLARES. A scope nothing
//                 reaches marks a rule no test exercises, read from the grammar itself
//                 so no hand-kept list can drift.
//   CONTAINMENT — a file that closes its constructs does not colour what follows it. The
//                 degenerate.* files carry unterminated constructs on purpose and stand exempt.
//
//   node tools/corpus-check.js [--verbose]

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const VERBOSE = process.argv.includes('--verbose');
const SENTINEL = 'The corpus sentinel stands plainly at the end.';

/** Every scope name the grammar declares, from its own name and contentName fields. */
function declaredScopes(file) {
  const out = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const key of ['name', 'contentName']) {
      const v = node[key];
      // A $1 in a scope name resolves per match, so the declared form never appears verbatim.
      if (typeof v === 'string' && !v.includes('$')) for (const s of v.split(/\s+/)) if (s) out.add(s);
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(JSON.parse(fs.readFileSync(file, 'utf8')));
  return out;
}

// The extensions the manifest claims. A corpus specimen carries one of them; a readme, a floor
// and a ceiling carry none, and naming those one by one lets the next control file join the
// corpus unnoticed.
const SPECIMEN = new Set(
  (require(path.resolve(__dirname, '..', 'package.json')).contributes.languages || [])
    .flatMap((l) => l.extensions || [])
);

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else if (!e.name.endsWith('.snap') && [...SPECIMEN].some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
  encoding: 'utf8'
}).trim().split('\n').filter(Boolean);

// The scope a file opens under, from the manifest's own language-to-grammar link. A map written
// beside the manifest sends a file type to the wrong grammar the moment one more appears, and
// coverage then reads that grammar's scopes as unreachable rather than unmeasured.
//
// Longest suffix wins: `.tw5.test` and `.test` both end a syntax-test file, and only one of them
// names the grammar that colours it. path.extname reads the shorter.
const EXTENSION_SCOPE = (() => {
  const manifest = require(path.resolve(__dirname, '..', 'package.json')).contributes;
  const scopeOfLanguage = new Map((manifest.grammars || [])
    .filter((g) => g.language).map((g) => [g.language, g.scopeName]));
  return (manifest.languages || []).flatMap((l) => (l.extensions || [])
    .map((e) => [e, scopeOfLanguage.get(l.id)]))
    .filter(([, scope]) => scope)
    .sort((a, b) => b[0].length - a[0].length);
})();
const scopeFor = (f) => (EXTENSION_SCOPE.find(([e]) => f.endsWith(e)) ?? [, 'text.html.tiddlywiki5'])[1];

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-corpus-'));
const corpus = files('corpus');
const reached = new Set();
const bleeding = [];

// One snapshot run per scope, over copies carrying an appended sentinel.
const byScope = new Map();
for (const f of corpus) {
  const s = scopeFor(f);
  const copy = path.join(scratch, path.basename(path.dirname(f)) + '-' + path.basename(f));
  fs.writeFileSync(copy, fs.readFileSync(f, 'utf8').replace(/\s*$/, '') + '\n\n' + SENTINEL + '\n');
  if (!byScope.has(s)) byScope.set(s, []);
  byScope.get(s).push({ src: f, copy });
}
for (const [scope, entries] of byScope) {
  // A control carrying the sentinel and nothing else. Whatever scopes it takes mark the
  // baseline for this file type, so nothing here guesses at what a clean line looks like.
  const control = path.join(scratch, 'control-' + scope.replace(/\./g, '_') + path.extname(entries[0].src));
  fs.writeFileSync(control, (path.extname(control) === '.tid' || path.extname(control) === '.meta'
    ? 'title: Control\n\n' : path.extname(control) === '.multids' ? 'title: $:/control/\n\n' : '') + SENTINEL + '\n');
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', control, ...entries.map((e) => e.copy)], {
    stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32'
  });
  const baseline = new Set();
  for (const line of fs.readFileSync(`${control}.snap`, 'utf8').split('\n')) {
    const m = /^#\s*\^+\s+(.*)$/.exec(line);
    if (m) for (const s of m[1].split(/\s+/)) if (s) baseline.add(s);
  }
  for (const { src, copy } of entries) {
    const snap = fs.readFileSync(`${copy}.snap`, 'utf8');
    let inSentinel = false;
    for (const line of snap.split('\n')) {
      if (line.startsWith('>')) { inSentinel = line.slice(1) === SENTINEL; continue; }
      const m = /^#\s*\^+\s+(.*)$/.exec(line);
      if (!m) continue;
      const scopes = m[1].split(/\s+/).filter(Boolean);
      for (const s of scopes) reached.add(s);
      // The sentinel must carry nothing but the base scope and a paragraph.
      if (inSentinel && !path.basename(src).startsWith('degenerate.')) {
        const stray = scopes.filter((s) => !baseline.has(s));
        if (stray.length) bleeding.push(`${src}  ->  ${stray.slice(0, 3).join(' ')}`);
      }
    }
  }
}
fs.rmSync(scratch, { recursive: true, force: true });

// Every grammar the manifest registers declares scopes this corpus must reach. Taking them from
// a list beside the manifest leaves a grammar's scopes unmeasured the moment one more joins:
// coverage then reads as a gain when a rule stops firing, because the rule left the count too.
const declared = new Set();
for (const g of require(path.resolve(__dirname, '..', 'package.json')).contributes.grammars) {
  for (const s of declaredScopes(g.path.replace(/^\.\//, ''))) declared.add(s);
}
const unreached = [...declared].filter((s) => !reached.has(s)).sort();

// One count over two populations answers for neither. A scope THIS grammar emits ends in its own
// suffix; every other name here hands a region to another grammar — source.python, text.html.php,
// comment.block.js — and reaching those wants a specimen carrying that language, which the corpus
// exists to hold for wikitext rather than for everything wikitext can embed.
const OURS = /\.(tiddlywiki5|memetic-wikitext)$/;
const unreachedOurs = unreached.filter((s) => OURS.test(s));
const unreachedHandoffs = unreached.length - unreachedOurs.length;

const reachedCount = declared.size - unreached.length;
const floorFile = path.join('corpus', 'coverage-floor.txt');
const floor = fs.existsSync(floorFile) ? Number(fs.readFileSync(floorFile, 'utf8').trim()) : 0;

// A ceiling, not a floor: the count of OUR OWN unreached scopes may fall and may never rise.
const ceilingFile = path.join('corpus', 'unreached-ceiling.txt');
// The number stands on the first line; what follows it explains the number.
const ceiling = fs.existsSync(ceilingFile)
  ? Number(fs.readFileSync(ceilingFile, 'utf8').split('\n')[0].trim())
  : Infinity;

console.log(`corpus-check  ${corpus.length} files, ${declared.size} scopes declared, ${reachedCount} reached (floor ${floor})`);
console.log(`  unreached: ${unreachedOurs.length} this grammar emits (ceiling ${ceiling}), ${unreachedHandoffs} handed to another grammar`);
if (reachedCount < floor) {
  console.error(`  coverage fell from ${floor} to ${reachedCount}; a rule the floor counts as reached now goes unexercised`);
}
if (unreachedOurs.length > ceiling) {
  console.error(`  ${unreachedOurs.length} of this grammar's own scopes go unexercised, above the ceiling of ${ceiling}`);
}
if (VERBOSE) {
  for (const s of unreachedOurs) console.log(`  unreached  ${s}`);
  for (const s of unreached) if (!OURS.test(s)) console.log(`  handoff    ${s}`);
}
if (bleeding.length) {
  console.error(`\n  files whose constructs colour the sentinel after them:`);
  for (const b of [...new Set(bleeding)]) console.error(`    ${b}`);
}
console.log(`  containment: ${new Set(bleeding.map((b) => b.split('  ->')[0])).size} of ${corpus.length} files bleed`);
process.exit(bleeding.length || reachedCount < floor || unreachedOurs.length > ceiling ? 1 : 0);
