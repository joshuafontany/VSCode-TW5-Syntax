#!/usr/bin/env node
// Every path the manifest names must stand inside the package a user installs.
//
// Each other gate here reads the source tree, where a file the package excludes still
// resolves. This one builds the .vsix and looks inside it, so a manifest entry pointing at
// an excluded file fails here and nowhere else.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const c = manifest.contributes ?? {};

// The paths the manifest promises, by the field that promises them.
const promised = [];
const claim = (p, from) => { if (p) promised.push({ path: p.replace(/^\.\//, ''), from }); };
for (const g of c.grammars ?? []) claim(g.path, `grammars[${g.scopeName}]`);
for (const l of c.languages ?? []) claim(l.configuration, `languages[${l.id}].configuration`);
for (const s of c.snippets ?? []) claim(s.path, `snippets[${s.language}]`);
claim(manifest.icon, 'icon');
claim(manifest.main, 'main');

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-pkg-'));
const vsix = path.join(scratch, 'probe.vsix');
execFileSync('npx', ['--yes', '@vscode/vsce', 'package', '--allow-missing-repository', '--out', vsix], {
  stdio: ['ignore', 'ignore', 'inherit']
});
const listing = execFileSync('unzip', ['-Z1', vsix], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((f) => f.replace(/^extension\//, ''));
const inside = new Set(listing);

const missing = promised.filter((p) => !inside.has(p.path));
fs.rmSync(scratch, { recursive: true, force: true });

console.log(`package-contents  ${listing.length} files packaged, ${promised.length} manifest paths checked`);
for (const m of missing) console.error(`  MISSING  ${m.path}\n           promised by ${m.from}`);
if (missing.length) {
  console.error(`\n  the manifest names ${missing.length} path(s) the package does not carry`);
  process.exit(1);
}
