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
// The relations live in the edition, at $:/tw5-syntax/ReaderRelations, because each one answers a
// question no registry answers: would a reader want these two styled differently, and would a
// reader meet these as one thing? A list of those inside a tool stands where nobody argues over
// it, and each entry carries the reason it stands — which the wiki shows and a comment cannot.
//
// TOGETHER holds a thing met as one, found over a specimen. ALIKE holds named scopes that must
// share a colour. APART holds a distinction a reader needs. A relation naming a scope no grammar
// emits stops checking anything, whichever list it sits in.
const { readData } = require('./wiki-data.js');
let RELATIONS;
try {
  RELATIONS = readData('ReaderRelations').data;
} catch (e) {
  // A gate that cannot read its own declarations must stop, never report agreement with nothing.
  console.error(`  ${e.message}`);
  process.exit(2);
}
const TOGETHER = RELATIONS.together;
const ALIKE = RELATIONS.alike;
const APART = RELATIONS.apart;


const { loadThemes, colourOf: paintOf } = require('./theme-model.js');

/** The colour a theme paints a scope, by its most specific matching rule. */
const colourOf = (theme, scope) => paintOf(scope, theme);

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
  const themes = loadThemes();

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
