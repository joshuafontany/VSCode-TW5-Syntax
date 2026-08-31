#!/usr/bin/env node
// What an attribute-list guard would cost, measured rather than asserted.
//
// html.js takes attributes in a loop, stops at the first one parseAttribute declines, and then
// demands a slash or a greater-than there. One stretch that parses as no attribute refuses the
// WHOLE tag. tests/known-gaps/an-unparseable-attribute-refuses-the-tag.tw5.test records three
// shapes that reach this, and the grammar paints all three as working tags.
//
// A TextMate begin pattern CAN express the law. An attribute list is alternation, not recursion,
// so a lookahead over the value forms parseutils.js declares decides the same question. What it
// cannot express is NESTING — a macro value carrying a macro, a filter value carrying a
// transclusion — and that is where the guard and the parser part.
//
// This takes both to every tag in TiddlyWiki's own tiddlers and reports the split, because the
// decision turns on a ratio nobody should freeze into prose:
//
//   TOO LOOSE   the guard admits what the parser refuses. The grammar already does this, so
//               adopting the guard changes nothing here.
//   TOO TIGHT   the guard refuses what the parser BUILDS. Adopting it stops colouring valid
//               content, which is the cost.
//
//   node tools/attribute-guard.js [--verbose]

const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');

// Every value form parseutils.js reads, in its order.
const VALUE = [
  '"""[\\s\\S]*?"""', '"[^"]*"', "'[^']*'",
  '\\[\\[(?:[^\\]]|\\](?!\\]))*\\]\\]',
  '\\{\\{\\{[\\S\\s]+?\\}\\}\\}', '\\{\\{[^}]+\\}\\}',
  '<<[^\\s>"\'=]+[^>]*>>', '\\(\\([^)]*\\)\\)',
  '```[\\s\\S]*?```', '`[^`]*`',
  '(?!<<)(?:>(?!>)|[^\\s>"\'])+'
].join('|');
// reAttributeName excludes a colon, and a colon still reaches a bound name: xmlns:dc and
// xlink:href both arrive whole. The name class here follows what the parser BINDS.
const ATTR = '\\s+[^\\/\\s>"\'`=]+(?:\\s*=\\s*(?:' + VALUE + '))?';
const GUARD = new RegExp('^<\\$?[a-zA-Z0-9$.-]+(?:' + ATTR + ')*\\s*/?>');

exports.GUARD = GUARD;

/**
 * A tag walked to its own close, stepping over quoted values and over `<< >>` pairs.
 *
 * A non-greedy match to the first `>` cuts a tag carrying a macro value in half, and the halves
 * then answer a question nobody asked. Measured: that extraction read 91% agreement where a
 * whole-tag extraction reads 99.95%.
 *
 * @param {string} src
 * @param {number} start
 * @returns {string|null}
 */
function extract(src, start) {
  let i = start + 1;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; i += 1; continue; }
    if (c === '\n') return null;
    if (c === '<' && src[i + 1] === '<') {
      const end = src.indexOf('>>', i);
      if (end < 0) return null;
      i = end + 2;
      continue;
    }
    if (c === '>') return src.slice(start, i + 1);
    i += 1;
  }
  return null;
}

exports.extract = extract;

if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  const tw = resolveTiddlyWiki();
  if (!tw) {
    console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
    process.exit(2);
  }
  const oracle = boot(tw, {});
  const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith('.tid')) out.push(p);
    }
    return out;
  };
  const files = ['editions', 'core', 'plugins', 'themes'].flatMap((d) => walk(path.join(tw, d)));

  let checked = 0;
  let agree = 0;
  let loose = 0;
  let tight = 0;
  const tightCases = new Set();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const blank = text.indexOf('\n\n');
    if (blank < 0) continue;
    const body = text.slice(blank + 2);
    for (const m of body.matchAll(/<\$?[A-Za-z]/g)) {
      const tag = extract(body, m.index);
      if (!tag || tag.length > 200) continue;
      checked += 1;
      const guarded = GUARD.test(tag);
      const read = oracle.readAt(tag, 0, tag.length);
      const built = read.kind !== 'text' && read.kind !== 'none';
      if (guarded === built) { agree += 1; continue; }
      if (guarded) loose += 1;
      else { tight += 1; tightCases.add(tag.slice(0, 96)); }
    }
  }
  console.log(`attribute-guard  ${checked} tag(s), ${agree} agreed (${((100 * agree) / checked).toFixed(2)}%)`);
  console.log(`  ${String(loose).padStart(4)}  the guard admits and the parser refuses — the grammar already does this`);
  console.log(`  ${String(tight).padStart(4)}  the guard refuses and the parser BUILDS — this is what adopting it costs`);
  if (verbose) for (const c of tightCases) console.log(`        ${JSON.stringify(c)}`);
}
