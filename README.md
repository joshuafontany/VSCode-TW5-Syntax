# TiddlyWiki5 Syntax README

[![test](https://github.com/joshuafontany/VSCode-TW5-Syntax/actions/workflows/test.yml/badge.svg)](https://github.com/joshuafontany/VSCode-TW5-Syntax/actions/workflows/test.yml)

This extension adds TiddlyWiki5 syntax-highlighting and snippets to Visual Studio Code. [TiddlyWiki5](http://tiddlywiki.com) is a rich, interactive tool for manipulating complex data, with structures that do not easily fit into conventional tools like spreadsheets or wordprocessors. It is a javascript environment that lives in the Browser and Node.js (and a few other implementations) which builds a Wiki/Content Management System. The design recommends building with "the smallest semantically meaningful chunks" – named **tiddlers**. A tiddler could be a system javascript module that is loaded on wiki boot, or a few paragraphs of user notes on a topic, or a wikitext function that build a Table of Contents out of a set of related Tags.

When run in the browser, each **tiddler** is a javascript object in memory (and is also represented as a json in custom `<script class="tiddlywiki-tiddler-store" type="application/json"></script>` element when the wiki is saved as a "single file" `*.html`). When run under Node.js, TiddlyWiki saves each wikitext **tiddler** to disk as a separate text file with a `*.tid` extension. Other "MIME Types" (images, json text, etc) are saved by the server along with a `*.meta` file that describes all other tiddler-fields (the file-content becomes the "text" field when loaded into the wiki).

This extension is intended for editing separate tiddler files on disk with Visual Studio Code.

## Languages

This extension implements several specifications, each with its own grammar and its own scope.

| language | files | scope | specifies |
|---|---|---|---|
| `tiddlywiki5` | `.tw`, `.tw5`, `.tiddlywiki5` | `text.html.tiddlywiki5` | TiddlyWiki wikitext, following the rules in `core/modules/parsers/wikiparser/rules` |
| `tid` | `.tid`, `.meta` | `source.tiddlywiki5.tid-file` | the tiddler file format: a field block, a blank line, then a body parsed as wikitext |
| `multids` | `.multids` | `source.tiddlywiki5.multids-file` | the multiple-tiddler file format |
| `memetic-wikitext` | `.mem` | `text.html.tiddlywiki5.memetic-wikitext` | Memetic-Wikitext, a superset of TiddlyWiki wikitext |
| `tiddlywiki5.test` | `.tw5.test` | `text.html.tiddlywiki5.test` | the syntax-test files this repository checks itself with |

Editing a `.tid`, `.tw5` or `.multids` file carries on exactly as before; a language added here reaches only the file extensions it names.

## Memetic-Wikitext

`*.mem` files open as **Memetic-Wikitext** (`text/memetic-wikitext+tiddlywiki`), a superset of TiddlyWiki
wikitext. Its scope extends the wikitext scope **by name**, so every construct TiddlyWiki reads keeps its
own reading inside a `*.mem` file, and the dialect adds to that rather than replacing any of it:

* the **sharktooth** sigil, `<<~ name … >>`, closing as `<<~ /name >>`
* a **control set** carried on `<<^ code="&#x0001;" … >>`
* **`lar:` URIs**, which name rather than fetch, read as addresses in prose
* named parameters bound with `=`, the separator TiddlyWiki reads as new-style and the only one that admits
  a filtered, indirect or macro value

The superset holds in both directions, which earns it the name: **a stock TiddlyWiki reads a `*.mem` file as
slightly odd wikitext.** A sigil parses as a macro call, a control carrier as a macro call, a `lar:` URI as
text. Nothing raises, nothing swallows, and the file still renders. An editor with this extension reads the
same bytes with the dialect's structure visible — the second reader sees more, and the first reader never
loses the file.

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
* `npm run package-contents` — every path the manifest names, checked inside the built package
* `npm run bench` — a disposable editor in a container, so you can look at the grammar with your own eyes

## Known Issues

Please report issues or offer Pull Requests at the GitHub Repository:

* https://github.com/joshuafontany/VSCode-TW5-Syntax

# Release Notes

* https://github.com/joshuafontany/VSCode-TW5-Syntax/blob/main/CHANGELOG.md

-----------------------------------------------------------------------------------------------------------

**Thank You for trying TiddlyWiki5 Syntax Highlighting for Visual Studio Code**

**Enjoy!**

* [Joshua Fontany](https://paypal.me/JoshuaFontany)
