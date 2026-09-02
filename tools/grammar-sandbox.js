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
 * Run a command inside a sandbox a caller may write into first.
 *
 * A gate reads what it reads: one reads the grammar, another reads the pinned snapshots. A
 * collision has to provoke the thing the gate actually opens, so the caller writes the sandbox
 * rather than handing over one file.
 *
 * @param {(sandbox: string) => void} mutate  writes the fault into the sandbox
 * @param {string[]} argv                     node arguments, relative to the sandbox
 * @returns {{code:number, out:string}}
 */
function runInSandbox(mutate, argv) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'grammar-sandbox-'));
  try {
    execFileSync('git', ['worktree', 'add', '-q', '--detach', sandbox, 'HEAD'], { cwd: ROOT });
    fs.rmSync(path.join(sandbox, 'node_modules'), { recursive: true, force: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));
    overlay('tools', sandbox);
    overlay('syntaxes', sandbox);
    overlay('editions', sandbox);
    overlay(path.join('tests', 'samples'), sandbox);
    mutate(sandbox);
    try {
      return { code: 0, out: execFileSync('node', argv.map((a) => path.join(sandbox, a)),
        { encoding: 'utf8', cwd: sandbox }) };
    } catch (e) {
      return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', sandbox], { cwd: ROOT, stdio: 'ignore' });
  }
}

/**
 * Run a command inside a sandbox whose grammar carries `provoked`.
 *
 * @param {string} provoked   the grammar text to write
 * @param {string[]} argv     node arguments, relative to the sandbox
 * @returns {{code:number, out:string}}
 */
function runProvoked(provoked, argv) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'grammar-sandbox-'));
  try {
    execFileSync('git', ['worktree', 'add', '-q', '--detach', sandbox, 'HEAD'], { cwd: ROOT });
    fs.rmSync(path.join(sandbox, 'node_modules'), { recursive: true, force: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));
    overlay('tools', sandbox);
    overlay('syntaxes', sandbox);
    overlay('editions', sandbox);
    fs.writeFileSync(path.join(sandbox, 'syntaxes', 'tiddlywiki5.json'), provoked);
    try {
      return { code: 0, out: execFileSync('node', argv.map((a) => path.join(sandbox, a)),
        { encoding: 'utf8', cwd: sandbox }) };
    } catch (e) {
      return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', sandbox], { cwd: ROOT, stdio: 'ignore' });
  }
}

module.exports = { runProvoked, runInSandbox, GRAMMAR: path.join(ROOT, 'syntaxes', 'tiddlywiki5.json') };
