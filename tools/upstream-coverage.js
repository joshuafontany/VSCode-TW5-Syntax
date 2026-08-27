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
// the span carrying nothing but the base scopes.
//
// NOT A GATE. This has never been made to fail. Deleting #table, #heading, #list or
// #styleblock from the grammar leaves every rule reporting ok, so the check does not yet
// detect a construct the grammar has stopped reading — and a check that cannot fail
// reports nothing worth acting on. It stands here as a scouting instrument whose findings
// were confirmed by hand, and it stays out of CI until a deliberate deletion makes it
// report. Whoever picks it up: start there, not with its output.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tw = process.argv[2];
const PER_RULE = Number(process.argv[3] || 6);
if (!tw || !fs.existsSync(tw)) {
  console.error('Usage: node tools/upstream-coverage.js <path-to-TiddlyWiki5> [samples-per-rule]');
  process.exit(2);
}

// ── the rules, read from their own modules ──────────────────────────────────
const ruleDir = path.join(tw, 'core/modules/parsers/wikiparser/rules');
function ruleFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? ruleFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []
  );
}
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

// ── what those regexes match in TiddlyWiki's own tiddlers ───────────────────
function tiddlers(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tiddlers(p, out);
    else if (e.name.endsWith('.tid')) out.push(p);
  }
  return out;
}
const corpus = [
  ...tiddlers(path.join(tw, 'core')),
  ...tiddlers(path.join(tw, 'editions/tw5.com/tiddlers'))
].slice(0, 1200);

const found = new Map(rules.map((r) => [r.name, new Set()]));
for (const f of corpus) {
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const r of rules) {
    if (found.get(r.name).size >= PER_RULE * 4) continue;
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) {
      const hit = m[0].replace(/[\r\n]+$/, '');
      // One line, short enough to stand alone in a probe.
      // Some rules match only their opening delimiter — codeinline is /(``?)/, the
      // emphasis family is /''/ and its siblings — so the harvested span is a delimiter
      // with neither content nor closer. Standing alone it scopes nothing, and rightly:
      // those constructs carry their own hand-written cases in tests/tiddlywiki5.
      if (!hit.trim() || hit.includes('\n') || hit.length > 60) continue;
      if (!/[A-Za-z0-9]/.test(hit)) continue;
      found.get(r.name).add(hit);
      if (found.get(r.name).size >= PER_RULE * 4) break;
    }
  }
}

// ── one probe paragraph per case, so a block rule gets its turn ─────────────
const cases = [];
for (const r of rules) {
  for (const hit of [...found.get(r.name)].slice(0, PER_RULE)) cases.push({ rule: r.name, hit, types: r.types });
}
if (cases.length === 0) {
  console.error('no cases collected — is that a TiddlyWiki5 checkout?');
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-upstream-'));
const probe = path.join(scratch, 'cases.tw');
fs.writeFileSync(probe, cases.map((c) => c.hit).join('\n\n') + '\n');

const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
  encoding: 'utf8'
}).trim().split('\n').filter(Boolean);
execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', probe], {
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: process.platform === 'win32'
});

const BASE = new Set(['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5', 'markup.other.paragraph.tiddlywiki5']);
const snap = fs.readFileSync(`${probe}.snap`, 'utf8').split('\n');
const scoped = new Map();
let current = null;
for (const line of snap) {
  if (line.startsWith('>')) {
    current = line.slice(1);
    continue;
  }
  // The FIRST token of the case decides. A construct's own rule scopes its opening
  // marker; anything nested inside it can be scoped by a different rule entirely, so
  // "carries some scope somewhere" would pass a case whose own rule had been deleted.
  if (scoped.has(current)) continue;
  const m = /^#(\s*)(\^+)\s+(.*)$/.exec(line);
  if (!m || current === null || !current.trim()) continue;
  if (m[1].length > 1) continue; // an assertion that does not start at column 0
  const extra = m[3].split(/\s+/).filter((s) => s && !BASE.has(s));
  scoped.set(current, extra.length > 0);
}

const byRule = new Map();
for (const c of cases) {
  const bucket = byRule.get(c.rule) ?? { ok: 0, miss: [], types: c.types };
  if (scoped.get(c.hit)) bucket.ok++;
  else bucket.miss.push(c.hit);
  byRule.set(c.rule, bucket);
}

fs.rmSync(scratch, { recursive: true, force: true });

let gaps = 0;
console.log(`upstream-coverage  ${rules.length} rules with a literal regex, ${cases.length} cases from TiddlyWiki's own tiddlers\n`);
for (const [name, b] of [...byRule].sort()) {
  const total = b.ok + b.miss.length;
  const mark = b.miss.length ? 'UNSCOPED' : 'ok      ';
  console.log(`  ${mark} ${name.padEnd(24)} ${b.ok}/${total}  [${b.types.join(',') || '?'}]`);
  for (const m of b.miss.slice(0, 3)) console.log(`             ${JSON.stringify(m).slice(0, 84)}`);
  if (b.miss.length) gaps++;
}
console.log(`\n  rules with an unscoped case: ${gaps}`);
process.exit(gaps ? 1 : 0);
