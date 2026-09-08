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
// the WHOLE construct says the opposite: every one of them reads differently from prose in all 65,
// because the distinction rides entirely on the punctuation and name scopes inside. A gate built on
// containers would have ruled a healthy grammar broken.
//
// So this paints whole specimens and compares what a reader sees. A pair that stops being
// distinguishable names a real loss no snapshot catches: scopes can move, stay pinned, stay
// faithful to the parser, and cost a reader the difference between two constructs.
//
// WHICH constructs a reader must tell apart asks a judgement no measurement settles, so the
// specimens stand declared — the same reason `colour-witness` declares its distinctions rather than
// deriving them. The FLOOR each pair holds comes from measurement.
//
//   node tools/construct-legibility.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, tokenize } = require('./tokenizer.js');
const { loadThemesByName, winner, colourOf } = require('./theme-model.js');

/** Whether a theme rules on a bare family root, which reaches every scope beginning there. */
const paintsRoot = (root, theme) => Boolean(colourOf(root, theme));

const verbose = process.argv.includes('--verbose');
const FLOOR = path.join(ROOT, 'corpus', 'legibility-floor.txt');

// One specimen per construct a reader meets constantly and must not confuse. Each stands minimal:
// a longer specimen borrows colour from whatever else it carries.
const CONSTRUCTS = {
  'a call': '<<myproc param:"v">>',
  'a filter run': '{{{ [tag[x]sort[y]] }}}',
  'a transclusion': '{{SomeTiddler}}',
  'a widget': '<$link to="x">go</$link>',
  'a wikilink': '[[Some Title]]',
  'a code span': '`some code`',
  'prose': 'an ordinary sentence here'
};

/** The colours one theme paints a specimen, as a set — what a reader takes in at a glance. */
const look = (tokens, theme) => {
  const colours = new Set(tokens.map((token) => {
    const rule = winner(token.scopes, theme);
    return (rule && rule.settings && rule.settings.foreground) || '-';
  }));
  return [...colours].sort().join('|');
};

(async () => {
  const themes = [...loadThemesByName().entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!themes.length) {
    console.error('  no bundled themes — run npm install');
    process.exit(2);
  }

  const painted = {};
  const claimed = {};
  for (const [name, source] of Object.entries(CONSTRUCTS)) {
    const lines = await tokenize('text.html.tiddlywiki5', `${source}\n`);
    painted[name] = themes.map(([, theme]) => look(lines[0], theme));
    claimed[name] = lines[0].flatMap((token) => token.scopes).filter((sc) => !/^meta\.paragraph\./.test(sc));
  }

  const names = Object.keys(CONSTRUCTS).filter((n) => n !== 'prose');
  const readings = [];
  for (const name of names) {
    const apart = painted[name].filter((c, i) => c !== painted.prose[i]).length;
    readings.push([`${name}  vs  prose`, apart]);
  }
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const apart = painted[names[i]].filter((c, k) => c !== painted[names[j]][k]).length;
      readings.push([`${names[i]}  vs  ${names[j]}`, apart]);
    }
  }

  // A FLOOR PER PAIR. One floor on the weakest pair cannot see a loss anywhere else: stripping a
  // call of every name a theme rules on left the weakest pair — a code span against prose — exactly
  // where it stood, and the gate held. A pair carrying no floor line fails until somebody seats it,
  // so a construct joining the list arrives unratcheted and says so rather than passing blind.
  const seated = new Map();
  if (fs.existsSync(FLOOR)) {
    for (const raw of fs.readFileSync(FLOOR, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const at = line.indexOf(' ');
      if (at > 0) seated.set(line.slice(at + 1).trim(), Number(line.slice(0, at)));
    }
  }

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
    // get pulled toward one colour and a deeper rule has to pull them back. Measured: `string` is
    // claimed by five of these constructs and 62 of 65 themes rule on the bare root, which is the
    // pressure behind every weak pair here; `markup` is claimed by two and one theme rules on its
    // root, which is why a raw span takes its name from that family and collides with nothing. A
    // ratchet wants a direction the tree can move in, and a family root is a naming decision rather
    // than a number, so this reads and judges nothing.
    console.log('  family pressure — constructs claiming a one-segment root, and themes ruling on it:');
    const families = new Map();
    for (const [name, source] of Object.entries(CONSTRUCTS)) {
      if (name === 'prose') continue;
      for (const scope of new Set(claimed[name])) {
        const root = scope.split('.')[0];
        if (root === 'text') continue;
        if (!families.has(root)) families.set(root, new Set());
        families.get(root).add(name);
      }
    }
    for (const [root, holders] of [...families].sort((a, b) => b[1].size - a[1].size)) {
      const rules = themes.filter(([, theme]) => themes && paintsRoot(root, theme)).length;
      console.log(`    ${holders.size} construct(s), ${String(rules).padStart(2)}/${themes.length} themes rule on \`${root}\`   ${[...holders].join(', ')}`);
    }
  }
  for (const f of fallen) console.error(`  ${f}`);
  for (const u of unseated) console.error(`  ${u} — no floor stands, so nothing ratchets it`);
  const weakest = readings.reduce((a, b) => (b[1] < a[1] ? b : a));
  console.log(`construct-legibility  ${readings.length} pair(s) over ${themes.length} theme(s), ${fallen.length} fallen, ${unseated.length} unseated, weakest ${weakest[1]}/${themes.length}`);
  console.log(`  ${weakest[0]}`);
  process.exit(fallen.length === 0 && unseated.length === 0 ? 0 : 1);
})();
