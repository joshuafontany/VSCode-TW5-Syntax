// The extension ships colouring and nothing that runs.
//
// A TextMate grammar decides how loudly a construct reads and never which parser rules a wiki
// stands — nothing in the VS Code API hands a grammar to an extension at runtime. So the
// configuration this extension offers works by scope naming and theme rules, and a release that
// quietly grew an activation path would answer a different design.
//
// That claim about the API answers to Microsoft's tree rather than to this one, and no test here
// can hold it. Its CONSEQUENCE lives here and this holds that: the package declares no entry
// point, contributes only declarative surfaces, carries no runtime dependency, and packs no
// executable file. A grammar-only extension stays a grammar-only extension by measurement.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const pkg = require(path.join(ROOT, 'package.json'));

// Surfaces VS Code reads without running anything. A key outside this set contributes behaviour.
const DECLARATIVE = new Set(['languages', 'grammars', 'snippets', 'configurationDefaults', 'configuration', 'themes', 'iconThemes', 'semanticTokenScopes']);

/**
 * What `vsce` says it would pack, or `null` when no `vsce` stands here.
 *
 * A BLANKET CATCH TURNED THIS GATE DARK. Reading the listing through `execFileSync`'s 1 MB default
 * buffer, and taking any throw for an absent tool, meant the gate reported "vsce unavailable" the
 * moment the listing grew past a megabyte — which is precisely what a LEAK does. Measured: a Claude
 * Code worktree under `.claude/` put 10 760 files and 1 507 executables into the listing, which
 * wrote 1 242 041 bytes, threw `ENOBUFS`, and skipped the very check that would have named it.
 *
 * So the buffer stands wide enough to read a leak, and only a tool that is genuinely ABSENT skips.
 * Every other failure refuses.
 *
 * ABSENCE GETS ASKED DIRECTLY, never inferred from a failure's words. Reading the message was the
 * first attempt and it was wrong twice over: with stderr discarded, a missing `vsce` says only
 * `Command failed: npx --no-install vsce ls` and carries no code, so the sniff called a plain
 * absence a refusal and redded every CI leg that has no `vsce` — which is all of them, since only
 * the `package` job fetches one. And on Windows `npx` is a `.cmd` shim `execFileSync` cannot spawn,
 * so the same absence arrives as `ENOENT` instead. Two questions, asked separately: does `vsce`
 * stand here, and will it list the package.
 *
 * @returns {string[]|null} the packed paths, or null when `vsce` does not stand here
 */
function vsceStands() {
  try {
    execFileSync('npx', ['--no-install', 'vsce', '--version'],
      { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' });
    return true;
  } catch {
    return false;
  }
}

function packedFiles() {
  if (!vsceStands()) return null;
  try {
    return execFileSync('npx', ['--no-install', 'vsce', 'ls'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024,
        shell: process.platform === 'win32' })
      .split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (e) {
    throw new Error(`vsce stands here and refused to list the package (${e.code ?? 'no code'}): `
      + `${String(e.stderr || e.message).split('\n').filter(Boolean).slice(-2).join(' / ')}`);
  }
}

test('the package declares no entry point', () => {
  assert.strictEqual(pkg.main, undefined, 'a `main` entry gives the extension a runtime');
  assert.strictEqual(pkg.browser, undefined, 'a `browser` entry gives the extension a web runtime');
  assert.strictEqual(pkg.activationEvents, undefined, 'activation events exist to start something');
});

test('the package contributes only declarative surfaces', () => {
  const contributed = Object.keys(pkg.contributes || {});
  const behavioural = contributed.filter((k) => !DECLARATIVE.has(k));
  assert.deepStrictEqual(behavioural, [], `contributions VS Code cannot read without running code: ${behavioural.join(', ')}`);
  assert.ok(contributed.includes('grammars'), 'a grammar extension contributes grammars');
});

test('the package carries no runtime dependency', () => {
  assert.deepStrictEqual(Object.keys(pkg.dependencies || {}), [], 'a runtime dependency ships with the extension');
});

// The ignore list decides what packs, and it names directories rather than contributions — so an
// edit there can drop a declared grammar and nothing downstream complains. VS Code loads a
// language whose grammar file went missing and colours nothing, silently.
test('every declared contribution packs', { timeout: 120000 }, (t) => {
  const listing = packedFiles();
  if (!listing) {
    t.skip('no `vsce` stands here — the ignore list stands unread');
    return;
  }
  const packed = new Set(listing);
  const declared = [
    ...(pkg.contributes.grammars || []).map((g) => g.path),
    ...(pkg.contributes.snippets || []).map((s) => s.path),
    ...(pkg.contributes.languages || []).filter((l) => l.configuration).map((l) => l.configuration)
  ].map((p) => p.replace(/^\.\//, ''));
  const absent = [...new Set(declared)].filter((f) => !packed.has(f));
  assert.deepStrictEqual(absent, [], `declared but never packed, so VS Code loads it and colours nothing: ${absent.join(', ')}`);
});

// The manifest decides what packs. A file the ignore list misses ships whatever it holds.
test('nothing executable packs into the extension', { timeout: 120000 }, (t) => {
  const packed = packedFiles();
  if (!packed) {
    t.skip('no `vsce` stands here — the ignore list stands unread');
    return;
  }
  assert.ok(packed.length > 0, 'the manifest packs nothing at all');
  const executable = packed.filter((f) => /\.(js|cjs|mjs|ts|sh)$/.test(f));
  assert.deepStrictEqual(executable, [], `executable file(s) packed: ${executable.join(', ')}`);
});

// ── THE SURFACE IS BOUNDED, NOT ONLY POPULATED ────────────────────────────────────────────────
//
// Every reading above asks whether what the manifest PROMISES reaches the package. None asks the
// other direction, and the gate that builds a real .vsix — `tools/package-contents.js` — asked only
// the same way. So the package's size was never anybody's measurement: a directory the ignore list
// does not name ships whatever it holds, and the only thing standing between a user and this
// repository's 128 MB of agent worktree was that nobody had run `vsce` on a machine that had one.
//
// So the surface derives on BOTH sides. What the manifest registers packs, and what packs is either
// something the manifest registers or one of the few files named here, each because a user or a
// theme author opens it. A file matching neither is a LEAK, and it reads as one.
// ONE READING, NOT TWO. `tools/package-contents.js` owns the bound and enforces it on a real .vsix
// in CI; this reads the same two definitions rather than restating them, because a gate and its test
// holding separate copies of one reading drift apart in silence.
const { SHIPPED, strayFiles, canonical } = require('../package-contents.js');

test('nothing packs that the manifest does not register and the tool does not name', { timeout: 120000 }, (t) => {
  const packed = packedFiles();
  if (!packed) {
    t.skip('no `vsce` stands here — the ignore list stands unread');
    return;
  }
  assert.deepStrictEqual(strayFiles(packed, pkg), [],
    'file(s) pack that nothing accounts for — name each in the tool\'s SHIPPED, or exclude it in .vscodeignore');
});

// THE COLLISION. A planted listing carries the two shapes this repository really grows — a harness
// file and an agent worktree — and both must read as strays, or the check above rests on a tree that
// happens to be clean today.
test('a harness file and an agent worktree both read as strays', () => {
  const planted = [
    'package.json',
    'syntaxes/tiddlywiki5.json',
    'corpus/memetic/control-set.mem',
    '.claude/worktrees/spirit/tools/theme-model.js',
    'themes/gruvbox/gruvbox-dark-hard.json'
  ];
  assert.deepStrictEqual(strayFiles(planted, pkg), [
    '.claude/worktrees/spirit/tools/theme-model.js',
    'corpus/memetic/control-set.mem',
    'themes/gruvbox/gruvbox-dark-hard.json'
  ], 'the reading let a harness file or a worktree through');
});

// A SHIPPED NAME THAT PACKS NOTHING IS A RULING ABOUT A FILE THAT LEFT. It reads as stale here
// rather than standing forever as permission nobody uses.
test('every name the tool ships stands in the tree', () => {
  for (const [file, why] of SHIPPED) {
    assert.ok(fs.existsSync(path.join(ROOT, file)),
      `SHIPPED names \`${file}\` — ${why} — and no such file stands here`);
  }
});

// VSCE RENAMES THREE FILES ON THE WAY IN, and a reading that takes either spelling as the truth
// calls the other three strays. Both spellings must land on the shipped file, and a name that
// merely LOOKS like one of the three must not.
test('a file vsce renames still reads as the file it ships', () => {
  assert.deepStrictEqual(strayFiles(['readme.md', 'changelog.md', 'LICENSE.txt'], pkg), [],
    'the package\'s own spelling of a shipped file read as a stray');
  assert.deepStrictEqual(strayFiles(['README.md', 'CHANGELOG.md', 'LICENSE'], pkg), [],
    'the source spelling of a shipped file read as a stray');
  assert.strictEqual(canonical('docs/readme.md'), 'docs/readme.md',
    'a readme somewhere else canonicalised onto the shipped one, so a whole directory could hide behind it');
  assert.deepStrictEqual(strayFiles(['docs/readme.md'], pkg), ['docs/readme.md'],
    'a readme in a subdirectory passed as the shipped readme');
});
