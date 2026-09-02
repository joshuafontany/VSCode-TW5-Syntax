#!/usr/bin/env node
// What the installed TiddlyWiki knows, harvested into the repo.
//
// A grammar carries lists it cannot derive — which filter operators exist, which widgets the core
// ships, which wikitext rules stand. Each goes stale on the release that adds to it, and a grammar
// notices nothing: a new operator simply reads as an unknown word.
//
// The host already knows. Booting the edition against a TiddlyWiki runs a startup module that
// reads `$tw.modules.types` and writes the answer into a tiddler; this saves that tiddler to the
// repo. A later boot against a newer TiddlyWiki writes a different answer, and `--check` reports
// the difference, so a version bump reaches the grammar as a failing gate rather than as a gap.
//
// HARVEST, NOT JUDGEMENT. What lands here comes from the host and no hand edits it. The built-in
// variable list answers a different question — which names does the core OWN — that no registry
// answers, so it lives beside this as a tiddler an operator argues over. The two look alike and
// fail differently: a harvest goes stale on a version, a judgement when the world moves.
//
//   node tools/grammar-signals.js [--check]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EDITION = path.join(ROOT, 'editions', 'tw5-syntax');
const HARVEST = path.join(EDITION, 'tiddlers', 'GrammarSignals.tid');
const check = process.argv.includes('--check');

// The oracle already resolves the TiddlyWiki this repo answers to, and a second resolver here
// would answer differently the day either one learns something.
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const host = resolveTiddlyWiki();
if (!host || !fs.existsSync(path.join(host, 'tiddlywiki.js'))) {
  console.error('  no TiddlyWiki stands where this looked — set TW5_PATH');
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'grammar-signals-'));
let harvested;
try {
  execFileSync('node', [path.join(host, 'tiddlywiki.js'), EDITION,
    '--output', scratch, '--rendertiddler', '$:/tw5-syntax/GrammarSignals', 'signals.json', 'text/plain'],
    { cwd: ROOT, stdio: 'ignore' });
  harvested = fs.readFileSync(path.join(scratch, 'signals.json'), 'utf8');
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

if (!harvested.trim()) {
  console.error('  the boot produced no signals — the startup module ran too late, or not at all');
  process.exit(2);
}
const signals = JSON.parse(harvested);
const counts = `${signals.filterOperators.length} operator(s), ${signals.widgets.length} widget(s), `
  + `${signals.wikiRules.length} rule(s)`;

const tid = `title: $:/tw5-syntax/GrammarSignals\n`
  + `type: application/json\n`
  + `tags: $:/tags/TW5Syntax/GrammarData\n`
  + `caption: Grammar signals\n`
  + `description: What TiddlyWiki ${signals.version} knows — harvested by a boot, never hand-written\n`
  + `tw5-version: ${signals.version}\n`
  + `\n${JSON.stringify(signals, null, 4)}\n`;

const standing = fs.existsSync(HARVEST) ? fs.readFileSync(HARVEST, 'utf8') : null;
if (standing === tid) {
  console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, the harvest current`);
  process.exit(0);
}
if (check) {
  const was = standing && /^tw5-version: (.*)$/m.exec(standing);
  console.error(`  the harvest differs from the TiddlyWiki this repo boots against`);
  console.error(`     standing: ${was ? was[1] : 'no harvest at all'}`);
  console.error(`     booted:   ${signals.version} — ${counts}`);
  console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, the harvest DRIFTED`);
  process.exit(1);
}
fs.writeFileSync(HARVEST, tid);
console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, the harvest written`);
