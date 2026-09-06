"use strict";
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
exports.name = "grammar-signals";
exports.platforms = ["node"];
exports.after = ["load-modules"];
// A command runs inside the `commands` startup, so the signals must stand in the wiki before it.
// Without this the render found no tiddler and wrote zero bytes, with exit code zero.
exports.before = ["commands"];
exports.synchronous = true;
/** The module names one registry holds, in a stable order. */
function namesOf(type) {
    return Object.keys($tw.modules.types[type] || {}).sort();
}
/**
 * A filter operator's module name reads `$:/core/modules/filters/<name>.js`, and its own exported
 * name may differ — the tail of the path names the operator an author writes.
 */
function operatorNames() {
    return namesOf("filteroperator")
        .map((title) => (/([^/]+)\.js$/.exec(title) || [, title])[1])
        .filter(Boolean)
        .sort();
}
/** A widget module registers under its own title; the widget an author writes takes the tail. */
function widgetNames() {
    return namesOf("widget")
        .map((title) => (/([^/]+)\.js$/.exec(title) || [, title])[1])
        .filter(Boolean)
        .sort();
}
/**
 * The rules TiddlyWiki reads in PRAGMA MODE, which it declares on each rule module.
 *
 * A grammar guarding the pragma zone by the backslash keywords alone reads seven of the eight:
 * commentblock stands among them, so an HTML comment holds the zone open the way a directive does.
 * Reading the family off a hand-written list closed the zone on the first comment line of a sample
 * and took fifty-four pragmas with it.
 */
function pragmaRuleNames() {
    const names = [];
    $tw.modules.forEachModuleOfType("wikirule", function (title, exports) {
        if (exports && exports.types && exports.types.pragma) {
            names.push(exports.name || (/([^/]+)\.js$/.exec(title) || [, title])[1]);
        }
    });
    return names.sort();
}
/**
 * The token each pragma rule opens on, taken off the rule's own matchRegExp.
 *
 * A grammar guards the pragma zone by a keyword list, and a keyword missing from that list closes
 * the zone on the line carrying it — every directive below then reads as prose. TiddlyWiki spells
 * each keyword inside the rule module, so the list derives rather than gets retyped: a release
 * adding a ninth pragma lands here, and the gate reading this says so.
 *
 * Three shapes carry an opener. A backslash and a name spells one directive; a backslash and an
 * alternation spells several under one rule, as function, procedure and widget share fnprocdef;
 * and a literal run spells a directive wearing no backslash at all, which the HTML comment does.
 */
function pragmaTokens() {
    const tokens = {};
    $tw.modules.forEachModuleOfType("wikirule", function (title, exports) {
        if (!exports || !exports.types || !exports.types.pragma)
            return;
        const name = exports.name || (/([^/]+)\.js$/.exec(title) || [, title])[1];
        let source = "";
        try {
            const rule = Object.create(exports);
            rule.init({});
            source = rule.matchRegExp ? rule.matchRegExp.source : "";
        }
        catch (e) {
            source = "";
        }
        if (!source)
            return;
        let found = [];
        const alternation = /^\\\\\(([^)]*)\)/.exec(source);
        const single = /^\\\\([A-Za-z]+)/.exec(source);
        if (alternation)
            found = alternation[1].split("|").map((word) => "\\" + word);
        else if (single)
            found = ["\\" + single[1]];
        else {
            const literal = /^([^\\[\](){}*+?^$|.]+)/.exec(source);
            if (literal)
                found = [literal[1]];
        }
        if (found.length)
            tokens[name] = found;
    });
    return tokens;
}
/** The run prefixes a filter may open with, each registered under its own module type. */
function filterRunPrefixes() {
    return namesOf("filterrunprefix")
        .map((title) => (/([^/]+)\.js$/.exec(title) || [, title])[1])
        .filter(Boolean)
        .sort();
}
/**
 * What each field name declares about the value it holds.
 *
 * A header value carries a string, and nothing in the file says how to read it. The reader does:
 * `$tw.Tiddler.fieldModules` holds a module per field name, and each declares how the value parses.
 * boot.js registers five — created and modified through parseDate, color with editType "color",
 * tags and list through parseStringArray — and `module-type: tiddlerfield` stays open, so a plugin
 * that declares a field of its own lands here too.
 *
 * The grammar reads this to decide which values take the wikitext reading. A date and a colour
 * name nothing, so they keep a plain reading; a title list names tiddlers in the same brackets a
 * filter run spells them in, so it takes the wikitext reading like any other field. Harvesting the
 * distinction beats retyping it: the day a release declares a sixth field, the gate says so.
 */
function fieldTypes() {
    const declared = {};
    const modules = $tw.Tiddler.fieldModules || {};
    for (const name of Object.keys(modules).sort()) {
        const field = modules[name];
        if (field.parse === $tw.utils.parseStringArray)
            declared[name] = "titles";
        else if (field.parse === $tw.utils.parseDate)
            declared[name] = "date";
        else if (field.editType)
            declared[name] = field.editType;
        else
            declared[name] = "string";
    }
    return declared;
}
exports.startup = function () {
    const signals = {
        version: $tw.version,
        filterOperators: operatorNames(),
        widgets: widgetNames(),
        wikiRules: namesOf("wikirule").map((t) => (/([^/]+)\.js$/.exec(t) || [, t])[1]).sort(),
        pragmaRules: pragmaRuleNames(),
        pragmaTokens: pragmaTokens(),
        filterRunPrefixes: filterRunPrefixes(),
        fieldTypes: fieldTypes()
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
