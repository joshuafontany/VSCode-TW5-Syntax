// The grammar set, resolved once, and the snapshotter that reads it.
//
// Ten tools here asked bash for the grammar arguments and spawned the snapshotter themselves, each
// carrying the same two lines. The invocation stood identical in all ten — measured, byte for byte
// — so the day one of them learned something the other nine would not.
//
// One resolution, cached. `grammars.sh` walks the manifest and probes for the grammars VS Code
// ships on this platform, which costs a shell and a scan; a tool that tokenizes several times paid
// it several times.

'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

let cached = null;

/**
 * The `-g` pairs the snapshotter takes, from `grammars.sh`.
 *
 * The script sources rather than executes, so a shell reads it and prints what it resolved. What
 * it cannot find on this platform it names on stderr and drops — a remote machine carries none of
 * the grammars VS Code ships, and a gate must still run there.
 *
 * @returns {string[]}
 */
function grammarArgs() {
  if (cached) return cached;
  cached = execFileSync('bash',
    ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
    { encoding: 'utf8', cwd: ROOT }).trim().split('\n').filter(Boolean);
  return cached;
}

/**
 * Write a snapshot beside each file, under one scope.
 *
 * @param {string} scope  the grammar a file opens under
 * @param {string[]} files  paths to tokenize
 * @param {{extra?: string[], quiet?: boolean}} [options]  extra grammars, and whether to swallow output
 */
function snapshot(scope, files, options = {}) {
  if (!files.length) return;
  execFileSync('npx',
    ['vscode-tmgrammar-snap', ...grammarArgs(), ...(options.extra ?? []), '-s', scope, '-u', ...files],
    { cwd: ROOT, stdio: options.quiet === false ? 'inherit' : 'ignore' });
}

module.exports = { ROOT, grammarArgs, snapshot };
