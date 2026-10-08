// What a theme paints, held to the engine that paints it.
//
// Four tools here measured colour, and each carried its own theme loader and its own idea of how a
// selector reaches a scope. They answered different questions — one wants the rule a whole stack
// lands on, one wants whether anything paints at all, one wants the colour of a single scope — but
// they shared the model underneath, and a shared model written four times drifts four ways.
//
// One loader, one resolution, three queries.
//
// THE RESOLUTION, AS `vscode-textmate` RUNS IT. A grammar pushes a token's scopes onto a stack
// OUTERMOST FIRST, and the theme answers at every push: whichever rule matches the scope just
// pushed OVERWRITES the style carried so far. So the INNERMOST scope any rule reaches decides the
// colour outright, and a selector's depth breaks a tie only among rules reaching the SAME scope.
// Depth never outranks position. A model ranking it the other way hands `markup.underline.link` on
// a link's container where the engine hands `string` on the caption inside it — measured, that one
// inversion accounts for the whole divergence this module used to carry.
//
// EACH PROPERTY RESOLVES ON ITS OWN. A rule setting only a `fontStyle` leaves the foreground
// standing, so a bold-only rule bolds a span another rule coloured.
//
// A SELECTOR REACHES by whole dot-separated segments: `markup.heading` reaches
// `markup.heading.1.tiddlywiki5` and `markup.head` reaches nothing. A selector may carry a
// descendant path — `text.html meta.embedded` — and only its LAST element decides what it reaches;
// the elements before it must stand somewhere EARLIER in the stack. A theme's own ordering breaks a
// remaining tie, later winning.
//
// THE DEFAULT IS THE EDITOR'S, NEVER A SCOPELESS RULE. VS Code builds the rule list it hands the
// engine from `colors['editor.foreground']` and `editor.background`, drops every scopeless entry in
// `tokenColors` — "the default rule (scope empty) is always the first rule. Ignore all other
// default rules" — and appends its own `token.*` rules where the theme names none. Comparing a
// model's fall-through against a DIFFERENT default from the engine's reads as divergence that
// belongs to the harness, so `engineTheme` builds the engine's list from the same reading.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');

/** A selector reaches a scope by whole dot-separated segments, never by part of one. */
const covers = (selector, scope) => scope === selector || scope.startsWith(`${selector}.`);

// VS Code's own `normalizeColor`. A theme writes `#D50` and `#24292eff` where the engine's colour
// map holds `#DD5500` and `#24292E`, so a comparison on the raw strings reports a divergence that
// stands nowhere on screen.
/**
 * A colour spelled the one way the engine holds it, or undefined where it spells nothing.
 *
 * @param {unknown} colour
 * @returns {string|undefined}
 */
function normalise(colour) {
  if (!colour || typeof colour !== 'string') return undefined;
  const len = colour.length;
  if (colour[0] !== '#' || ![4, 5, 7, 9].includes(len)) return undefined;
  let out = '#';
  for (let i = 1; i < len; i++) {
    const upper = colour[i].toUpperCase();
    if (!/[0-9A-F]/.test(upper)) return undefined;
    out += upper;
    if (len === 4 || len === 5) out += upper;
  }
  return out.length === 9 && out.slice(7) === 'FF' ? out.slice(0, 7) : out;
}

// What VS Code registers for an editor a theme leaves unstated, by base theme.
const EDITOR_FOREGROUND = { dark: '#BBBBBB', light: '#333333', hcDark: '#FFFFFF', hcLight: '#292929' };
const EDITOR_BACKGROUND = { dark: '#1E1E1E', light: '#FFFFFF', hcDark: '#000000', hcLight: '#FFFFFF' };

// The rules VS Code appends where a theme names no `token.info-token` of its own. No grammar scope
// begins `token.`, so these paint nothing here — they stand so the rule list matches the engine's
// byte for byte rather than nearly.
const DEFAULT_TOKENS = {
  dark: [['token.info-token', '#6796e6'], ['token.warn-token', '#cd9731'],
    ['token.error-token', '#f44747'], ['token.debug-token', '#b267e6']],
  light: [['token.info-token', '#316bcd'], ['token.warn-token', '#cd9731'],
    ['token.error-token', '#cd3131'], ['token.debug-token', '#800080']],
  hcDark: [['token.info-token', '#6796e6'], ['token.warn-token', '#008000'],
    ['token.error-token', '#FF0000'], ['token.debug-token', '#b267e6']],
  hcLight: [['token.info-token', '#316bcd'], ['token.warn-token', '#cd9731'],
    ['token.error-token', '#cd3131'], ['token.debug-token', '#800080']]
};

/** The base theme a theme answers to, named the way VS Code names it. */
const baseOf = (theme) => (Object.prototype.hasOwnProperty.call(EDITOR_FOREGROUND, theme.type) ? theme.type : 'dark');

/**
 * One theme, read the way VS Code reads it: a base, a default style, and the rules in order.
 *
 * A rule's `scope` may hold a list, a comma-joined string, or a descendant path; each becomes one
 * entry carrying the parts that must match and what it paints.
 *
 * @param {object} theme  the JSON a theme ships
 * @returns {{base: string, defaults: {foreground: string, background: string}, rules: {parts: string[], order: number, settings: Record<string,string>}[]}}
 */
function flatten(theme) {
  // A caller handing back what `flatten` already returned reads as a theme with no rules, and the
  // gate above it measures sixty-five themes' worth of nothing while reporting green. So the shape
  // answers before the reading does.
  if (!theme || typeof theme !== 'object' || Array.isArray(theme) || !('tokenColors' in theme)) {
    throw new TypeError('flatten takes a theme; rulesOf takes either a theme or the model it built');
  }
  const base = baseOf(theme);
  const colours = theme.colors || {};
  const defaults = {
    foreground: normalise(colours['editor.foreground']) || EDITOR_FOREGROUND[base],
    background: normalise(colours['editor.background']) || EDITOR_BACKGROUND[base]
  };
  const rules = [];
  // The rule list VS Code hands the engine, kept beside the model that answers for it. A theme's
  // own entry carries its scope UNSPLIT — a rule naming three selectors stands as one entry there
  // and as three here — so rebuilding one from the other drops the selectors past the first.
  const engine = [{ settings: { foreground: defaults.foreground, background: defaults.background } }];
  let order = 0;
  const add = (scope, settings) => {
    engine.push({ scope, settings });
    for (const selector of (Array.isArray(scope) ? scope : String(scope).replace(/^,+|,+$/g, '').split(','))) {
      const parts = selector.trim().split(/\s+/).filter(Boolean);
      if (parts.length) rules.push({ parts, order, settings });
    }
    order += 1;
  };
  let named = false;
  for (const rule of theme.tokenColors || []) {
    // A scopeless entry names the editor's default, and VS Code ignores every one of them.
    if (!rule.scope || !rule.settings) continue;
    if (rule.scope === 'token.info-token') named = true;
    add(rule.scope, {
      foreground: normalise(rule.settings.foreground),
      background: normalise(rule.settings.background),
      fontStyle: rule.settings.fontStyle
    });
  }
  if (!named) for (const [scope, foreground] of DEFAULT_TOKENS[base]) add(scope, { foreground: normalise(foreground) });
  return { base, defaults, rules, engine };
}

/** One theme file, read. */
function loadTheme(file) {
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')));
}

/** Every bundled theme, or an empty list where none stands. */
function loadThemes() {
  if (!fs.existsSync(THEMES)) return [];
  const files = fs.readdirSync(THEMES).filter((f) => f.endsWith('.json'));
  const loaded = [];
  for (const file of files) {
    try { loaded.push(loadTheme(path.join(THEMES, file))); }
    catch { loadThemes.dropped.push(file); }
  }
  return loaded;
}
// What the last load could not read. A silent drop turns a measurement over sixty-five themes into
// one over none, and a caller counting themes alone notices.
loadThemes.dropped = [];

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
 * A theme either read or raw. A caller holding the JSON a theme ships hands it over as it stands; a
 * caller holding the model hands that. Refusing one of the two moves the difference into every
 * caller.
 *
 * @param {unknown} theme
 */
const modelOf = (theme) => (theme && Array.isArray(theme.rules) ? theme : flatten(theme));

/** The rules alone, for a caller weighing selectors rather than colour. */
const rulesOf = (theme) => modelOf(theme).rules;

/**
 * Whether a rule's descendant path stands satisfied by the scopes OUTSIDE position `at`.
 *
 * The elements before the last must each stand earlier in the stack, nearest first, and gaps
 * between them stand allowed — the way the engine matches a parent scope list.
 */
function ancestorsStand(parts, stack, at) {
  let j = at - 1;
  for (let p = parts.length - 2; p >= 0; p--) {
    while (j >= 0 && !covers(parts[p], stack[j])) j--;
    if (j < 0) return false;
    j--;
  }
  return true;
}

/**
 * The rule the engine lands on for ONE scope in a stack, or null.
 *
 * Depth of the selector's last element ranks first, then how many ancestors it names, then the
 * theme's own order with the later rule winning — the engine's own ordering among the rules
 * reaching one scope.
 */
function ruleAt(stack, at, rules, wants) {
  let best = null;
  for (const rule of rules) {
    if (wants && rule.settings[wants] === undefined) continue;
    const last = rule.parts[rule.parts.length - 1];
    if (!covers(last, stack[at])) continue;
    if (!ancestorsStand(rule.parts, stack, at)) continue;
    const score = last.split('.').length * 1000 + rule.parts.length;
    if (!best || score > best.score || (score === best.score && rule.order >= best.order)) {
      best = { score, order: rule.order, selector: rule.parts.join(' '), settings: rule.settings };
    }
  }
  return best;
}

/**
 * The style a theme paints a scope STACK with — foreground, background and fontStyle, each from
 * its own innermost rule, over the editor's default.
 *
 * @param {string[]} stack
 * @param {object} theme
 * @returns {{foreground: string, background: string, fontStyle: string|null, selector: string|null}}
 */
function styleOf(stack, theme) {
  const model = modelOf(theme);
  const style = { foreground: model.defaults.foreground, background: model.defaults.background, fontStyle: null, selector: null };
  for (let at = 0; at < stack.length; at++) {
    for (const key of ['foreground', 'background', 'fontStyle']) {
      const rule = ruleAt(stack, at, model.rules, key);
      if (!rule) continue;
      style[key] = key === 'fontStyle' ? fontStyleOf(rule.settings.fontStyle) : rule.settings[key];
      if (key === 'foreground') style.selector = rule.selector;
    }
  }
  return style;
}

// A fontStyle spelled the one way the engine holds it: a sorted set of the four styles it knows, and
// null for none. A theme writes `""` to CLEAR an inherited style, which reads as no style rather
// than as no rule — so the empty spelling and the absent one land on the same answer on screen.
const STYLES = ['bold', 'italic', 'strikethrough', 'underline'];
const fontStyleOf = (value) => (typeof value === 'string'
  ? (value.split(/\s+/).filter((s) => STYLES.includes(s)).sort().join(' ') || null)
  : null);

/**
 * The rule whose FOREGROUND a theme paints a stack with, or null where the stack falls through to
 * the editor's own foreground and reads as prose.
 *
 * @param {string[]} stack
 * @param {object} theme
 */
function reaches(stack, theme) {
  const rules = rulesOf(theme);
  let found = null;
  for (let at = 0; at < stack.length; at++) {
    const rule = ruleAt(stack, at, rules, 'foreground');
    if (rule) found = rule;
  }
  return found;
}

/** Whether a theme paints a stack at all, rather than leaving it the editor's foreground. */
const paints = (stack, theme) => Boolean(reaches(stack, theme));

/**
 * The foreground a theme gives ONE scope, or null where no rule reaches it.
 *
 * A scope asked alone answers differently from the same scope inside a stack — an ancestor cannot
 * paint what a caller never handed over, and a descendant selector reaches nothing at all — so a
 * caller asking about a construct hands the stack.
 *
 * @param {string} scope
 * @param {object} theme
 */
function colourOf(scope, theme) {
  // A CALLER HANDING A STACK GETS ITS STACK READ. The doc above tells a caller to hand one, and
  // wrapping every argument in a single-element array made that impossible — a descendant selector
  // then answered nowhere, and no caller could prove it answers where its ancestor stands.
  const rule = reaches(Array.isArray(scope) ? scope : [scope], theme);
  return rule ? rule.settings.foreground : null;
}

/**
 * The rule list VS Code hands `vscode-textmate` for a theme.
 *
 * @param {object} theme
 * @returns {{settings: Array<{scope?: string, settings: object}>}}
 */
const engineTheme = (theme) => ({ settings: modelOf(theme).engine });

/**
 * A theme carrying exactly ONE rule, for settling a reading rather than measuring one.
 *
 * Three harnesses failed to settle which bits of a token's metadata hold its foreground; a theme
 * painting one known scope one unmistakable colour settled it in minutes, because an index that
 * appears at one offset and nowhere else admits no second reading.
 *
 * @param {string} scope
 * @param {Record<string,string>} settings
 * @param {{foreground: string, background: string}} [editor]
 */
const probeTheme = (scope, settings, editor = { foreground: '#010203', background: '#000000' }) =>
  flatten({ type: 'dark', colors: { 'editor.foreground': editor.foreground, 'editor.background': editor.background },
    tokenColors: [{ scope, settings }] });

module.exports = {
  THEMES, probeTheme, covers, normalise, flatten, modelOf, rulesOf, loadTheme, loadThemes, loadThemesByName,
  styleOf, reaches, paints, colourOf, engineTheme
};
