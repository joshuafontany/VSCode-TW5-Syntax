#!/usr/bin/env node
// Upstream coverage.
//
// Every TiddlyWiki wikitext rule declares the regex it matches on. This takes those
// regexes to TiddlyWiki's OWN tiddlers, collects what they actually match there, and
// asks whether this grammar scopes each one. Neither the cases nor the verdicts come
// from anybody's reading of the format: the corpus supplies the cases, and the parser's
// own regex decides what counts as one.
//
//   node tools/upstream-coverage.js <path-to-TiddlyWiki5> [samples-per-rule]
//
// A rule reports UNSCOPED when its construct stands in the corpus and the grammar leaves
// the construct's OPENING token carrying nothing but the base scopes.
//
// WHAT IT DETECTS, proven by deletion: a construct no rule reads any more. Removing
// #table, or #codeblock, or both transclusion rules, makes those rules report every
// case unscoped.
// Removing only #transcludeblock reports nothing, and rightly — #transcludeinline still
// reads the same text, so the construct still reads.
//
// WHAT IT DOES NOT COVER: a rule whose regex matches only its own marker. heading carries
// /(!{1,6})/, list /([\*#;:>]+)/, quoteblock /(<<<+)/ — the harvested span carries
// no content, so those rules never reach the corpus sweep and carry hand-written cases in
// tests/tiddlywiki5 instead.
//
// The deciding half stands under test in tests/tools/upstream-coverage.test.js, against
// snapshots that state their answer rather than leaving a grammar to supply it.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const { BASE, readSnapshot } = require('./snapshot-format.js');

/**
 * A snapshot, read into a verdict per source line: did the grammar scope that line's
 * OPENING token with anything beyond the base?
 *
 * The opening token decides. A construct's own rule scopes its first mark; anything
 * nested inside may answer to a different rule entirely, so asking whether the line
 * carries some scope somewhere would pass a table row that a transclusion inside it had
 * coloured.
 *
 * Every non-blank source line receives a verdict. A line left undecided reads as scoped
 * in the caller, letting a deleted rule go unreported.
 *
 * @param {string} text  a .snap file's contents
 * @returns {Map<string, boolean>}
 */
function judgeSnapshot(text) {
  const verdict = new Map();
  for (const { source, annotations } of readSnapshot(text)) {
    // A line repeated in one snapshot answers once, on its first showing.
    if (!source.trim() || verdict.has(source)) continue;
    const opening = annotations[0];
    // No annotation at all, or a first annotation past column 0: the construct's own
    // opening mark carries nothing, whatever a later column holds.
    if (!opening || opening.start !== 0) {
      verdict.set(source, false);
      continue;
    }
    verdict.set(source, opening.scopes.some((sc) => !BASE.has(sc)));
  }
  return verdict;
}

module.exports = { judgeSnapshot, BASE };

function main() {
  // A path names a checkout outright; without one this answers to the same TiddlyWiki every
  // other gate does. Demanding the argument left the registered script unrunnable, and it
  // reported a usage line where a verdict belonged.
  const tw = process.argv[2] || resolveTiddlyWiki();
  const PER_RULE = Number(process.argv[3] || 6);
  if (!tw || !fs.existsSync(tw)) {
    console.error('Usage: node tools/upstream-coverage.js <path-to-TiddlyWiki5> [samples-per-rule]');
    process.exit(2);
  }

  // ── the rules, read from their own modules ────────────────────────────────
  const ruleDir = path.join(tw, 'core/modules/parsers/wikiparser/rules');
  const ruleFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? ruleFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []
    );
  const rules = [];
  for (const file of ruleFiles(ruleDir)) {
    const src = fs.readFileSync(file, 'utf8');
    const m = /this\.matchRegExp\s*=\s*\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\/([a-z]*)\s*;/.exec(src);
    if (!m) continue; // computed at runtime; those carry their own probes
    const t = /exports\.types\s*=\s*\{([^}]*)\}/.exec(src);
    const types = t ? [...t[1].matchAll(/(\w+)\s*:\s*true/g)].map((x) => x[1]) : [];
    let re;
    try {
      re = new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g');
    } catch {
      continue;
    }
    rules.push({ name: path.basename(file, '.js'), re, types });
  }

  // ── what those regexes match in TiddlyWiki's own tiddlers ─────────────────
  const tiddlers = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) tiddlers(p, out);
      else if (e.name.endsWith('.tid')) out.push(p);
    }
    return out;
  };
  const corpus = [
    ...tiddlers(path.join(tw, 'core')),
    ...tiddlers(path.join(tw, 'editions/tw5.com/tiddlers'))
  ].slice(0, 1200);

  const found = new Map(rules.map((r) => [r.name, new Set()]));
  const claimed = new Set(); // one case belongs to one rule, so a verdict names one rule
  for (const f of corpus) {
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    for (const r of rules) {
      if (found.get(r.name).size >= PER_RULE) continue;
      r.re.lastIndex = 0;
      for (const m of text.matchAll(r.re)) {
        // Trailing whitespace never survives into a snapshot's source line, so nothing
        // could find a case carrying it again by its own text.
        const hit = m[0].replace(/\s+$/, '');
        // One line, short enough to stand alone in a probe. Some rules match only their
        // opening delimiter — codeinline carries /(``?)/, the emphasis family /''/ and its
        // siblings — so the harvested span carries a delimiter with neither content nor
        // closer. Those keep their own cases in tests/tiddlywiki5.
        if (!hit.trim() || hit.includes('\n') || hit.length > 60) continue;
        if (!/[A-Za-z0-9]/.test(hit)) continue;
        if (claimed.has(hit)) continue;
        claimed.add(hit);
        found.get(r.name).add(hit);
        if (found.get(r.name).size >= PER_RULE) break;
      }
    }
  }

  // ── one probe paragraph per case, so a block rule gets its turn ───────────
  const cases = [];
  for (const r of rules) for (const hit of found.get(r.name)) cases.push({ rule: r.name, hit, types: r.types });
  if (cases.length === 0) {
    console.error('no cases collected — is that a TiddlyWiki5 checkout?');
    process.exit(2);
  }

  // ── one file per case ────────────────────────────────────────────────────
  // Never one file for all of them. Several rules match only their opening mark —
  // codeblock carries /```([\w-]*)\r?\n/ — so a harvested case can open a construct with no
  // closer, and in a shared file it swallows every case after it. Each case answers for
  // itself alone.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-upstream-'));
  const probes = cases.map((c, i) => {
    const file = path.join(scratch, `case-${String(i).padStart(4, '0')}.tw`);
    fs.writeFileSync(file, c.hit + '\n');
    return file;
  });

  const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...probes], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  });

  const scoped = new Map();
  probes.forEach((file, i) => {
    const snapFile = `${file}.snap`;
    if (!fs.existsSync(snapFile)) return;
    const v = judgeSnapshot(fs.readFileSync(snapFile, 'utf8'));
    if (v.has(cases[i].hit)) scoped.set(i, v.get(cases[i].hit));
  });
  if (process.env.UC_KEEP) console.error(`UC_KEEP scratch: ${scratch}`);
  else fs.rmSync(scratch, { recursive: true, force: true });

  const byRule = new Map();
  const unseen = [];
  cases.forEach((c, i) => {
    const bucket = byRule.get(c.rule) ?? { ok: 0, miss: [], types: c.types };
    if (!scoped.has(i)) unseen.push(c.hit);
    if (scoped.get(i)) bucket.ok++;
    else bucket.miss.push(c.hit);
    byRule.set(c.rule, bucket);
  });

  let gaps = 0;
  console.log(
    `upstream-coverage  ${rules.length} rules with a literal regex, ${cases.length} cases from TiddlyWiki's own tiddlers\n`
  );
  for (const [name, b] of [...byRule].sort()) {
    const total = b.ok + b.miss.length;
    console.log(
      `  ${b.miss.length ? 'UNSCOPED' : 'ok      '} ${name.padEnd(24)} ${b.ok}/${total}  [${b.types.join(',') || '?'}]`
    );
    for (const m of b.miss.slice(0, 3)) console.log(`             ${JSON.stringify(m).slice(0, 84)}`);
    if (b.miss.length) gaps++;
  }
  if (unseen.length) {
    console.log(`\n  cases the snapshot never reported on: ${unseen.length}`);
    for (const u of unseen.slice(0, 5)) console.log(`     ${JSON.stringify(u).slice(0, 84)}`);
  }
  // A rule that collected no case never passed. Dropping it from the report
  // leaves the closing tally speaking for rules it never measured — the corpus filters
  // below carry no alphanumeric, so the emphasis family, dash, codeinline, hardlinebreaks
  // and the comment rules reach this line every run.
  const silent = rules.map((r) => r.name).filter((n) => !byRule.has(n));
  if (silent.length) {
    console.log(`\n  rules this sweep never reached (no case in the corpus): ${silent.length}`);
    console.log(`     ${silent.join(' ')}`);
  }
  console.log(`\n  rules with an unscoped case: ${gaps} (of ${byRule.size} measured)`);
  process.exit(gaps || unseen.length ? 1 : 0);
}

if (require.main === module) main();
