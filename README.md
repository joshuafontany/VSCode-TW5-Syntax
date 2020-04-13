# TiddlyWiki5 Syntax README

This extension adds TiddlyWiki5 syntax-highlighting to Visual Studio Code. [TiddlyWiki5](http://tiddlywiki.com) is a rich, interactive tool for manipulating complex data with structure that doesn't easily fit into conventional tools like spreadsheets or wordprocessors. It is a javascript environment that lives in the Browser and Node.js (and a few other implementations) which builds a Wiki/Content Management System out of "the smallest semantically meaningful chunks" – named **tiddlers**. When run in the browser, each **tiddler** is a javascript object in memory (and is also represented as a `<div>` of data when the wiki is saved as a "single file" `*.html`).

When run under Node.js, TiddlyWiki saves each wikitext **tiddler** to disk as a separate text file with a `*.tid` extention. Other "MIME Types" (images, json text, etc) are saved by the server along with a `*.meta` file that describes all other tiddler-fields (the file-content becoms the "text" field when loaded into the wiki).

This extension is intended for editing seperate tiddler files with Visual Studio Code.

## Features

Based primarily on the grammars found below, with heavy tweaking and editing.

* https://github.com/PaulPorfiroff/atom-language-tiddlywiki5
* https://github.com/roma0104/sublime-tid

`*.tid` and `*.meta` files have their field-names identified (and illegal characters detected). All field content (text field included) is parsed as "text.html.tiddlywiki5" (defined in `./syntaxes/tw5-wikitext.json`).

## Known Issues

Please report isues or offer Pull Requets at the GitHub Repository:

* https://github.com/joshuafontany/VSCode-TW5-Syntax

# Release Notes

## 0.1.2

- Improved variable, tranclusion, link, and macro definition recognition
- Setup seperate "language names" for *.tid / *.meta ("tid"), vs  / *.multids files ("multitids") vs *.tw / *.tw5 wikitext ("tiddlywiki5"). This helps debugging and with certain grammar features (injections).
- Mapped MIME types

## 0.1.1

- Improved string and pragma recognition

## 0.1.0

- Initial release

-----------------------------------------------------------------------------------------------------------

**Thank You for trying TiddlyWiki5 Syntax Highlighting for Viual Studio Online**

**Enjoy!**

* [Joshua Fontany](https://paypal.me/JoshuaFontany)