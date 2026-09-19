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
// A COMPILE IS NOT AN AGREEMENT. Two engines can each accept a pattern and still find different matches
// in it, and a reader on a documentation site then meets the same construct coloured two ways. The
// behavioural arm asks a bounded question: given a line the corpus really carries, read from its start, do
// the two engines find the same match at the same place. A tokenizer asks from a moving position with a
// rule stack behind it, so agreement here reads as necessary rather than sufficient — and a disagreement
// stands real either way.
//
//   node tools/engine-witness.js [--verbose]
//   node tools/engine-witness.js --behaviour    what the two engines MATCH, over the corpus's own lines

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./tokenizer.js');

const verbose = process.argv.includes('--verbose');
const behaviour = process.argv.includes('--behaviour');
const mustFail = process.argv.includes('--must-fail');
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
    const reason = rest.join('#').trim();
    // A COMPILE REFUSAL AND A BEHAVIOURAL SPLIT ANSWER TO DIFFERENT RUNS. The plain arm asks
    // whether a PATTERN survives translation at all; the `--behaviour` arm asks whether a line the
    // corpus carries reads the same once it does. A ruling entry that only ever explains the second
    // question would sit IDLE in the first run forever, so a reason opening `BEHAVIOUR —` marks it
    // for the behavioural arm alone, the way a `READER <version>` prefix keys a divergence to one
    // TW5_PATH elsewhere in this repository.
    const behaviourOnly = /^BEHAVIOUR\s*[—-]/.test(reason);
    entries.push({ key, reason, behaviourOnly });
  }
  return entries;
}

/** Every distinct non-blank line the corpus carries, which is the only string set neither engine chose. */
function corpusLines() {
  const seen = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.(tw|mem|tid|multids|meta)$/.test(entry.name)) continue;
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const text = line.replace(/\s+$/, '');
        if (text.trim()) seen.add(text);
      }
    }
  };
  walk(path.join(ROOT, 'corpus'));
  return [...seen];
}

/** Every pattern the grammars carry, with where it stands. */
function patternsOf(files) {
  const out = [];
  for (const file of files) {
    const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
    const walk = (node) => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (!node || typeof node !== 'object') return;
      for (const key of ['begin', 'end', 'match', 'while']) {
        if (typeof node[key] === 'string') {
          out.push({ file: path.basename(file), key, name: node.name || node.contentName || '(unnamed)', pattern: node[key] });
        }
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(grammar);
  }
  return out;
}

(async () => {
  const { toRegExp } = await import('oniguruma-to-es');
  const rulings = ledger();
  const files = grammars();

  if (behaviour) {
    const oniguruma = require('vscode-oniguruma');
    await oniguruma.loadWASM(fs.readFileSync(path.join(ROOT, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')));
    const lines = corpusLines();
    const all = patternsOf(files);
    const parted = [];
    let read = 0;
    // A ZERO THAT CANNOT MOVE PROVES NOTHING, and no genuine divergence stands to prove this comparator
    // sees one: thirteen candidates drawn from the known differences between Oniguruma and JavaScript —
    // `\h`, POSIX brackets, possessive quantifiers, inline flags, `\X`, `\G`, character-class
    // intersection — all read alike, because the translation is faithful. So the arm MISPAIRS instead,
    // reading each pattern's translation against the NEXT pattern's Oniguruma answer. A count that
    // survives that measures nothing at all.
    all.forEach((entry, i) => { entry.against = all[(i + 1) % all.length].pattern; });
    for (const entry of all) {
      let translated;
      let scanner;
      try { translated = toRegExp(entry.pattern); } catch { continue; }
      try { scanner = new oniguruma.OnigScanner([mustFail ? entry.against : entry.pattern]); } catch { continue; }
      read += 1;
      for (const line of lines) {
        let onig = null;
        try { onig = scanner.findNextMatchSync(line, 0); } catch { continue; }
        let js = null;
        try { translated.lastIndex = 0; js = translated.exec(line); } catch { continue; }
        const a = onig ? `${onig.captureIndices[0].start}..${onig.captureIndices[0].end}` : '-';
        const b = js ? `${js.index}..${js.index + js[0].length}` : '-';
        if (a === b) continue;
        parted.push({ ...entry, line, onig: a, js: b });
        break;
      }
    }
    const unruled = parted.filter((r) => !rulings.some((l) => r.pattern.includes(l.key)));
    for (const r of unruled.slice(0, verbose ? 20 : 6)) {
      console.error(`  the two engines read ${r.key} differently: ${r.name.slice(0, 46)}`);
      console.error(`     ${JSON.stringify(r.pattern.slice(0, 64))}`);
      console.error(`     oniguruma ${r.onig}, translated ${r.js}, on ${JSON.stringify(r.line.slice(0, 52))}`);
    }
    console.log(`engine-witness  ${read} pattern(s) read against ${lines.length} corpus line(s), `
      + `${parted.length} that match differently, ${mustFail ? 'mispaired' : `${unruled.length} unruled`}`);
    process.exitCode = mustFail || !unruled.length ? 0 : 1;
    return;
  }

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

  // A `BEHAVIOUR —` ruling answers only the behavioural arm above, so this arm neither reaches for
  // it to explain a refusal nor reports it idle when nothing here refuses.
  const compileRulings = rulings.filter((l) => !l.behaviourOnly);
  const unruled = refused.filter((r) => !compileRulings.some((l) => r.why.includes(l.key) || r.pattern.includes(l.key)));
  const idle = compileRulings.filter((l) => !refused.some((r) => r.why.includes(l.key) || r.pattern.includes(l.key)));

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
  process.exitCode = unruled.length === 0 && idle.length === 0 ? 0 : 1;
  return;
})();
