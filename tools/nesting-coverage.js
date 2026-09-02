#!/usr/bin/env node
// Nesting coverage.
//
// A hand-built matrix finds what its author already suspected. This one asks TiddlyWiki's
// own tiddlers which container-and-construct pairs actually occur, then checks that the
// grammar reads the construct inside the container as it reads it alone.
//
// Both halves come from upstream: containers from the rules TiddlyWiki declares
// `types: {block: true}`, constructs from those it declares `types: {inline: true}`, and
// the pairing from where they stand together in the corpus. Nothing here consults this
// grammar to decide what counts, which keeps it clear of its own reasoning.
//
//   node tools/nesting-coverage.js <path-to-TiddlyWiki5> [max-pairs]
//
// A pair reports MISSING when the construct reads alone and not inside the container.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

/**
 * The container a line opens, by the block marker it starts with.
 *
 * Deliberately shallow: a line names its own container, so a construct's neighbourhood
 * reads off the line it stands on and never off a parse. `null` where the line opens no
 * container of its own.
 *
 * @param {string} line
 * @returns {{name: string, content: string} | null}
 */
function containerOf(line) {
  let m;
  if ((m = /^(!{1,6})\s*(.*)$/.exec(line))) return { name: 'heading', content: m[2] };
  if ((m = /^([*#;:>]+)\s*(.*)$/.exec(line))) return { name: 'list', content: m[2] };
  if ((m = /^\|(.*)\|[fhck]?$/.exec(line))) return { name: 'table', content: m[1] };
  if ((m = /^<\$([A-Za-z0-9.$-]+)[^>]*>(.+)<\/\$/.exec(line))) return { name: 'widget', content: m[2] };
  return null;
}

/**
 * The constructs standing in a stretch of text, by the regexes TiddlyWiki matches them
 * with. A regex that matches only its own delimiter carries no construct to check, so a
 * match with no alphanumeric character is passed over.
 *
 * @param {string} text
 * @param {Array<{name: string, re: RegExp}>} inlineRules
 * @returns {Array<{rule: string, hit: string}>}
 */
function constructsIn(text, inlineRules) {
  const out = [];
  for (const r of inlineRules) {
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) {
      const hit = m[0].replace(/\s+$/, '');
      if (!hit || !/[A-Za-z0-9]/.test(hit) || hit.length > 40) continue;
      out.push({ rule: r.name, hit });
      break; // one witness per rule per stretch
    }
  }
  return out;
}

/**
 * Put a construct inside a container, in that container's own shape.
 *
 * `inline` stands for the baseline: the construct in a plain sentence. A construct ALONE
 * on a line reads as its block form where one exists — `{{X}}` is a block transclusion,
 * `@@css;` opens a style block — so comparing a container against a line-alone baseline
 * would count that duality as loss. A sentence is the fair comparison.
 */
function compose(container, hit) {
  switch (container) {
    case 'inline':
      return `a ${hit} b`;
    case 'heading':
      return `! ${hit}`;
    case 'list':
      return `* ${hit}`;
    case 'table':
      return `|a |${hit} |`;
    case 'widget':
      return `<$button>${hit}</$button>`;
    default:
      return hit;
  }
}

module.exports = { containerOf, constructsIn, compose };

function main() {
  // A path names a checkout outright; without one this answers to the same TiddlyWiki every
  // other gate does. Demanding the argument left the registered script unrunnable, and it
  // reported a usage line where a verdict belonged.
  const tw = process.argv[2] || resolveTiddlyWiki();
  const MAX = Number(process.argv[3] || 120);
  if (!tw || !fs.existsSync(tw)) {
    console.error('Usage: node tools/nesting-coverage.js <path-to-TiddlyWiki5> [max-pairs]');
    process.exit(2);
  }

  const ruleDir = path.join(tw, 'core/modules/parsers/wikiparser/rules');
  const ruleFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? ruleFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []
    );
  const inlineRules = [];
  for (const file of ruleFiles(ruleDir)) {
    const src = fs.readFileSync(file, 'utf8');
    const t = /exports\.types\s*=\s*\{([^}]*)\}/.exec(src);
    if (!t || !/inline\s*:\s*true/.test(t[1])) continue;
    const m = /this\.matchRegExp\s*=\s*\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\/([a-z]*)\s*;/.exec(src);
    if (!m) continue;
    try {
      inlineRules.push({ name: path.basename(file, '.js'), re: new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g') });
    } catch {
      /* a regex this reader cannot rebuild */
    }
  }

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
  ].slice(0, 1500);

  // ── the pairs the corpus actually stands up ───────────────────────────────
  const pairs = new Map(); // "container/rule" -> witness hit
  for (const f of corpus) {
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const c = containerOf(line.replace(/\r$/, ''));
      if (!c || !c.content.trim()) continue;
      for (const k of constructsIn(c.content, inlineRules)) {
        const key = `${c.name}/${k.rule}`;
        if (!pairs.has(key)) pairs.set(key, k.hit);
      }
    }
    if (pairs.size >= MAX) break;
  }
  if (pairs.size === 0) {
    console.error('no pairs found — is that a TiddlyWiki5 checkout?');
    process.exit(2);
  }

  // ── each construct alone, and inside its container ────────────────────────
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-nesting-'));
  const entries = [...pairs].map(([key, hit], i) => {
    const [container, rule] = key.split('/');
    const alone = path.join(scratch, `a-${String(i).padStart(3, '0')}.tw`);
    const inside = path.join(scratch, `i-${String(i).padStart(3, '0')}.tw`);
    fs.writeFileSync(alone, compose('inline', hit) + '\n');
    fs.writeFileSync(inside, compose(container, hit) + '\n');
    return { key, container, rule, hit, alone, inside };
  });

  const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  execFileSync(
    'npx',
    ['vscode-tmgrammar-snap', ...grammars, '-s', 'text.html.tiddlywiki5', '-u', ...entries.flatMap((e) => [e.alone, e.inside])],
    { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' }
  );

  // The scopes a snapshot names anywhere, as a set. Comparing sets rather than positions
  // lets a container add its own scopes without counting as a change to the construct.
  const scopesOf = (file) => {
    const s = new Set();
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^#\s*\^+\s+(.*)$/.exec(line);
      if (!m) continue;
      for (const scope of m[1].split(/\s+/)) if (scope) s.add(scope);
    }
    return s;
  };

  const missing = [];
  for (const e of entries) {
    const alone = scopesOf(`${e.alone}.snap`);
    const inside = scopesOf(`${e.inside}.snap`);
    // What the construct earned standing alone, beyond the plain-paragraph baseline.
    const earned = [...alone].filter((s) => s !== 'text.html.tiddlywiki5' && s !== 'meta.paragraph.tiddlywiki5');
    if (earned.length === 0) continue; // the construct reads as nothing even alone
    const lost = earned.filter((s) => !inside.has(s));
    if (lost.length) missing.push({ ...e, lost });
  }

  fs.rmSync(scratch, { recursive: true, force: true });

  const byContainer = new Map();
  for (const m of missing) byContainer.set(m.container, (byContainer.get(m.container) ?? 0) + 1);
  console.log(`nesting-coverage  ${entries.length} container/construct pairs from TiddlyWiki's own tiddlers\n`);
  for (const m of missing) {
    console.log(`  MISSING ${m.key.padEnd(28)} ${JSON.stringify(m.hit).slice(0, 40)}`);
    console.log(`             loses ${m.lost.slice(0, 3).join(' ')}`);
  }
  if (byContainer.size) {
    console.log('');
    for (const [c, n] of [...byContainer].sort()) console.log(`  ${c}: ${n} construct(s) lost`);
  }
  console.log(`\n  pairs where the container costs the construct its reading: ${missing.length}`);
  process.exit(missing.length ? 1 : 0);
}

if (require.main === module) main();
