#!/usr/bin/env node
// One grammar, two engines, and a host that swallows what either refuses.
//
// vscode-textmate raises nothing when Oniguruma declines a pattern. The rule simply never matches:
// the corpus reaches fewer scopes, the snapshots record the reduced reading as correct, and every
// gate in this repository passes on it. Probed directly, the WASM engine takes `(?<unclosed`, `(`,
// `*bad` and `[z-a]` without a word — the swallow sits BELOW the API, so no reading of that engine
// finds a dead pattern, and a second engine has to answer.
//
// The second engine answers a question the first cannot reach as well. This grammar runs wherever
// a reader meets it, and a documentation site rendering through Shiki translates every pattern to
// JavaScript first. A construct one engine implements and the other emulates differently colours
// differently there — silently, for a reader who runs no gate and files no issue. That reader has
// no other advocate in this repository.
//
// NEITHER ENGINE HOLDS AUTHORITY. The gate reports the DIFFERENCE. Treating the WASM build as
// correct would encode its quirks as law, and treating the translation as correct would encode a
// translator's coverage as the language.
//
//   node tools/engine-witness.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./tokenizer.js');

const verbose = process.argv.includes('--verbose');
const LEDGER = path.join(ROOT, 'corpus', 'engine-ledger.txt');

/** Every grammar the manifest ships, by the path it declares. */
function grammars() {
  const manifest = require(path.join(ROOT, 'package.json')).contributes ?? {};
  return (manifest.grammars ?? [])
    .map((g) => path.resolve(ROOT, g.path))
    .filter((file) => fs.existsSync(file));
}

/** A refusal this repository has looked at, and what it ruled. */
function ledger() {
  if (!fs.existsSync(LEDGER)) return [];
  const entries = [];
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const [body, ...rest] = line.split('#');
    const key = body.trim();
    if (!key) continue;
    entries.push({ key, reason: rest.join('#').trim() });
  }
  return entries;
}

(async () => {
  const { toRegExp } = await import('oniguruma-to-es');
  const rulings = ledger();
  const files = grammars();
  const refused = [];
  let patterns = 0;

  for (const file of files) {
    const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
    const walk = (node) => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (!node || typeof node !== 'object') return;
      for (const key of ['begin', 'end', 'match', 'while']) {
        if (typeof node[key] !== 'string') continue;
        patterns += 1;
        try {
          toRegExp(node[key]);
        } catch (e) {
          refused.push({
            file: path.basename(file),
            key,
            name: node.name || node.contentName || '(unnamed)',
            pattern: node[key],
            why: e.message.split('\n')[0].slice(0, 80)
          });
        }
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(grammar);
  }

  const unruled = refused.filter((r) => !rulings.some((l) => r.why.includes(l.key) || r.pattern.includes(l.key)));
  const idle = rulings.filter((l) => !refused.some((r) => r.why.includes(l.key) || r.pattern.includes(l.key)));

  if (verbose) {
    for (const r of refused) console.log(`  ${r.file}  ${r.name.slice(0, 40)}\n     ${r.why}\n     ${JSON.stringify(r.pattern.slice(0, 70))}`);
  }
  for (const r of unruled) {
    console.error(`  ${r.file} carries a ${r.key} the second engine refuses: ${r.why}`);
    console.error(`     ${r.name}  ${JSON.stringify(r.pattern.slice(0, 70))}`);
  }
  for (const l of idle) {
    console.error(`  the ledger rules ${JSON.stringify(l.key)}, and no pattern reads that way any more — a ruling that explains nothing`);
  }
  console.log(`engine-witness  ${patterns} pattern(s) across ${files.length} grammar(s), `
    + `${refused.length} refused by the second engine, ${unruled.length} unruled, ${idle.length} ruling(s) explaining nothing`);
  process.exit(unruled.length === 0 && idle.length === 0 ? 0 : 1);
})();
