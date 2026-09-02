// A memetic construct leaves the wikitext after it alone.
//
// The bleed canary appends a sentence to the END of a sample and catches a construct that
// swallows to the end of the file. A construct that corrupts the paragraph after it and then
// recovers passes that canary untouched, and the dialect adds eleven opening constructs the
// wikitext grammar has no rule for.
//
// This puts an ordinary sentence after EVERY construct the dialect opens on, and asks that each
// sentence carry a paragraph and nothing else. The construct list comes from the grammar's own
// top-level patterns, so a rule added later joins the probe without anybody remembering it.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SENTENCE = 'An ordinary sentence stands here.';

/** One specimen of each construct, taken from the rule's own opening pattern. */
const SPECIMENS = {
  declaration: '<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///probe >>',
  'control-soh': '<<^ code="&#x0001;" >>',
  'control-stx': '<<^ code="&#x0002;" >>',
  'control-etx': '<<^ code="&#x0003;" >>',
  'control-eot': '<<^ code="&#x0004;" >>',
  'control-other': '<<^ >>',
  'sigil-close': '<<~/ahu >>',
  'sigil-unresolved': '<<~? >>',
  'sigil-pragma': '<<~! pragma >>',
  sigil: '<<~ ahu #x >>',
  'lar-uri': 'A lar:///a/b?k=v#/frag stands inline.'
};

const grammar = JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', 'memetic-wikitext.json'), 'utf8'));
const opens = (grammar.repository.memetic.patterns || []).map((p) => String(p.include).replace('#', ''));

const grammars = (() => {
  try {
    return execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch { return []; }
})();

/** Every annotation over a given line's text, as scope lists. */
function annotationsOver(snapshot, needle) {
  const out = [];
  let line = null;
  for (const text of fs.readFileSync(snapshot, 'utf8').split('\n')) {
    if (text.startsWith('>')) { line = text.slice(1); continue; }
    const m = text.match(/^#\s*\^+ (.*)/);
    if (m && line && line.includes(needle)) out.push(m[1].split(/\s+/));
  }
  return out;
}

test('every construct the dialect opens on carries a specimen', () => {
  const missing = opens.filter((rule) => !(rule in SPECIMENS));
  assert.deepStrictEqual(missing, [], `the dialect opens on rule(s) this probe never writes: ${missing.join(', ')}`);
});

test('a construct leaves the paragraph after it alone', { skip: grammars.length ? false : 'no grammar list', timeout: 600000 }, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-contain-'));
  const file = path.join(scratch, 'probe.mem');
  fs.writeFileSync(file, opens.map((r) => `${SPECIMENS[r]}\n\n${SENTENCE}\n`).join('\n'));
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', grammar.scopeName, '-u', file],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });

  const foreign = annotationsOver(`${file}.snap`, SENTENCE)
    .map((scopes) => scopes.filter((s) => !s.startsWith('text.html.tiddlywiki5') && !s.includes('paragraph')))
    .filter((extra) => extra.length);
  fs.rmSync(scratch, { recursive: true, force: true });

  assert.ok(opens.length > 5, `the dialect opens on ${opens.length} construct(s) — the reader stopped matching`);
  assert.deepStrictEqual(
    foreign.slice(0, 4), [],
    `${foreign.length} span(s) after a construct carry scopes the construct should have closed`
  );
});
