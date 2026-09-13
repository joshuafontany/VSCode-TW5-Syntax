#!/usr/bin/env node
// A divergence classified by REACH, never by a reason somebody wrote down.
//
// Two readers stand over one text and neither holds a global now. TiddlyWiki's parser walks a
// document and looks ahead to its end; a TextMate grammar reads one line and carries a rule stack
// across the newline. Agreement between them names a sync, never a truth, and a difference opens a
// candidate — the results of two programs may differ and yet both stand correct.
//
// So the ledger records which KIND of difference each entry carries, and this measures it.
//
//   REACHES OUT — an arm MOVED the parser's verdict, so the deciding evidence sits outside the
//                 grammar's reach. Permanent by construction, and filing one as owed names a
//                 repair nobody can perform.
//   UNPROVEN    — no arm moved it. That names the absence of a proof and NOTHING ELSE: an
//                 alteration hands back the file's own remaining text, which carries a closer only
//                 where the file happened to hold one. An arm failing to move proves nothing, and
//                 reading its silence as "the evidence sat in reach" would state a verdict on no
//                 evidence — the very move this probe exists to retire.
//
// So the gate runs ONE-SIDED, and says so: nothing filed as owed may reach out. A ruling of
// structural over an unproven class stands as a judgement, marked as one, awaiting a sharper arm.
//
// TWO ARMS, because reach runs both ways. Forward reach ends at the line's end: a parser scanning
// to end of source for a closer decides on evidence no pattern sees. Backward reach travels only
// as far as the rule stack carries: a `\rules` pragma fifty lines up narrows the parser's own rule
// set, and no stack carries that. Measured, a forward-only probe calls the pragma case a defect —
// its verdict holds under every alteration after the line and moves the moment the pragma changes.
//
// BOTH ALTERATIONS DERIVE. The forward one hands back the file's OWN remaining text, which the cut
// removed. The backward one strikes the pragma lines, spelled by the tokens harvested off each
// pragma rule's own matchRegExp. Neither reads a list anybody typed.
//
//   node tools/light-cone.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { READINGS, DEFAULT_TYPE } = require('./carrier-reading.js');
const { readData } = require('./wiki-data.js');

const verbose = process.argv.includes('--verbose');
const LEDGER = path.join(ROOT, 'corpus', 'swallow-ledger.txt');
const { SENTINEL, standAlone } = require('./sentinel.js');


const oracle = boot(resolveTiddlyWiki(), {});
const { data: signals } = readData('GrammarSignals.tid');

/** The pragma lines, spelled by the tokens each pragma rule opens on. */
const PRAGMA = (() => {
  const tokens = Object.values(signals.pragmaTokens ?? {}).flat()
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return tokens.length ? new RegExp(`^[ \\t]*(?:${tokens.join('|')})`) : /$^/;
})();

/** Did TiddlyWiki build the sentinel quoteblock where the sentinel stands? */
const parserReads = (text, at, type = DEFAULT_TYPE) =>
  flatten(oracle.parseAs(type, text).tree, { sameSpace: true }).some((n) => n.rule === 'quoteblock' && n.start === at);

/** Did the grammar open it, on the sentinel's own line? */
const grammarReads = (lines, at) => (lines[at] ?? [])
  .some((t) => t.scopes.some((s) => s.startsWith('punctuation.definition.markup.quote.quoteblock.begin')));

/** The ledger, as rulings that name a class. */
function ledger() {
  const entries = [];
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const [body, ...rest] = line.split('#');
    const [direction, key] = body.trim().split(/\s+/);
    if (!direction || !key) continue;
    const reason = rest.join('#').trim();
    entries.push({
      direction,
      key,
      claims: /^OWED\b/.test(reason) ? 'owed' : 'ruled',
      re: new RegExp(`^${key.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
    });
  }
  return entries;
}

function specimens() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const reading = READINGS[path.extname(entry.name)];
      if (reading) out.push({ file, ...reading });
    }
  };
  walk(path.join(ROOT, 'corpus'));
  return out;
}


/**
 * Where a reader's own typing would land, derived from the carrier's bytes.
 *
 * A PERTURBATION MUST NOT WANDER. A probe sampling differently each run hands a different verdict
 * to whoever looked last, and this house already retired one gauge for exactly that. So the
 * positions come from a hash of the head itself: broad sampling, and two runs read alike.
 *
 * @param {string} head  the text a cut left standing
 * @param {number} count how many places to try
 */
function typoSites(head, count) {
  let h = 2166136261;
  for (let i = 0; i < head.length; i += 1) { h ^= head.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const sites = [];
  for (let i = 0; i < count; i += 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    sites.push(h % Math.max(1, head.length));
  }
  return sites;
}

// What a person types by accident: a doubled space, and a stray character that opens nothing.
const TYPOS = [' ', 'x'];

/** Places tried per cut. The arm stops early the moment it finds evidence on the sentinel's line. */
const TYPO_SITES = 12;

(async () => {
  const rulings = ledger();
  const measured = new Map();
  let divergences = 0;
let closed = 0;
  let forwardMoves = 0;
  let backwardMoves = 0;
  let typoMoves = 0;

  for (const { file, scope, body, type: typeOf } of specimens()) {
    const text = fs.readFileSync(file, 'utf8');
    if (/degenerate\./.test(path.basename(file))) continue;
    const lines = text.split('\n');
    for (let cut = 1; cut <= lines.length; cut += 1) {
      const head = lines.slice(0, cut).join('\n').replace(/\n+$/, '');
      if (!head.trim()) continue;
      const rest = lines.slice(cut).join('\n');
      // A SENTINEL MUST STAND ALONE. A cut leaving the carrier's own quoteblock open puts it inside
      // one, where the parser holds a quote starting at the CARRIER's `<<<` and the grammar opens a
      // nested one; the closer restores both readers to the same depth. Declining the cut instead
      // costs real findings — every cut in the quoteblock corpus sits under an open `<<<` by design.
      const stem = standAlone(head);
      if (stem !== head) closed += 1;
      const specimen = `${stem}\n\n${SENTINEL}`;
      const read = body ? body(specimen) : specimen;
      // The tiddler's OWN type picks its parser, and both arms answer through the same one.
      const type = typeOf ? typeOf(specimen) : DEFAULT_TYPE;
      const at = read.lastIndexOf(SENTINEL);
      const line = specimen.split('\n').length - 4;
      if (at < 0) continue;
      const tokens = await tokenize(scope, specimen);
      const parser = parserReads(read, at, type);
      const grammar = grammarReads(tokens, line);
      if (parser === grammar) continue;
      divergences += 1;

      // FORWARD ARM — hand back the text the cut removed. The sentinel keeps its offset; only what
      // lies past it changes, which is exactly the evidence no pattern reaches.
      const ahead = `${stem}\n\n${SENTINEL}${rest}`;
      const aheadRead = body ? body(ahead) : ahead;
      const forward = parserReads(aheadRead, aheadRead.lastIndexOf(SENTINEL), type) !== parser;

      // BACKWARD ARM — strike the pragma lines. A rule stack carries regions, never the parser's
      // own rule set, so a verdict turning on one turns on evidence the grammar never held.
      const struck = standAlone(head.split('\n').filter((l) => !PRAGMA.test(l)).join('\n'));
      let backward = false;
      if (struck !== stem && struck.trim()) {
        const behind = `${struck}\n\n${SENTINEL}`;
        const behindRead = body ? body(behind) : behind;
        backward = parserReads(behindRead, behindRead.lastIndexOf(SENTINEL), type) !== parser;
      }
      // TYPO ARM — a reader's own typing. Both arms above alter something nobody types; a person
      // inserts a space or a stray character in the middle of what they already wrote. Where a
      // one-character insertion moves the parser's verdict at the sentinel, the DECIDING evidence
      // sits at that character, and the arm records HOW FAR BACK it sits. The distance informs a
      // ceiling ruling without settling it: evidence one line back may sit inside a region a
      // begin/end pair already carries, where evidence fifty lines back wants a region spanning
      // fifty lines. Reading the distance as a verdict would state more than the arm measured.
      let typo = false;
      let nearest = Infinity;
      for (const site of typoSites(head, TYPO_SITES)) {
        for (const ch of TYPOS) {
          const typed = standAlone(`${head.slice(0, site)}${ch}${head.slice(site)}`);
          if (!typed.trim()) continue;
          const spec = `${typed}\n\n${SENTINEL}`;
          const typedRead = body ? body(spec) : spec;
          const where = typedRead.lastIndexOf(SENTINEL);
          if (where < 0) continue;
          if (parserReads(typedRead, where, type) === parser) continue;
          typo = true;
          // Lines between the insertion and the cut. Zero puts the evidence on the sentinel's line.
          const back = head.slice(site).split('\n').length - 1;
          if (back < nearest) nearest = back;
        }
        if (typo && nearest === 0) break;
      }

      if (forward) forwardMoves += 1;
      if (backward) backwardMoves += 1;
      if (typo) typoMoves += 1;

      const scopes = (tokens[line] ?? []).flatMap((t) => t.scopes)
        .filter((s) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(s) && !/quoteblock/.test(s));
      const key = parser
        ? (scopes.find((s) => /^(meta|comment|source|string)\./.test(s)) || scopes[0] || '(bare text)')
        : (() => {
          const covering = flatten(oracle.parseAs(type, read).tree, { sameSpace: true })
            .filter((n) => typeof n.start === 'number' && n.start <= at && n.end >= at && n.rule);
          return covering.length ? covering[covering.length - 1].rule : '(nothing)';
        })();
      const id = `${parser ? 'runaway' : 'overbound'} ${key}`;
      // THE TYPO ARM DIAGNOSES AND NEVER PROVES. A forward move shows the parser deciding on
      // text past the sentinel, and a backward move on a rule set no stack carries — both sit
      // beyond any pattern. A typo sits INSIDE the head, which the grammar's own stack reads,
      // so its movement shows SENSITIVITY rather than reach. Counting it as proof would state
      // the verdict this probe exists to retire, from the other direction.
      const klass = forward || backward ? 'reaches-out' : 'unproven';
      if (!measured.has(id)) measured.set(id, { arms: new Set(), klass, hits: 0, file: path.basename(file), cut });
      const seen = measured.get(id);
      seen.hits += 1;
      if (forward) seen.arms.add('forward');
      if (backward) seen.arms.add('backward');
      if (typo) { seen.arms.add(`typo@${nearest}`); seen.nearest = Math.min(seen.nearest ?? Infinity, nearest); }
      // One reach standing anywhere in a family makes the family structural: a single instance
      // deciding on evidence outside the grammar carries the whole class out of repair's range.
      if (klass === 'reaches-out') seen.klass = 'reaches-out';
    }
  }

  // One-sided. An owed entry that reaches out stands refuted by measurement; a ruled entry the
  // arms never moved stands unproven, which reports and does not refuse.
  const wrong = [];
  const unproven = [];
  for (const [id, seen] of measured) {
    const [direction, ...rest] = id.split(' ');
    const key = rest.join(' ');
    const ruling = rulings.find((r) => r.direction === direction && r.re.test(key));
    if (!ruling) continue;                       // swallow-witness answers for an unruled divergence
    if (ruling.claims === 'owed' && seen.klass === 'reaches-out') wrong.push({ id, seen });
    if (ruling.claims === 'ruled' && seen.klass === 'unproven') unproven.push({ id, seen });
  }

  if (verbose) {
    for (const [id, seen] of [...measured].sort((a, b) => b[1].hits - a[1].hits)) {
      const arms = seen.arms.size ? [...seen.arms].join('+') : 'neither arm moved';
      console.log(`  ${seen.klass.padEnd(10)} ${String(seen.hits).padStart(4)}x  ${id}`);
      console.log(`             reach: ${arms}   e.g. ${seen.file}:${seen.cut}`);
    }
  }
  for (const u of unproven) {
    console.log(`  ruled without proof: ${u.id} — no arm moved it, so the ruling stands as judgement`);
  }
  for (const w of wrong) {
    console.error(`  the ledger files ${JSON.stringify(w.id)} as owed, and an arm reaches past the grammar`);
    console.error('     a difference deciding on evidence no pattern sees names a repair nobody can perform');
  }
  console.log(`light-cone  ${divergences} divergence(s) across ${measured.size} class(es), ${closed} quote(s) closed to ask; `
    + `forward arm moved ${forwardMoves}, backward arm moved ${backwardMoves}, typo arm moved ${typoMoves}; `
    + `${measured.size - unproven.length - wrong.length} proven or unruled, ${unproven.length} ruled without proof, `
    + `${wrong.length} owed but reaching out`);
  process.exitCode = wrong.length === 0 ? 0 : 1;
  return;
})();
