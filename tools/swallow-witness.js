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
//   node tools/swallow-witness.js [--verbose]

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

/** Does TiddlyWiki build a quoteblock after the blank line? */
function parserStops(opener) {
  const out = execFileSync('node', [path.join(ROOT, 'tools', 'tw5-oracle.js'), '--text', specimen(opener)],
    { encoding: 'utf8', cwd: ROOT });
  return /quoteblock/.test(out);
}

/** Does the grammar colour a quoteblock after the blank line? */
function grammarStops(dir, opener, index) {
  const file = path.join(dir, `swallow-${index}.tw`);
  fs.writeFileSync(file, specimen(opener));
  return file;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'swallow-'));
const files = OPENERS.map((o, i) => grammarStops(scratch, o, i));
const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
  { encoding: 'utf8', cwd: ROOT }).trim().split('\n').filter(Boolean);
execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...files],
  { cwd: ROOT, stdio: 'ignore' });

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
console.log(`swallow-witness  ${OPENERS.length} opener(s), ${findings.length} that run past a block boundary the parser respects`);
process.exit(findings.length === 0 ? 0 : 1);
