#!/usr/bin/env node
// The corpus, gated on invariants rather than on pinned tokens.
//
// tests/samples holds frozen specimens whose every token is pinned, so a snapshot moves only
// in a commit that moves the sample. This asks a different question of broader ground:
//
//   COVERAGE    — every scope the grammar DECLARES is reached by some corpus file. A scope
//                 nothing reaches is a rule no test exercises, read from the grammar itself
//                 so no hand-kept list can drift.
//   CONTAINMENT — a file that closes its constructs does not colour what follows it. The
//                 degenerate.* files carry unterminated constructs on purpose and are exempt.
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

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    // The corpus is its samples; the readme and the floor are not among them.
    else if (!e.name.endsWith('.snap') && !/^(README\.md|coverage-floor\.txt)$/.test(e.name)) out.push(p);
  }
  return out;
}

const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
  encoding: 'utf8'
}).trim().split('\n').filter(Boolean);

const SCOPE_OF = { '.mem': 'text.html.tiddlywiki5.memetic-wikitext', '.tid': 'source.tiddlywiki5.tid-file',
  '.meta': 'source.tiddlywiki5.tid-file', '.multids': 'source.tiddlywiki5.multids-file' };
const scopeFor = (f) => SCOPE_OF[path.extname(f)] ?? 'text.html.tiddlywiki5';

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
  // A control carrying the sentinel and nothing else. Whatever scopes it takes are the
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

const declared = new Set();
for (const g of ['syntaxes/tiddlywiki5.json', 'syntaxes/memetic-wikitext.json']) {
  for (const s of declaredScopes(g)) declared.add(s);
}
const unreached = [...declared].filter((s) => !reached.has(s)).sort();

const reachedCount = declared.size - unreached.length;
const floorFile = path.join('corpus', 'coverage-floor.txt');
const floor = fs.existsSync(floorFile) ? Number(fs.readFileSync(floorFile, 'utf8').trim()) : 0;

console.log(`corpus-check  ${corpus.length} files, ${declared.size} scopes declared, ${reachedCount} reached (floor ${floor})`);
if (reachedCount < floor) {
  console.error(`  coverage fell from ${floor} to ${reachedCount}; a rule the corpus used to reach now goes unexercised`);
}
if (VERBOSE) for (const s of unreached) console.log(`  unreached  ${s}`);
if (bleeding.length) {
  console.error(`\n  files whose constructs colour the sentinel after them:`);
  for (const b of [...new Set(bleeding)]) console.error(`    ${b}`);
}
console.log(`  containment: ${new Set(bleeding.map((b) => b.split('  ->')[0])).size} of ${corpus.length} files bleed`);
process.exit(bleeding.length || reachedCount < floor ? 1 : 0);
