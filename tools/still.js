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
//   node tools/still.js --host | --over <dir> [--sample N] [--seed N] [--reach] [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT, tokenize, tokenizeFrom } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { READINGS, DEFAULT_TYPE } = require('./carrier-reading.js');
const { kindOf, KINDS } = require('./region-kind.js');

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
// A DRAW DECIDES A SAMPLED RUN. `--reach` drops the draw and crosses every carrier, so the verdict
// answers to the ground rather than to the seed.
const reach = argv.includes('--reach');
// `--host` names the ground every gate already needs a checkout for: TiddlyWiki's own tiddlers,
// which stand OUTSIDE this repository's corpus. The instrument exists for ground the corpus does
// not hold — a class the ledgers name says the base held and the ground merely widened, and ground
// the corpus holds cannot widen anything. Pointed at `./corpus` this pass found 8 classes, every one
// already named, and `swallow-witness` finds the same 8 over the same files with the same
// comparison.
const host = argv.includes('--host');
const over = host
  ? (resolveTiddlyWiki() ? path.join(resolveTiddlyWiki(), 'editions') : undefined)
  : argv[argv.indexOf('--over') + 1];
const sampleAt = argv.indexOf('--sample');
const sample = sampleAt >= 0 ? Number(argv[sampleAt + 1]) : 40;
const seedAt = argv.indexOf('--seed');
const seed = seedAt >= 0 ? Number(argv[seedAt + 1]) : 1;
// A caller reading one measurement off this asks for it by name. Only a RUN wants ground to sweep.
if (require.main === module && (!over || !fs.existsSync(over))) {
  if (host) {
    console.log('still  no TiddlyWiki checkout resolved, so no host ground stands to pass over');
    process.exit(0);
  }
  console.error('still: name the ground to pass over — node tools/still.js --host | --over <dir> [--sample N]');
  process.exit(2);
}

const SENTINEL = '<<<\nQuoted\n<<<\n';
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


// ── how wide a ruling reaches, in CAUSES ────────────────────────────────────────────────────────
//
// A key's TOKEN SHARE tracks authoring, never generosity. Measured across one session: 55.8, 56.6,
// 57.2, 60.0, and every re-seat carried a true reason — the corpus is AUTHORED and this house
// authors into it constantly, so writing more of what already stands ruled raises the number. A
// guard that re-seats on every honest change has stopped guarding.
//
// The hazard the warning at the head of this file names reads: widen a key far enough and every
// finding falls inside it. That names CAUSES, and `region-kind.js` already spells them. So a key
// spanning ONE kind names one cause however common that cause runs, and a key spanning several
// absorbs findings nobody reasoned about. Authoring a thousand carriers moves neither count.
//
// The token share still READS, beside the verdict, because a reader wants to know how much ground
// stands ruled. It ratchets nothing.

/** How many KINDS one ruling key reaches — the causes it can absorb. */
async function kindsSpanned(key) {
  const re = matcher(key);
  return KINDS.filter(([kind]) => re.test(kind) || matcher(kind).test(key)).length;
}

/** The ruling that spans the most causes, and how many. */
async function widestRuling() {
  let widest = { key: '(none)', kinds: 0 };
  for (const key of new Set(named().map((r) => r.key))) {
    const kinds = await kindsSpanned(key);
    if (kinds > widest.kinds) widest = { key, kinds };
  }
  return widest;
}

// A ruling may name one cause and may never name two. The ceiling stands beside the other ratchets
// and carries its own reason.
const BREADTH_CEILING = (() => {
  const p = path.join(ROOT, 'corpus', 'ruling-breadth-ceiling.txt');
  return fs.existsSync(p) ? Number(fs.readFileSync(p, 'utf8').split('\n')[0]) : 99;
})();

// A ruling may gain entries and may never gain ground. The ceiling stands beside the other ratchets
// and carries its own reason; a ruling that needs more ground than this answers for it in writing.

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

// ── the reach a verdict rests on ──────────────────────────────────────────────────────────────
//
// A sampled run reads 25 of 4403 carriers and reports a verdict on all of them. Measured over the
// whole ground: 23 carriers carry a class no ledger names, so a draw of 25 misses every one of them
// about seven times in eight — which is why seeds 1, 2, 9 and 13 read green and seed 5 read red off
// one tree. The floor names how much of the ground the pass has actually crossed and found named.
const REACH_FLOOR = (() => {
  const p = path.join(ROOT, 'corpus', 'carrier-reach-floor.txt');
  return fs.existsSync(p) ? Number(fs.readFileSync(p, 'utf8').split('\n')[0]) : 0;
})();

/** Whether a measured reach falls below the floor, read at the precision the run REPORTS. */
const underFloor = (share) => Number((100 * share).toFixed(1)) < Number((100 * REACH_FLOOR).toFixed(1));

/**
 * Every divergence a carrier holds, as a class id per cut — or `null` where no cut reads.
 *
 * ONE GRAMMAR READING PER CARRIER. A grammar reads strictly left to right, so the stack a head ends
 * on stands the same whether the reader arrives there through the whole file or through that head
 * alone; the sentinel's own lines then read from that stack. Re-reading each head in full costs the
 * SQUARE of the file's length, and measured at 90% of a sampled run's time — which put the whole
 * ground out of a gate's reach. `tools/still.test.js` collides the two readings cut for cut.
 */
async function divergencesIn(file) {
  const reading = READINGS[path.extname(file)];
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  // A `\rules` pragma narrows the parser's own rule set, which no rule stack carries; a long file
  // costs its own length squared on the parser side, which no reading here collapses.
  if (/^\\rules /m.test(text) || lines.length > 400) return null;
  const { stacks } = await tokenizeFrom(reading.scope, lines);
  const found = [];
  for (let cut = 1; cut <= lines.length; cut += 1) {
    const head = lines.slice(0, cut).join('\n').replace(/\n+$/, '');
    if (!head.trim()) continue;
    const specimen = `${head}\n\n${SENTINEL}`;
    const read = reading.body ? reading.body(specimen) : specimen;
    // The tiddler's OWN type picks its parser. A dictionary body forced through wikitext builds a
    // paragraph, two calls and a quoteblock where the host builds one `genesis` node.
    const type = reading.type ? reading.type(specimen) : DEFAULT_TYPE;
    const at = read.lastIndexOf(SENTINEL);
    if (at < 0) continue;
    // The head after its trailing blank lines come off — the lines the file's own reading covered.
    const held = head.split('\n').length;
    const { tokens } = await tokenizeFrom(reading.scope, ['', '<<<'], stacks[held - 1]);
    const sentinel = tokens[1] ?? [];
    const tree = flatten(oracle.parseAs(type, read).tree, { sameSpace: true });
    const parser = tree.some((n) => n.rule === 'quoteblock' && n.start === at);
    const grammar = sentinel
      .some((t) => t.scopes.some((s) => s.startsWith('punctuation.definition.markup.quote.quoteblock.begin')));
    if (parser === grammar) continue;
    const scopes = sentinel.flatMap((t) => t.scopes)
      .filter((s) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(s) && !/quoteblock/.test(s));
    const key = parser
      ? kindOf(scopes)
      : (() => {
        const covering = tree.filter((n) => typeof n.start === 'number' && n.start <= at && n.end >= at && n.rule);
        return covering.length ? covering[covering.length - 1].rule : '(nothing)';
      })();
    found.push({ cut, id: `${parser ? 'runaway' : 'overbound'} ${key}` });
  }
  return found;
}

module.exports = {
  kindsSpanned,
  widestRuling,
  BREADTH_CEILING,
  groundOf, ruledGround, named, matcher, kindOf,
  REACH_FLOOR, underFloor, divergencesIn, carriers, READINGS
};

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
  const unruled = (id) => !rulings.some((r) => r.re.test(id.split(' ').slice(1).join(' ')));

  // ── the reach ratchet ───────────────────────────────────────────────────────────────────────
  //
  // A CARRIER, never a seed and never a class. Seeds and carriers do not agree: 200 seeds at sample
  // 25 draw 5000 carriers and reach 2979 distinct ones, so a count of seeds names a budget rather
  // than a coverage. A count of classes NAMED rises by ruling generously, which is the one move
  // every other ratchet here exists to weigh. A carrier whose every divergence falls inside a
  // ruling is the thing a green verdict actually claims, one per carrier, counted once.
  if (reach) {
    const files = carriers(over);
    let clean = 0;
    let skipped = 0;
    let divergences = 0;
    const blocking = new Map();
    for (const file of files) {
      const found = await divergencesIn(file);
      // A carrier no cut reads stands UNSWEPT, never clean. Counting it as named would raise the
      // reach by adding ground nobody crossed — the shape a lucky draw already takes.
      if (found === null) { skipped += 1; continue; }
      divergences += found.length;
      const here = new Set(found.map((d) => d.id).filter(unruled));
      if (!here.size) { clean += 1; continue; }
      for (const id of here) {
        if (!blocking.has(id)) blocking.set(id, { carriers: 0, file: path.basename(file), cut: found.find((d) => d.id === id).cut });
        blocking.get(id).carriers += 1;
      }
    }
    const swept = files.length - skipped;
    const share = swept ? clean / swept : 0;
    const under = underFloor(share);
    for (const [id, seen] of [...blocking].sort((a, b) => b[1].carriers - a[1].carriers)) {
      console.log(`  ${String(seen.carriers).padStart(4)} carrier(s) blocked by ${JSON.stringify(id)} — e.g. ${seen.file}:${seen.cut}`);
    }
    if (under) {
      console.error(`  the pass reaches ${(100 * share).toFixed(1)}% of swept carriers fully named, below the floor of ${(100 * REACH_FLOOR).toFixed(1)}%`);
    }
    console.log(`reach  ${clean} of ${swept} carrier(s) stand fully named, ${(100 * share).toFixed(1)}% (floor ${(100 * REACH_FLOOR).toFixed(1)}%); `
      + `${skipped} carrier(s) no cut reads, ${divergences} divergence(s), ${blocking.size} class(es) blocking`);
    process.exit(!under && broadened.length === 0 ? 0 : 1);
  }

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
    for (const { cut, id } of (await divergencesIn(file)) ?? []) {
      divergences += 1;
      if (!classes.has(id)) classes.set(id, { hits: 0, file: path.basename(file), cut });
      classes.get(id).hits += 1;
    }
  }

  const unnamed = [...classes].filter(([id]) => unruled(id));
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
  const widest = await widestRuling();
  const overBreadth = widest.kinds > BREADTH_CEILING;
  if (overBreadth) {
    console.error(`  \`${widest.key}\` spans ${widest.kinds} cause(s), above the ceiling of ${BREADTH_CEILING}`);
    for (const key of [...new Set(rulings.map((r) => r.key))].sort()) {
      const n = await kindsSpanned(key);
      if (n > BREADTH_CEILING) console.error(`     ${n} cause(s)  ${key}`);
    }
  }
  console.log(`still  ${chosen.length} of ${files.length} carrier(s) at seed ${seed}, ${divergences} divergence(s) across ${classes.size} class(es), `
    + `${unnamed.length} unnamed, ${broadened.length} ruling(s) broadened, widest ruling spans ${widest.kinds} cause(s) (ceiling ${BREADTH_CEILING}), `
    + `${(100 * ground).toFixed(1)}% of corpus tokens ruled`);
  process.exit(unnamed.length === 0 && broadened.length === 0 && !overBreadth ? 0 : 1);
})();
