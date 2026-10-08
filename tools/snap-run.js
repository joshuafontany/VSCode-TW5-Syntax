// ONE WAY TO SPAWN THE SNAPSHOT TOOL, because two platforms refuse it for two different reasons.
//
// `npx` is a `.cmd` shim on Windows, which `execFileSync` cannot spawn directly: it answers
// `spawnSync npx ENOENT`. Passing `shell` cures that and buys the NEXT refusal, because cmd.exe
// stops at about 8k characters of command line — "The command line is too long" — and a growing
// corpus walks into that ceiling with no warning and no bad reading to point at.
//
// So every caller hands the file list HERE, and this batches it by measured length. The control file
// a caller passes rides every batch, since a baseline read once per batch is the same baseline.
//
//   node --test tools/snap-run.test.js
'use strict';

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

// cmd.exe refuses past roughly 8k. Measuring against a lower ceiling leaves room for the shell's
// own quoting, which a caller cannot see from here.
const BUDGET = 6000;

/**
 * The file list, split so no single command line runs long.
 *
 * @param {string[]} fixed  the arguments every batch carries (the tool, grammars, scope, control)
 * @param {string[]} files  the files to divide among batches
 * @returns {string[][]} one batch per run, never empty, each holding at least one file
 */
function batches(fixed, files) {
  // Each argument costs its own length plus the quoting and separator a shell adds around it.
  const cost = (arg) => arg.length + 3;
  const spent = fixed.reduce((n, a) => n + cost(a), 0);
  const out = [[]];
  let length = spent;
  for (const file of files) {
    if (out[out.length - 1].length && length + cost(file) > BUDGET) {
      out.push([]);
      length = spent;
    }
    out[out.length - 1].push(file);
    length += cost(file);
  }
  return out;
}

/**
 * Run `vscode-tmgrammar-snap` over `files`, in as many batches as the command line needs.
 *
 * @param {string[]} fixed  arguments before the file list — grammars, `-s <scope>`, any `-u <control>`
 * @param {string[]} files  the files to snapshot
 * @param {object} [options]  `stdio` and `cwd`, as `execFileSync` reads them
 */
function snapRun(fixed, files, options = {}) {
  if (!files.length) return;
  const argv = ['vscode-tmgrammar-snap', ...fixed];
  for (const batch of batches(argv, files)) {
    execFileSync('npx', [...argv, ...batch], {
      cwd: options.cwd ?? ROOT,
      stdio: options.stdio ?? ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32'
    });
  }
}

module.exports = { snapRun, batches, BUDGET };
