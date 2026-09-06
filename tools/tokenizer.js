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

// ── the same grammars, read in this process ───────────────────────────────────────────────────
//
// The snapshotter spawns a process, writes a file and reads it back. A sweep asking one question
// of several hundred specimens pays that cost several hundred times, which puts a whole class of
// instrument out of reach — anything that probes real text at every position rather than a table
// of examples.
//
// vscode-tmgrammar-test carries the registry the snapshotter itself builds, so loading it here
// reads the same grammars under the same injections. Collided against every pinned snapshot in
// tests/samples: 31 of 31 reproduce scope for scope.

let registry = null;
const loaded = new Map();

/** The registry the snapshotter builds: the manifest's grammars, plus the extras grammars.sh names. */
function grammarRegistry() {
  if (registry) return registry;
  const { createRegistry } = require('vscode-tmgrammar-test/dist/common/index.js');
  const fs = require('node:fs');
  const manifest = require(path.join(ROOT, 'package.json')).contributes || {};
  const seen = new Set();
  const grammars = [];
  for (const g of manifest.grammars || []) {
    const file = path.resolve(ROOT, g.path);
    if (!fs.existsSync(file)) continue;
    seen.add(file);
    grammars.push({ path: file, scopeName: g.scopeName, injectTo: g.injectTo });
  }
  const args = grammarArgs();
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== '-g') continue;
    const file = path.resolve(ROOT, args[i + 1]);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    grammars.push({ path: file });
  }
  registry = createRegistry(grammars);
  return registry;
}

/**
 * Every token a scope's grammar names in a text, line by line.
 *
 * A grammar this registry cannot resolve — one of the several dozen VS Code ships that a bare
 * checkout carries none of — warns on stderr and drops out of the reading, the same way it does
 * under the snapshotter.
 *
 * @param {string} scope  the grammar the text opens under
 * @param {string} text
 * @returns {Promise<Array<Array<{startIndex:number,endIndex:number,scopes:string[]}>>>}
 */
async function tokenize(scope, text) {
  if (!loaded.has(scope)) loaded.set(scope, await grammarRegistry().loadGrammar(scope));
  const grammar = loaded.get(scope);
  if (!grammar) throw new Error(`no grammar stands under ${scope}`);
  const lines = [];
  let stack = null;
  for (const line of text.split('\n')) {
    const read = grammar.tokenizeLine(line, stack);
    stack = read.ruleStack;
    lines.push(read.tokens);
  }
  return lines;
}

module.exports = { ROOT, grammarArgs, snapshot, tokenize };

