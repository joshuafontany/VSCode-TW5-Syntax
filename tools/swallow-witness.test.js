// The witness must find a swallow, and must not invent one.
//
// A witness reporting zero reads the same whether the grammar holds every bound or the witness
// stopped looking. Both halves get checked here: an opener the parser carries to end-of-source
// must draw no report, and a rule stripped of its bound must draw one.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { runProvoked } = require('./grammar-sandbox.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WITNESS = path.join(ROOT, 'tools', 'swallow-witness.js');
const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');

const run = () => {
  try {
    return { code: 0, out: execFileSync('node', [WITNESS, '--verbose'], { encoding: 'utf8', cwd: ROOT }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const live = { skip: fs.existsSync(WITNESS) ? false : 'no witness', timeout: 600000 };

test('every opener stands bounded where the parser bounds it', live, () => {
  const { code, out } = run();
  assert.match(out, /0 that read the block boundary differently from the parser/, out.slice(-400));
  assert.strictEqual(code, 0);
});

// The other direction. A bound that contains a runaway can cut a construct the parser carries
// whole — measured, one landed here and cost 1004 spans their filter scoping.
test('a closed construct carries across a blank line wherever the parser carries it', live, () => {
  const { out } = run();
  assert.match(out, /\{\{\{\s+closed: parser carries\s+grammar carries/,
    'a terminated filter block spans a blank line in TiddlyWiki and must here');
  assert.match(out, /and \d+ closed/, 'the closed battery must run');
});

test('an opener the parser carries to end-of-source reads as agreement', live, () => {
  // Hard line breaks run to the end of the source in TiddlyWiki itself, so a grammar running on
  // there agrees with the parser. A witness holding a table of answers instead of asking would
  // report this one.
  const { out } = run();
  assert.match(out, /"""\s+parser runs on\s+grammar runs on/,
    'the witness must read the parser rather than assume every opener stops');
});

// The collision runs against a COPY of the working tree, so it exercises the witness as it
// stands now rather than as it stood at the last commit.
test('a rule stripped of its bound reads as a swallow', live, () => {
  // Every block bound at once, not one rule's. Stripping a single rule stopped provoking the
  // moment a second rule bounded the same opener, and the collision then proved nothing while
  // reading green — measured on the inline style run, which the style BLOCK also bounds.
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').split('|(?=^$)').join('');
  const { code, out } = runProvoked(provoked, ['tools/swallow-witness.js']);
  assert.match(out, /"\[img\[" unterminated takes the block after the blank line/, out.slice(-600));
  assert.match(out, /[1-9]\d* that read the block boundary differently/, out.slice(-200));
  assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
});
