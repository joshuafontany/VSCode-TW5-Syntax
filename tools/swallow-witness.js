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
// Not every construct stops there, and a table of guesses misreports: `"""` opens hard line
// breaks, which TiddlyWiki itself carries to the end of the source. So this asks the parser what
// it does with each opener rather than holding a table of answers, and reports only where the two
// disagree.
//
// THE OTHER DIRECTION. A bound that contains a runaway can also cut a construct the parser
// carries whole. TiddlyWiki's filtered transclude matches across blank lines — its regexp reads
// `[^\|]+?`, which takes newlines — so a bound at the first blank line ends a block the parser
// keeps open. Measured when that bound landed here: it cost 1004 spans across four specimens
// their filter scoping and manufactured 89 link claims out of filter operands.
//
// So every opener runs twice: once left unterminated, and once CLOSED with a blank line inside.
// A grammar must stop where the parser stops AND carry on where the parser carries on.
//
//   node tools/swallow-witness.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { grammarArgs } = require('./tokenizer.js');

const ROOT = path.resolve(__dirname, '..');
const verbose = process.argv.includes('--verbose');

// Openers TiddlyWiki defines, each written unterminated. A battery derived from the grammar's own
// regexes reads whatever the grammar happens to spell and so cannot catch a rule the grammar
// spells wrongly; these come from the parser's rule list.
const OPENERS = ['@@style;', "''", '//', '__', '^^', ',,', '~~', '`', '[[', '{{', '{{{', '<<',
  '$(', '${', '"""', '[img[', '[ext[', '<$widget', '--', '!!!', '|', '*', '>', ';', '@@'];

// The block that follows. A quoteblock reads well here: it opens and closes on its own line, and
// both the parser and the grammar name it plainly.
const AFTER = '<<<\nQuoted\n<<<';
const specimen = (opener) => `text ${opener} unterminated\n\n${AFTER}\n`;

// Each opener with the closer that shuts it, and a blank line between. Only openers with a
// closer ride this second battery; a marker that opens a line has nothing to close.
const CLOSERS = {
  '{{{': '}}}', '{{': '}}', '[[': ']]', '[img[': ']]', '[ext[': ']]',
  '@@style;': '@@', '@@': '@@', "''": "''", '//': '//', '__': '__', '^^': '^^',
  ',,': ',,', '~~': '~~', '`': '`', '$(': ')$', '${': '}$', '<<': '>>'
};
const closedSpecimen = (opener) => `${opener}\n\nbody\n\n${CLOSERS[opener]}\n`;

/**
 * What TiddlyWiki built from one specimen.
 *
 * A refusal reads loudly here. The two readings below test a regex against the output, so an
 * oracle that died would answer every question with "no" and the witness would report the parser
 * agreeing with the grammar everywhere.
 *
 * @param {string} text
 * @returns {string}
 */
function askOracle(text) {
  const { code, out } = runTool('tw5-oracle.js', ['--text', text]);
  if (code !== 0) throw new Error(`the oracle refused a specimen, so no reading below stands:\n${out}`);
  return out;
}

/** Does TiddlyWiki build a quoteblock after the blank line? */
function parserStops(opener) {
  return /quoteblock/.test(askOracle(specimen(opener)));
}

/** Does the grammar colour a quoteblock after the blank line? */
function grammarStops(dir, opener, index) {
  const file = path.join(dir, `swallow-${index}.tw`);
  fs.writeFileSync(file, specimen(opener));
  return file;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'swallow-'));
const files = OPENERS.map((o, i) => grammarStops(scratch, o, i));
const grammars = grammarArgs();
execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...files],
  { cwd: ROOT, stdio: 'ignore' });

// A closed construct: does the parser keep ONE node across the blank line, and does the grammar
// keep one region? The parser's answer comes from whether it names the construct's own rule at
// the far side of the blank line.
const closedOpeners = OPENERS.filter((o) => CLOSERS[o]);
const closedFiles = closedOpeners.map((o, i) => {
  const file = path.join(scratch, `closed-${i}.tw`);
  fs.writeFileSync(file, closedSpecimen(o));
  return file;
});
if (closedFiles.length) {
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...closedFiles],
    { cwd: ROOT, stdio: 'ignore' });
}

/** Does TiddlyWiki carry one construct across the blank line? */
function parserCarries(opener) {
  const out = askOracle(closedSpecimen(opener));
  // The word `body` sits past the blank line. The parser carries the construct when the FIRST
  // node it names names something other than a plain block stopping at the opener.
  return !/^element<p> \[parseblock\] @0-\d+\n\s+text "[^"]*"\n(?!\s)/.test(out) && !/parseblock/.test(out.split('\n')[0]);
}

const carryFindings = [];
closedOpeners.forEach((opener, i) => {
  const snap = fs.readFileSync(`${closedFiles[i]}.snap`, 'utf8');
  // The grammar carries it when the line past the blank line still stands inside a region the
  // opener began, rather than falling back to a paragraph of its own.
  const carries = !/^>body\n#\^+ text\.html\.tiddlywiki5 meta\.paragraph/m.test(snap);
  const parser = parserCarries(opener);
  if (verbose) {
    console.log(`  ${opener.padEnd(9)} closed: parser ${parser ? 'carries' : 'stops  '}   grammar ${carries ? 'carries' : 'stops'}`);
  }
  if (parser && !carries) carryFindings.push(opener);
});

const findings = [];
OPENERS.forEach((opener, i) => {
  const snap = fs.readFileSync(`${files[i]}.snap`, 'utf8');
  const grammar = /quoteblock/.test(snap);
  const parser = parserStops(opener);
  if (verbose) {
    console.log(`  ${opener.padEnd(9)} parser ${parser ? 'stops ' : 'runs on'}   grammar ${grammar ? 'stops' : 'runs on'}`);
  }
  if (parser && !grammar) findings.push(opener);
});
fs.rmSync(scratch, { recursive: true, force: true });

for (const opener of findings) {
  console.error(`  ${JSON.stringify(opener)} unterminated takes the block after the blank line; TiddlyWiki parses it`);
}
for (const opener of carryFindings) {
  console.error(`  ${JSON.stringify(opener)} closed stops at the blank line; TiddlyWiki carries it across`);
}
const total = findings.length + carryFindings.length;
console.log(`swallow-witness  ${OPENERS.length} opener(s) unterminated and ${closedOpeners.length} closed, `
  + `${total} that read the block boundary differently from the parser`);
process.exit(total === 0 ? 0 : 1);
