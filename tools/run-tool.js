// Running an instrument and reading what it said.
//
// A gate answers in two parts: an exit code, and the lines it printed. A test that reads only the
// code learns nothing about WHY, and one that lets the throw escape reads a failing gate as a
// broken test. Five tests carried the same seven lines to hold both, differing only in which
// instrument they named.
//
//   const { runTool } = require('./run-tool.js');
//   const { code, out } = runTool('dark-construct.js', ['--verbose']);

'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Spawn node and hand back both halves of the answer.
 *
 * A non-zero exit reads as a result rather than as a fault, because a gate that refuses IS the
 * measurement — so `out` carries stdout and stderr together, the way a reader sees them.
 *
 * ON SUCCESS `out` CARRIES STDOUT ALONE, and that asymmetry has bitten twice: a caller asserting on a
 * line a tool writes to STDERR passes only on runs where the tool FAILED, which reads as an
 * intermittent fault in whatever the assertion names. A caller wanting both streams unconditionally
 * wants a tool that refuses, or an assertion that lives where the reading does.
 *
 * @param {string[]} argv        node's arguments, the script first
 * @param {{cwd?: string, env?: Record<string,string>}} [opts]  `env` adds to this process's own
 * @returns {{code: number, out: string}}
 */
function runNode(argv, { cwd = ROOT, env } = {}) {
  try {
    return { code: 0, out: execFileSync('node', argv,
      // A READING LONGER THAN THE BUFFER GETS ITS WRITER KILLED. Node enforces `maxBuffer` by
      // sending SIGTERM, so a tool printing past the 1 MB default dies mid-sentence — measured at
      // 1 070 461 bytes, where a collision running a whole test file inside a sandbox crossed it and
      // the death then read as the gate refusing. A gate's own verbose reading must fit.
      { encoding: 'utf8', cwd, maxBuffer: 64 * 1024 * 1024,
        env: env ? { ...process.env, ...env } : process.env }) };
  } catch (e) {
    // A KILLED CHILD IS NOT A MEASUREMENT. `execFileSync` reports a signal death as `status: null`
    // with whatever the child had already written, and handing that back reads as though the tool
    // had RUN and REFUSED. Measured under a full parallel sweep: a legibility run died and its gate
    // reported a pair standing at 65 of 65 as missing, so a reader chased a grammar defect that was
    // a dead process. Twenty-six files run a tool through here and every one inherits the lie.
    if (e.signal) {
      throw new Error(`${argv[0]} died by ${e.signal} after ${(e.stdout ?? '').length} byte(s) — `
        + 'a killed child reads as a refusal, so this refuses to answer for one');
    }
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/**
 * Run one instrument by name.
 *
 * @param {string} tool  a file name under `tools/`, or an absolute path
 * @param {string[]} [args]
 * @param {{cwd?: string, env?: Record<string,string>}} [opts]
 * @returns {{code: number, out: string}}
 */
function runTool(tool, args = [], opts) {
  const file = path.isAbsolute(tool) ? tool : path.join(ROOT, 'tools', tool);
  return runNode([file, ...args], opts);
}

module.exports = { runNode, runTool, ROOT };
