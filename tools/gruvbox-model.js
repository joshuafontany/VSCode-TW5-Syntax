// Six themes the bundled set never carries, reached the way `grammars.sh` reaches a platform's own
// VS Code install: a candidate root per platform, read if it exists, named absent if it does not.
//
// The operator ruled the six `jdinhlife.gruvbox` themes — Dark Hard, Dark Medium, Dark Soft, Light
// Hard, Light Medium, Light Soft — measured and REPORTED beside the bundled 65, never admitted to a
// floor. `tools/theme-model.js` already answers "every bundled theme, or an empty list where none
// stands" for `node_modules/tm-themes/themes`; this answers the same question for a marketplace
// extension's `themes/` directory, which ships nowhere this package installs.
//
// THREE WAYS IN, EACH ONE EXPLICIT BEFORE IT IS A GUESS.
//   1. `GRUVBOX_THEMES_DIR`  — a directory already holding the six JSON files, named outright. The
//      house law for `TW5_PATH` applies here too: a reader who wants a sure reading names the
//      directory rather than trusting a sibling heuristic.
//   2. `VSCODE_EXTENSIONS_DIR` — a directory to search for `jdinhlife.gruvbox-*`, for a reader whose
//      extensions do not sit where this file's own candidates look.
//   3. The conventional per-platform extensions roots VS Code itself installs into. None of these
//      is where `grammars.sh` looks — that file reads VS Code's OWN bundled grammars under
//      `resources/app/extensions`, which never carries a marketplace theme — so this names its own
//      candidates rather than borrowing that file's list.
//
// A machine carrying none of the three reads ABSENT, plainly, never a crash and never a silent
// zero standing in for six. `tools/gruvbox-report.js` turns that into a `SKIP` summary line CI's
// own standalone checkout meets honestly, on every platform `test.yml` runs, including Windows
// under cmd.exe where none of these candidates exists at all.
//
// THE SIX NAMES ARE NEVER HAND-LISTED HERE. Whatever `.json` files the resolved `themes/` directory
// holds get read, the way `loadThemes()` reads whatever stands in `tm-themes/themes` — so a theme
// the extension drops or adds is what this reports, not what somebody remembered to type.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { flatten } = require('./theme-model.js');

// The extension's own publisher.name — stable across every version jdinhlife has shipped.
const SLUG = /^jdinhlife\.gruvbox-/;

/** Every directory this reader's platform conventionally installs VS Code extensions into. */
function candidateExtensionRoots() {
  const home = os.homedir();
  const roots = [
    path.join(home, '.vscode', 'extensions'),
    path.join(home, '.vscode-server', 'extensions'),
    path.join(home, '.vscode-insiders', 'extensions')
  ];
  if (process.env.USERPROFILE) {
    roots.push(path.join(process.env.USERPROFILE, '.vscode', 'extensions'));
    roots.push(path.join(process.env.USERPROFILE, '.vscode-insiders', 'extensions'));
  }
  return roots;
}

/** The newest `jdinhlife.gruvbox-*` folder an extensions root carries, or null. */
function newestGruvbox(extensionsRoot) {
  if (!fs.existsSync(extensionsRoot)) return null;
  const found = fs.readdirSync(extensionsRoot).filter((name) => SLUG.test(name)).sort();
  // Lexical sort on `jdinhlife.gruvbox-X.Y.Z` orders by version for every version this extension
  // has shipped (single or double digit components alike have sorted this way since 1.0.0); the
  // LAST entry is the newest one installed.
  return found.length ? path.join(extensionsRoot, found[found.length - 1], 'themes') : null;
}

/**
 * The directory holding the six theme JSON files, or null with a reason naming why none resolved.
 *
 * @returns {{dir: string|null, reason: string|null}}
 */
function resolveThemesDir() {
  if (process.env.GRUVBOX_THEMES_DIR) {
    const dir = process.env.GRUVBOX_THEMES_DIR;
    if (fs.existsSync(dir)) return { dir, reason: null };
    return { dir: null, reason: `GRUVBOX_THEMES_DIR names ${dir}, which does not exist` };
  }
  if (process.env.VSCODE_EXTENSIONS_DIR) {
    const dir = newestGruvbox(process.env.VSCODE_EXTENSIONS_DIR);
    if (dir) return { dir, reason: null };
    return { dir: null, reason: `VSCODE_EXTENSIONS_DIR names ${process.env.VSCODE_EXTENSIONS_DIR}, which carries no jdinhlife.gruvbox-*` };
  }
  for (const root of candidateExtensionRoots()) {
    const dir = newestGruvbox(root);
    if (dir) return { dir, reason: null };
  }
  return { dir: null, reason: 'no jdinhlife.gruvbox extension found under GRUVBOX_THEMES_DIR, VSCODE_EXTENSIONS_DIR, or any conventional VS Code extensions root' };
}

/**
 * Every theme the resolved `jdinhlife.gruvbox` directory carries, flattened the way
 * `theme-model.js`'s `loadThemes()` flattens the bundled set — or an absent reading, named.
 *
 * @returns {{themes: object[], names: string[], dir: string|null, available: boolean, reason: string|null, dropped: string[]}}
 */
function loadGruvboxThemes() {
  const { dir, reason } = resolveThemesDir();
  if (!dir) return { themes: [], names: [], dir: null, available: false, reason, dropped: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const themes = [];
  const names = [];
  const dropped = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, '');
      themes.push(flatten(JSON.parse(raw)));
      names.push(file.replace(/\.json$/, ''));
    } catch { dropped.push(file); }
  }
  if (!themes.length) {
    return { themes: [], names: [], dir, available: false, reason: `${dir} resolved but carries no readable theme JSON`, dropped };
  }
  return { themes, names, dir, available: true, reason: null, dropped };
}

module.exports = { SLUG, candidateExtensionRoots, newestGruvbox, resolveThemesDir, loadGruvboxThemes };
