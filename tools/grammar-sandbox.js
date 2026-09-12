// A throwaway copy of the repo, with one grammar swapped.
//
// A collision proves a gate catches the fault it stands for, which means running the gate against
// a grammar carrying that fault. Writing the REAL grammar to do it hands every other test a
// different grammar mid-run, and a restore that loses a race leaves the fault standing in the
// tree — measured, it stripped a heading's scope names and the next reading of the gate reported
// a twenty-point regression that existed only in the leftovers.
//
// The worktree comes from HEAD, so it carries the COMMITTED tools and grammars. A gate under
// change in the working tree must collide as it stands now, never as it stood at the last
// commit, so both directories come across before the fault lands.

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runNode } = require('./run-tool.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');

// Copy a directory over the sandbox's own, all the way down. A shallow copy left the edition's
// tiddlers behind, and a gate that reads them then measured whatever the last commit held.
function overlay(dir, sandbox) {
  const from = path.join(ROOT, dir);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.join(sandbox, dir), { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) { overlay(path.join(dir, entry.name), sandbox); continue; }
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(from, entry.name), path.join(sandbox, dir, entry.name));
  }
}

/**
 * Run a command inside a sandbox, with a caller's fault written into it first.
 *
 * A gate reads what it reads: one reads the grammar, another reads the pinned snapshots. A
 * collision has to provoke the thing the gate actually opens, so the caller writes the sandbox
 * rather than handing over one file.
 *
 * `dirs` names what the sandbox takes from the working tree. A gate reading pinned snapshots needs
 * the samples as they stand; one provoking the grammar wants them as HEAD holds them, so the two
 * callers below ask for different overlays and share everything else.
 *
 * `argv` names paths inside the sandbox and gets rewritten to point there. `extra` rides through
 * untouched, for the flags and scope names a tool reads as words rather than as files.
 *
 * @param {string[]} dirs                     directories to overlay from the working tree
 * @param {(sandbox: string) => void} mutate  writes the fault into the sandbox
 * @param {string[]} argv                     node arguments, relative to the sandbox
 * @param {string[]} [extra]                  arguments passed through as written
 * @returns {{code:number, out:string}}
 */

/**
 * Watch what a provocation writes, so the harness can prove it altered something.
 *
 * A PROVOCATION THAT CHANGES NOTHING PROVES NOTHING, AND READS EXACTLY LIKE ONE THAT WORKS. Measured
 * four times in one session: a strike naming one corpus file while a second carried the same form, a
 * strike naming an exact source line somebody rewrote, a strike truncating at the angle INSIDE the
 * arrow it meant to remove, and an anchored global replace striking once per anchor rather than once
 * per occurrence. Each read green and planted no fault.
 *
 * Intercepting the writes beats hashing the tree: a mutator writing IDENTICAL bytes is the exact
 * failure, so counting writes answers nothing and only content does.
 */
function watchWrites() {
  const before = new Map();
  const real = { write: fs.writeFileSync, append: fs.appendFileSync, rm: fs.rmSync, unlink: fs.unlinkSync };
  const remember = (file) => {
    const key = String(file);
    if (before.has(key)) return;
    try { before.set(key, fs.readFileSync(key, 'utf8')); } catch { before.set(key, null); }
  };
  fs.writeFileSync = (file, ...rest) => { remember(file); return real.write(file, ...rest); };
  fs.appendFileSync = (file, ...rest) => { remember(file); return real.append(file, ...rest); };
  fs.rmSync = (file, ...rest) => { remember(file); return real.rm(file, ...rest); };
  fs.unlinkSync = (file, ...rest) => { remember(file); return real.unlink(file, ...rest); };
  return () => {
    Object.assign(fs, { writeFileSync: real.write, appendFileSync: real.append, rmSync: real.rm, unlinkSync: real.unlink });
    for (const [file, was] of before) {
      let now = null;
      try { now = fs.readFileSync(file, 'utf8'); } catch { now = null; }
      if (now !== was) return true;
    }
    return false;
  };
}

function inSandbox(dirs, mutate, argv, extra = []) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'grammar-sandbox-'));
  try {
    execFileSync('git', ['worktree', 'add', '-q', '--detach', sandbox, 'HEAD'], { cwd: ROOT });
    fs.rmSync(path.join(sandbox, 'node_modules'), { recursive: true, force: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));
    for (const dir of dirs) overlay(dir, sandbox);
    const settled = watchWrites();
    mutate(sandbox);
    if (!settled() && !mutate.unprovoked) {
      throw new Error('the provocation altered nothing in the sandbox, so it plants no fault — '
        + 'a collision reading green over an unaltered tree proves its gate cannot fail');
    }
    // THE SANDBOX MEETS THE HOST THIS TREE MEETS. `resolveTiddlyWiki` prefers a checkout standing
    // beside the repository and falls back to the pinned package; a sandbox stands in the system
    // temp directory, where no checkout stands beside it, so every run here resolved the package —
    // measured, 5.4.1 against the checkout's 5.5.0-prerelease. A collision then proved its gate
    // against a parser the gate never runs on. `TW5_PATH` outranks every candidate.
    // EVERY GROUND A GATE READS, not only the host. A sandbox stands in the system temp directory,
    // where nothing sits beside it, so every path a resolver walks upward for falls through — the
    // TiddlyWiki checkout (measured, 5.4.1 against 5.5.0-prerelease) and the operator's boot seed
    // alike. A collision then proves its gate against ground the gate never runs on.
    const host = resolveTiddlyWiki();
    const seed = path.resolve(ROOT, '..', 'bags', 'lares', 'ha.ka.ba', 'lares', 'api', 'noosphere-boot.mem');
    const env = { ...process.env };
    if (host) env.TW5_PATH = host;
    if (fs.existsSync(seed)) env.LARES_SEED = seed;
    return runNode([...argv.map((a) => path.join(sandbox, a)), ...extra], { cwd: sandbox, env });
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', sandbox], { cwd: ROOT, stdio: 'ignore' });
  }
}

const WORKING = ['tools', 'syntaxes', 'editions', 'corpus', path.join('tests', 'samples')];
// The corpus rides across too: swallow-witness draws its whole battery from it, and a run
// reading HEAD's corpus would collide a working-tree grammar against specimens the working tree
// has since changed — or against a ledger it has yet to commit.
const AT_HEAD = ['tools', 'syntaxes', 'editions', 'corpus'];

/**
 * Run a command inside a sandbox a caller may write into first.
 *
 * @param {(sandbox: string) => void} mutate  writes the fault into the sandbox
 * @param {string[]} argv                     node arguments, relative to the sandbox
 * @param {string[]} [extra]                  arguments passed through as written
 * @returns {{code:number, out:string}}
 */
const runInSandbox = (mutate, argv, extra) => inSandbox(WORKING, mutate, argv, extra);

// THE ONE DOOR FOR PROVOKING NOTHING, named so a reader sees the intent. A caller running a tool in
// isolation alters no tree on purpose, and a silent exemption would reopen the hole above.
runInSandbox.unprovoked = (argv, extra) => {
  const none = () => {};
  none.unprovoked = true;
  return inSandbox(WORKING, none, argv, extra);
};

/**
 * Run a command inside a sandbox whose grammar carries `provoked`.
 *
 * @param {string} provoked   the grammar text to write
 * @param {string[]} argv     node arguments, relative to the sandbox
 * @param {string[]} [extra]  arguments passed through as written
 * @returns {{code:number, out:string}}
 */
const runProvoked = (provoked, argv, extra) => inSandbox(AT_HEAD,
  (sandbox) => fs.writeFileSync(path.join(sandbox, 'syntaxes', 'tiddlywiki5.json'), provoked), argv, extra);

module.exports = { runProvoked, runInSandbox, GRAMMAR: path.join(ROOT, 'syntaxes', 'tiddlywiki5.json') };
