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
 * @param {string[]} argv        node's arguments, the script first
 * @param {{cwd?: string, env?: Record<string,string>}} [opts]  `env` adds to this process's own
 * @returns {{code: number, out: string}}
 */
function runNode(argv, { cwd = ROOT, env } = {}) {
  try {
    return { code: 0, out: execFileSync('node', argv,
      { encoding: 'utf8', cwd, env: env ? { ...process.env, ...env } : process.env }) };
  } catch (e) {
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
