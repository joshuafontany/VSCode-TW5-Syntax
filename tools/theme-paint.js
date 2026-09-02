#!/usr/bin/env node
// How loudly a scope reads, measured across the themes people actually use.
//
// A TextMate grammar cannot switch a rule off — nothing in the VS Code API registers,
// edits or unregisters a grammar at runtime. What a grammar DOES choose: how loudly a
// construct reads by default, because a theme paints a scope only when one of its own
// rules names that scope or a dotted PREFIX of it. `markup.underline.link.…` inherits every
// theme's link colour; `meta.…` inherits almost nothing.
//
// So the scope name IS the default. This measures it against the bundled theme set rather
// than leaving it to anyone's sense of convention.
//
//   node tools/theme-paint.js <scope>...      how many themes paint each scope
//   node tools/theme-paint.js --families      every scope the grammar emits, by family
//
// The deciding half — themeRules, paints, paintRate — stands under test in
// tests/tools/theme-paint.test.js.

const fs = require('node:fs');
const path = require('node:path');

const THEME_DIR = path.resolve(__dirname, '..', 'node_modules', 'tm-themes', 'themes');

/**
 * The scope selectors a theme declares, flattened.
 *
 * A `scope` arrives as a string, a comma-separated string, or an array; all three mean the
 * same list of selectors.
 *
 * @param {object} theme  a parsed theme JSON
 * @returns {string[]}
 */
// One matching rule, shared. Four tools here weigh what a selector reaches, and a rule written
// four times parts four ways the day one of them learns something.
const { covers, flatten } = require('./theme-model.js');

function themeRules(theme) {
  // The model already flattens a theme, and it keeps what each rule paints; this wants only the
  // selectors. Reading tokenColors a second way here parted from the model the day either changed.
  return flatten(theme).map((rule) => rule.parts.join(' '));
}

/**
 * The selector that paints a scope, or null.
 *
 * TextMate matches by dotted prefix: `markup.underline` paints
 * `markup.underline.link.wikilink.tiddlywiki5`, and `markup.underlines` paints nothing.
 * A descendant selector — `meta.tag entity.name` — targets its LAST element, so only that
 * element carries the comparison.
 *
 * @param {string} scope
 * @param {string[]} rules  themeRules() output
 * @returns {string|null}
 */
function paints(scope, rules) {
  for (const rule of rules) {
    // A descendant selector names ancestors and then its target. This tool weighs ONE scope
    // string, never a stack, so it cannot judge ancestry — it compares the target alone and
    // under-counts rather than claiming a match it could not check.
    const parts = rule.split(/\s+/);
    const target = parts[parts.length - 1];
      if (covers(target, scope)) return target;
  }
  return null;
}

/**
 * Every bundled theme, by name.
 *
 * @returns {{name:string, rules:string[]}[]}
 */
function loadThemes(dir = THEME_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return { name: f.slice(0, -5), rules: themeRules(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * How many themes paint a scope, and through which selectors.
 *
 * @param {string} scope
 * @param {{name:string, rules:string[]}[]} themes
 * @returns {{painted:string[], total:number, via:Record<string,number>}}
 */
function paintRate(scope, themes) {
  const painted = [];
  const via = {};
  for (const { name, rules } of themes) {
    const selector = paints(scope, rules);
    if (!selector) continue;
    painted.push(name);
    via[selector] = (via[selector] || 0) + 1;
  }
  return { painted, total: themes.length, via };
}

/**
 * Every scope this grammar emits.
 *
 * @param {string} grammarPath
 * @returns {string[]}
 */
function grammarScopes(grammarPath) {
  const found = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'name' || key === 'contentName') && typeof value === 'string') {
        for (const s of value.split(/\s+/)) if (s && !s.includes('$')) found.add(s);
      } else walk(value);
    }
  };
  walk(JSON.parse(fs.readFileSync(grammarPath, 'utf8')));
  return [...found].sort();
}

module.exports = { THEME_DIR, themeRules, paints, loadThemes, paintRate, grammarScopes };

if (require.main === module) {
  const themes = loadThemes();
  if (themes.length === 0) {
    console.error(`no themes found in ${THEME_DIR} — run npm install`);
    process.exit(2);
  }
  const args = process.argv.slice(2);
  if (args.includes('--families')) {
    const scopes = grammarScopes(path.resolve(__dirname, '..', 'syntaxes', 'tiddlywiki5.json')).filter((s) =>
      s.endsWith('.tiddlywiki5')
    );
    const families = new Map();
    for (const s of scopes) {
      const family = s.split('.').slice(0, 2).join('.');
      if (!families.has(family)) families.set(family, []);
      families.get(family).push(s);
    }
    console.log(`theme-paint  ${scopes.length} scopes, ${families.size} families, ${themes.length} themes\n`);
    const rows = [...families]
      .map(([family, members]) => ({ family, members, rate: paintRate(members[0], themes).painted.length }))
      .sort((a, b) => b.rate - a.rate || b.members.length - a.members.length);
    for (const { family, members, rate } of rows) {
      console.log(`  ${String(rate).padStart(2)}/${themes.length}  ${family.padEnd(28)} ${members.length} scope(s)`);
    }
    process.exit(0);
  }
  if (args.length === 0) {
    console.error('usage: node tools/theme-paint.js <scope>... | --families');
    process.exit(2);
  }
  for (const scope of args) {
    const { painted, total, via } = paintRate(scope, themes);
    console.log(`  ${String(painted.length).padStart(2)}/${total}  ${scope}`);
    for (const [selector, n] of Object.entries(via).sort((a, b) => b[1] - a[1])) {
      console.log(`          via "${selector}" x${n}`);
    }
  }
}
