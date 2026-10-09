#!/usr/bin/env node
// The package a user installs, bounded on BOTH sides.
//
// Each other gate here reads the source tree, where a file the package excludes still resolves.
// This one builds the .vsix and looks inside it, so a manifest entry pointing at an excluded file
// fails here and nowhere else.
//
// IT ONLY EVER ASKED ABOUT OMISSION. Every path the manifest promises had to stand inside the
// package, and nothing asked the other direction — so nothing measured the package's SIZE. A
// directory the ignore list does not name ships whatever it holds: a Claude Code session leaves a
// git worktree under `.claude/`, and this repository's weighed 128 MB across
// 10 760 files, 1 507 of them executable. It would have shipped. Worse, it SILENCED the invariant
// that reads the same listing — `vsce ls` wrote 1 242 041 bytes, past `execFileSync`'s 1 MB
// default, and a blanket catch there took the overflow for an absent tool and skipped.
//
// So the surface derives on both sides now. What the manifest registers packs, and what packs is
// either registered or named in `SHIPPED` with the reason a user or a theme author opens it.
//
//   node tools/package-contents.js

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// THE FILES THAT SHIP WITHOUT A CONTRIBUTION REGISTERING THEM, each with the reason it ships. A
// reader asking why the package carries a file gets the answer here rather than from an ignore
// list's silence.
const SHIPPED = new Map([
  ['package.json', 'the manifest VS Code reads to register everything else'],
  ['README.md', 'what the extension is, which the Marketplace renders'],
  ['CHANGELOG.md', 'what moved between versions, which the Marketplace renders'],
  ['LICENSE', 'the terms the package ships under'],
  ['ThirdPartyNotices.txt', 'the terms the vendored grammars ship under'],
  ['MIGRATION.md', 'the scope renames a theme written against an older version must follow'],
  ['SCOPE-NAMES.md', 'the scope vocabulary a theme author writes rules against'],
  ['contributing.md', 'where a reader who wants to change the grammar goes next'],
  ['tw5.png', 'the icon the manifest names']
]);

/**
 * The paths a manifest PROMISES, each with the field that promises it.
 *
 * @param {object} manifest  a package.json shape
 * @returns {{path: string, from: string}[]}
 */
function promisedPaths(manifest) {
  const c = manifest.contributes ?? {};
  const out = [];
  const claim = (p, from) => { if (p) out.push({ path: p.replace(/^\.\//, ''), from }); };
  for (const g of c.grammars ?? []) claim(g.path, `grammars[${g.scopeName}]`);
  for (const l of c.languages ?? []) claim(l.configuration, `languages[${l.id}].configuration`);
  for (const s of c.snippets ?? []) claim(s.path, `snippets[${s.language}]`);
  claim(manifest.icon, 'icon');
  claim(manifest.main, 'main');
  return out;
}

/**
 * One spelling for a file `vsce` renames on the way in.
 *
 * `vsce ls` prints the SOURCE name and the built .vsix carries vsce's own: `README.md` packs as
 * `readme.md`, `CHANGELOG.md` as `changelog.md`, and `LICENSE` gains a `.txt`. Two readings of one
 * package therefore disagree about three files, and taking either spelling as the truth reports the
 * other three as strays. Naming the rename here keeps the quirk visible — a case-blind compare
 * would hide it, and would also stop telling `README.md` apart from a stray `readme.MD`.
 *
 * @param {string} file  a path as one reading spells it
 * @returns {string} the path as `SHIPPED` spells it
 */
function canonical(file) {
  if (/^readme\.md$/i.test(file)) return 'README.md';
  if (/^changelog\.md$/i.test(file)) return 'CHANGELOG.md';
  if (/^license(\.(txt|md))?$/i.test(file)) return 'LICENSE';
  return file;
}

/**
 * Packed paths that neither the manifest registers nor `SHIPPED` names.
 *
 * Pure, so a collision can plant a listing: a check that can only be collided by dirtying the tree
 * it measures does not get collided, and this one guards against exactly the dirt a worktree leaves.
 *
 * @param {string[]} packed  paths inside the package, repository-relative
 * @param {object} manifest  a package.json shape
 * @returns {string[]} the strays, sorted
 */
function strayFiles(packed, manifest) {
  const registered = new Set(promisedPaths(manifest).map((p) => p.path));
  return packed.filter((f) => !registered.has(f) && !SHIPPED.has(canonical(f))).sort();
}

/**
 * Paths the manifest promises that the package does not carry.
 *
 * @param {string[]} packed
 * @param {object} manifest
 * @returns {{path: string, from: string}[]}
 */
function missingPaths(packed, manifest) {
  const inside = new Set(packed.map(canonical));
  return promisedPaths(manifest).filter((p) => !inside.has(p.path));
}

module.exports = { SHIPPED, promisedPaths, strayFiles, missingPaths, canonical };

if (require.main !== module) return;

const { execFileSync } = require('node:child_process');
const os = require('node:os');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-pkg-'));
const vsix = path.join(scratch, 'probe.vsix');
execFileSync('npx', ['--yes', '@vscode/vsce', 'package', '--allow-missing-repository', '--out', vsix], {
  stdio: ['ignore', 'ignore', 'inherit'],
  cwd: ROOT,
  shell: process.platform === 'win32'
});
const listing = execFileSync('unzip', ['-Z1', vsix], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean)
  .filter((f) => f.startsWith('extension/'))
  .map((f) => f.replace(/^extension\//, ''));
fs.rmSync(scratch, { recursive: true, force: true });

const missing = missingPaths(listing, manifest);
const strays = strayFiles(listing, manifest);

console.log(`package-contents  ${listing.length} files packaged, `
  + `${promisedPaths(manifest).length} manifest path(s) checked, ${SHIPPED.size} named besides`);
for (const m of missing) console.error(`  MISSING  ${m.path}\n           promised by ${m.from}`);
for (const s of strays) console.error(`  STRAY    ${s}\n           nothing registers it and nothing names it`);
if (missing.length) {
  console.error(`\n  the manifest names ${missing.length} path(s) the package does not carry`);
}
if (strays.length) {
  console.error(`\n  the package carries ${strays.length} path(s) nothing accounts for — name each in`
    + ` SHIPPED with its reason, or exclude it in .vscodeignore`);
}
process.exitCode = missing.length + strays.length === 0 ? 0 : 1;
