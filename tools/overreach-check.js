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
//   node tools/overreach-check.js '<glob>' [--camelcase] [--verbose] [--expected=<file>] [--scope=<scopeName>]
//   node tools/overreach-check.js --corpus [count] [--exclude=<path fragment>]... [--truncate[=seed]]
//
// --corpus builds its specimens rather than looking for them: every Nth tiddler across
// editions, core, plugins and themes, header stripped, one file each. A corpus that lives
// in a scratchpad does not survive a session, and a corpus somebody curated answers to
// whoever curated it.
//
// --truncate cuts every specimen short at a seeded offset, so the corpus stops holding well-formed
// input. TiddlyWiki's own tiddlers come from people who know the parser, writing in house
// style, to document the parser — the best-formed wikitext in existence, and the easy end of the
// distribution a learner writes from. Truncation manufactures the other end: an opener with no
// close, a table missing its last row, a macro body cut mid-parameter. Both sides read the same
// bytes, so the law holds unchanged; only the ground gets harder.
//
// The seed makes a finding reproducible. Nothing here draws randomness at run time.
//
// Neither side of the comparison comes from anybody's reading of the format: the grammar
// supplies the claims and TiddlyWiki's parser supplies the verdicts.
//
// The deciding half — offsetAt, review — stands under test in
// tools/overreach-check.test.js; the .snap format itself lives in tools/snapshot-format.js.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseTid } = require('./wiki-data.js');
const { grammarArgs } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { BASE, readSnapshot, claims, verdicts, declines } = require('./snapshot-format.js');

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
 * Whether TiddlyWiki would parse this tiddler's text as wikitext at all.
 *
 * A `.tid` carries a `type` field in its header, and only some types reach the wikitext
 * parser. Asking what that parser builds from a tiddler typed `text/plain`, or from TiddlyWiki
 * Classic markup, compares the grammar against a parser that would never have run — and the
 * answer diverges in every span, saying nothing about either.
 *
 * An absent type reads as wikitext, TiddlyWiki's own default. Only the header block declares a
 * type; a `type:` line standing in the body carries content.
 *
 * @param {string} tid  the whole file, header and all
 * @returns {boolean}
 */
function parsesAsWikitext(tid) {
  const declared = parseTid(tid).fields.type;
  if (!declared) return true;
  return declared === 'text/vnd.tiddlywiki';
}

/**
 * The rulings that explain a divergence, read from a file.
 *
 * Some spans stand where TiddlyWiki refuses BY RULING: a scope the host ships disabled, a
 * `\rules` run narrowing a rule set no TextMate grammar can follow, a fixture carrying
 * deliberate faults. Counting those beside a genuine over-reach gives a tally that can never reach
 * zero and teaches a reader nothing.
 *
 * Each line names a scope prefix, optionally scoped to one file, and a reason after `#`. A
 * line carrying no reason names no ruling — it names a number somebody wanted smaller.
 *
 * @param {string} text
 * @returns {{file:string|null, scope:string, reason:string}[]}
 */
function readExpected(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const cut = line.indexOf('#');
    if (cut < 0) throw new Error(`ruling carries no reason: ${line}`);
    const reason = line.slice(cut + 1).trim();
    if (!reason) throw new Error(`ruling carries no reason: ${line}`);
    const target = line.slice(0, cut).trim();
    const colon = target.lastIndexOf(':');
    const named = colon < 0 ? { file: null, scope: target } : { file: target.slice(0, colon), scope: target.slice(colon + 1) };
    if (!named.file && !named.scope) throw new Error(`ruling names neither a file nor a scope: ${line}`);
    out.push(
      colon < 0
        ? { file: null, scope: target, reason }
        : { file: target.slice(0, colon), scope: target.slice(colon + 1), reason }
    );
  }
  return out;
}

/**
 * Whether a ruling explains this span.
 *
 * A ruling matches a scope by dotted prefix, or by suffix where it opens with `*.` — a dialect
 * names its whole vocabulary that way while every scope it INHERITS keeps the base suffix and
 * still answers. A file matches where the path ends in the fragment the ruling names — so a ruling written for one fixture never quietly excuses another. An EMPTY scope
 * covers every span in the file it names, which a fixture carrying deliberate faults earns and
 * nothing else does: a ruling with neither a file nor a scope explains everything, and
 * readExpected refuses it.
 *
 * @param {{file:string|null, scope:string}[]} rules
 * @param {string} file
 * @param {string} scope
 * @returns {boolean}
 */
function isExpected(rules, file, scope) {
  return rules.some(
    (r) =>
      (r.scope === ''
        ? true
        : r.scope.startsWith('*.')
          ? scope.endsWith(r.scope.slice(1))
          : scope === r.scope || scope.startsWith(`${r.scope}.`)) &&
      (r.file === null || file === r.file || file.endsWith(`/${r.file}`))
  );
}

/**
 * Every span where the grammar and TiddlyWiki disagree, in both directions.
 *
 * A span answers for itself: the grammar painted THIS stretch, so TiddlyWiki gets asked
 * about THIS stretch. Two disagreements stand, and they run opposite ways:
 *
 * - `overreach` — the grammar CLAIMS a construct and the parser yields plain text. The
 *   grammar coloured markup that does not work.
 * - `invention` — the grammar passes a VERDICT, or marks a SUPPRESSION, and the parser
 *   BUILDS a node HERE. The grammar denied markup that works.
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
    const condemned = declines(ann.scopes);
    const condemnedVerdicts = verdicts(ann.scopes);
    const condemnedSuppressions = condemned.filter((s) => !condemnedVerdicts.includes(s));
    if (claimed.length === 0 && condemned.length === 0) continue;
    const start = offsetAt(source, ann.line, ann.start);
    const end = offsetAt(source, ann.line, ann.end);
    const read = oracle.readAt(source, start, end);
    const at = { line: ann.line + 1, col: ann.start + 1, start, end, span: source.slice(start, end), rule: read.rule };
    // A span inside an unparsed definition body answers to neither question.
    if (read.innermost === 'opaque') continue;
    if (claimed.length > 0 && read.kind === 'text') {
      findings.push({ kind: 'overreach', ...at, scope: claimed[claimed.length - 1] });
    }
    // A verdict and a suppression assert different things, so different evidence unseats them.
    //
    // A VERDICT claims the parser REFUSED. TiddlyWiki refuses by parsing nothing at all, so plain
    // text unseats one as squarely as a built construct does — the parser looked, declined the
    // construct, and kept the characters. Reading only `built` here left the commonest shape of
    // all unexamined: a stray bracket in prose, which every parser run turns into text.
    //
    // A SUPPRESSION claims the parser declined the construct and kept the text. Text there reads
    // as agreement, and only a construct built in its place unseats it.
    if (condemnedVerdicts.length > 0 && (read.innermost === 'built' || read.innermost === 'text')) {
      findings.push({ kind: 'invention', ...at, scope: condemnedVerdicts[condemnedVerdicts.length - 1] });
    } else if (condemnedSuppressions.length > 0 && read.innermost === 'built') {
      findings.push({ kind: 'invention', ...at, scope: condemnedSuppressions[condemnedSuppressions.length - 1] });
    }
  }
  return findings;
}

module.exports = { BASE, parseSnapshot, offsetAt, claims, verdicts, declines, readExpected, isExpected, parsesAsWikitext, review };

if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const expectedFile = (args.find((a) => a.startsWith('--expected=')) || '').slice('--expected='.length);
  const rulings = expectedFile ? readExpected(fs.readFileSync(expectedFile, 'utf8')) : [];
  const camelcase = args.includes('--camelcase');
  const truncateArg = args.find((a) => a === '--truncate' || a.startsWith('--truncate='));
  const truncating = Boolean(truncateArg);
  const seed = Number((truncateArg || '').split('=')[1] || 1);
  const pattern = args.find((a) => !a.startsWith('--')) || './tests/samples/*.tw';
  // The dialect answers to the same parser: memetic-wikitext includes the whole base grammar,
  // so every reading below carries into a .mem file, and the gate asks it there too.
  const scope = (args.find((a) => a.startsWith('--scope=')) || '--scope=text.html.tiddlywiki5').slice('--scope='.length);

  const tw = resolveTiddlyWiki();
  if (!tw) {
    console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
    process.exit(2);
  }
  const oracle = boot(tw, camelcase ? { rules: { 'Inline/wikilink': 'enable' } } : {});

  // A snapshot per file, taken into scratch so a run never disturbs the pinned ones.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-overreach-'));

  // A seeded generator, so a run that finds something repeats and finds it again.
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = seeded(seed);

  /**
   * A specimen cut short, between a tenth and nine tenths of its length.
   *
   * The band leaves both ends out: a cut at the very start yields nothing to read, and a cut at
   * the very end leaves the specimen effectively whole, and neither asks the question.
   *
   * @param {string} text
   * @param {() => number} rand
   * @returns {string}
   */
  const truncate = (text, rand) => text.slice(0, Math.max(1, Math.floor(text.length * (0.1 + rand() * 0.8))));

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
    return picked
      .map((src) => ({ src, tid: fs.readFileSync(src, 'utf8') }))
      // Only tiddlers TiddlyWiki would hand to the wikitext parser. The rest carry another
      // language, and the question has no meaning for them.
      .filter(({ tid }) => parsesAsWikitext(tid))
      .map(({ src, tid }, i) => {
        // A .tid carries a header block, then a blank line, then the wikitext.
        const dest = path.join(scratch, `w${String(i).padStart(4, '0')}.tw`);
        const { body } = parseTid(tid);
        fs.writeFileSync(dest, truncating ? truncate(body, rand) : body);
        return { src, dest, whole: body };
      });
  };

  let files;
  let copies;
  let whole = [];
  if (args.includes('--corpus')) {
    const count = Number(args.find((a) => /^\d+$/.test(a)) || 400);
    const built = buildCorpus(count);
    files = built.map((b) => path.relative(process.cwd(), b.src));
    copies = built.map((b) => b.dest);
    whole = built.map((b) => b.whole);
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
  const grammars = grammarArgs();
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...copies], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  });

  const byScope = { overreach: new Map(), invention: new Map() };
  let ruled = 0;
  let cutOnly = 0;
  let unanswerable = 0;
  let scanned = 0;
  copies.forEach((copy, i) => {
    const snap = `${copy}.snap`;
    if (!fs.existsSync(snap)) return;
    scanned += 1;
    const source = fs.readFileSync(copy, 'utf8');
    for (const f of review(source, fs.readFileSync(snap, 'utf8'), oracle)) {
      if (isExpected(rulings, files[i], f.scope)) {
        ruled += 1;
        continue;
      }
      // On cut ground, a claim answers to the WHOLE tiddler before it answers here.
      //
      // The law reads: the parser yields plain text, so the author reached for markup and
      // missed. A cut file carries no author who missed — an opener whose close lies past the
      // cut refuses for that reason alone, and an editor that waited for the close would go
      // dark on every keystroke a construct takes to type.
      //
      // Truncation takes a PREFIX, so an offset means the same thing in both texts. Ask the
      // parser about the same stretch of the uncut tiddler: a node there names the cut as the
      // whole reason, and the claim stands. Plain text there names a claim that would over-reach
      // whether or not anybody cut the file.
      if (truncating && f.kind === 'overreach' && whole[i] !== undefined) {
        const uncut = oracle.readAt(whole[i], f.start, f.end);
        // The same law review holds: a span the whole tiddler stores rather than parses carries
        // no answer either way. A macro body stores verbatim, so the parser never rules on the
        // widgets inside it, and reading "not plain text" there as "the construct works" would
        // let the cut explain a span nothing ever examined.
        if (uncut.innermost === 'opaque') {
          unanswerable += 1;
          continue;
        }
        if (uncut.kind !== 'text') {
          cutOnly += 1;
          continue;
        }
      }
      const bucket = byScope[f.kind];
      if (!bucket.has(f.scope)) bucket.set(f.scope, []);
      bucket.get(f.scope).push({ ...f, file: files[i] });
    }
  });
  fs.rmSync(scratch, { recursive: true, force: true });

  const count = (m) => [...m.values()].reduce((n, v) => n + v.length, 0);
  const total = count(byScope.overreach) + count(byScope.invention);
  console.log(
    `overreach-check  ${scanned} file(s)${camelcase ? '  [CamelCase forced on]' : ''}` +
      (truncating ? `  [cut at seed ${seed}]` : '') +
      (rulings.length ? `  ${ruled} span(s) explained by ${rulings.length} ruling(s)` : '')
  );
  if (truncating) {
    console.log(`  ${String(cutOnly).padStart(4)}  span(s) the cut alone refused — the uncut tiddler builds there`);
    console.log(`  ${String(unanswerable).padStart(4)}  span(s) the uncut tiddler STORES rather than parses — no answer either way`);
  }
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
