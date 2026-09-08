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
const { kindOf, KINDS } = require('./region-kind.js');

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const over = argv[argv.indexOf('--over') + 1];
const sampleAt = argv.indexOf('--sample');
const sample = sampleAt >= 0 ? Number(argv[sampleAt + 1]) : 40;
const seedAt = argv.indexOf('--seed');
const seed = seedAt >= 0 ? Number(argv[seedAt + 1]) : 1;
// A caller reading one measurement off this asks for it by name. Only a RUN wants ground to sweep.
if (require.main === module && (!over || !fs.existsSync(over))) {
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


/** A key as a matcher, so one spelling serves the ledger reader and the ground reader alike. */
const matcher = (key) => new RegExp(`^${key.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

// The ground a key stands on, read off THE CORPUS rather than the swept carriers. A ratchet answers
// to one number every run, and the sweep's own ground moves with `--over`, `--sample` and the seed.
const CORPUS = path.join(ROOT, 'corpus');
let corpusScopes = null;

/**
 * Every distinct scope STACK the corpus reaches, with the count of tokens wearing it.
 *
 * Stacks rather than scopes, because a token wears several at once: summing per scope counts one
 * token once per scope it carries, and a union over ten ruling keys then read 100.9% of a corpus.
 */
async function stackCounts() {
  if (corpusScopes) return corpusScopes;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (!/\.(txt|md)$/.test(e.name)) files.push(full);
    }
  })(CORPUS);
  const stacks = new Map();
  let total = 0;
  for (const file of files.sort()) {
    const reading = READINGS[path.extname(file)] ?? READINGS['.tw'];
    let lines;
    try { lines = await tokenize(reading.scope, fs.readFileSync(file, 'utf8')); } catch { continue; }
    for (const line of lines) for (const token of line) {
      total += 1;
      const key = [...new Set(token.scopes)].join(' ');
      stacks.set(key, (stacks.get(key) ?? 0) + 1);
    }
  }
  corpusScopes = { stacks, total };
  return corpusScopes;
}

/**
 * The share of corpus TOKENS a ruling key stands on.
 *
 * A key's breadth lives in the GROUND it claims, never in the punctuation of its name. Measured:
 * `meta.codeblock.*` carries a wildcard and stands on 3.5% of tokens; `meta.paragraph.tiddlywiki5`
 * carries none and stands on 18%. A reader scoring the spelling ranks those backwards, and a ruling
 * on the second passes as the narrower of the two.
 */
async function groundOf(key) {
  return shareOf([matcher(key)]);
}

/** The share of corpus tokens EVERY ruling stands on between them. */
async function ruledGround() {
  return shareOf(named().map((r) => r.re));
}

/** The share of corpus tokens whose stack carries a scope any of these matchers claims. */
async function shareOf(matchers) {
  const { stacks, total } = await stackCounts();
  if (!total) return 0;
  let hits = 0;
  for (const [stack, n] of stacks) {
    if (stack.split(' ').some((scope) => matchers.some((re) => re.test(scope)))) hits += n;
  }
  return hits / total;
}

// A ruling may gain entries and may never gain ground. The ceiling stands beside the other ratchets
// and carries its own reason; a ruling that needs more ground than this answers for it in writing.
/**
 * Whether a measured share stands above the ceiling, read at the precision the run REPORTS.
 *
 * A ratchet on a real number seated at a printed figure fails on the digits nobody printed: 55.8%
 * measured sits a fraction above 0.558 written down. One reading serves the run and every caller,
 * so a gate and its test cannot round two ways.
 */
const overCeiling = (share) => Number((100 * share).toFixed(1)) > Number((100 * GROUND_CEILING).toFixed(1));

const GROUND_CEILING = (() => {
  const p = path.join(ROOT, 'corpus', 'ruled-ground-ceiling.txt');
  return fs.existsSync(p) ? Number(fs.readFileSync(p, 'utf8').split('\n')[0]) : 1;
})();

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

module.exports = { groundOf, ruledGround, GROUND_CEILING, overCeiling, named, matcher, kindOf };

if (require.main !== module) return;

(async () => {
  // ── a ruling may gain entries and may not gain breadth ────────────────────────────────────
  const broadened = [];
  const migrated = [];
  for (const file of LEDGERS) {
    const p = path.join('corpus', file);
    let was;
    // A ledger with no HEAD yet has no breadth to have gained.
    try { was = execFileSync('git', ['show', `HEAD:${p}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { continue; }
    const keysOf = (text) => text.split('\n')
      .map((l) => l.replace(/^\s+/, '')).filter((l) => l && !l.startsWith('#'))
      .map((l) => { const b = l.split('#')[0].trim().split(/\s+/); return b.length > 1 ? [b[0], b[1]] : [b[0], b[0]]; });
    // The KEY carries the identity, so a direction alone cannot pair two rulings — two entries
    // sharing one direction would overwrite each other and the comparison would pair strangers.
    // A broadening reads as an old key gone, and a new key that MATCHES it and reaches further.
    const before = keysOf(was);
    const now = keysOf(fs.readFileSync(path.join(ROOT, p), 'utf8'));
    const nowKeys = new Set(now.map(([d, k]) => `${d} ${k}`));
    // A key that no longer speaks the kind vocabulary cannot be compared to one that does: the pair
    // records a MIGRATION rather than a widening, and reading it as widening would fail every run
    // that renames a vocabulary. Breadth still answers — the ground ceiling below weighs every key
    // together, migrated or not, and a migration that actually claims more ground crosses it.
    const kinds = new Set(KINDS.map(([key]) => key));
    for (const [direction, old] of before) {
      if (nowKeys.has(`${direction} ${old}`)) continue;
      for (const [d, key] of now) {
        if (d !== direction) continue;
        if (!matcher(key).test(old)) continue;
        if (kinds.has(key) && !kinds.has(old)) { migrated.push(`${file}: ${JSON.stringify(old)} -> ${JSON.stringify(key)}`); continue; }
        if (await groundOf(key) <= await groundOf(old)) continue;
        broadened.push(`${file}: ${JSON.stringify(old)} -> ${JSON.stringify(key)}`);
      }
    }
  }

  const rulings = named();
  // SHUFFLED, and deterministically so. Taking every Nth file walks directory order, which groups
  // carriers by bag and by whoever wrote them — a class living in one author's habits or one bag's
  // subject sits entirely outside such a sample and reads as absence. The seed keeps a finding
  // reproducible: the same seed walks the same carriers.
  const files = carriers(over);
  let state = seed;
  const roll = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const shuffled = files.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(roll() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, sample);

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
        ? kindOf(scopes)
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
  for (const m of migrated) console.log(`  a ruling key moved to the kind vocabulary: ${m}`);
  for (const b of broadened) console.error(`  a ruling key broadened and now reaches further: ${b}`);
  for (const [id, seen] of unnamed) {
    console.error(`  ${JSON.stringify(id)} names a class no ledger holds — the base still moves`);
    console.error(`     ${seen.file}:${seen.cut}  (${seen.hits} cut(s))`);
  }
  // A ruling may gain entries and may never gain ground. The guard above weighs a key that CHANGED,
  // pairing it with the one that replaced it; a key nobody replaced passes it unweighed however much
  // ground it claims, and an addition is the shape a generous ruling actually takes. So the ground
  // every ruling stands on between them answers to a ratchet of its own.
  const ground = await ruledGround();
  const overGround = overCeiling(ground);
  if (overGround) {
    console.error(`  the ledgers rule ${(100 * ground).toFixed(1)}% of corpus tokens, above the ceiling of ${(100 * GROUND_CEILING).toFixed(1)}%`);
    for (const key of [...new Set(rulings.map((r) => r.key))].sort()) {
      console.error(`     ${(100 * await groundOf(key)).toFixed(1).padStart(5)}%  ${key}`);
    }
  }
  console.log(`still  ${chosen.length} of ${files.length} carrier(s) at seed ${seed}, ${divergences} divergence(s) across ${classes.size} class(es), `
    + `${unnamed.length} unnamed, ${broadened.length} ruling(s) broadened, ${(100 * ground).toFixed(1)}% of corpus tokens ruled (ceiling ${(100 * GROUND_CEILING).toFixed(1)}%)`);
  process.exit(unnamed.length === 0 && broadened.length === 0 && !overGround ? 0 : 1);
})();
