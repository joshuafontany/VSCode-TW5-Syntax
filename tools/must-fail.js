#!/usr/bin/env node
// Specimens written to fail, and the degradation each one still produces.
//
// A malformed specimen stands exempt from the gates that measure well-formed text: it bleeds on
// purpose, so a containment check would refuse it forever. That exemption costs nothing while the
// specimen degrades — and the day the grammar improves past it, the specimen reads clean, keeps
// its exemption, and every gate agrees that nothing stands wrong. A control stops controlling and
// reports it in green.
//
// So the exemption carries a declaration and the declaration gets measured, in both directions: a
// specimen nobody declared, and a declaration naming no specimen.
//
// HELD APART FROM THE DIVERGENCE LEDGERS. Those record what this grammar CANNOT YET read; this
// records what it MUST NOT read. A list fusing both senses grows unreadable, and its entries then
// differ only by whoever remembers which kind they meant.
//
//   node tools/must-fail.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { walkMatching } = require('./walk.js');

const verbose = process.argv.includes('--verbose');
const DECLARATION = path.join(ROOT, 'corpus', 'must-fail.txt');
const SENTINEL = 'The corpus sentinel stands plainly at the end.';
const SCOPE = { '.tw': 'text.html.tiddlywiki5', '.mem': 'text.html.tiddlywiki5.memetic-wikitext' };

/** Every specimen the corpus marks malformed by name. */
function marked() {
  return walkMatching(path.join(ROOT, 'corpus'), (name) => /^degenerate\./.test(name));
}

function declarations() {
  const out = [];
  for (const raw of fs.readFileSync(DECLARATION, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [name, degradation] = line.split('#')[0].trim().split(/\s+/);
    if (name && degradation) out.push({ name, degradation });
  }
  return out;
}

/** What the specimen does to a sentence standing after it, and what it names inside itself. */
async function degradationOf(file) {
  const scope = SCOPE[path.extname(file)];
  if (!scope) return null;
  const text = `${fs.readFileSync(file, 'utf8').replace(/\s*$/, '')}\n\n${SENTINEL}\n`;
  const lines = await tokenize(scope, text);
  const at = text.split('\n').indexOf(SENTINEL);
  const carried = (lines[at] ?? []).flatMap((t) => t.scopes)
    .filter((s) => !/^(text\.html|source\.)/.test(s) && !/paragraph/.test(s));
  const verdicts = lines.flat().flatMap((t) => t.scopes).filter((s) => s.startsWith('invalid.'));
  return { bleeds: carried.length > 0, verdict: verdicts.length > 0, carried, verdicts };
}

(async () => {
  const declared = declarations();
  const specimens = marked();
  const failures = [];

  for (const file of specimens) {
    if (!declared.some((d) => d.name === path.basename(file))) {
      failures.push(`  ${path.basename(file)} carries the malformed name and no declaration, so its exemption asserts nothing`);
    }
  }
  for (const { name, degradation } of declared) {
    const file = specimens.find((f) => path.basename(f) === name);
    if (!file) {
      failures.push(`  the declaration names ${name}, and no specimen by that name stands in the corpus`);
      continue;
    }
    const measured = await degradationOf(file);
    if (!measured) { failures.push(`  ${name} opens under no grammar this gate reads`); continue; }
    if (!measured[degradation]) {
      failures.push(`  ${name} declares ${degradation} and no longer produces one — a control that stopped controlling`);
    } else if (verbose) {
      console.log(`  ${name.padEnd(28)} ${degradation}: ${(measured.carried[0] ?? measured.verdicts[0] ?? '').slice(0, 56)}`);
    }
  }

  for (const f of failures) console.error(f);
  console.log(`must-fail  ${specimens.length} specimen(s), ${declared.length} declaration(s), ${failures.length} that assert nothing`);
  process.exitCode = failures.length === 0 ? 0 : 1;
  return;
})();
