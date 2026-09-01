// The witness must find a swallow, and must not invent one.
//
// A witness reporting zero reads the same whether the grammar holds every bound or the witness
// stopped looking. Both halves get checked here: an opener the parser carries to end-of-source
// must draw no report, and a rule stripped of its bound must draw one.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
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
  assert.match(out, /0 that run past a block boundary/, out.slice(-400));
  assert.strictEqual(code, 0);
});

test('an opener the parser carries to end-of-source reads as agreement', live, () => {
  // Hard line breaks run to the end of the source in TiddlyWiki itself, so a grammar running on
  // there agrees with the parser. A witness holding a table of answers instead of asking would
  // report this one.
  const { out } = run();
  assert.match(out, /"""\s+parser runs on\s+grammar runs on/,
    'the witness must read the parser rather than assume every opener stops');
});

// The collision runs against a COPY. Writing the real grammar to provoke a failure hands every
// other test a different grammar mid-run, and a restore that loses a race leaves the provocation
// standing in the tree.
test('a rule stripped of its bound reads as a swallow', live, () => {
  // Every block bound at once, not one rule's. Stripping a single rule stopped provoking the
  // moment a second rule bounded the same opener, and the collision then proved nothing while
  // reading green — measured on the inline style run, which the style BLOCK also bounds.
  const provoked = fs.readFileSync(GRAMMAR, 'utf8').split('|(?=^$)').join('');
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'swallow-collide-'));
  try {
    execFileSync('git', ['worktree', 'add', '-q', '--detach', sandbox, 'HEAD'], { cwd: ROOT });
    fs.rmSync(path.join(sandbox, 'node_modules'), { recursive: true, force: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));
    fs.writeFileSync(path.join(sandbox, 'syntaxes', 'tiddlywiki5.json'), provoked);
    let out = '';
    let code = 0;
    try {
      out = execFileSync('node', [path.join(sandbox, 'tools', 'swallow-witness.js')],
        { encoding: 'utf8', cwd: sandbox });
    } catch (e) {
      code = e.status;
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    assert.match(out, /"\{\{" unterminated takes the block after the blank line/, out.slice(-600));
    assert.match(out, /[1-9]\d* that run past a block boundary/, out.slice(-200));
    assert.notStrictEqual(code, 0, 'the witness must fail the gate, not only print');
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', sandbox], { cwd: ROOT, stdio: 'ignore' });
  }
});
