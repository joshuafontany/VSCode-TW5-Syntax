#!/usr/bin/env node
// Whether a mark carries STRUCTURE, asked by taking it away.
//
// Every other instrument here compares which CHARACTERS the grammar colours against which SPANS
// TiddlyWiki builds. None of them asks whether a mark's colour answers for anything: a scope can
// stand exactly where the host reads text, agreeing with it on every character, and still be
// painting a delimiter the host never needed — or leaving one plain the host depended on.
//
// TWO ARMS, from one population: every character the grammar's own delimiter scopes touch, and
// every character it leaves plain inside a construct the host built.
//
//   OVERREACH  the grammar CLAIMS a character as `punctuation.definition.*` — a delimiter — and
//              replacing it with a neutral letter leaves the host's tree SHAPE unchanged. The
//              grammar called it markup and the host never needed it.
//   MISS       the grammar leaves an UNCLAIMED, non-word, non-space character plain inside a
//              construct TiddlyWiki built, and replacing IT changes the shape. The host needed a
//              mark the grammar left as ground.
//
// SHAPE means node TYPES, TAGS and attribute NAMES — never text, never an offset. Two trees read
// alike here when they nest the same way and name the same things, whatever words sit inside.
//
// THE COMPARISON STAYS LOCAL, at the TIGHTEST STRUCTURAL NODE the character's offset falls inside,
// rather than the whole document. A block elsewhere in the file answers a question this character
// never asked, and comparing the whole tree would let it in — a distant block re-numbering an
// entity count, say — as if the ablation had caused it.
//
// ONE PARSE PER CHARACTER TESTED. Ablation keeps the text's LENGTH exactly as it was — one letter
// swapped for another — so every offset still names the same column in both trees, and the block a
// character falls inside before ablation is the block to read after it.
//
// NO SECOND WALKER. The grammar's own reading comes from darkness-witness.js's `placed`, over
// tools/tokenizer.js; the host's comes from tw5-oracle.js's `boot`. Neither is reimplemented here.
//
// Every finding stands declared in corpus/ablation-ledger.txt, in darkness-ledger.txt's own shape,
// and a declaration whose line no longer finds anything fails as stale.
//
//   node tools/ablation-witness.js [--verbose] [--list]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./run-tool.js');
const { placed } = require('./darkness-witness.js');
const { boot, resolveTiddlyWiki, flatten, isPlainText } = require('./tw5-oracle.js');
const { readerOf, appliesToReader } = require('./reader-scope.js');
const { carrierFiles } = require('./walk.js');

const LEDGER = path.join(ROOT, 'corpus', 'ablation-ledger.txt');
const CARRIER_DIRS = [path.join(ROOT, 'corpus', 'wikitext'), path.join(ROOT, 'tests', 'samples')];

const MARK = /^punctuation\.definition\..*\.tiddlywiki5$/;

// THE REVERSE ARM'S OWN "UNCLAIMED" READS WIDER THAN THE FORWARD ARM'S "CLAIMED". A character
// already carrying ANY punctuation scope is a mark the grammar painted, whatever family it chose —
// `punctuation.separator.cell.pipe.inner.tiddlywiki5` names a table's inner pipe as pointedly as
// `punctuation.definition.table.pipe.outer.begin.tiddlywiki5` names its first one. Measured: every
// inner cell pipe across the table carriers ablated to a MISS under the narrower reading, one per
// pipe, none of them naming a mark the grammar left plain — the grammar had already named every one,
// under a sibling family the forward arm does not test. The forward arm stays narrow on purpose,
// since overreach-check's own `mark` regex answers to `punctuation.definition.*` alone; the reverse
// arm asks a different question — is this character marked AT ALL — so its exclusion reads wider.
const ANY_PUNCTUATION = /^punctuation\..*\.tiddlywiki5$/;

/** A neutral letter, never the character it replaces. */
function neutral(ch) {
  return ch.toLowerCase() === 'x' ? 'q' : 'x';
}

/**
 * Node types, tags and attribute NAMES, depth-first — never text, never an offset.
 *
 * @param {object[]} nodes
 * @returns {object[]}
 */
function shapeOf(nodes) {
  return (nodes || [])
    .filter((n) => n && typeof n === 'object')
    .map((n) => ({
      type: n.type,
      tag: n.tag || null,
      attrs: Object.keys(n.attributes || {}).sort(),
      children: shapeOf(n.children)
    }));
}

/**
 * The TIGHTEST node with real structure that covers an offset — never a bare text leaf, whose
 * shape never answers to its content and would compare equal on every ablation by construction.
 *
 * WALKING `tree`'s TOP LEVEL ALONE FAILS HERE. parsePragmas nests the whole document after a
 * definition beneath it (tw5-oracle.js's own `flatten`), so a carrier opening with `\define` hands
 * back ONE top-level node spanning just the pragma, with everything after it nested — at a
 * RESTARTED coordinate space — several levels down. A block search over `tree` alone either misses
 * every offset past the pragma or, worse, falls back to the whole nested chain, comparing far more
 * than the one character asked. `flatten` reads every node in the SAME space `verdictAt` does — a
 * restarted child's offsets run no further than its own nested body, so it never numerically covers
 * an offset outside it — and covering falls out of that flat list the same honest way `readAt` gets
 * it right elsewhere in this codebase.
 *
 * @param {object[]} tree
 * @param {number} p
 * @returns {object|null}
 */
function nodeCovering(tree, p) {
  const spans = flatten(tree, { sameSpace: true }).filter(
    (n) => n && typeof n.start === 'number' && typeof n.end === 'number' && n.start <= p && n.end > p
  );
  const structural = spans.filter((n) => !isPlainText(n));
  const pool = structural.length > 0 ? structural : spans;
  if (pool.length === 0) return null;
  // A TIE PREFERS THE DEEPER NODE. `flatten` lists parents before children, so an outer wrapper
  // built exactly around one child of the same width — a void element built around the styled
  // span it holds, say — would otherwise win by arriving first, losing the child's own attributes
  // to the comparison. `<=` keeps walking inward on every tie.
  return pool.reduce((a, b) => (b.end - b.start <= a.end - a.start ? b : a));
}

/**
 * Whether ablating one character at `p` changes the shape of the node it falls inside.
 *
 * @param {string} text
 * @param {number} p
 * @param {{parse: Function}} oracle
 * @returns {boolean}
 */
function changesShape(text, p, oracle) {
  const before = oracle.parse(text).tree;
  const beforeNode = nodeCovering(before, p);
  const beforeShape = JSON.stringify(shapeOf(beforeNode ? [beforeNode] : []));
  const ablated = text.slice(0, p) + neutral(text[p]) + text.slice(p + 1);
  const after = oracle.parse(ablated).tree;
  // THE SAME OFFSET, read fresh against the ABLATED tree's own covering node — asking for the
  // node at the SAME START as `beforeNode` would miss a change that moves or removes it entirely,
  // which is exactly the change an ablation over a real delimiter causes.
  const afterNode = nodeCovering(after, p);
  const afterShape = JSON.stringify(shapeOf(afterNode ? [afterNode] : []));
  return beforeShape !== afterShape;
}

/**
 * Every structural (never plain-text) node that CONTAINS offset `p`, outermost first — the
 * ancestor chain `nodeCovering` walks to find its own tightest answer.
 *
 * @param {object[]} tree
 * @param {number} p
 * @returns {object[]}
 */
function chainAt(tree, p) {
  return flatten(tree, { sameSpace: true })
    .filter((n) => n && typeof n.start === 'number' && typeof n.end === 'number' && n.start <= p && n.end > p && !isPlainText(n))
    .sort((a, b) => (b.end - b.start) - (a.end - a.start))
    .map((n) => ({ type: n.type, tag: n.tag || '', end: n.end }));
}

// A REPLACEMENT CAN BUILD MARKUP OF ITS OWN. `neutral()` answers with a LETTER, and a letter reads
// as an identifier — an attribute name, a macro name — everywhere TiddlyWiki's own grammar admits
// one. Traced: `* [img[ ]]`, ablating the SECOND `[` to `x` leaves `* [imgx ]]`; image.js finds no
// `[` immediately after `[img`, so it calls parseutils.js's `parseAttribute`, whose name token
// admits `x`, and carries an attribute list into the NEXT LINE's `[`, building an image the
// ORIGINAL held never — a construct never appears when nothing at this position could start an
// attribute name.
//
// NO REPLACEMENT CHARACTER IS UNIVERSALLY INERT. `>`, `=` and `"` each open, close or continue
// some token elsewhere in this grammar — a macro CALL's own unquoted parameter value admits a lone
// `>` (parseutils.js's `reMacroParameter`), which is exactly what let `>` stand in for the real
// name-terminating `=` of `<<a=b>>` and read as no change at all. Whitespace fares no better: a
// skipped space just exposes the NEXT character to the same risk (traced: `* [img  ]]` still opens
// an image, this time swallowing a `]` as the attribute name). Multiplying replacements and
// requiring agreement across them only relocates the artifact to whichever "inert" candidate turns
// out to share a role with the character under test.
//
// THE INVARIANT THAT HOLDS: a MISS reports the ORIGINAL character's own structure going missing,
// never the REPLACEMENT's own structure appearing. `isCreationArtifact` reads two ancestor chains,
// outermost first, over the SAME offset: BEFORE ablation and AFTER it. Walking them in lockstep —
//   - a node BEFORE held with no counterpart at the same rank AFTER means something was genuinely
//     lost or altered; an artifact never does that, only ADDS.
//   - a node persisting at the same rank that grew BEYOND its own PARENT's original end has
//     annexed a neighbour's territory (a mismatched closing tag consuming the rest of the
//     document, say) — real damage a finding must report, not creation to wave through.
//   - once the chains run out of common rank, AFTER holding a node BEFORE never had is creation —
//     unless THAT new node's own span reaches PAST the original covering node's end, which is the
//     replacement's lookahead spilling into content the ablated character's own construct never
//     engaged (the image's attribute list crossing into the next line's `[`).
//
// @param {string} text
// @param {number} p
// @param {{parse: Function}} oracle
// @param {object} beforeNode  `nodeCovering` at `p` in the text BEFORE ablation
// @returns {boolean}
function isCreationArtifact(text, p, oracle, beforeNode) {
  const before = oracle.parse(text).tree;
  const beforeChain = chainAt(before, p);
  const ablated = text.slice(0, p) + neutral(text[p]) + text.slice(p + 1);
  const after = oracle.parse(ablated).tree;
  const afterChain = chainAt(after, p);
  let i = 0;
  while (i < beforeChain.length && i < afterChain.length
    && beforeChain[i].type === afterChain[i].type && beforeChain[i].tag === afterChain[i].tag) {
    if (i > 0 && afterChain[i].end > beforeChain[i - 1].end) return false;
    i += 1;
  }
  if (i < beforeChain.length) return false; // BEFORE held something AFTER has no counterpart for
  if (i >= afterChain.length) return false; // no deeper node appeared; whatever differs is alteration
  return afterChain[i].end > beforeNode.end; // grew past the original's own boundary => spillover
}

/**
 * Whether ablating one character at `p` reports a genuine MISS: the shape changed, AND the change
 * is the ORIGINAL structure going missing rather than the replacement's own creation.
 *
 * @param {string} text
 * @param {number} p
 * @param {{parse: Function}} oracle
 * @returns {boolean}
 */
function isRealMiss(text, p, oracle) {
  if (!changesShape(text, p, oracle)) return false;
  const beforeNode = nodeCovering(oracle.parse(text).tree, p);
  if (!beforeNode) return true;
  return !isCreationArtifact(text, p, oracle, beforeNode);
}

/**
 * Every OVERREACH and MISS this text carries.
 *
 * @param {string} text
 * @param {{parse: Function, readAt: Function}} oracle
 * @param {(text: string) => Promise<{s:number,e:number,scopes:string[]}[]>} [read]  the grammar,
 *   unless a caller hands in another reader
 * @returns {Promise<{verdict:'OVERREACH'|'MISS', line:number, char:string, text:string}[]>}
 */
async function ablations(text, oracle, read = placed) {
  const tokens = await read(text);
  const claimed = new Set();
  const marked = new Set();
  for (const t of tokens) {
    const isMark = t.scopes.some((s) => MARK.test(s));
    const isPunctuation = isMark || t.scopes.some((s) => ANY_PUNCTUATION.test(s));
    for (let p = t.s; p < t.e; p += 1) {
      if (!/\S/.test(text[p])) continue;
      if (isMark) claimed.add(p);
      if (isPunctuation) marked.add(p);
    }
  }
  const lineOf = (p) => text.slice(0, p).split('\n').length;
  const lineTextOf = (p) => {
    const start = text.lastIndexOf('\n', p - 1) + 1;
    let end = text.indexOf('\n', p);
    if (end < 0) end = text.length;
    return text.slice(start, end).trim();
  };
  const found = [];
  const seen = new Set();
  const record = (verdict, p) => {
    const line = lineOf(p);
    const lineText = lineTextOf(p);
    const key = `${verdict} ${line} ${text[p]}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ verdict, line, char: text[p], text: lineText });
  };
  // FORWARD ARM. Every character the grammar claims as a delimiter, INSIDE a construct TiddlyWiki
  // actually built. A mark the host refused already answers to overreach-check.js's OWN cheaper
  // check — `read.innermost === 'text'`, a claim naming one of this grammar's delimiters over kept
  // text — and every character inside a plain-text span ablates to an unchanged shape by
  // construction, a text node's shape never answering to its content. Testing those here would
  // only restate overreach-check's own finding, at the cost of one parse apiece, so the forward
  // arm asks only where overreach-check CANNOT: a mark standing inside something the host built,
  // which is exactly the ground `verdictAt`'s widest cover reads as agreement (§2 of the research
  // that proposed this instrument — overreach-check reads `built` the moment any node covers a
  // span, so a colspan mark painted over a `td` that never needed it reads as agreement there).
  for (const p of claimed) {
    if (oracle.readAt(text, p, p + 1).innermost !== 'built') continue;
    if (!changesShape(text, p, oracle)) record('OVERREACH', p);
  }
  // REVERSE ARM. Every unclaimed, non-word, non-space character standing inside a construct the
  // host actually built — prose answers to nothing here, so this asks the host first.
  for (let p = 0; p < text.length; p += 1) {
    if (marked.has(p)) continue;
    const ch = text[p];
    if (/[\w\s]/.test(ch)) continue;
    const built = oracle.readAt(text, p, p + 1).kind === 'built';
    if (!built) continue;
    if (isRealMiss(text, p, oracle)) record('MISS', p);
  }
  return found.sort((a, b) => a.line - b.line || a.char.localeCompare(b.char));
}

/** The key a ledger line and a finding share. */
const keyOf = (file, char, verdict, lineText) => `${file}  ${char}  ${verdict}  ${JSON.stringify(lineText)}`;

/** Declarations, keyed as findings key, each carrying its reason. */
function readLedger() {
  const declared = new Map();
  if (!fs.existsSync(LEDGER)) return declared;
  const shape = /^(\S+)\s+(\S+)\s+(OVERREACH|MISS)\s+("(?:[^"\\]|\\.)*")\s*#\s?(.*)$/;
  for (const raw of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = shape.exec(line);
    if (!m) { declared.set(`unreadable: ${line}`, null); continue; }
    declared.set(keyOf(m[1], m[2], m[3], JSON.parse(m[4])), m[5]);
  }
  return declared;
}

/** Every wikitext carrier, derived from the directories that hold them. */
function carriers() {
  return carrierFiles(CARRIER_DIRS);
}

module.exports = {
  ablations,
  shapeOf,
  nodeCovering,
  chainAt,
  changesShape,
  isCreationArtifact,
  isRealMiss,
  neutral,
  keyOf
};

if (require.main !== module) return;

(async () => {
  const verbose = process.argv.includes('--verbose');
  const list = process.argv.includes('--list');
  const oracle = boot(resolveTiddlyWiki());
  const current = oracle.$tw.version;
  const declared = readLedger();
  const unreadable = [...declared.keys()].filter((k) => k.startsWith('unreadable: '));
  const files = carriers();
  const findings = [];
  let judged = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    for (const f of await ablations(text, oracle)) findings.push({ ...f, file: rel, key: keyOf(rel, f.char, f.verdict, f.text) });
    judged += 1;
  }
  if (list) {
    for (const f of findings) process.stdout.write(`${f.key}  # ${declared.get(f.key) || 'REASON OWED'}\n`);
    return;
  }
  // A declaration naming a READER (tools/reader-scope.js) answers only for that one, the same
  // generalisation darkness-witness.js carries — a finding that reader never meets stays undeclared
  // here as if nothing named it.
  const undeclared = findings.filter((f) => {
    if (!declared.has(f.key)) return true;
    return !appliesToReader(readerOf(declared.get(f.key)).version, current);
  });
  const foundKeys = new Set(findings.map((f) => f.key));
  const stale = [...declared.keys()].filter((k) => !k.startsWith('unreadable: ') && !foundKeys.has(k)
    && appliesToReader(readerOf(declared.get(k)).version, current));
  const owed = findings.filter((f) => declared.has(f.key) && /^OWED\b/.test(readerOf(declared.get(f.key)).rest)).length;
  for (const f of undeclared.slice(0, verbose ? undeclared.length : 12)) {
    console.log(`  ${f.verdict} ${f.file}:${f.line} ${JSON.stringify(f.char)}  ${JSON.stringify(f.text.slice(0, 70))}`);
  }
  if (!verbose && undeclared.length > 12) console.log(`  … ${undeclared.length - 12} more; --verbose lists them all`);
  for (const k of stale) console.log(`  ${k} — a declaration explaining nothing: the line no longer finds it (stale)`);
  for (const k of unreadable) console.log(`  ${k.slice(12)} — a ledger line this cannot read`);
  console.log(`ablation-witness  ${findings.length} finding(s) over ${judged} carrier(s): ${findings.length - undeclared.length} declared (${owed} owed), ${undeclared.length} undeclared, ${stale.length} stale`);
  process.exitCode = undeclared.length || stale.length || unreadable.length ? 1 : 0;
})();
