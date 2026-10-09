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

const { snapRun } = require('./snap-run.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grammarArgs } = require('./tokenizer.js');

const VERBOSE = process.argv.includes('--verbose');
const SENTINEL = 'The corpus sentinel stands plainly at the end.';

const { declaredScopes } = require('./grammar-scopes.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { walkMatching } = require('./walk.js');

// The extensions the manifest claims. A corpus specimen carries one of them; a readme, a floor
// and a ceiling carry none, and naming those one by one lets the next control file join the
// corpus unnoticed.
const SPECIMEN = new Set(
  (require(path.resolve(__dirname, '..', 'package.json')).contributes.languages || [])
    .flatMap((l) => l.extensions || [])
);

function files(dir) {
  return walkMatching(dir, (name) => !name.endsWith('.snap') && [...SPECIMEN].some((x) => name.endsWith(x)));
}

const grammars = grammarArgs();

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

/**
 * The type a tiddler's own header declares, or nothing.
 *
 * A `type` FIELD CHANGES THE LANGUAGE OF EVERYTHING BELOW IT, so it changes what a clean line looks
 * like. The tid grammar hands a declared body to the guest language through a region that never
 * closes, exactly as TiddlyWiki hands it to that parser — which means the sentinel appended below
 * reads in the GUEST language too, and grading it against a control that declares nothing reports
 * every such specimen as bleeding. Measured on the first tiddler to declare the dialect: its
 * sentinel carried `text.html.tiddlywiki5.memetic-wikitext` where the control carried the wikitext
 * body scope, and the file read as 1 of 69 bleeding while nothing had leaked.
 *
 * @param {string} text  a specimen's whole text
 * @returns {string|null} the declared type, or nothing when the header names none
 */
function declaredType(text) {
  const header = text.split(/\r?\n\r?\n/, 1)[0];
  const m = /^[ \t]*type[ \t]*:[ \t]*(\S+)[ \t]*$/m.exec(header);
  return m ? m[1] : null;
}

// One snapshot run per scope AND DECLARED TYPE, over copies carrying an appended sentinel. The
// type joins the key because it decides the baseline, not merely the colouring.
const byScope = new Map();
for (const f of corpus) {
  const text = fs.readFileSync(f, 'utf8');
  const s = scopeFor(f);
  const type = declaredType(text);
  const key = `${s}\u0000${type ?? ''}`;
  const copy = path.join(scratch, path.basename(path.dirname(f)) + '-' + path.basename(f));
  fs.writeFileSync(copy, text.replace(/\s*$/, '') + '\n\n' + SENTINEL + '\n');
  if (!byScope.has(key)) byScope.set(key, { scope: s, type, entries: [] });
  byScope.get(key).entries.push({ src: f, copy });
}
for (const [key, { scope, type, entries }] of byScope) {
  // A control carrying the sentinel and nothing else, under the same declaration. Whatever scopes
  // it takes mark the baseline for this file type, so nothing here guesses at what a clean line
  // looks like.
  const extension = path.extname(entries[0].src);
  const control = path.join(scratch,
    'control-' + key.replace(/\u0000/g, '--').replace(/[^A-Za-z0-9]+/g, '_') + extension);
  const typeLine = type ? `type: ${type}\n` : '';
  fs.writeFileSync(control, (extension === '.tid' || extension === '.meta'
    ? `title: Control\n${typeLine}\n`
    : extension === '.multids' ? `title: $:/control/\n${typeLine}\n` : '') + SENTINEL + '\n');
  // The shared runner batches the file list, since cmd.exe refuses a long command line and a
  // growing corpus reaches that ceiling with no warning. The control rides every batch, because a
  // baseline read once per batch is the same baseline.
  snapRun([...grammars, '-s', scope, '-u', control], entries.map((e) => e.copy));
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
// The number stands on the first line; what follows it explains the number, the way every ceiling
// beside it reads. A reader taking the whole file answers NaN the moment a floor carries a reason.
const floor = fs.existsSync(floorFile)
  ? Number(fs.readFileSync(floorFile, 'utf8').split('\n')[0].trim())
  : 0;

// A ceiling, not a floor: the count of OUR OWN unreached scopes may fall and may never rise.
const ceilingFile = path.join('corpus', 'unreached-ceiling.txt');
// The number stands on the first line; what follows it explains the number.
const ceiling = fs.existsSync(ceilingFile)
  ? Number(fs.readFileSync(ceilingFile, 'utf8').split('\n')[0].trim())
  : Infinity;

// ── RULE COVERAGE — every rule the PARSER stands, some specimen makes fire ────────────────────
//
// Coverage above reads the grammar's own scope names, so it answers whether this repository
// exercises what it wrote. It cannot answer whether the corpus exercises what TiddlyWiki READS:
// a construct the grammar never learned reaches no scope, goes unmissed, and the count reads full.
// So the second population comes from the host. `activeRules` names the rules left standing after
// $:/config/WikiParserRules has had its say, and a rule no specimen fires marks ground the corpus
// does not cover — the fault a hand-written battery makes, one level up from the battery.
//
// A rule building NO NODE escapes any reading of a tree, and naming it here as a gap reports a
// permanent one. Measured, one such rule stands.
const NO_NODE = {
  whitespace: 'sets the parser\'s whitespace handling and builds nothing, so no tree carries its name'
};
const oracle = boot(resolveTiddlyWiki(), {});
const active = oracle.activeRules();
const standing = [...new Set([...active.block, ...active.inline, ...active.pragma])].sort();
const fired = new Set();
for (const f of corpus) {
  // The host parses wikitext; a `.tid` or a `.multids` carries a header it never reads, and the
  // dialect's own vocabulary rides on top of the same base.
  if (!/\.(tw|mem)$/.test(f)) continue;
  for (const node of flatten(oracle.parse(fs.readFileSync(f, 'utf8')).tree)) if (node.rule) fired.add(node.rule);
}
const unfired = standing.filter((r) => !fired.has(r) && !NO_NODE[r]);

console.log(`corpus-check  ${corpus.length} files, ${declared.size} scopes declared, ${reachedCount} reached (floor ${floor}), `
  + `${standing.length - unfired.length} of ${standing.length} parser rule(s) fired`);
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
console.log(`  rules: ${Object.keys(NO_NODE).length} of the rules TiddlyWiki stands build no node, so no tree carries them: `
  + `${Object.entries(NO_NODE).map(([r, why]) => `${r} ${why}`).join('; ')}`);
for (const rule of unfired) {
  console.error(`  no corpus specimen makes TiddlyWiki fire ${rule}, so nothing here reads what it builds`);
}
process.exitCode = bleeding.length || unfired.length || reachedCount < floor || unreachedOurs.length > ceiling ? 1 : 0;
return;
