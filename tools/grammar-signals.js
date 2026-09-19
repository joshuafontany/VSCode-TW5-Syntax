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

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runNode } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const EDITION = path.join(ROOT, 'editions', 'tw5-syntax');
const HARVEST = path.join(EDITION, 'tiddlers', 'GrammarSignals.tid');
const check = process.argv.includes('--check');

// The oracle already resolves the TiddlyWiki this repo answers to, and a second resolver here
// would answer differently the day either one learns something.
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

// KEYED ON THE READER, generalizing the same reason-prefix shape the ledgers carry (tools/reader-
// scope.js) onto a harvest rather than a ruling. `GrammarSignals.tid` stays the shipped tiddler —
// the edition's own build reads exactly this file, and every other gate that reads it (rule-
// coverage.js, filter-witness.js, construct-legibility.js, light-cone.js) keeps answering to
// whichever reader wrote it, unaffected. A reader whose version does not match that file's own
// `tw5-version` field gets a PEER snapshot instead — corpus/reader-signals/<version>.json — so
// `--check` compares each reader against ITS OWN baseline and neither fails nor reads stale under
// the other. Two readers exist here: this repository's own fork (local development, TW5_PATH) and
// the pinned `tiddlywiki` devDependency (CI); `GrammarSignals.tid` answers for whichever booted
// when someone last ran `signals` with no `--check`, and a peer file answers for the rest.
const PEER_DIR = path.join(ROOT, 'corpus', 'reader-signals');
const sanitizeVersion = (v) => v.replace(/[^A-Za-z0-9.+-]/g, '_');
const primaryVersion = (() => {
  if (!fs.existsSync(HARVEST)) return null;
  const m = /^tw5-version:\s*(.+)$/m.exec(fs.readFileSync(HARVEST, 'utf8'));
  return m ? m[1].trim() : null;
})();

const host = resolveTiddlyWiki();
if (!host || !fs.existsSync(path.join(host, 'tiddlywiki.js'))) {
  console.error('  no TiddlyWiki stands where this looked — set TW5_PATH');
  process.exitCode = 2;
  return;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'grammar-signals-'));
let harvested;
try {
  const { code, out } = runNode([path.join(host, 'tiddlywiki.js'), EDITION,
    '--output', scratch, '--rendertiddler', '$:/tw5-syntax/GrammarSignals', 'signals.json', 'text/plain']);
  if (code !== 0) {
    console.error(`  the boot refused, so nothing below stands:\n${out}`);
    process.exitCode = 2;
    return;
  }
  harvested = fs.readFileSync(path.join(scratch, 'signals.json'), 'utf8');
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

if (!harvested.trim()) {
  console.error('  the boot produced no signals — the startup module ran too late, or not at all');
  process.exitCode = 2;
  return;
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

// The PRIMARY reader's own file, unchanged in shape — the edition ships exactly this tiddler, and
// every other gate reading it keeps answering to whichever reader wrote it.
const isPrimary = primaryVersion === null || signals.version === primaryVersion;
const target = isPrimary ? HARVEST : path.join(PEER_DIR, `${sanitizeVersion(signals.version)}.json`);
const rendered = isPrimary ? tid : `${JSON.stringify(signals, null, 4)}\n`;
const label = isPrimary ? 'the harvest' : `the peer harvest (${path.relative(ROOT, target)})`;

const standing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
if (standing === rendered) {
  console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, ${label} current`);
  process.exitCode = 0;
  return;
}
if (check) {
  console.error(`  ${label} differs from the TiddlyWiki this run booted against`);
  console.error(`     standing: ${standing ? 'a different harvest' : 'no harvest at all'}`);
  console.error(`     booted:   ${signals.version} — ${counts}`);
  console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, ${label} DRIFTED`);
  process.exitCode = 1;
  return;
}
if (!isPrimary) fs.mkdirSync(PEER_DIR, { recursive: true });
fs.writeFileSync(target, rendered);
console.log(`grammar-signals  TiddlyWiki ${signals.version} — ${counts}, ${label} written`);
