#!/usr/bin/env node
// What a half-typed construct costs the tokenizer.
//
// A grammar meets unfinished input on every keystroke, and a pattern that reads cheaply on a
// finished construct can read expensively on an unfinished one. A lazy quantifier nested inside a
// repeating group brings that on: each repetition offers the engine another place to
// split, and a failing match walks all of them.
//
// Measured on the style block, whose declaration list carried that shape: six declarations with
// no closing newline cost a tenth of a millisecond, twelve cost nineteen, and sixty cost a
// hundred and thirty — the engine's own backtrack limit, reached rather than exceeded. A
// declaration reading property, colon, value, semicolon offers no split and stays flat.
//
// This walks every pattern in every grammar against unfinished input at growing sizes and reports
// any whose cost climbs with length. The threshold names a stall a reader would feel.
//
// One rule stands measured and unchanged. The filter operator reads an operator name, an optional
// suffix after a colon and an operand in brackets, with three lazy quantifiers among them, and
// against an unclosed bracket followed by colon-dense text the engine walks the splits they
// offer. The surface stands narrow: a plain unclosed link, which an author types constantly,
// costs six microseconds, and the same bracket with three colon-separated segments costs eleven.
// Cost climbs past sixty segments — around two hundred and fifty characters of colon-dense text
// inside a bracket nobody closed — reaching ten milliseconds, and ninety past a hundred and
// twenty. That shape arrives by pasting rather than by typing.
//
// One cure ran and reverted. Making those quantifiers greedy matches the same text in principle,
// since each class already excludes its delimiter; measured, it moved three snapshots, failed an
// assertion and cost the corpus two scopes. That rule reaches further than its own line.
//
//   node tools/backtrack-witness.js [--verbose]

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
// Sizes a reader reaches while typing. Past this a line stops reading as one somebody wrote and
// becomes one somebody pasted, and every pattern here reads a pasted line more slowly than a
// typed one without that costing anybody a keystroke.
const SIZES = [8, 32];
// A stall a reader feels, per pattern, on one line. `--budget=<ms>` lowers it, for a reader chasing
// a pattern that costs more than its neighbours and for the collision that proves this gate can
// fail — Oniguruma's optimizer refuses every classic catastrophic shape at these sizes, so a
// provocation through the grammar proves nothing here.
const BUDGET_MS = Number((process.argv.find((a) => a.startsWith('--budget=')) || '').slice(9)) || 8;

// A wall-clock budget alone answers to the machine. Run beside a dozen other gates, the whole set
// slows together and the slowest pattern crosses eight milliseconds having done nothing different —
// measured, a run alone read 1.4ms where the same run under the suite read past 8. So a pattern
// stalls only when it costs more than the budget AND more than this many times a CONTROL pattern
// timed the same way, on the same inputs, under the same load. `--ratio=<n>` lowers it, so the
// collision below can drive the reading rather than the machine.
const BUDGET_RATIO = Number((process.argv.find((a) => a.startsWith('--ratio=')) || '').slice(8)) || 20;
const CONTROL = 'x';

// The openers this format writes. A pattern answers to every one of them, because deriving an
// opener from a pattern's own characters reads its REGEX punctuation rather than the text it
// matches — a witness built that way met the style rule with an open paren and a pipe and never
// engaged it at all.
const OPENERS = ['@@', '<<', '[[', '{{', '{{{', '<$x ', '|', '*', '#', '"""', '```', '`', '\\\\define d() ', '<!--', ';', '!', '>'];
// Filler offering a repeating group somewhere to split.
const FILLERS = ['a:b;', '.c', 'x ', 'a=b ', '<<m>>'];

/** Unfinished input: an opener this format writes, a repeating body, and no close. */
function specimens() {
  const out = [];
  for (const opener of OPENERS) for (const filler of FILLERS) for (const n of SIZES) {
    out.push([n, `${opener}${filler.repeat(n)}X`]);
  }
  return out;
}

exports.specimens = specimens;
exports.BUDGET_MS = BUDGET_MS;

if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  (async () => {
    const oniguruma = require(path.join(ROOT, 'node_modules', 'vscode-oniguruma'));
    await oniguruma.loadWASM(fs.readFileSync(path.join(ROOT, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')).buffer);

    const patterns = new Set();
    for (const file of fs.readdirSync(path.join(ROOT, 'syntaxes')).filter((f) => f.endsWith('.json'))) {
      const grammar = JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', file), 'utf8'));
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        for (const key of ['match', 'begin', 'end', 'while']) if (typeof node[key] === 'string') patterns.add(node[key]);
        for (const key of Object.keys(node)) walk(node[key]);
      };
      walk(grammar);
    }

    const CASES = specimens();

    // The control, timed the way every pattern below gets timed. It matches at once, so what it
    // costs names the run's own overhead rather than any pattern's work.
    const time = (scanner, text) => {
      scanner.findNextMatchSync(new oniguruma.OnigString(text), 0);
      const started = process.hrtime.bigint();
      for (let i = 0; i < 5; i += 1) scanner.findNextMatchSync(new oniguruma.OnigString(text), 0);
      return Number(process.hrtime.bigint() - started) / 1e6 / 5;
    };
    const control = new oniguruma.OnigScanner([CONTROL]);
    const baseline = Math.max(...CASES.map(([, text]) => time(control, text)));

    let worst = 0;
    const slow = [];
    for (const pattern of patterns) {
      let scanner;
      try { scanner = new oniguruma.OnigScanner([pattern]); } catch { continue; }
      for (const [size, text] of CASES) {
        const ms = time(scanner, text);
        if (ms > worst) worst = ms;
        if (ms > BUDGET_MS && ms > baseline * BUDGET_RATIO) {
          slow.push(`${ms.toFixed(1)}ms  (${(ms / baseline).toFixed(0)}x the control)  on ${JSON.stringify(text.slice(0, 26))}...  pattern ${pattern.slice(0, 48)}`);
        }
      }
    }
    console.log(`backtrack-witness  ${patterns.size} pattern(s), worst ${worst.toFixed(3)}ms against a budget of ${BUDGET_MS}ms`
      + ` and ${BUDGET_RATIO}x a control reading ${baseline.toFixed(3)}ms`);
    console.log(`  ${slow.length}  pattern(s) a reader would feel stall on unfinished input`);
    if (verbose) for (const s of [...new Set(slow)].slice(0, 10)) console.log(`     ${s}`);
    process.exit(slow.length ? 1 : 0);
  })();
}
