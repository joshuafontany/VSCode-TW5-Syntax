#!/usr/bin/env node
// What a delimiter inherits from the content it bounds.
//
// `contentName` names the INTERIOR of a region and nothing else, so the marks that open and close
// it stand outside the content family BY CONSTRUCTION. VS Code's own TypeScript grammar states the
// consequence in its rules: it stacks `string.template.ts` onto the backtick by hand, because the
// backtick would otherwise lose the string colour the interior carries.
//
// NOTHING DOWNSTREAM NOTICES. The region paints, the interior paints, and the mark reads as
// whatever its own name reaches — a reading no assertion file states and no coverage gate counts,
// because a token stands there either way.
//
// So the tree gets read and every parting SHAPE gets ruled. A shape keys on the two-segment family
// of the content against the families its delimiters carry, which rules a construct rather than a
// pattern: adding a nineteenth embedded language adds no ruling, and moving a family's root asks
// for one.
//
// FIVE KINDS, and the first of them names a declaration that does nothing at all.
//
//   INERT              `contentName` on a `match` rule. vscode-textmate reads the field on a
//                      begin/end region and nowhere else, so the declaration parses and moves no
//                      token. MEASURED on every run rather than asserted, with a control.
//   COVERING           Both bounds stand as zero-width lookarounds, so the content spans the whole
//                      construct, delimiters included, and nothing parts.
//   INHERITS           Every family the content carries also stands on a delimiter capture or on
//                      the region's own name. The additive cure, where somebody already wrote it.
//   PARTS              The delimiter stands outside what the content carries. Whether that serves a
//                      reader or costs one answers per construct, which is what the ledger rules.
//   UNNAMED-DELIMITER  A begin/end carrying no captures at all: the mark takes neither its own name
//                      nor the content's, and reads as whatever encloses the region.
//
// A RULING CARRIES ITS REASON. A reason opening OWED records debt rather than accepting it, and the
// gate stays green while printing it — the shape `swallow-ledger.txt` already uses.
//
//   node tools/delimiter-inheritance.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SYNTAXES = path.join(ROOT, 'syntaxes');
const LEDGER = path.join(ROOT, 'corpus', 'delimiter-ledger.txt');
const verbose = process.argv.includes('--verbose');

/** The two leading segments of a scope: the family a theme rule most often writes against. */
const family = (scope) => scope.split('.').slice(0, 2).join('.');

/** Does any scope in `carried` reach `want` by dot-bounded prefix, either direction? */
const reaches = (carried, want) =>
  carried.some((c) => c === want || want.startsWith(`${c}.`) || c.startsWith(`${want}.`));

/** Every `name` a capture block declares, split into single scopes. */
const captured = (block) => (block ? Object.values(block) : [])
  .map((c) => c && c.name).filter((n) => typeof n === 'string')
  .flatMap((n) => n.split(/\s+/)).filter(Boolean);

/** A bound that consumes nothing: the content then spans the delimiters too. */
const zeroWidth = (pattern) => /^\(\?<?[=!]/.test(pattern || '');

/**
 * Every `contentName` rule one grammar declares, classified by what its delimiters inherit.
 *
 * @param {string} file  path to a .json grammar
 * @returns {Array<{file:string, kind:string, shape:string, content:string}>}
 */
function rulesIn(file) {
  const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.contentName === 'string') {
      const delimiters = [...captured(node.beginCaptures), ...captured(node.endCaptures),
        ...captured(node.captures)];
      const region = (node.name || '').split(/\s+/).filter(Boolean);
      const wants = node.contentName.split(/\s+/).filter(Boolean);
      let kind;
      if (node.match !== undefined && node.begin === undefined) kind = 'inert';
      else if (zeroWidth(node.begin) && zeroWidth(node.end)) kind = 'covering';
      else if (!delimiters.length) kind = 'unnamed-delimiter';
      else if (wants.every((w) => reaches(delimiters, w) || reaches(region, w))) kind = 'inherits';
      else kind = 'parts';
      const carried = [...new Set(delimiters.map(family))].sort().join('+') || '(none)';
      out.push({
        file: path.basename(file), kind, content: node.contentName,
        shape: `${family(wants[0])} <- ${carried}`
      });
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(grammar);
  return out;
}

// ── the inert claim, measured ───────────────────────────────────────────────────────────────────
//
// A `contentName` on a `match` rule declares nothing, and saying so costs nothing. So the gate
// READS it: the same construct twice, once carrying the field and once without, under the registry
// this repository's own gates build. The two must agree. The control runs the same comparison over
// a begin/end rule, where the field DOES move the reading — two readings agreeing say nothing
// unless the comparison can part two that differ.
const INERT_PROBE = {
  line: 'name=[[a value]]',
  match: (scopeName, extra) => Object.assign({
    scopeName,
    patterns: [Object.assign({
      match: '([\\w\\-]+)\\s*(=)\\s*(\\[\\[)(.*?)(\\]\\])',
      name: 'meta.probe',
      captures: {
        1: { name: 'variable.parameter.probe' },
        2: { name: 'keyword.operator.probe' },
        3: { name: 'punctuation.definition.string.begin.probe' },
        4: { name: 'string.quoted.bracket.probe' },
        5: { name: 'punctuation.definition.string.end.probe' }
      }
    }, extra)]
  }),
  region: (scopeName, extra) => ({
    scopeName,
    patterns: [Object.assign({
      begin: '(\\[\\[)', end: '(\\]\\])', name: 'meta.probe',
      beginCaptures: { 1: { name: 'punctuation.definition.string.begin.probe' } },
      endCaptures: { 1: { name: 'punctuation.definition.string.end.probe' } }
    }, extra)]
  })
};

/** The scopes this reader puts on one line, under a throwaway grammar. */
async function readUnder(raw) {
  const { createRegistryFromGrammars } = require('vscode-tmgrammar-test/dist/common/index.js');
  const registry = createRegistryFromGrammars([{
    grammar: { path: `${raw.scopeName}.json`, scopeName: raw.scopeName },
    content: JSON.stringify(raw)
  }]);
  const grammar = await registry.loadGrammar(raw.scopeName);
  // Each arm needs a scope name of its own, so the root drops out and the comparison stands on what
  // the rules put above it.
  return grammar.tokenizeLine(INERT_PROBE.line, null).tokens
    .map((t) => t.scopes.filter((s) => s !== raw.scopeName).join(' ')).join(' | ');
}

// ── the ledger ──────────────────────────────────────────────────────────────────────────────────

/** Every ruling the ledger carries, by the shape it rules. */
function rulings() {
  const out = new Map();
  for (const line of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const at = text.indexOf('#');
    const key = (at < 0 ? text : text.slice(0, at)).trim();
    out.set(key, at < 0 ? '' : text.slice(at + 1).trim());
  }
  return out;
}

(async () => {
  const rules = fs.readdirSync(SYNTAXES).filter((f) => f.endsWith('.json'))
    .flatMap((f) => rulesIn(path.join(SYNTAXES, f)));
  const shapes = new Map();
  for (const r of rules) {
    const key = `${r.kind} ${r.shape}`;
    if (!shapes.has(key)) shapes.set(key, { count: 0, files: new Set(), contents: new Set() });
    const s = shapes.get(key);
    s.count += 1; s.files.add(r.file); s.contents.add(r.content);
  }

  const ruled = rulings();
  const broken = [];
  const unruled = [...shapes.keys()].filter((k) => !ruled.has(k)).sort();
  if (unruled.length) {
    broken.push(`${unruled.length} shape(s) the tree declares and the ledger rules nowhere:`);
    for (const k of unruled) broken.push(`    ${k}   (${shapes.get(k).count} rule(s) in ${[...shapes.get(k).files].join(', ')})`);
  }
  const stale = [...ruled.keys()].filter((k) => !shapes.has(k)).sort();
  if (stale.length) {
    broken.push(`${stale.length} ruling(s) naming a shape the tree no longer declares:`);
    for (const k of stale) broken.push(`    ${k}`);
  }
  // A RULING EXPLAINING NOTHING has outlived its cause, the way an unexplained divergence has.
  const empty = [...ruled].filter(([k, reason]) => shapes.has(k) && reason.length < 40).map(([k]) => k).sort();
  if (empty.length) {
    broken.push(`${empty.length} ruling(s) explaining nothing:`);
    for (const k of empty) broken.push(`    ${k}`);
  }

  // The inert claim, read rather than asserted.
  const withField = await readUnder(INERT_PROBE.match('source.probe.with', { contentName: 'string.quoted.bracket.probe' }));
  const without = await readUnder(INERT_PROBE.match('source.probe.without', {}));
  const regionWith = await readUnder(INERT_PROBE.region('source.probe.region-with', { contentName: 'string.quoted.bracket.probe' }));
  const regionWithout = await readUnder(INERT_PROBE.region('source.probe.region-without', {}));
  if (withField !== without) broken.push('a contentName on a match rule MOVES the reading after all, so the inert kind names nothing');
  if (regionWith === regionWithout) broken.push('the control reads alike, so the comparison parts nothing and the agreement above says nothing');

  const byKind = new Map();
  for (const r of rules) byKind.set(r.kind, (byKind.get(r.kind) || 0) + 1);
  for (const kind of ['inert', 'covering', 'inherits', 'parts', 'unnamed-delimiter']) {
    console.log(`  ${kind.padEnd(18)} ${String(byKind.get(kind) || 0).padStart(3)} rule(s)`);
  }
  console.log('  a contentName on a match rule moves nothing — both arms read identically');
  console.log('  control: a contentName on a begin/end rule moves the reading, so the comparison parts what differs');
  if (verbose) {
    console.log('');
    for (const [key, s] of [...shapes].sort()) {
      console.log(`  ${String(s.count).padStart(3)}x  ${key}`);
      console.log(`       ${ruled.get(key) || '(unruled)'}`);
    }
  }
  for (const b of broken) console.error(`  ${b}`);
  console.log(`delimiter-inheritance  ${rules.length} contentName rule(s) over ${shapes.size} shape(s), ${unruled.length} unruled`);
  process.exitCode = broken.length === 0 ? 0 : 1;
  return;
})();
