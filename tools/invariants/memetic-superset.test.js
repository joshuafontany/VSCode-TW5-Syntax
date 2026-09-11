// memetic-wikitext claims to hold wikitext entire and add to it. This holds it to that.
//
// The dialect includes the wikitext grammar rather than reimplementing it, so the claim looks
// structural — but a TextMate injection keys on a scope name, and a wrapper fires none of the
// wrapped grammar's. Whatever an injection paints, a wrapper loses unless it carries the
// injection too. A dialect missing them loses spans a wikitext file carries — 34 of them across
// this corpus — and the superset claim reads false while every other gate reads green.
//
// A superset may ADD a span, since the dialect carries constructs wikitext has no rule for. It
// may not lose one, and it may not drop a scope from one it keeps.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CORPUS = path.join(ROOT, 'corpus', 'wikitext');

/** Every annotated span in a snapshot, keyed by line and column, carrying its scopes. */
function spans(file) {
  const out = new Map();
  let line = -1;
  for (const text of fs.readFileSync(file, 'utf8').split('\n')) {
    if (text.startsWith('>')) { line += 1; continue; }
    const m = text.match(/^#(\s*)(\^+) (.*)/);
    if (m) out.set(`${line}:${m[1].length}:${m[2].length}`, m[3].split(/\s+/));
  }
  return out;
}

const grammars = (() => {
  try {
    return execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch { return []; }
})();

const live = { skip: grammars.length > 0 && fs.existsSync(CORPUS) ? false : 'no grammar list or no corpus' };

test('a wikitext file reads the same under the dialect that wraps it', { ...live, timeout: 600000 }, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-superset-'));
  const files = fs.readdirSync(CORPUS).filter((f) => f.endsWith('.tw'));
  assert.ok(files.length > 10, `${files.length} wikitext specimen(s) — the corpus went missing`);

  const pairs = files.map((f, i) => {
    const stem = `s${String(i).padStart(2, '0')}`;
    fs.copyFileSync(path.join(CORPUS, f), path.join(scratch, `${stem}.tw`));
    fs.copyFileSync(path.join(CORPUS, f), path.join(scratch, `${stem}.mem`));
    return { source: f, wikitext: path.join(scratch, `${stem}.tw`), memetic: path.join(scratch, `${stem}.mem`) };
  });
  const snap = (scope, targets) =>
    execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...targets],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
  snap('text.html.tiddlywiki5', pairs.map((p) => p.wikitext));
  snap('text.html.tiddlywiki5.memetic-wikitext', pairs.map((p) => p.memetic));

  const lost = [];
  const stripped = [];
  for (const pair of pairs) {
    const base = spans(`${pair.wikitext}.snap`);
    const wrapped = spans(`${pair.memetic}.snap`);
    for (const [at, scopes] of base) {
      const theirs = wrapped.get(at);
      if (!theirs) { lost.push(`${pair.source} at ${at}`); continue; }
      // The root scope names the grammar and differs by design; every other scope must survive.
      const missing = scopes.filter((s) => !theirs.includes(s) && !s.startsWith('text.html.tiddlywiki5'));
      if (missing.length) stripped.push(`${pair.source} at ${at}: ${missing.join(' ')}`);
    }
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  assert.deepStrictEqual(lost.slice(0, 8), [], `${lost.length} span(s) the dialect loses; a superset loses none`);
  assert.deepStrictEqual(stripped.slice(0, 8), [], `${stripped.length} span(s) the dialect strips a scope from`);
});
