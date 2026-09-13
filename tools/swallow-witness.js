#!/usr/bin/env node
// Where an unterminated construct stops.
//
// TiddlyWiki closes a block at a blank line — wikiparser.js splits on /\r?\n\r?\n/ — so a
// construct left open cannot reach the block after it. The parser renders the stray delimiter as
// literal text, records a diagnostic, and parses the next block whole.
//
// A grammar rule whose end pattern names only its closing delimiter carries no such bound. One
// unterminated opener then takes the rest of the file: every construct after it colours as that
// rule's interior, and the stray-bracket verdict fires on markup standing in plain sight.
// Measured on the flagship specimen, a single unclosed `@@` swallowed two hundred lines, cost
// sixty-two quoteblock spans their colouring and manufactured twenty-eight verdicts.
//
// THE OTHER DIRECTION. A bound that contains a runaway can also cut a construct the parser
// carries whole. TiddlyWiki's filtered transclude matches across blank lines — its regexp reads
// `[^\|]+?`, which takes newlines — so a bound at the first blank line ends a block the parser
// keeps open. Measured when that bound landed here: it cost 1004 spans across four specimens
// their filter scoping and manufactured 89 link claims out of filter operands.
//
// So a grammar must stop where the parser stops AND carry on where the parser carries on, and
// this asks both questions of the same specimens.
//
// THE BATTERY COMES FROM REAL TEXT. A list of openers written by hand probes what its author
// remembers, and it carries the grammar's own spelling into the check meant to question that
// spelling. Measured: twenty-five such openers reach twelve of the thirty-six body rules
// TiddlyWiki stands, leaving twenty-four unasked. So the specimens come from the corpus instead —
// every file cut at every line, a blank line and a sentinel appended. Real text carries constructs
// no hand enumerates, and a cut lands inside them by construction.
//
// ONE SPAN, ONE OFFSET, BOTH READERS. Three coarser readings of the same question misreport:
//   * "does the sentinel exist anywhere" — TiddlyWiki carries an element with no closer to the
//     end of the tiddler and parses BLOCKS inside it, so the sentinel stands there too, nested.
//     That reading calls a correct grammar wrong.
//   * "does the sentinel stand at the root" — parsePragmas nests every later block beneath the
//     definition above it, so one pragma in the head sinks the sentinel a level.
//   * a sentinel any specimen can also OPEN collides with the head it follows.
// So the sentinel stands at a known offset and each reader answers for that offset alone.
//
//   node tools/swallow-witness.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');
const { READINGS, DEFAULT_TYPE } = require('./carrier-reading.js');
const { unboundedRegions } = require('./grammar-scopes.js');
const { kindOf } = require('./region-kind.js');

const verbose = process.argv.includes('--verbose');
const LEDGER = path.join(ROOT, 'corpus', 'swallow-ledger.txt');

// A quoteblock reads well as the sentinel: it opens and closes on its own line, both readers name
// it plainly, and neither reader's rule set changes underneath it.
const { SENTINEL, standAlone } = require('./sentinel.js');

// Specimens the corpus carries on purpose, which this question has no business asking of them.
// A degenerate fixture exists to leave constructs open; a `\rules` run narrows the parser's own
// rule set, which no TextMate grammar follows and which corpus/expected-divergence.txt already
// rules.
const EXEMPT = (file, text) => /degenerate\./.test(path.basename(file)) || /^\\rules /m.test(text);

// What each file type opens under, and how a body reaches the parser.
//
// A `.tid` carries a header the wikitext parser never reads, so the specimen keeps the header and
// the sentinel lands in the BODY — which makes the sharpest question available anywhere here: cut
// inside the header, append a body, and see whether a field value left open colours it.
//
// Two types stand out, each for a reason rather than by omission. A `.multids` carries no wikitext
// body at all — every line names a field — so no parser reading exists to disagree with. A syntax
// test opens with a directive line and carries assertions on `#` lines, which the wikitext parser
// reads as ordered lists; the two readers diverge there by construction, on every line.

/** Every corpus specimen a reading covers, with the reading it takes. */
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
 * The ledger: a divergence this repo has already looked at, and what it ruled.
 *
 * Each line reads `direction key # reason`, the key a scope name or a parser rule, `*` standing
 * for any run of characters. A reason opening `OWED` names a divergence recorded rather than
 * accepted — it keeps the gate green and prints as debt.
 */
function ledger() {
  const entries = [];
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.replace(/^\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const [body, ...rest] = line.split('#');
    const [direction, key] = body.trim().split(/\s+/);
    if (!direction || !key) continue;
    const reason = rest.join('#').trim();
    entries.push({ direction, key, reason, owed: /^OWED\b/.test(reason),
      re: new RegExp(`^${key.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`) });
  }
  return entries;
}

const oracle = boot(resolveTiddlyWiki(), {});

/** Did TiddlyWiki build the sentinel quoteblock, where the sentinel stands? */
const parserReads = (text, at, type = DEFAULT_TYPE) =>
  flatten(oracle.parseAs(type, text).tree, { sameSpace: true }).some((n) => n.rule === 'quoteblock' && n.start === at);

/** Did the grammar open the sentinel quoteblock, on the sentinel's own line? */
const grammarReads = (lines, at) => (lines[at] || [])
  .some((t) => t.scopes.some((s) => s.startsWith('punctuation.definition.markup.quote.quoteblock.begin')));

/** What the grammar named where the sentinel should have opened. */
function grammarNames(lines, at) {
  const scopes = (lines[at] || []).flatMap((t) => t.scopes)
    .filter((s) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(s) && !/quoteblock/.test(s));
  return kindOf(scopes);
}

/** The rule TiddlyWiki had open across the offset the sentinel stands at. */
function parserHolds(text, at, type = DEFAULT_TYPE) {
  const covering = flatten(oracle.parseAs(type, text).tree, { sameSpace: true })
    .filter((n) => typeof n.start === 'number' && n.start <= at && n.end >= at && n.rule);
  return covering.length ? covering[covering.length - 1].rule : '(nothing)';
}

(async () => {
  const rulings = ledger();
  const findings = new Map();
  const standing = new Set();
  let probes = 0;
let closed = 0;
  let files = 0;

  for (const { file, scope, body, type: typeOf } of specimens()) {
    const text = fs.readFileSync(file, 'utf8');
    if (EXEMPT(file, text)) continue;
    files += 1;
    const lines = text.split('\n');
    for (let cut = 1; cut <= lines.length; cut += 1) {
      const head = lines.slice(0, cut).join('\n').replace(/\n+$/, '');
      if (!head.trim()) continue;
      // A SENTINEL MUST STAND ALONE. A cut leaving the carrier's own quoteblock open puts it inside
      // one, where the parser holds a quote starting at the CARRIER's `<<<` and the grammar opens a
      // nested one; the closer restores both readers to the same depth. Declining the cut instead
      // costs real findings — every cut in the quoteblock corpus sits under an open `<<<` by design.
      const stem = standAlone(head);
      if (stem !== head) closed += 1;
      const specimen = `${stem}\n\n${SENTINEL}`;
      // The parser reads a body; the grammar reads a file. A `.tid` cut inside its header hands
      // the parser a body of the sentinel alone, and the blank line ending that header doubles as
      // the one the sentinel stands behind.
      const read = body ? body(specimen) : specimen;
      // The tiddler's OWN type picks its parser: a dictionary body forced through wikitext builds
      // a paragraph, two calls and a quoteblock where the host builds one `genesis` node.
      const type = typeOf ? typeOf(specimen) : DEFAULT_TYPE;
      const at = read.lastIndexOf(SENTINEL);
      const line = specimen.split('\n').length - 4;
      if (at < 0) continue;
      probes += 1;
      const tokens = await tokenize(scope, specimen);
      for (const token of tokens[line] || []) for (const scope of token.scopes) standing.add(scope);
      const parser = parserReads(read, at, type);
      const grammar = grammarReads(tokens, line);
      if (parser === grammar) continue;
      const direction = parser ? 'runaway' : 'overbound';
      const key = parser ? grammarNames(tokens, line) : parserHolds(read, at, type);
      const id = `${direction} ${key}`;
      if (!findings.has(id)) findings.set(id, { direction, key, hits: [] });
      findings.get(id).hits.push({ file: path.basename(file), cut, tail: lines[cut - 1].slice(0, 58) });
    }
  }

  // A ruling covers a family, and several scopes fall under one — every element name the tag
  // rules spell reaches the same ledger line. Reporting the reason once per RULING rather than
  // once per scope keeps the debt readable as the grammar grows names.
  const unruled = [];
  const stale = new Set(rulings.map((r) => `${r.direction} ${r.key}`));
  const owed = new Map();
  for (const finding of findings.values()) {
    const ruling = rulings.find((r) => r.direction === finding.direction && r.re.test(finding.key));
    if (!ruling) { unruled.push(finding); continue; }
    stale.delete(`${ruling.direction} ${ruling.key}`);
    if (!ruling.owed) continue;
    const id = `${ruling.direction} ${ruling.key}`;
    if (!owed.has(id)) owed.set(id, { ruling, keys: [], cuts: 0 });
    owed.get(id).keys.push(finding.key);
    owed.get(id).cuts += finding.hits.length;
  }

  if (verbose) {
    for (const finding of [...findings.values()].sort((a, b) => b.hits.length - a.hits.length)) {
      const ruling = rulings.find((r) => r.direction === finding.direction && r.re.test(finding.key));
      const stand = ruling ? (ruling.owed ? 'OWED ' : 'ruled') : 'UNRULED';
      console.log(`  ${stand}  ${String(finding.hits.length).padStart(3)}x  ${finding.direction.padEnd(9)} ${finding.key}`);
      console.log(`             ${finding.hits[0].file}:${finding.hits[0].cut}  ${JSON.stringify(finding.hits[0].tail)}`);
    }
  }
  for (const { ruling, keys, cuts } of owed.values()) {
    console.log(`  owed  ${ruling.direction} ${ruling.key}  ${cuts} cut(s) across ${keys.length} scope(s)`);
    console.log(`        ${ruling.reason.replace(/^OWED\s*[\u2014-]?\s*/, '')}`);
  }
  // A divergence gets fixed and its ruling stays, and the ledger then reads as more standing debt
  // than the repository carries. A ruling explains a divergence or it explains nothing.
  for (const key of stale) {
    console.error(`  the ledger rules ${JSON.stringify(key)}, and no cut reads that way any more`);
  }
  for (const finding of unruled) {
    const where = finding.hits[0];
    console.error(finding.direction === 'runaway'
      ? `  ${finding.key} reads on past the blank line; TiddlyWiki parses the block after it`
      : `  the grammar stops at the blank line; TiddlyWiki carries ${finding.key} across it`);
    console.error(`     ${where.file}:${where.cut}  ${JSON.stringify(where.tail)}  (${finding.hits.length} cut(s))`);
  }

  // A region no cut opens stands unasked. The ceiling may fall and may never rise: a new region
  // arrives with a specimen that opens it, or it arrives unmeasured.
  const unbounded = unboundedRegions(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'));
  const unasked = unbounded.filter((r) => ![...standing].some((s) => r.re.test(s)));
  const ceilingFile = path.join(ROOT, 'corpus', 'unasked-regions-ceiling.txt');
  const ceiling = fs.existsSync(ceilingFile)
    ? Number(fs.readFileSync(ceilingFile, 'utf8').split('\n')[0].trim()) : Infinity;
  if (unasked.length > ceiling) {
    console.error(`  ${unasked.length} region(s) with no line bound stand unasked, above the ceiling of ${ceiling}`);
    for (const r of unasked.slice(0, 8)) console.error(`     ${r.name}`);
  }
  // A ceiling nobody can act on falls by luck. Lowering it means writing a specimen that opens a
  // NAMED region, so a verbose run says which regions stand waiting for one.
  if (verbose) for (const r of unasked) console.log(`  unasked  ${r.name}`);
  console.log(`  regions: ${unbounded.length} carry no line bound, ${unbounded.length - unasked.length} `
    + `stand open under some cut, ${unasked.length} go unasked (ceiling ${ceiling})`);

  console.log(`swallow-witness  ${probes} cut(s) across ${files} corpus file(s), ${closed} quote(s) closed to ask, `
    + `${findings.size} divergence(s), ${owed.size} recorded, ${unruled.length} unruled, ${stale.size} ruling(s) explaining nothing`);
  process.exitCode = unruled.length === 0 && stale.size === 0 && unasked.length <= ceiling ? 0 : 1;
  return;
})();
