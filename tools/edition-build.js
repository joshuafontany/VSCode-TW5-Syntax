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

const tsc = resolveCompiler();
if (!tsc) {
  console.error('  no TypeScript compiler stands where this looked — set TSC_PATH, or install one');
  process.exit(2);
}

try {
  execFileSync(tsc, ['-p', PROJECT], { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}

// A tiddler the host cannot read never runs as a module, and a boot reports nothing about it.
const emitted = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'grammar-signals.js');
const header = new RegExp('^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)', 'mg');
const text = fs.readFileSync(emitted, 'utf8');
const match = header.exec(text);
if (!match) {
  console.error('  the compiled module carries no header TiddlyWiki can read, so the wiki would load nothing');
  process.exit(1);
}
const fields = Object.fromEntries(match[1].split('\n').filter(Boolean)
  .map((line) => line.split(/:\s*/)).map(([k, ...v]) => [k, v.join(': ')]));
console.log(`edition-build  ${path.basename(emitted)} → ${fields.title} (module-type: ${fields['module-type']})`);
