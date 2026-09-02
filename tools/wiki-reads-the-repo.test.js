// The wiki reads the repository from where the repository sits.
//
// Five directories reach the edition as tiddlers — `tools/`, `syntaxes/`, `snippets/`, `docs/`
// and `tests/` — through a `tiddlywiki.files` spec that names each one by relative path. No file
// gets copied, so a reader who opens a tiddler looks at the same bytes a gate reads.
//
// This holds that claim by booting the edition and comparing what arrives against what stands on
// disk. It derives its expectation from the specs rather than listing the directories again: a
// spec that starts naming a sixth directory gets checked without anybody editing this, and a spec
// whose regexp stops matching a file shows up as a tiddler that never arrived.
//
// It also holds the hazard the specs carry. A `tiddlywiki.files` REPLACES the scan of the
// directory holding it, so every spec sits alone in a subdirectory of its own; one dropped beside
// the edition's tiddlers stopped it loading them.
//
//   node --test tools/wiki-reads-the-repo.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EDITION = path.join(ROOT, 'editions', 'tw5-syntax');
const TIDDLERS = path.join(EDITION, 'tiddlers');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

// Every `tiddlywiki.files` under the edition, each read as the directory it names and the titles
// it promises.
function specs() {
  const found = [];
  for (const entry of fs.readdirSync(TIDDLERS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const home = path.join(TIDDLERS, entry.name);
    const spec = path.join(home, 'tiddlywiki.files');
    if (!fs.existsSync(spec)) continue;
    const parsed = JSON.parse(fs.readFileSync(spec, 'utf8'));
    for (const dir of parsed.directories) {
      found.push({
        spec: path.relative(ROOT, spec),
        home,
        disk: path.resolve(home, dir.path),
        match: new RegExp(dir.filesRegExp),
        prefix: dir.fields.title.prefix,
        type: dir.fields.type,
      });
    }
  }
  return found;
}

// What the disk offers one spec entry: title to bytes, for the files that can reach the wiki
// under the title the spec names. A `.meta` sidecar takes two files out of that reckoning, and
// `sidecarPairs` collects them instead.
function onDisk(entry) {
  const files = new Map();
  for (const name of fs.readdirSync(entry.disk)) {
    const full = path.join(entry.disk, name);
    if (!fs.statSync(full).isFile()) continue;
    if (!entry.match.test(name)) continue;
    if (name.endsWith('.meta')) continue;
    if (fs.existsSync(full + '.meta')) continue;
    files.set(entry.prefix + name, fs.readFileSync(full));
  }
  return files;
}

// The files a `.meta` sidecar governs, as {file, meta} paths.
function sidecarPairs() {
  const pairs = [];
  for (const entry of specs()) {
    for (const name of fs.readdirSync(entry.disk)) {
      const full = path.join(entry.disk, name);
      if (!fs.statSync(full).isFile() || name.endsWith('.meta')) continue;
      if (fs.existsSync(full + '.meta')) pairs.push({ file: full, meta: full + '.meta', entry });
    }
  }
  return pairs;
}

// What a boot of the edition offers, for every title under the house prefix.
let booted;
function fromTheWiki() {
  if (booted) return booted;
  const host = resolveTiddlyWiki();
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-reads-'));
  try {
    execFileSync('node', [path.join(host, 'tiddlywiki.js'), EDITION, '--output', scratch,
      '--render', '[all[tiddlers]prefix[$:/tw5-syntax/]]', '[encodeuricomponent[]addsuffix[.txt]]',
      'text/plain', '$:/core/templates/plain-text-tiddler'], { cwd: ROOT, stdio: 'ignore' });
    booted = new Map();
    for (const name of fs.readdirSync(scratch)) {
      booted.set(decodeURIComponent(name.slice(0, -'.txt'.length)),
        fs.readFileSync(path.join(scratch, name)));
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return booted;
}

test('every spec names a directory that stands', () => {
  const found = specs();
  assert.ok(found.length >= 5, `${found.length} spec entr(ies) — five directories reach the wiki`);
  for (const entry of found) {
    assert.ok(fs.existsSync(entry.disk), `${entry.spec} names ${entry.disk}, which nothing holds`);
    assert.ok(entry.prefix, `${entry.spec} names a directory and no title prefix`);
  }
});

test('a spec sits alone, so the scan it replaces would have found nothing', () => {
  for (const entry of specs()) {
    const beside = fs.readdirSync(entry.home).filter((n) => n !== 'tiddlywiki.files');
    assert.deepStrictEqual(beside, [],
      `${entry.spec} shares its directory with ${beside.join(', ')} — the spec replaces that scan`);
  }
});

test('every file the specs match arrives in the wiki', () => {
  const wiki = fromTheWiki();
  const missing = [];
  for (const entry of specs()) {
    for (const title of onDisk(entry).keys()) if (!wiki.has(title)) missing.push(title);
  }
  assert.deepStrictEqual(missing, [], `${missing.length} file(s) the specs match, which no boot showed`);
});

test('what the wiki shows carries the bytes the disk holds', () => {
  const wiki = fromTheWiki();
  const parted = [];
  for (const entry of specs()) {
    for (const [title, bytes] of onDisk(entry)) {
      const got = wiki.get(title);
      if (got && !got.equals(bytes)) parted.push(`${title} (disk ${bytes.length}, wiki ${got.length})`);
    }
  }
  assert.deepStrictEqual(parted, [], `${parted.length} tiddler(s) parted from the file behind them`);
});

test('the corpus stays on disk, and a tiddler points at it', () => {
  for (const entry of specs()) {
    assert.notStrictEqual(path.basename(entry.disk), 'corpus',
      `${entry.spec} loads the corpus — the coverage floor already measures those files`);
  }
  const pointer = path.join(TIDDLERS, 'Corpus.tid');
  assert.ok(fs.existsSync(pointer), 'nothing points at the corpus from inside the wiki');
  const text = fs.readFileSync(pointer, 'utf8');
  for (const named of ['corpus/wikitext/', 'corpus/tid/', 'corpus/memetic/', 'coverage-floor.txt']) {
    assert.ok(text.includes(named), `the pointer names no ${named}`);
  }
});

test('a specimen reaches the wiki as characters rather than as what they mean', () => {
  for (const entry of specs()) {
    if (!entry.prefix.startsWith('$:/tw5-syntax/tests/')) continue;
    assert.strictEqual(entry.type, 'text/plain',
      `${entry.prefix} renders as ${entry.type} — an assertion pins characters, not meaning`);
  }
});

test('a `.meta` sidecar takes its pair out of the house namespace', () => {
  // TiddlyWiki's spec loader hard-excludes `*.meta` and merges the sidecar's fields OVER the ones
  // the spec asks for, so a sidecar carrying `title:` names the tiddler and the prefix loses. The
  // pair here holds a deliberately malformed fixture, which names the whole reason it stands.
  const wiki = fromTheWiki();
  for (const pair of sidecarPairs()) {
    const named = path.basename(pair.file);
    assert.ok(!wiki.has(pair.entry.prefix + named),
      `${named} arrived under the prefix — the sidecar stopped governing its title`);
    assert.ok(!wiki.has(pair.entry.prefix + named + '.meta'),
      `${named}.meta arrived as a tiddler — the loader stopped excluding sidecars`);
  }
});
