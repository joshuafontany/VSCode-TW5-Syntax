#!/usr/bin/env node
// Compile the edition's TypeScript into the CJS module tiddlers TiddlyWiki loads.
//
// A module tiddler carries its own header — title, type, module-type — in a comment the host reads
// from the start of a line. TypeScript emits that comment untouched, so the source and the tiddler
// stay one file rather than a file and a wrapper.
//
// The compiler resolves the way the oracle resolves TiddlyWiki: a variable names it, then this
// repository, then the workspace above it. A submodule cloned alone finds its own; a submodule
// beside its parent finds the parent's.
//
//   node tools/edition-build.js

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PROJECT = path.join(ROOT, 'editions', 'tw5-syntax', 'tsconfig.json');

function resolveCompiler() {
  const candidates = [
    process.env.TSC_PATH,
    path.join(ROOT, 'node_modules', '.bin', 'tsc'),
    path.join(ROOT, '..', 'node_modules', '.bin', 'tsc'),
    path.join(ROOT, '..', '..', 'node_modules', '.bin', 'tsc')
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

const check = process.argv.includes('--check');
const tsc = resolveCompiler();
if (!tsc) {
  console.error('  no TypeScript compiler stands where this looked — set TSC_PATH, or install one');
  process.exit(2);
}

// What the tree carried before this build, so `--check` can say whether the build changed it.
const SRC_DIR = path.join(ROOT, 'editions', 'tw5-syntax', 'src');
const OUT_DIR = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers');
const before = Object.fromEntries(fs.readdirSync(SRC_DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => f.replace(/\.ts$/, '.js'))
  .map((f) => [f, fs.existsSync(path.join(OUT_DIR, f)) ? fs.readFileSync(path.join(OUT_DIR, f), 'utf8') : null]));

try {
  execFileSync(tsc, ['-p', PROJECT], { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}

// A tiddler the host cannot read never runs as a module, and a boot reports nothing about it.
//
// Every source compiles, so every source gets checked. Naming one by hand checked the one somebody
// remembered: a second module arrived, compiled, and stood unverified beside it.
const SRC = SRC_DIR;
const TIDDLERS = OUT_DIR;
const sources = fs.readdirSync(SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

const headerOf = (text) => new RegExp('^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)', 'mg').exec(text);

const built = [];
for (const source of sources) {
  const emitted = path.join(TIDDLERS, source.replace(/\.ts$/, '.js'));
  if (!fs.existsSync(emitted)) {
    console.error(`  ${source} compiled to nothing the wiki would load — no ${path.basename(emitted)} stands`);
    process.exit(1);
  }
  const match = headerOf(fs.readFileSync(emitted, 'utf8'));
  if (!match) {
    console.error(`  ${path.basename(emitted)} carries no header TiddlyWiki can read, so the wiki would load nothing`);
    process.exit(1);
  }
  const fields = Object.fromEntries(match[1].split('\n').filter(Boolean)
    .map((line) => line.split(/:\s*/)).map(([k, ...v]) => [k, v.join(': ')]));
  built.push(`${path.basename(emitted)} → ${fields.title} (module-type: ${fields['module-type']})`);
}
// The weld. Nothing in continuous integration carries a TypeScript compiler — the one this build
// finds sits in a parent checkout — so nothing there can rebuild these modules and compare. A
// contributor editing the source and forgetting the build would ship the OLD module: the wiki loads
// it, the gates it carries run, and every reading comes back green from code nobody wrote.
//
// So the build records what it compiled FROM, and a gate recomputes that from the sources alone.
// Verifying wants no compiler; only rebuilding does.
const crypto = require('node:crypto');
const record = {
  compiler: (() => {
    try { return execFileSync(tsc, ['--version'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; }
  })(),
  sources: Object.fromEntries(sources.map((source) =>
    [source, crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, source))).digest('hex')]))
};
fs.writeFileSync(path.join(TIDDLERS, 'EditionBuild.tid'),
  ['title: $:/tw5-syntax/EditionBuild',
    'type: application/json',
    'tags: $:/tags/TW5Syntax/GrammarData',
    'caption: Edition build',
    'description: What the compiled modules answer to — harvested by the build, never hand-written',
    '', `${JSON.stringify(record, null, 4)}\n`].join('\n'));

// A compiler stands in this repository's own dependencies now, so continuous integration can rebuild
// and compare — a stronger reading than the weld, which answers only that nobody edited a source
// since the last build. Both stand: the weld wants no compiler, and this wants no trust.
if (check) {
  const moved = Object.entries(before)
    .filter(([name, text]) => text !== fs.readFileSync(path.join(TIDDLERS, name), 'utf8'))
    .map(([name]) => name);
  if (moved.length) {
    console.error(`  ${moved.length} module(s) the build wrote differently: ${moved.join(', ')}`);
    console.error('  the tree carries what an older build left — commit what this one wrote');
    process.exit(1);
  }
}

console.log(`edition-build  ${built.length} module(s) from ${record.compiler}${check ? ', the tree current' : ''}`);
for (const line of built) console.log(`  ${line}`);
