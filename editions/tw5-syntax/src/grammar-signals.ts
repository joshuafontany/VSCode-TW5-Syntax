/*\
title: $:/tw5-syntax/modules/grammar-signals
type: application/javascript
module-type: startup
\*/
/**
 * grammar-signals — harvest what THIS TiddlyWiki knows, into tiddlers the grammar answers to.
 *
 * A grammar carries lists it cannot derive: which filter operators exist, which widgets the core
 * ships, which wikitext rules stand. Each list goes stale on the release that adds to it, and
 * nothing in a grammar notices — a new operator simply reads as an unknown word.
 *
 * The host already knows. `$tw.modules.types` carries every registered filteroperator, widget and
 * wikirule, so a boot of this edition against a given TiddlyWiki reports that version's answer.
 * This module writes it down. A later boot against a newer TiddlyWiki writes a different answer,
 * a gate compares the two, and the cascade reaches the grammar as a failing check rather than as
 * a silent gap.
 *
 * Written in TypeScript and compiled to a CJS module tiddler, the way the parent repo builds its
 * own TW5 modules — the source carries the tiddler header, so the compiled file needs no wrapper.
 */

declare const exports: Record<string, unknown>;
declare const $tw: {
  version: string;
  modules: { types: Record<string, Record<string, unknown>> };
  wiki: { addTiddler: (fields: Record<string, string>) => void };
  utils: { each: (o: unknown, f: (v: unknown, k: string) => void) => void };
};

exports.name = "grammar-signals";
exports.platforms = ["node"];
exports.after = ["load-modules"];
// A command runs inside the `commands` startup, so the signals must stand in the wiki before it.
// Without this the render found no tiddler and wrote zero bytes, with exit code zero.
exports.before = ["commands"];
exports.synchronous = true;

/** The module names one registry holds, in a stable order. */
function namesOf(type: string): string[] {
  return Object.keys($tw.modules.types[type] || {}).sort();
}

/**
 * A filter operator's module name reads `$:/core/modules/filters/<name>.js`, and its own exported
 * name may differ — the tail of the path names the operator an author writes.
 */
function operatorNames(): string[] {
  return namesOf("filteroperator")
    .map((title) => (/([^/]+)\.js$/.exec(title) || [, title])[1] as string)
    .filter(Boolean)
    .sort();
}

/** A widget module registers under its own title; the widget an author writes takes the tail. */
function widgetNames(): string[] {
  return namesOf("widget")
    .map((title) => (/([^/]+)\.js$/.exec(title) || [, title])[1] as string)
    .filter(Boolean)
    .sort();
}

exports.startup = function (): void {
  const signals = {
    version: $tw.version,
    filterOperators: operatorNames(),
    widgets: widgetNames(),
    wikiRules: namesOf("wikirule").map((t) => (/([^/]+)\.js$/.exec(t) || [, t])[1] as string).sort()
  };
  $tw.wiki.addTiddler({
    title: "$:/tw5-syntax/GrammarSignals",
    type: "application/json",
    tags: "$:/tags/TW5Syntax/GrammarData",
    caption: "Grammar signals",
    description: "What the TiddlyWiki this edition booted against knows — harvested, never hand-written",
    text: JSON.stringify(signals, null, 4)
  });
};
