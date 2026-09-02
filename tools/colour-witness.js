#!/usr/bin/env node
// What a reader sees, rather than what a scope name says.
//
// Every other gate here reads scope NAMES. A reader reads colours, and the two come apart in both
// directions: two differently named scopes paint identically when no theme rule reaches past
// their shared family, and one construct paints two ways when its parts carry names from
// different families. Neither shows in a snapshot, and both show at a glance.
//
// A theme paints a scope by its most specific matching rule, so this takes each scope to
// every bundled theme and compares the colours rather than the names.
//
// Two relations answer here.
//
//   TOGETHER  An opener and its closer read alike. The pairs come from the names themselves —
//             a scope carrying .begin. or .start. beside one carrying .end. — so a construct
//             added later joins the check without anybody remembering it.
//
//   APART     A distinction a reader needs to see. These stand declared, because whether a
//             difference SHOULD show asks a judgement no measurement settles: punctuation
//             reading alike serves a reader, and a lar: root's three terms reading alike does not.
//
//   node tools/colour-witness.js [--verbose]

const fs = require('node:fs');
const { declaredScopesIn } = require('./grammar-scopes.js');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

// Distinctions a reader needs to see, and how many themes must show each. A theme paints from its
// own palette and none carries a colour for every family, so a relation asks for a majority
// rather than for all.
// Constructs a reader meets as one thing and must therefore read as one colour. Each names a
// SPECIMEN and the words inside it that play one part, because a relation over scope NAMES stays
// true when a rule swaps which capture carries which name, and such a swap makes a
// link's visible text change colour with the presence of a caption.
const TOGETHER = [
  { what: "a link's visible text, captioned or not",
    specimen: 'A [[Plain]] and a [[Caption|Target]] link.\nAn [ext[Ecaption|https://example.com]] and https://example.org here.\n',
    words: ['Plain', 'Caption', 'Ecaption'] }
];

// MEASURED AND DECLINED. TextMate's question cuts both ways, and four pairs that read alike here
// SHOULD read alike:
//
//   a section's opening name beside its closing name — one construct, and the slash carries the
//   closing, so a reader who saw them apart would read two things where one stands
//   a bracketed value beside a single-quoted one — one value, quoted two ways
//   a bare value beside a quoted one — every grammar surveyed keeps both under `string`
//   a \define keyword beside a \procedure keyword — the difference between them lands in the
//   BODY, where a define substitutes and a procedure does not, and the bodies already read apart
//   in 72 of 100 measured pairs. A pragma keyword reads as a pragma keyword, and both open one.
//
// Scopes a reader meets as ONE THING, named separately so a rule can still reach each. A lar
// root carries three terms — heading, angle of approach, carried dynamic — and they name one
// address between them. Painted from three different families they read as three unrelated
// things: measured, all three shared a colour in 1 of 65 themes, and Gruvbox Dark Medium gave the
// first one aqua and the other two yellow.
//
// Operator ruling, 2026-09-01: the three read as one colour. They keep distinct tails, so a rule
// written against `entity.name.tag.angle.lar` still reaches that term alone — but no bundled theme
// rules below `entity.name.tag` for a scope this grammar emits, so under one root the three paint
// alike in every one of them, and the differentiation stays available rather than visible.
const ALIKE = [
  { what: "a lar: root's three terms, which name one address between them",
    scopes: ['entity.name.tag.heading.lar.memetic-wikitext',
             'entity.name.tag.angle.lar.memetic-wikitext',
             'entity.name.tag.dynamic.lar.memetic-wikitext'],
    least: 60 }
];

const APART = [
  { what: 'a link — the text a reader clicks, and the title it reaches',
    scopes: ['markup.underline.link.tiddlywiki5', 'string.entity.other.title.link.tiddlywiki5'],
    least: 40 },
  // TextMate's own question decides these: "would I want these two elements styled differently?"
  // — asked of the reader, never of the parser's node inventory.
  //
  // A WIDGET and an HTML ELEMENT open the same way and mean nothing alike: one calls into
  // TiddlyWiki, one emits a tag. The host itself marks the difference with a dollar. A widget
  // takes the family it belongs to — a thing invoked by name — rather than the tag family it
  // merely resembles.
  { what: 'a TiddlyWiki widget and an HTML element, which open alike and mean nothing alike',
    scopes: ['entity.name.function.widget.tiddlywiki5', 'entity.name.tag.html.tiddlywiki5'],
    least: 45 },
  // A SYSTEM TITLE names something the host provides, and TiddlyWiki hides those from ordinary
  // lists. Its home category names a framework's own thing; a second name carries it to themes,
  // since the home category alone reaches under half of them.
  { what: 'a title the host provides and a title an author wrote',
    scopes: ['support.other.system.title.tiddlywiki5', 'string.entity.other.title.link.tiddlywiki5'],
    least: 55 },
  // The sharktooth opens a sigil in the house's namespace; the carrier mark frames the carrier
  // itself, and what it names IS a control character. A reader scanning a meme wants the framing
  // to stand off from what the framing carries.
  { what: "a sigil's sharktooth and the carrier's own control mark",
    scopes: ['keyword.control.sharktooth.memetic-wikitext',
             'constant.character.carrier.stx.memetic-wikitext'],
    least: 48 }
];

/** The colour a theme paints a scope, by its most specific matching rule. */
function colourOf(theme, scope) {
  let best = null;
  let reach = -1;
  for (const rule of theme.tokenColors || []) {
    for (const selector of [].concat(rule.scope || [])) {
      for (const part of String(selector).split(',').map((s) => s.trim())) {
        const last = part.split(/\s+/).pop();
        if (!last) continue;
        if ((scope === last || scope.startsWith(`${last}.`)) && last.length > reach) {
          reach = last.length;
          best = (rule.settings || {}).foreground || null;
        }
      }
    }
  }
  return best;
}

/** Every scope any grammar names. */
function declaredScopes() {
  return new Set([...declaredScopesIn(path.join(ROOT, 'syntaxes'))]
    .filter((s) => /\.(?:tiddlywiki5|memetic-wikitext)$/.test(s)));
}

/** An opener beside the closer that shuts it, taken from the names. */
function openerCloserPairs(scopes) {
  const pairs = [];
  for (const scope of scopes) {
    if (!/\.(begin|start|open)\./.test(scope)) continue;
    const closer = scope.replace(/\.begin\./, '.end.').replace(/\.start\./, '.end.').replace(/\.open\./, '.close.');
    if (scopes.has(closer)) pairs.push([scope, closer]);
  }
  return pairs;
}

/**
 * The innermost scope each word carries, read from a snapshot of the specimen holding them.
 *
 * @param {string} specimen
 * @param {string[]} words
 * @returns {Record<string,string>}
 */
function scopesOverWords(specimen, words) {
  const { execFileSync } = require('node:child_process');
  const os = require('node:os');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-colour-'));
  const file = path.join(scratch, 'probe.tw');
  fs.writeFileSync(file, specimen);
  const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
    { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', file],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
  const out = {};
  let line = null;
  for (const text of fs.readFileSync(`${file}.snap`, 'utf8').split('\n')) {
    if (text.startsWith('>')) { line = text.slice(1); continue; }
    const m = text.match(/^#(\s*)(\^+) (.*)/);
    if (!m || line === null) continue;
    const span = line.slice(m[1].length, m[1].length + m[2].length);
    if (words.includes(span)) out[span] = m[3].split(/\s+/).pop();
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  return out;
}

exports.scopesOverWords = scopesOverWords;
exports.colourOf = colourOf;
exports.declaredScopes = declaredScopes;
exports.openerCloserPairs = openerCloserPairs;
exports.APART = APART;
exports.TOGETHER = TOGETHER;

if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  if (!fs.existsSync(THEMES)) {
    console.error('no bundled themes — run npm install');
    process.exit(2);
  }
  const themes = fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(THEMES, f), 'utf8')); } catch { return null; } })
    .filter(Boolean);

  const scopes = declaredScopes();
  const pairs = openerCloserPairs(scopes);

  // A relation naming a scope no grammar emits stops checking anything, and reads as clean while
  // it does. So does a pair list that shrinks. Both weaken silently, the failure a gate
  // exists to prevent.
  const missing = [...ALIKE, ...APART].flatMap((r) => r.scopes.filter((sc) => !scopes.has(sc)).map((sc) => `${sc} — named by a relation, emitted by no grammar`));
  const PAIR_FLOOR = Number(fs.existsSync(path.join(ROOT, 'corpus', 'colour-pair-floor.txt'))
    ? fs.readFileSync(path.join(ROOT, 'corpus', 'colour-pair-floor.txt'), 'utf8').split('\n')[0].trim() : 0);
  const shrunk = pairs.length < PAIR_FLOOR ? [`${pairs.length} opener/closer pair(s), below the floor of ${PAIR_FLOOR}`] : [];
  const split = [];
  for (const [opener, closer] of pairs) {
    const differ = themes.filter((t) => colourOf(t, opener) !== colourOf(t, closer)).length;
    if (differ) split.push(`${differ}/${themes.length}  ${opener}  vs  ${closer}`);
  }

  const parted = [];
  for (const relation of TOGETHER) {
    const found = scopesOverWords(relation.specimen, relation.words);
    const missing = relation.words.filter((w) => !found[w]);
    if (missing.length) { parted.push(`${relation.what}: the specimen colours nothing over ${missing.join(', ')}`); continue; }
    const carried = relation.words.map((w) => found[w]);
    const differ = themes.filter((t) => new Set(carried.map((sc) => colourOf(t, sc))).size > 1).length;
    if (differ) parted.push(`${differ}/${themes.length} themes read apart what a reader meets as one: ${relation.what} (${carried.join(' vs ')})`);
  }

  const fused = [];
  for (const relation of ALIKE) {
    const alike = themes.filter((t) => new Set(relation.scopes.map((sc) => colourOf(t, sc))).size === 1).length;
    if (alike < relation.least) fused.push(`${alike}/${themes.length} themes read as one (wants ${relation.least}): ${relation.what}`);
  }

  const flattened = [];
  for (const relation of APART) {
    // A scope no rule reaches paints as the editor's own foreground, which a reader sees as a
    // colour like any other — so an unpainted scope counts as one, and two unpainted scopes
    // count as the same one.
    const apart = themes.filter((t) => new Set(relation.scopes.map((s) => colourOf(t, s))).size >= relation.scopes.length).length;
    if (apart < relation.least) flattened.push(`${apart}/${themes.length} themes tell apart (wants ${relation.least}): ${relation.what}`);
  }

  console.log(`colour-witness  ${scopes.size} scope(s) over ${themes.length} theme(s)`);
  console.log(`  ${String(split.length + parted.length).padStart(4)}  thing(s) a reader meets as one and a theme paints apart, of ${pairs.length + TOGETHER.length}`);
  console.log(`  ${String(flattened.length).padStart(4)}  declared distinction(s) too few themes can show, of ${APART.length}`);
  console.log(`  ${String(fused.length).padStart(4)}  declared unity(ies) too few themes can show, of ${ALIKE.length}`);
  console.log(`  ${String(missing.length + shrunk.length).padStart(4)}  relation(s) that stopped checking anything`);
  for (const line of [...split, ...parted, ...flattened, ...fused, ...missing, ...shrunk].slice(0, verbose ? 12 : 3)) console.log(`     ${line}`);
  process.exit(split.length || parted.length || flattened.length || fused.length || missing.length || shrunk.length ? 1 : 0);
}
