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
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

// Distinctions a reader needs to see, and how many themes must show each. A theme paints from its
// own palette and none carries a colour for every family, so a relation asks for a majority
// rather than for all.
const APART = [
  { what: 'a lar: root — heading, angle of approach, carried dynamic',
    scopes: ['entity.name.tag.heading.lar.memetic-wikitext',
             'entity.other.attribute-name.angle.lar.memetic-wikitext',
             'entity.name.function.dynamic.lar.memetic-wikitext'],
    least: 40 },
  { what: 'a link — the text a reader clicks, and the title it reaches',
    scopes: ['markup.underline.link.tiddlywiki5', 'string.entity.other.title.link.tiddlywiki5'],
    least: 40 }
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
  const out = new Set();
  for (const file of fs.readdirSync(path.join(ROOT, 'syntaxes')).filter((f) => f.endsWith('.json'))) {
    const text = fs.readFileSync(path.join(ROOT, 'syntaxes', file), 'utf8');
    for (const m of text.matchAll(/"([a-z][A-Za-z0-9.$_-]*\.(?:tiddlywiki5|memetic-wikitext))"/g)) out.add(m[1]);
  }
  return out;
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

exports.colourOf = colourOf;
exports.declaredScopes = declaredScopes;
exports.openerCloserPairs = openerCloserPairs;
exports.APART = APART;

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
  const missing = APART.flatMap((r) => r.scopes.filter((sc) => !scopes.has(sc)).map((sc) => `${sc} — named by a relation, emitted by no grammar`));
  const PAIR_FLOOR = Number(fs.existsSync(path.join(ROOT, 'corpus', 'colour-pair-floor.txt'))
    ? fs.readFileSync(path.join(ROOT, 'corpus', 'colour-pair-floor.txt'), 'utf8').split('\n')[0].trim() : 0);
  const shrunk = pairs.length < PAIR_FLOOR ? [`${pairs.length} opener/closer pair(s), below the floor of ${PAIR_FLOOR}`] : [];
  const split = [];
  for (const [opener, closer] of pairs) {
    const differ = themes.filter((t) => colourOf(t, opener) !== colourOf(t, closer)).length;
    if (differ) split.push(`${differ}/${themes.length}  ${opener}  vs  ${closer}`);
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
  console.log(`  ${String(split.length).padStart(4)}  opener/closer pair(s) a theme paints apart, of ${pairs.length}`);
  console.log(`  ${String(flattened.length).padStart(4)}  declared distinction(s) too few themes can show, of ${APART.length}`);
  console.log(`  ${String(missing.length + shrunk.length).padStart(4)}  relation(s) that stopped checking anything`);
  for (const line of [...split, ...flattened, ...missing, ...shrunk].slice(0, verbose ? 12 : 3)) console.log(`     ${line}`);
  process.exit(split.length || flattened.length || missing.length || shrunk.length ? 1 : 0);
}
