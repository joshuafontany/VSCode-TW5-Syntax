#!/usr/bin/env node
// Over-reach: where the grammar paints a construct TiddlyWiki refuses.
//
// tools/upstream-coverage.js asks one direction — does the grammar READ what TiddlyWiki
// reads? A rule reports UNSCOPED when TiddlyWiki's own regex finds a construct the grammar
// leaves bare. Nothing there can see the other direction, because a scope standing over
// text TiddlyWiki declined to parse looks exactly like a scope doing its job.
//
// This asks that other direction. It takes the scopes the grammar actually paints, hands
// each span back to TiddlyWiki's parser, and reports every span where the parser yields
// PLAIN TEXT. The law it enforces:
//
//   the parser returns a node    -> the construct works -> a scope may stand
//   the parser yields plain text -> the author reached for markup and missed
//
//   node tools/overreach-check.js '<glob>' [--camelcase] [--verbose]
//   node tools/overreach-check.js --corpus [count] [--exclude=<path fragment>]...
//
// --corpus builds its specimens rather than looking for them: every Nth tiddler across
// editions, core, plugins and themes, header stripped, one file each. A corpus that lives
// in a scratchpad does not survive a session, and a corpus somebody curated answers to
// whoever curated it.
//
// Neither side of the comparison comes from anybody's reading of the format: the grammar
// supplies the claims and TiddlyWiki's parser supplies the verdicts.
//
// The deciding half — offsetAt, review — stands under test in
// tests/tools/overreach-check.test.js; the .snap format itself lives in tools/snapshot-format.js.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { BASE, readSnapshot, claims, verdicts } = require('./snapshot-format.js');

/**
 * The spans a snapshot annotates, flattened across its lines.
 *
 * @param {string} text  a .snap file's contents
 * @returns {{line:number, start:number, end:number, scopes:string[]}[]}
 */
function parseSnapshot(text) {
  return readSnapshot(text).flatMap(({ line, annotations }) => annotations.map((a) => ({ line, ...a })));
}

/**
 * The absolute offset of a column on a line, over the same text the grammar read.
 *
 * @param {string} source
 * @param {number} line   zero-based
 * @param {number} col    zero-based
 * @returns {number}
 */
function offsetAt(source, line, col) {
  let offset = 0;
  const lines = source.split('\n');
  for (let i = 0; i < line && i < lines.length; i += 1) offset += lines[i].length + 1;
  return offset + col;
}

/**
 * Every span where the grammar and TiddlyWiki disagree, in both directions.
 *
 * A span answers for itself: the grammar painted THIS stretch, so TiddlyWiki gets asked
 * about THIS stretch. Two disagreements stand, and they run opposite ways:
 *
 * - `overreach` — the grammar CLAIMS a construct and the parser yields plain text. The
 *   grammar coloured markup that does not work.
 * - `invention` — the grammar passes a VERDICT and the parser BUILDS a node HERE. The
 *   grammar condemned markup that does.
 *
 * The two read different evidence, because they ask opposite questions. A claim answers to
 * whether ANY construct covers the span, since a grammar names a construct's parts as well
 * as its whole. A verdict answers to the TIGHTEST cover: a verdict says the parser built
 * nothing here, and text standing inside a heading TiddlyWiki built remains text it refused.
 *
 * A verdict over refused text and a claim over a built construct both read correct, and
 * neither reports. A span inside a definition body reports on neither count: TiddlyWiki
 * stores that body rather than parsing it, so this parse holds no answer about the span.
 *
 * @param {string} source    the file the grammar read
 * @param {string} snapText  its .snap
 * @param {{readAt: Function}} oracle
 * @returns {{kind:'overreach'|'invention', line:number, col:number, span:string, scope:string, rule:string|null}[]}
 */
function review(source, snapText, oracle) {
  const findings = [];
  for (const ann of parseSnapshot(snapText)) {
    const claimed = claims(ann.scopes);
    const condemned = verdicts(ann.scopes);
    if (claimed.length === 0 && condemned.length === 0) continue;
    const start = offsetAt(source, ann.line, ann.start);
    const end = offsetAt(source, ann.line, ann.end);
    const read = oracle.readAt(source, start, end);
    const at = { line: ann.line + 1, col: ann.start + 1, span: source.slice(start, end), rule: read.rule };
    // A span inside an unparsed definition body answers to neither question.
    if (read.innermost === 'opaque') continue;
    if (claimed.length > 0 && read.kind === 'text') {
      findings.push({ kind: 'overreach', ...at, scope: claimed[claimed.length - 1] });
    }
    if (condemned.length > 0 && read.innermost === 'built') {
      findings.push({ kind: 'invention', ...at, scope: condemned[condemned.length - 1] });
    }
  }
  return findings;
}

module.exports = { BASE, parseSnapshot, offsetAt, claims, verdicts, review };

if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const camelcase = args.includes('--camelcase');
  const pattern = args.find((a) => !a.startsWith('--')) || './tests/samples/*.tw';

  const tw = resolveTiddlyWiki();
  if (!tw) {
    console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
    process.exit(2);
  }
  const oracle = boot(tw, camelcase ? { rules: { 'Inline/wikilink': 'enable' } } : {});

  // A snapshot per file, taken into scratch so a run never disturbs the pinned ones.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-overreach-'));

  /** Every Nth tiddler across TiddlyWiki's own wikis, body only, one file each. */
  const buildCorpus = (count) => {
    const walk = (dir, out = []) => {
      if (!fs.existsSync(dir)) return out;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.tid')) out.push(p);
      }
      return out;
    };
    // Deliberately malformed content answers to its own tests, never to a grammar —
    // editions/test/tiddlers/tests/data holds parse fixtures that carry deliberate faults.
    // Excluding a path RESAMPLES the corpus rather than trimming it: the stride recomputes
    // over what remains, so two runs with different exclusions compare totals only loosely.
    const excluded = args.filter((a) => a.startsWith('--exclude=')).map((a) => a.slice('--exclude='.length));
    const all = ['editions', 'core', 'plugins', 'themes']
      .flatMap((d) => walk(path.join(tw, d)))
      .filter((f) => !excluded.some((x) => f.includes(x)))
      .sort();
    const stride = Math.max(1, Math.floor(all.length / count));
    const picked = all.filter((_, i) => i % stride === 0).slice(0, count);
    return picked.map((src, i) => {
      // A .tid carries a header block, then a blank line, then the wikitext.
      const text = fs.readFileSync(src, 'utf8');
      const blank = text.indexOf('\n\n');
      const dest = path.join(scratch, `w${String(i).padStart(4, '0')}.tw`);
      fs.writeFileSync(dest, blank < 0 ? '' : text.slice(blank + 2));
      return { src, dest };
    });
  };

  let files;
  let copies;
  if (args.includes('--corpus')) {
    const count = Number(args.find((a) => /^\d+$/.test(a)) || 400);
    const built = buildCorpus(count);
    files = built.map((b) => path.relative(process.cwd(), b.src));
    copies = built.map((b) => b.dest);
  } else {
    files = execFileSync('bash', ['-c', `ls ${pattern}`], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((f) => f && !f.endsWith('.snap'));
    copies = files.map((f) => {
      const dest = path.join(scratch, path.basename(f));
      fs.copyFileSync(f, dest);
      return dest;
    });
  }
  if (copies.length === 0) {
    console.error(`no files matched ${pattern}`);
    process.exit(2);
  }
  const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
    encoding: 'utf8'
  })
    .trim()
    .split('\n')
    .filter(Boolean);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...copies], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  });

  const byScope = { overreach: new Map(), invention: new Map() };
  let scanned = 0;
  copies.forEach((copy, i) => {
    const snap = `${copy}.snap`;
    if (!fs.existsSync(snap)) return;
    scanned += 1;
    const source = fs.readFileSync(copy, 'utf8');
    for (const f of review(source, fs.readFileSync(snap, 'utf8'), oracle)) {
      const bucket = byScope[f.kind];
      if (!bucket.has(f.scope)) bucket.set(f.scope, []);
      bucket.get(f.scope).push({ ...f, file: files[i] });
    }
  });
  fs.rmSync(scratch, { recursive: true, force: true });

  const count = (m) => [...m.values()].reduce((n, v) => n + v.length, 0);
  const total = count(byScope.overreach) + count(byScope.invention);
  console.log(`overreach-check  ${scanned} file(s)${camelcase ? '  [CamelCase forced on]' : ''}`);
  const section = (kind, headline) => {
    const map = byScope[kind];
    console.log(`\n  ${String(count(map)).padStart(4)}  ${headline}`);
    for (const [scope, hits] of [...map].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(hits.length).padStart(4)}  ${scope}`);
      for (const h of verbose ? hits : hits.slice(0, 2)) {
        console.log(`        ${h.file}:${h.line}:${h.col}  ${JSON.stringify(h.span)}${h.rule ? `  (TiddlyWiki looked: ${h.rule})` : ''}`);
      }
      if (!verbose && hits.length > 2) console.log(`        … ${hits.length - 2} more (--verbose)`);
    }
  };
  section('overreach', 'span(s) the grammar CLAIMS and TiddlyWiki refuses');
  section('invention', 'span(s) the grammar CONDEMNS and TiddlyWiki builds');
  if (total === 0) console.log('\n  the grammar and the parser agree everywhere they were asked');
  process.exitCode = total === 0 ? 0 : 1;
}
