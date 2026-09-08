#!/usr/bin/env node
// Does the base hold still?
//
// A full pass over ground the corpus does not hold surfaces divergences between the two readers.
// The answer turns on KIND rather than count: an instance of a class the ledgers already name says
// the base held and the ground merely widened, while a class nobody has named says the base still
// moves. That distinction decides when healing yields the priority to designing, so it answers to
// a measurement rather than to a count of quiet weeks.
//
// ⚠ THE CONDITION CAN BE MET BY RULING GENEROUSLY. Widen a ledger key far enough and every finding
// falls inside it, which reads identical from outside to a base that settled. So a key's REACH
// gets gated beside its entries: a ruling may gain entries and may not gain breadth. The check
// reads what the last commit held, since breadth names a change rather than a state.
//
//   node tools/still.js --over <dir> [--sample N] [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { parseTid } = require('./wiki-data.js');

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const over = argv[argv.indexOf('--over') + 1];
const sample = Number(argv[argv.indexOf('--sample') + 1] || 40);
if (!over || !fs.existsSync(over)) {
  console.error('still: name the ground to pass over — node tools/still.js --over <dir> [--sample N]');
  process.exit(2);
}

const SENTINEL = '<<<\nQuoted\n<<<\n';
const READINGS = {
  '.tw': { scope: 'text.html.tiddlywiki5' },
  '.mem': { scope: 'text.html.tiddlywiki5.memetic-wikitext' },
  '.tid': { scope: 'source.tiddlywiki5.tid-file', body: (t) => parseTid(t).body }
};
const LEDGERS = ['swallow-ledger.txt', 'engine-ledger.txt', 'carrier-ledger.txt'];

/** Every ruling key the ledgers name, as matchers. */
function named() {
  const keys = [];
  for (const file of LEDGERS) {
    const p = path.join(ROOT, 'corpus', file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
      const line = raw.replace(/^\s+/, '');
      if (!line || line.startsWith('#')) continue;
      const body = line.split('#')[0].trim().split(/\s+/);
      const key = body.length > 1 ? body[1] : body[0];
      if (key) keys.push(key);
    }
  }
  return keys.map((k) => ({
    key: k,
    re: new RegExp(`^${k.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
  }));
}

/** How far a key reaches: a key with more wildcard and fewer literal segments reaches further. */
const reach = (key) => key.split('*').length * 100 - key.replace(/\*/g, '').split('.').filter(Boolean).length;

function carriers(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (/^(node_modules|\.git|\.worktrees|attic)$/.test(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (READINGS[path.extname(e.name)] && !/degenerate\./.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

const oracle = boot(resolveTiddlyWiki(), {});

(async () => {
  // ── a ruling may gain entries and may not gain breadth ────────────────────────────────────
  const broadened = [];
  for (const file of LEDGERS) {
    const p = path.join('corpus', file);
    let was;
    // A ledger with no HEAD yet has no breadth to have gained.
    try { was = execFileSync('git', ['show', `HEAD:${p}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { continue; }
    const keysOf = (text) => text.split('\n')
      .map((l) => l.replace(/^\s+/, '')).filter((l) => l && !l.startsWith('#'))
      .map((l) => { const b = l.split('#')[0].trim().split(/\s+/); return b.length > 1 ? [b[0], b[1]] : [b[0], b[0]]; });
    const before = new Map(keysOf(was).map(([d, k]) => [d, k]));
    for (const [direction, key] of keysOf(fs.readFileSync(path.join(ROOT, p), 'utf8'))) {
      const old = before.get(direction);
      if (old && reach(key) > reach(old)) broadened.push(`${file}: ${JSON.stringify(old)} -> ${JSON.stringify(key)}`);
    }
  }

  const rulings = named();
  const files = carriers(over);
  const step = Math.max(1, Math.floor(files.length / sample));
  const chosen = files.filter((_, i) => i % step === 0).slice(0, sample);

  const classes = new Map();
  let divergences = 0;
  for (const file of chosen) {
    const reading = READINGS[path.extname(file)];
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    if (/^\\rules /m.test(text) || lines.length > 400) continue;
    for (let cut = 1; cut <= lines.length; cut += 1) {
      const head = lines.slice(0, cut).join('\n').replace(/\n+$/, '');
      if (!head.trim()) continue;
      const specimen = `${head}\n\n${SENTINEL}`;
      const read = reading.body ? reading.body(specimen) : specimen;
      const at = read.lastIndexOf(SENTINEL);
      const line = specimen.split('\n').length - 4;
      if (at < 0) continue;
      const tokens = await tokenize(reading.scope, specimen);
      const parser = flatten(oracle.parse(read).tree).some((n) => n.rule === 'quoteblock' && n.start === at);
      const grammar = (tokens[line] ?? [])
        .some((t) => t.scopes.some((s) => s.startsWith('punctuation.definition.markup.quote.quoteblock.begin')));
      if (parser === grammar) continue;
      divergences += 1;
      const scopes = (tokens[line] ?? []).flatMap((t) => t.scopes)
        .filter((s) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(s) && !/quoteblock/.test(s));
      const key = parser
        ? (scopes.find((s) => /^(meta|comment|source|string)\./.test(s)) || scopes[0] || '(bare text)')
        : (() => {
          const covering = flatten(oracle.parse(read).tree)
            .filter((n) => typeof n.start === 'number' && n.start <= at && n.end >= at && n.rule);
          return covering.length ? covering[covering.length - 1].rule : '(nothing)';
        })();
      const id = `${parser ? 'runaway' : 'overbound'} ${key}`;
      if (!classes.has(id)) classes.set(id, { hits: 0, file: path.basename(file), cut });
      classes.get(id).hits += 1;
    }
  }

  const unnamed = [...classes].filter(([id]) => !rulings.some((r) => r.re.test(id.split(' ').slice(1).join(' '))));
  if (verbose) {
    for (const [id, seen] of [...classes].sort((a, b) => b[1].hits - a[1].hits)) {
      const known = rulings.some((r) => r.re.test(id.split(' ').slice(1).join(' ')));
      console.log(`  ${known ? 'named by a ledger' : 'UNNAMED         '}  ${String(seen.hits).padStart(4)}x  ${id}`);
    }
  }
  for (const b of broadened) console.error(`  a ruling key broadened and now reaches further: ${b}`);
  for (const [id, seen] of unnamed) {
    console.error(`  ${JSON.stringify(id)} names a class no ledger holds — the base still moves`);
    console.error(`     ${seen.file}:${seen.cut}  (${seen.hits} cut(s))`);
  }
  console.log(`still  ${chosen.length} carrier(s), ${divergences} divergence(s) across ${classes.size} class(es), `
    + `${unnamed.length} unnamed, ${broadened.length} ruling(s) broadened`);
  process.exit(unnamed.length === 0 && broadened.length === 0 ? 0 : 1);
})();
