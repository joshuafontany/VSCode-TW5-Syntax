#!/usr/bin/env node
// A construct the corpus reaches that no theme paints.
//
// Every other gate here asks whether two things read ALIKE or APART. A construct can pass both and
// still read as nothing: no theme rule reaches its innermost scope, so it takes the editor's own
// foreground and a reader meets it as prose. Measured before the vocabulary work, a heading did
// exactly that — 9 of 65 themes coloured its text — while every gate read green, because a scope
// stood there and matched its siblings.
//
// Plain reading often serves the reader. A paragraph, the words inside a bullet, the content of
// embedded MathML — markdown leaves all of them plain too, and the panel median for a list's
// content across six markup grammars sits at 6%. So this reports only what stands UNDECLARED: a dark
// construct earns a line here saying why a reader should meet it plain, or the gate fails.
//
// The floor counts themes, not spans. A construct standing dark on one span stands dark on all of
// them.
//
//   node tools/dark-construct.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readSnapshot } = require('./snapshot-format.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const SAMPLES = path.join(ROOT, 'tests', 'samples');
const verbose = process.argv.includes('--verbose');

// How many of the bundled themes must paint a construct before it reads as painted at all.
const LEAST = 16;

// The reasons live in the edition, at $:/tw5-syntax/PlainConstructs, because each answers a
// question no theme answers: should a reader meet this as prose? A list of those inside a tool
// stands where nobody argues over it, and a construct that outgrows its reason deserves an
// argument rather than a quiet deletion.
//
// A scope leaving the list without gaining colour fails the gate; a reason answering to nothing
// fails it the same way.
const { readData } = require('./wiki-data.js');
let PLAIN;
try {
  PLAIN = readData('PlainConstructs').data;
} catch (e) {
  // A gate that cannot read its own declarations must stop, never report agreement with nothing.
  console.error(`  ${e.message}`);
  process.exit(2);
}


/** A theme's rules, flattened to one selector each. */
function loadTheme(file) {
  const theme = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const rules = [];
  for (const rule of theme.tokenColors || []) {
    for (const selector of [].concat(rule.scope || [])) {
      for (const part of String(selector).split(',')) {
        const last = part.trim().split(/\s+/).pop();
        if (last) rules.push({ last, settings: rule.settings || {} });
      }
    }
  }
  return rules;
}

const covers = (selector, scope) => scope === selector || scope.startsWith(`${selector}.`);
const paints = (rules, stack) => rules.some((r) => stack.some((s) => covers(r.last, s)));

const themes = fs.existsSync(THEMES)
  ? fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
      .map((f) => { try { return loadTheme(path.join(THEMES, f)); } catch { return null; } })
      .filter(Boolean)
  : [];

if (!themes.length) {
  console.error('no bundled themes — run npm install');
  process.exit(2);
}

// Every innermost scope the corpus reaches, with how many themes paint the stack it stands in.
const seen = new Map();
for (const name of fs.readdirSync(SAMPLES).filter((f) => f.endsWith('.snap'))) {
  let records;
  try { records = readSnapshot(fs.readFileSync(path.join(SAMPLES, name), 'utf8')); } catch { continue; }
  for (const { source, annotations } of records) {
    if (!source) continue;
    for (const a of annotations) {
      const text = source.slice(a.start, a.end);
      if (!text.trim()) continue;
      const inner = a.scopes[a.scopes.length - 1];
      if (seen.has(inner)) { seen.get(inner).spans += 1; continue; }
      seen.set(inner, { spans: 1, themes: themes.filter((t) => paints(t, a.scopes)).length, sample: text.slice(0, 18) });
    }
  }
}

const declared = (scope) => Object.keys(PLAIN).find((p) => scope === p || scope.startsWith(`${p}.`));

const dark = [...seen].filter(([, v]) => v.themes < LEAST);
const undeclared = dark.filter(([s]) => !declared(s));
// A reason nothing reaches stops explaining anything, the same way a stale relation does.
const idle = Object.keys(PLAIN).filter((p) => !dark.some(([s]) => s === p || s.startsWith(`${p}.`)));

if (verbose) {
  for (const [scope, v] of dark.sort((a, b) => b[1].spans - a[1].spans)) {
    console.log(`  ${String(v.spans).padStart(5)}x  ${String(v.themes).padStart(2)}/${themes.length}  ${scope}   [${v.sample}]`);
  }
}
for (const [scope, v] of undeclared) {
  console.error(`  ${scope} stands dark — ${v.themes}/${themes.length} themes paint it, over ${v.spans} span(s) — and no line says why a reader should meet it plain`);
}
for (const p of idle) {
  console.error(`  "${p}" names a reason nothing needs — no construct under it stands dark`);
}
console.log(`dark-construct  ${seen.size} construct(s) over ${themes.length} themes, ${dark.length} plain, `
  + `${undeclared.length + idle.length} unaccounted`);
process.exit(undeclared.length + idle.length === 0 ? 0 : 1);
