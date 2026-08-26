# TiddlyWiki5 Syntax README

This extension adds TiddlyWiki5 syntax-highlighting and snippets to Visual Studio Code. [TiddlyWiki5](http://tiddlywiki.com) is a rich, interactive tool for manipulating complex data, with structures that do not easily fit into conventional tools like spreadsheets or wordprocessors. It is a javascript environment that lives in the Browser and Node.js (and a few other implementations) which builds a Wiki/Content Management System. The design recommends building with "the smallest semantically meaningful chunks" – named **tiddlers**. A tiddler could be a system javascript module that is loaded on wiki boot, or a few paragraphs of user notes on a topic, or a wikitext function that build a Table of Contents out of a set of related Tags.

When run in the browser, each **tiddler** is a javascript object in memory (and is also represented as a json in custom `<script class="tiddlywiki-tiddler-store" type="application/json"></script>` element when the wiki is saved as a "single file" `*.html`). When run under Node.js, TiddlyWiki saves each wikitext **tiddler** to disk as a separate text file with a `*.tid` extention. Other "MIME Types" (images, json text, etc) are saved by the server along with a `*.meta` file that describes all other tiddler-fields (the file-content becoms the "text" field when loaded into the wiki).

This extension is intended for editing seperate tiddler files on disk with Visual Studio Code.

## Features

Based primarily on the grammars found below, with heavy tweaking and editing.

* https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/grammars/html.json
* https://github.com/PaulPorfiroff/atom-language-tiddlywiki5
* https://github.com/roma0104/sublime-tid

`*.tid` and `*.meta` files have syntaxes that parse the metadata field "block" (and illegal characters detected). All field content (text field included) is parsed as `text.html.tiddlywiki5` (defined in `./syntaxes/tiddlywiki5.json`).

### Memetic-Wikitext

`*.mem` files carry `text/memetic-wikitext+tiddlywiki`, a superset of TW5 wikitext in which
every additional construct spells a TiddlyWiki macro call — the third character after `<<`
names the macro, so a vanilla TiddlyWiki processor reads the whole document as valid
wikitext with each construct an unbound call.

The grammar (`./syntaxes/memetic-wikitext.json`, scope `text.html.tiddlywiki5.memetic-wikitext`)
claims those constructs and then falls through to `text.html.tiddlywiki5`, so base wikitext keeps
its reading and colour themes written for the base scope apply unchanged. It highlights the
`<<!DOCTYPE … >>` declaration, the `<<^ code:"&#x000N;" >>` transmission frame with its trailing
`ni:///sha-256;` check, the `<<~ name … >>` sigil family with its `<<~/name >>` closes and
`#fragment` anchors, and `lar:` URIs.

Editing `*.tid` or `*.tw5` files is unaffected — the grammar loads for `*.mem` only.

## Known Issues

Please report isues or offer Pull Requets at the GitHub Repository:

* https://github.com/joshuafontany/VSCode-TW5-Syntax

# Release Notes

* https://github.com/joshuafontany/VSCode-TW5-Syntax/blob/main/CHANGELOG.md

-----------------------------------------------------------------------------------------------------------

**Thank You for trying TiddlyWiki5 Syntax Highlighting for Viual Studio Online**

**Enjoy!**

* [Joshua Fontany](https://paypal.me/JoshuaFontany)
