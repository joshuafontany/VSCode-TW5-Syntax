#!/usr/bin/env node
// Whether a reader can tell one construct from another, at a glance.
//
// Every other colour instrument here reads SCOPES. `colour-witness` asks whether an opener and its
// closer paint alike and whether declared distinctions survive; `theme-parity` asks whether a
// construct reaches themes at all. None of them asks the question a reader actually asks: does a
// call look like a filter run, does a transclusion look like a wikilink.
//
// The two come apart. Measured over the bundled themes, the CONTAINER scope of a call, a filter run,
// a transclusion and prose each resolve to one colour — no theme rule reaches `meta.variable.call.*`
// or `meta.transclusion.*`, so all four fall through to the default and 44 of 65 themes paint the
// containers identically. Reading that alone says a reader meets four constructs in one ink. Reading
// the WHOLE construct says the opposite, because the distinction rides entirely on the punctuation
// and name scopes inside. A gate built on containers would have ruled a healthy grammar broken.
//
// THE POPULATION COMES FROM THE HOST. `$tw.modules.types.wikirule` names every rule TiddlyWiki
// stands and the harvest in the edition records that answer, so the constructs measured here are
// the ones the host declares rather than the ones somebody thought to list. A hand-written
// enumeration cannot notice what it missed: the seven specimens this held before carried no
// emphasis at all, and emphasis turned out to hold the weakest reading in the whole table. A rule
// the host adds arrives here unmeasured and SAYS SO rather than passing blind.
//
// What stays declared is a NAME and a SPECIMEN per rule, and which rules a reader meets as one
// construct — a judgement no measurement settles. Neither adds a member the host did not name.
//
// THE READING CARRIES fontStyle. A reader tells bold from italic instantly, and both wear the same
// foreground in most themes: measured on foreground alone, bold parts from italic in 23 of 65 and
// this gate would have called a healthy grammar broken again, one family further along. Foreground
// and fontStyle together read 56.
//
//   node tools/construct-legibility.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { loadThemesByName, styleOf, colourOf } = require('./theme-model.js');
const { readData } = require('./wiki-data.js');

/** Whether a theme rules on a bare family root, which reaches every scope beginning there. */
const paintsRoot = (root, theme) => Boolean(colourOf(root, theme));

const verbose = process.argv.includes('--verbose');
const FLOOR = path.join(ROOT, 'corpus', 'legibility-floor.txt');

// One specimen per rule the host stands, and the name a reader knows it by. The name names; it
// never admits a member. Each specimen stands minimal — a longer one borrows colour from whatever
// else it carries — and must paint ink beyond the base scope, which the run below checks.
const CONSTRUCTS = {
  bold: ['bold', "''bold text''"],
  codeblock: ['a code block', '```\ncode here\n```'],
  codeinline: ['a code span', '`some code`'],
  commentblock: ['a comment', '<!-- a comment -->'],
  conditional: ['a conditional', '<% if [{x}] %>yes<% endif %>'],
  dash: ['a dash', 'one -- two'],
  entity: ['an entity', '&amp;'],
  extlink: ['a bare external link', 'https://example.com'],
  filteredtranscludeblock: ['a filter run', '{{{ [tag[x]sort[y]] }}}'],
  fnprocdef: ['a procedure definition', '\\procedure greet(who) Hello'],
  hardlinebreaks: ['a hard-linebreak run', '"""\nline one\n"""'],
  heading: ['a heading', '! A heading'],
  horizrule: ['a horizontal rule', '---'],
  html: ['a widget', '<$link to="x">go</$link>'],
  image: ['an image', '[img[picture.png]]'],
  import: ['an import directive', '\\import [tag[Macro]]'],
  italic: ['italic', '//italic text//'],
  list: ['a list item', '* an item'],
  macrocallblock: ['a call', '<<myproc param:"v">>'],
  macrodef: ['a macro definition', '\\define greet(who) Hello'],
  mvvdisplayinline: ['a multi-value display', '((varname))'],
  parameters: ['a parameters directive', '\\parameters(who:"world")'],
  parsermode: ['a parsermode directive', '\\parsermode block'],
  prettyextlink: ['a captioned external link', '[ext[Caption|https://example.com]]'],
  prettylink: ['a wikilink', '[[Some Title]]'],
  quoteblock: ['a quote block', '<<<\nquoted line\n<<<'],
  rules: ['a rules directive', '\\rules except html'],
  strikethrough: ['strikethrough', '~~struck out~~'],
  styleblock: ['a styled block', '@@color:red;\nstyled\n@@'],
  styleinline: ['a styled span', '@@color:red;styled@@'],
  subscript: ['subscript', ',,subscript,,'],
  superscript: ['superscript', '^^superscript^^'],
  syslink: ['a system link', '$:/core/ui/PageTemplate'],
  table: ['a table row', '|cell one|cell two|'],
  transcludeblock: ['a transclusion', '{{SomeTiddler}}'],
  typedblock: ['a typed block', '$$$text/html\n<b>x</b>\n$$$'],
  underscore: ['underline', '__underlined__'],
  whitespace: ['a whitespace directive', '\\whitespace trim'],
  wikilink: ['a CamelCase link', 'HelloThere'],
  wikilinkprefix: ['a suppressed link', '~HelloThere']
};

// Rules a reader meets as ONE construct. TiddlyWiki splits four of them by POSITION — the same
// syntax read in block context and in inline context — and a reader meets one thing either way.
// This is the only place a host rule leaves the table, and it names the rule that carries it.
const TOGETHER = {
  commentinline: 'commentblock',
  filteredtranscludeinline: 'filteredtranscludeblock',
  macrocallinline: 'macrocallblock',
  transcludeinline: 'transcludeblock'
};

// The baseline every construct answers to. Prose stands outside the host's rule list by nature —
// it names what the parser builds when NO rule fires — so it is declared, and the run below checks
// that it paints no ink, which is the control the specimens are read against.
const PROSE = ['prose', 'an ordinary sentence here'];

/** Whether a scope belongs to the ground every specimen stands on rather than to a construct. */
const isBase = (scope) => /^(text\.html\.tiddlywiki5$|meta\.paragraph\.)/.test(scope);

/**
 * The look one theme gives a specimen, as a set — what a reader takes in at a glance.
 *
 * FOREGROUND AND fontStyle BOTH. A reader tells bold from italic without reading a word, and most
 * themes carry that difference in fontStyle alone; foreground by itself reports 23 of 65.
 */
/**
 * How a specimen LOOKS under one theme: the set of foreground/fontStyle pairs its tokens resolve to.
 *
 * A SUBSTITUTION PRICES A NAME WITHOUT MOVING IT. `substitute` appends a candidate scope to any stack
 * already carrying a published one, so a caller can ask what a naming fork would cost before anybody
 * edits a grammar — the same question this gate answers after the fact, asked by the same reading.
 * Measured, that order matters: one fork halved a construct's prose readings and dropped four declared
 * distinctions below their floors, and the cost only showed once the grammar carried it.
 *
 * @param {{scopes: string[]}[]} tokens
 * @param {object} theme
 * @param {{find: string, append: string}} [substitute]
 */
const look = (tokens, theme, substitute) => {
  const looks = new Set(tokens.map((token) => {
    const scopes = substitute && token.scopes.some((s) => s === substitute.find || s.startsWith(`${substitute.find}.`))
      ? [...token.scopes, substitute.append]
      : token.scopes;
    const style = styleOf(scopes, theme);
    return `${style.foreground || '-'}/${style.fontStyle || '-'}`;
  }));
  return [...looks].sort().join('|');
};

/**
 * Every construct pair, with how many themes tell the two apart — optionally under a substitution.
 *
 * The gate below reads this with no substitution and holds the answers to their floors; the family
 * atlas reads it with one to price a candidate. Neither carries a second copy of the reading.
 *
 * @param {{find: string, append: string}} [substitute]
 * @returns {Promise<{readings: [string, number][], themes: number, seated: Map<string, number>}>}
 */
async function pairsApart(substitute) {
  const themes = [...loadThemesByName().entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const entries = { ...CONSTRUCTS, __prose: PROSE };
  const painted = {};
  const label = {};
  for (const [rule, [reads, source]] of Object.entries(entries)) {
    const tokens = (await tokenize('text.html.tiddlywiki5', source)).flat();
    label[rule] = reads;
    painted[rule] = themes.map(([, theme]) => look(tokens, theme, substitute));
  }
  const names = Object.keys(CONSTRUCTS);
  const readings = [];
  for (const rule of names) {
    readings.push([`${label[rule]}  vs  prose`,
      painted[rule].filter((c, i) => c !== painted.__prose[i]).length]);
  }
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      readings.push([`${label[names[i]]}  vs  ${label[names[j]]}`,
        painted[names[i]].filter((c, k) => c !== painted[names[j]][k]).length]);
    }
  }
  return { readings, themes: themes.length, seated: seatedFloors() };
}

/** The floor each pair must hold, as the corpus seats them. */
function seatedFloors() {
  const seated = new Map();
  if (!fs.existsSync(FLOOR)) return seated;
  for (const raw of fs.readFileSync(FLOOR, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf(' ');
    if (at > 0) seated.set(line.slice(at + 1).trim(), Number(line.slice(0, at)));
  }
  return seated;
}

module.exports = { look, pairsApart, seatedFloors, CONSTRUCTS, PROSE };

// The deciding halves above answer to a caller; the gate below answers to a run.
if (require.main !== module) return;

(async () => {
  const themes = [...loadThemesByName().entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!themes.length) {
    console.error('  no bundled themes — run npm install');
    process.exitCode = 2;
    return;
  }

  // THE HOST DECLARES THE POPULATION. A rule it stands and this table never measures reads as a
  // construct nobody checked; a rule this table names and the host dropped reads as a specimen
  // outliving what it explains. Both fail, the same way an unseated floor does.
  const { data: signals } = readData('GrammarSignals.tid');
  const host = new Set(signals.wikiRules || []);
  const named = new Set([...Object.keys(CONSTRUCTS), ...Object.keys(TOGETHER)]);
  const unmeasured = [...host].filter((rule) => !named.has(rule)).sort();
  const orphaned = [...named].filter((rule) => !host.has(rule)).sort();

  const specimens = { ...CONSTRUCTS, __prose: PROSE };
  const painted = {};
  const claimed = {};
  const label = {};
  const dead = [];
  const inert = [];
  for (const [rule, [reads, source]] of Object.entries(specimens)) {
    // THE SPECIMEN CARRIES NO TRAILING NEWLINE. A trailing one splits into an empty last line, and
    // vscode-textmate hands an empty line a token of width 1 for the newline it stands in front of
    // — base scope, no character painted. Flattened in, that token adds the DEFAULT colour to every
    // specimen's look and collapses distinctions that stand: measured on `snazzy-light`, a filter
    // run and a transclusion each painted `#ADB1C2` and `#CF9C00`, the filter run alone carried an
    // unpainted space, and the phantom handed the transclusion that third look for free. The pair
    // read 63 of 65 without it and 62 with. A zero-width filter does not catch it; not asking for
    // the line does.
    const tokens = (await tokenize('text.html.tiddlywiki5', source)).flat();
    label[rule] = reads;
    painted[rule] = themes.map(([, theme]) => look(tokens, theme));
    const scopes = tokens.flatMap((token) => token.scopes).filter((scope) => !isBase(scope));
    claimed[rule] = scopes;
    // A specimen that fails to fire its rule measures PROSE under a construct's name and reports a
    // healthy pair. Prose carries the same check inverted: ink under it would make the baseline a
    // construct.
    if (rule === '__prose') { if (scopes.length) inert.push(`${reads} paints ${scopes.length} scope(s) beyond the base, so the baseline is not prose`); }
    else if (!scopes.length) dead.push(`${reads} — the specimen ${JSON.stringify(source)} paints no scope beyond the base, so it measures prose`);
  }

  const names = Object.keys(CONSTRUCTS);
  const readings = [];
  for (const rule of names) {
    const apart = painted[rule].filter((c, i) => c !== painted.__prose[i]).length;
    readings.push([`${label[rule]}  vs  prose`, apart]);
  }
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const apart = painted[names[i]].filter((c, k) => c !== painted[names[j]][k]).length;
      readings.push([`${label[names[i]]}  vs  ${label[names[j]]}`, apart]);
    }
  }

  // A FLOOR PER PAIR. One floor on the weakest pair cannot see a loss anywhere else: stripping a
  // call of every name a theme rules on left the weakest pair exactly where it stood, and the gate
  // held. A pair carrying no floor line fails until somebody seats it, so a construct joining the
  // list arrives unratcheted and says so rather than passing blind.
  const seated = seatedFloors();

  const fallen = [];
  const unseated = [];
  for (const [pair, apart] of readings) {
    if (!seated.has(pair)) { unseated.push(pair); continue; }
    if (apart < seated.get(pair)) fallen.push(`${pair} — ${apart}/${themes.length} tell them apart, below the floor of ${seated.get(pair)}`);
  }

  if (verbose) {
    for (const [pair, apart] of [...readings].sort((a, b) => a[1] - b[1])) {
      console.log(`  ${String(apart).padStart(3)}/${themes.length}  ${pair}${seated.has(pair) ? '' : '   (no floor seated)'}`);
    }
    // FAMILY PRESSURE, reported and never ratcheted. A theme rule naming a one-segment root reaches
    // every construct whose scopes start there, so constructs sharing a root that themes rule on
    // get pulled toward one colour and a deeper rule has to pull them back. A ratchet wants a
    // direction the tree can move in, and a family root is a naming decision rather than a number,
    // so this reads and judges nothing.
    console.log('  family pressure — constructs claiming a one-segment root, and themes ruling on it:');
    const families = new Map();
    for (const rule of names) {
      for (const scope of new Set(claimed[rule])) {
        const root = scope.split('.')[0];
        if (root === 'text') continue;
        if (!families.has(root)) families.set(root, new Set());
        families.get(root).add(label[rule]);
      }
    }
    for (const [root, holders] of [...families].sort((a, b) => b[1].size - a[1].size)) {
      const rules = themes.filter(([, theme]) => paintsRoot(root, theme)).length;
      console.log(`    ${String(holders.size).padStart(2)} construct(s), ${String(rules).padStart(2)}/${themes.length} themes rule on \`${root}\``);
    }
  }
  for (const d of dead) console.error(`  ${d}`);
  for (const i of inert) console.error(`  ${i}`);
  for (const u of unmeasured) console.error(`  ${u} — TiddlyWiki stands this rule and no specimen measures it`);
  for (const o of orphaned) console.error(`  ${o} — no rule of this name stands in the harvest, so the specimen outlives what it explains`);
  for (const f of fallen) console.error(`  ${f}`);
  for (const u of unseated) console.error(`  ${u} — no floor stands, so nothing ratchets it`);
  const weakest = readings.reduce((a, b) => (b[1] < a[1] ? b : a));
  const held = !fallen.length && !unseated.length && !unmeasured.length && !orphaned.length && !dead.length && !inert.length;
  console.log(`construct-legibility  ${names.length} construct(s) from ${host.size} host rule(s), ${readings.length} pair(s) over ${themes.length} theme(s), ${fallen.length} fallen, ${unseated.length} unseated, weakest ${weakest[1]}/${themes.length}`);
  console.log(`  ${weakest[0]}`);
  // A VERDICT SET, NEVER AN EXIT CALLED. `process.exit` abandons whatever stdout has not drained, and
  // this witness prints 820 lines: measured under CPU contention, six runs returned 171, 742 and 820
  // pairs with an exit status of 0 every time, so a reader could not tell a short reading from a
  // complete one. Setting the code lets the loop drain and the process leave on its own.
  process.exitCode = held ? 0 : 1;
})();
