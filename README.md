# TiddlyWiki5 Syntax README

[![test](https://github.com/joshuafontany/VSCode-TW5-Syntax/actions/workflows/test.yml/badge.svg)](https://github.com/joshuafontany/VSCode-TW5-Syntax/actions/workflows/test.yml)

This extension adds TiddlyWiki5 syntax-highlighting and snippets to Visual Studio Code. [TiddlyWiki5](http://tiddlywiki.com) is a rich, interactive tool for manipulating complex data, with structures that do not easily fit into conventional tools like spreadsheets or wordprocessors. It is a javascript environment that lives in the Browser and Node.js (and a few other implementations) which builds a Wiki/Content Management System. The design recommends building with "the smallest semantically meaningful chunks" – named **tiddlers**. A tiddler could be a system javascript module that is loaded on wiki boot, or a few paragraphs of user notes on a topic, or a wikitext function that build a Table of Contents out of a set of related Tags.

When run in the browser, each **tiddler** is a javascript object in memory (and is also represented as a json in custom `<script class="tiddlywiki-tiddler-store" type="application/json"></script>` element when the wiki is saved as a "single file" `*.html`). When run under Node.js, TiddlyWiki saves each wikitext **tiddler** to disk as a separate text file with a `*.tid` extension. Other "MIME Types" (images, json text, etc) are saved by the server along with a `*.meta` file that describes all other tiddler-fields (the file-content becomes the "text" field when loaded into the wiki).

This extension is intended for editing separate tiddler files on disk with Visual Studio Code.

## Languages

This extension provides five languages, each with its own grammar and scope.

| language | files | scope | covers |
|---|---|---|---|
| `tiddlywiki5` | `.tw`, `.tw5`, `.tiddlywiki5` | `text.html.tiddlywiki5` | TiddlyWiki wikitext, following the rules in `core/modules/parsers/wikiparser/rules` |
| `tid` | `.tid`, `.meta` | `source.tiddlywiki5.tid-file` | the tiddler file format: a field block, a blank line, then a body parsed as wikitext |
| `multids` | `.multids` | `source.tiddlywiki5.multids-file` | the multiple-tiddler file format |
| `memetic-wikitext` | `.mem` | `text.html.tiddlywiki5.memetic-wikitext` | Memetic-Wikitext, a superset of TiddlyWiki wikitext |
| `tiddlywiki5.test` | `.tw5.test` | `text.html.tiddlywiki5.test` | the syntax-test files used to check the grammars |

Each language applies only to the file extensions listed, so adding one changes nothing about how the others behave.

## Memetic-Wikitext

`*.mem` files open as **Memetic-Wikitext** (`text/memetic-wikitext+tiddlywiki`), a small extension of
TiddlyWiki wikitext used by the [Lares](https://github.com/amorphous-dreams) agent tooling. Its scope,
`text.html.tiddlywiki5.memetic-wikitext`, includes the wikitext grammar, so ordinary wikitext highlights
inside a `*.mem` file exactly as it does in a `*.tid` file. On top of that it highlights four additions:

* `<<~ name … >>` and its closing form `<<~ /name >>`
* `<<^ code="&#x0001;" … >>`, a set of document-structure markers
* `lar:` URIs, highlighted as addresses where they appear in prose
* named parameters written `key=value`, which TiddlyWiki 5.4 accepts alongside `key:value`

Every addition uses syntax TiddlyWiki already parses — each of the first two reads as a macro call, and a
`lar:` URI reads as plain text. A `*.mem` file therefore loads and renders in an unmodified TiddlyWiki
without errors, and this extension simply shows more of its structure while editing.

If you do not use `*.mem` files, nothing here affects you: the language applies to that extension alone.

## Features

Based primarily on the grammars found below, with heavy tweaking and editing.

* https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/grammars/html.json
* https://github.com/PaulPorfiroff/atom-language-tiddlywiki5
* https://github.com/roma0104/sublime-tid

`*.tid` and `*.meta` files have syntaxes that parse the metadata field "block" (and illegal characters detected). All field content (text field included) is parsed as `text.html.tiddlywiki5` (defined in `./syntaxes/tiddlywiki5.json`).

## For contributors

`contributing.md` carries the detail. In short, the grammars answer to more than their own tests:

* `npm test` — assertion files stating what each construct should scope
* `npm run snap` — every sample's whole tokenization, pinned beside it
* `npm run canary` — an ordinary sentence appended to every sample, which must stay ordinary
* `npm run corpus` — broad ground, gated on every declared scope being reached and nothing bleeding
* `npm run upstream-coverage -- <path-to-TiddlyWiki5>` — TiddlyWiki's own rule regexes, taken to its own tiddlers
* `npm run overreach -- --corpus` — every scope the grammar paints, handed back to TiddlyWiki's parser: a claim over text it refuses, and a verdict over a construct it builds
* `npm run tw5-oracle -- '<wikitext>'` — the tree TiddlyWiki builds, and `-- --rules` the rules it stands
* `npm run rule-inventory` — every parser rule, the config tiddlers it answers to, and what TiddlyWiki ships for each
* `npm run theme-paint -- <scope>` — how many bundled themes paint a scope, and `-- --families` the whole grammar ranked
* `npm run overreach-corpus-files` / `overreach-corpus-memetic` — the corpus, in both dialects, against the parser and the written rulings
* `npm run compose-memes` — composition over whatever memetic writing stands beside this checkout; set `MEMES` to one or more directories
* `npm run package-contents` — every path the manifest names, checked inside the built package
* `npm run bench` — a disposable editor in a container, so you can look at the grammar with your own eyes

## Colour toggles

A TextMate grammar cannot switch a parser rule off — nothing in the VS Code API reaches a
grammar at runtime — so what a grammar chooses is how loudly a construct reads. A theme
paints a scope when one of its own rules names that scope or a dotted prefix of it, which makes
the scope name the default. `npm run theme-paint -- <scope>` measures any scope against the
bundled theme set, and `-- --families` ranks every family this grammar emits.

Two groups are worth turning, and both turn from `editor.tokenColorCustomizations` in your
own settings. Nothing else needs a switch: the grammar's structural families already read
quiet in every bundled theme.

### CamelCase links — off by default

TiddlyWiki has shipped CamelCase linking **disabled** since 5.3.0
(`$:/config/WikiParserRules/Inline/wikilink`), so `HelloWorld` builds no link in a new wiki
and the grammar reads it quiet — `meta.link.wikilink.tiddlywiki5`, which few themes paint
where a `markup.underline.link.` scope inherits nearly every theme's link colour. The
construct still carries its own scope, so a wiki that enables CamelCase in
Control Panel → Settings colours it back with one rule:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "meta.link.wikilink.tiddlywiki5", "settings": { "fontStyle": "underline" } }
  ]
}
```

A rule carrying only `fontStyle` leaves the colour to your theme. A `foreground` holds one
literal colour across every theme you switch to, so give each theme its own block when you
want one:

```json
"editor.tokenColorCustomizations": {
  "[Default Dark+]": { "textMateRules": [
    { "scope": "meta.link.wikilink.tiddlywiki5", "settings": { "foreground": "#4fc1ff" } } ] },
  "[Default Light+]": { "textMateRules": [
    { "scope": "meta.link.wikilink.tiddlywiki5", "settings": { "foreground": "#0451a5" } } ] }
}
```

The suppressing `~` keeps its punctuation colour either way: `wikilinkprefix` carries its own
rule, TiddlyWiki ships it enabled, and it consumes the `~` whether or not CamelCase stands.

### Verdicts — on by default

The grammar marks markup TiddlyWiki refuses to parse with `invalid.*` scopes, which most
themes paint as errors — the two VS Code ships among them. Where TiddlyWiki genuinely
refuses, a verdict earns its place; some still stand where it does not. To read them quietly
while that settles:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": ["invalid.illegal.html.tiddlywiki5", "invalid.deprecated.html.tiddlywiki5"],
      "settings": { "foreground": "#808080" } }
  ]
}
```

Both blocks work per workspace folder in `.vscode/settings.json`, so one wiki can answer
differently from another.

Per-rule switching — one toggle for each of TiddlyWiki's parser rules, resolved down a bag
stack — waits on the tree-sitter and language-server work, where a live parser can answer
for the file in front of it. `npm run rule-inventory` reports that surface today.

## Known Issues

Please report issues or offer Pull Requests at the GitHub Repository:

* https://github.com/joshuafontany/VSCode-TW5-Syntax

# Release Notes

* https://github.com/joshuafontany/VSCode-TW5-Syntax/blob/main/CHANGELOG.md

-----------------------------------------------------------------------------------------------------------

**Thank You for trying TiddlyWiki5 Syntax Highlighting for Visual Studio Code**

**Enjoy!**

* [Joshua Fontany](https://paypal.me/JoshuaFontany)
