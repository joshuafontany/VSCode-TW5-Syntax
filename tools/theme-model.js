// What a theme paints, asked three ways.
//
// Four tools here measured colour, and each carried its own theme loader and its own idea of how a
// selector reaches a scope. They answered different questions — one wants the winning rule for a
// whole stack, one wants whether anything paints at all, one wants the colour of a single scope —
// but they shared the model underneath, and a shared model written four times drifts four ways.
//
// One loader, one matching rule, three queries.
//
// THE MATCHING RULE. A selector reaches a scope when it equals it or names a dot-bounded prefix of
// it, so `markup.heading` reaches `markup.heading.1.tiddlywiki5` and `markup.head` reaches
// nothing. A selector may carry a descendant path — `text.html meta.embedded` — and only its LAST
// element decides what it reaches; the elements before it must stand somewhere earlier in the
// stack. A theme's own ordering breaks a tie, later winning, the way VS Code resolves one.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

/** A selector reaches a scope by whole dot-separated segments, never by part of one. */
const covers = (selector, scope) => scope === selector || scope.startsWith(`${selector}.`);

/**
 * One theme, flattened to its rules. A rule's `scope` may hold a list, a comma-joined string, or a
 * descendant path; each becomes one entry carrying the parts that must match and what it paints.
 *
 * @param {string} file
 * @returns {{parts: string[], order: number, settings: Record<string,string>}[]}
 */
function loadTheme(file) {
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')));
}

/** One theme object, flattened to its rules. */
function flatten(theme) {
  const rules = [];
  (theme.tokenColors || []).forEach((rule, order) => {
    const scope = rule.scope;
    if (!scope) return;
    for (const selector of (Array.isArray(scope) ? scope : String(scope).split(','))) {
      const parts = selector.trim().split(/\s+/).filter(Boolean);
      if (parts.length) rules.push({ parts, order, settings: rule.settings || {} });
    }
  });
  return rules;
}

/** Every bundled theme, or an empty list where none stands. */
function loadThemes() {
  if (!fs.existsSync(THEMES)) return [];
  return fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return loadTheme(path.join(THEMES, f)); } catch { return null; } })
    .filter(Boolean);
}

/** Every bundled theme, by file name, for a caller naming one. */
function loadThemesByName() {
  if (!fs.existsSync(THEMES)) return new Map();
  const out = new Map();
  for (const f of fs.readdirSync(THEMES).filter((x) => x.endsWith('.json'))) {
    try { out.set(f.replace(/\.json$/, ''), loadTheme(path.join(THEMES, f))); } catch { /* a theme this reader cannot take */ }
  }
  return out;
}

/**
 * The rule a theme paints a scope STACK with, or null.
 *
 * Depth decides first — a selector naming more segments wins — then position in the stack, so an
 * innermost scope outranks the base it stands on.
 *
 * @param {string[]} stack
 * @param {ReturnType<typeof loadTheme>} rules
 */
function winner(stack, theme) {
  const rules = rulesOf(theme);
  let best = null;
  for (const rule of rules) {
    const last = rule.parts[rule.parts.length - 1];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!covers(last, stack[i])) continue;
      let ok = true;
      let j = i - 1;
      for (let p = rule.parts.length - 2; p >= 0; p--) {
        while (j >= 0 && !covers(rule.parts[p], stack[j])) j--;
        if (j < 0) { ok = false; break; }
        j--;
      }
      if (!ok) continue;
      const score = last.split('.').length * 1000 + i * 10 + rule.parts.length;
      if (!best || score > best.score || (score === best.score && rule.order > best.order)) {
        best = { score, order: rule.order, selector: rule.parts.join(' '), settings: rule.settings };
      }
      break;
    }
  }
  return best;
}

/**
 * A theme either loaded or raw. A caller holding the JSON a theme ships hands it over as it
 * stands; a caller holding the flattened rules hands those. Refusing one of the two would move
 * the difference into every caller.
 *
 * @param {unknown} theme
 */
function rulesOf(theme) {
  return Array.isArray(theme) ? theme : flatten(theme);
}

/** Whether a theme paints a stack at all. */
const paints = (stack, theme) => rulesOf(theme).some((r) => stack.some((s) => covers(r.parts[r.parts.length - 1], s)));

/**
 * The foreground a theme gives ONE scope, by its longest matching selector, or null.
 *
 * A scope asked alone answers differently from the same scope inside a stack — an ancestor cannot
 * paint what a caller never handed over — so a caller asking about a construct hands the stack.
 *
 * @param {string} scope
 * @param {ReturnType<typeof loadTheme>} rules
 */
function colourOf(scope, theme) {
  const rules = rulesOf(theme);
  let best = null;
  let reach = -1;
  for (const rule of rules) {
    const last = rule.parts[rule.parts.length - 1];
    if (covers(last, scope) && last.length > reach) {
      reach = last.length;
      best = rule.settings.foreground || null;
    }
  }
  return best;
}

/** One style property, resolved on its own — VS Code takes each from its own most specific rule. */
function propertyOf(stack, theme, key) {
  const rules = rulesOf(theme);
  let best = null;
  for (const rule of rules) {
    if (rule.settings[key] === undefined) continue;
    const last = rule.parts[rule.parts.length - 1];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!covers(last, stack[i])) continue;
      const score = last.split('.').length * 1000 + i * 10;
      if (!best || score > best.score) best = { score, value: rule.settings[key] };
      break;
    }
  }
  return best && best.value;
}

module.exports = { THEMES, covers, flatten, rulesOf, loadTheme, loadThemes, loadThemesByName, winner, paints, colourOf, propertyOf };
