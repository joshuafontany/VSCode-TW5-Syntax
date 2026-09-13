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
| `tiddlywiki5.test` | `.tw5.test` | `text.html.tiddlywiki5.test` | the syntax-test files that check the grammars |

Each language applies only to the file extensions listed, so adding one changes nothing about how the others behave.

## Memetic-Wikitext

`*.mem` files open as **Memetic-Wikitext** (`text/memetic-wikitext+tiddlywiki`), a small extension of
TiddlyWiki wikitext used by the [Lares](https://github.com/amorphous-dreams) agent tooling. Its scope,
`text.html.tiddlywiki5.memetic-wikitext`, includes the wikitext grammar, so ordinary wikitext highlights
inside a `*.mem` file exactly as it does in a `*.tid` file. On top of that it highlights four additions:

* `<<~ name …>>` and its closing form `<<~ /name>>`
* `<<^ code="&#x0001;" …>>`, a set of document-structure markers
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

`*.tid` and `*.meta` files have syntaxes that parse the metadata field "block" (and illegal characters detected). Every field's content, the text field included, parses as `text.html.tiddlywiki5` (defined in `./syntaxes/tiddlywiki5.json`).

## For contributors

`contributing.md` carries the detail and `SCOPE-NAMES.md` carries the rule this repository names its
scopes by — what a name promises, the three precedents that settled it, and the three parts of it a gate
checks. In short, the grammars answer to more than their own tests:

* `npm test` — assertion files stating what each construct should scope
* `npm run test-tools` — the tools themselves, which the gates read through
* `npm run snap` — every sample's whole tokenization, pinned beside it
* `npm run canary` — an ordinary sentence appended to every sample, which must stay ordinary
* `npm run corpus` — broad ground, gated on the corpus reaching every declared scope and on nothing bleeding
* `npm run test-tools` also pins WHICH TiddlyWiki answers: a checkout beside this repository outranks the pinned `tiddlywiki` devDependency, and `TW5_PATH` outranks both. Parser work happens in a checkout; the package exists so a contributor holding only this repository runs every gate rather than skipping them
* `npm run upstream-coverage -- <path-to-TiddlyWiki5>` — TiddlyWiki's own rule regexes, taken to its own tiddlers
* `npm run overreach -- --corpus` — every scope the grammar paints, handed back to TiddlyWiki's parser: a claim over text it refuses, and a verdict over a construct it builds
* `npm run overreach-host` — the same question over TiddlyWiki's own tiddlers, against the written rulings
* `npm run overreach-cut` — the same tiddlers cut short at a seeded offset, so the ground leaves well-formed input behind
* `npm run tests-known-gaps` — the specimens stating what the grammar does not yet do, which fails when one of them starts passing
* `npm run colour-witness` — what a reader sees rather than what a scope name says: an opener and its closer read alike in every bundled theme, and a declared distinction reaches enough of them to show
* `npm run backtrack-witness` — what a half-typed construct costs the tokenizer, over every pattern in every grammar
* `npm run attribute-guard` — what an attribute-list guard would cost, taken to TiddlyWiki's own tags: how many it would refuse that the parser builds. `-- --cut` cuts each tag short first, matching the input such a guard would actually meet
* `npm run tw5-oracle -- '<wikitext>'` — the tree TiddlyWiki builds, and `-- --rules` the rules it stands
* `npm run rule-inventory` — every parser rule, the config tiddlers it answers to, and what TiddlyWiki ships for each
* `npm run theme-paint -- <scope>` — how many bundled themes paint a scope, and `-- --families` the whole grammar ranked
* `npm run overreach-corpus-files` / `overreach-corpus-memetic` — the corpus, in both dialects, against the parser and the written rulings
* `npm run compose-memes` — composition over whatever memetic writing stands beside this checkout; set `MEMES` to one or more directories
* `npm run legibility` — whether a reader can tell one construct from another: every pair over every bundled theme, each carrying its own floor
* `npm run ceiling` — what a TextMate grammar CANNOT reach about TiddlyWiki, measured against the host and naming the kind of reader that closes each one. A ceiling somebody closes RETIRES, and the gate fails until it goes
* `npm run delimiters` — what a delimiter inherits from the content it bounds: every `contentName` in the tree,
  keyed by shape, each ruled in `corpus/delimiter-ledger.txt` as a parting that serves a reader or costs one
* `npm run package-contents` — every path the manifest names, checked inside the built package
* `npm run bench` — a disposable editor in a container, so you can look at the grammar with your own eyes

## Colour toggles

A TextMate grammar decides how loudly a construct reads and never which parser rules a wiki
stands — nothing in the VS Code API hands a grammar to an extension at runtime. That claim
answers to Microsoft's tree; its consequence answers here, and
`tools/invariants/ships-no-runtime.test.js` holds it: no entry point, no activation events, only
declarative contributions, no runtime dependency, and nothing executable in the package. A theme
paints a scope when one of its own rules names that scope or a dotted prefix of it, which makes
the scope name the default. `npm run theme-paint -- <scope>` measures any scope against the
bundled theme set, and `-- --families` ranks every family this grammar emits.

Two groups repay turning, and both turn from `editor.tokenColorCustomizations` in your
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


<!-- reading-recipe -->

### Constructs your theme leaves quiet

Three readings sit outside what a scope name can reach: the family that would make each one loud either names the construct something it is not, or costs a neighbouring construct a distinction a reader needs. Measured across the bundled themes:

| construct | reads as prose in | why it stands |
| --- | --- | --- |
| `markup.superscript.tiddlywiki5` | 63 of 65 themes | the conventional name, unthemed across the bundled set, matching markdown's own reading |
| `markup.subscript.tiddlywiki5` | 63 of 65 themes | the same reading |
| `variable.name.mvv-display.tiddlywiki5` | 29 of 65 themes | every truthful loud family costs this construct's neighbours their declared distinctions |

A `fontStyle` rule gives each one a mark your own theme keeps its colours under:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "markup.superscript.tiddlywiki5", "settings": { "fontStyle": "bold" } },
    { "scope": "markup.subscript.tiddlywiki5", "settings": { "fontStyle": "bold" } },
    { "scope": "variable.name.mvv-display.tiddlywiki5", "settings": { "fontStyle": "underline" } }
  ]
}
```

Generated by `npm run reading-recipe` from `corpus/prose-reading-ledger.txt`, so a construct that stops reading quiet leaves this table the day it does.
<!-- reading-recipe -->

### Verdicts — on by default

The grammar marks markup TiddlyWiki refuses to parse with `invalid.illegal.*` scopes, which
most themes paint as errors — the two VS Code ships among them. A verdict answers to what
TiddlyWiki refuses and never to what another language retired, so the family carries four
names rather than the twelve it once did; `MIGRATION.md` records which went.

**Name the family, never a member.** A theme selector reaches a scope by dot-bounded prefix,
so one rule on `invalid.illegal` reaches every verdict this grammar draws and keeps reaching
them when a name gains a segment. To read them quietly:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "invalid.illegal", "settings": { "foreground": "#808080" } }
  ]
}
```

That selector also reaches an embedded block's own verdicts — a CSS or JavaScript region
inside a tiddler — which is usually what a reader quieting errors wants. `npm run
rule-inventory` prints the exact names, so you never need this page to list them.

Both blocks work per workspace folder in `.vscode/settings.json`, so one wiki can answer
differently from another.

### Why this extension ships no colour of its own

An extension **may** contribute `editor.tokenColorCustomizations` through
`contributes.configurationDefaults`. VS Code registers it, warns nothing, and it takes
effect; some 450 published manifests do exactly that. This one declines, for three reasons
that hold whatever the colour.

**No hardcoded colour survives an arbitrary theme.** A `foreground` that reads well on
Default Dark+ reads as noise on a light, high-contrast or pastel theme, and the extension
never learns which one you run. Theming belongs to the theme and to you.

**A contributed default cannot be scoped to a language.** Only settings marked
language-overridable reach the per-language schema, and `editor.tokenColorCustomizations`
carries no such mark — VS Code's theme maintainers have closed that request directly. So a
colour contributed here would apply in every file you open, not only in wikitext. The one
containment mechanism left is the language suffix already on every scope name this grammar
emits, which is why they all carry `.tiddlywiki5` or `.memetic-wikitext`.

**A contributed default merges INTO your settings rather than sitting under them.** VS Code
deep-merges object defaults, so writing your own `editor.tokenColorCustomizations` would
not clear the extension's rules — removing them would take an explicit empty
`"textMateRules": []`, which would destroy your own alongside. An opinion you cannot turn
off without losing your own work is not a default.

So the two blocks above stay a snippet you paste, theme-scoped, under your hand. What this
extension **does** contribute by default is behavioural and carries no colour:
`files.associations`, mapping each extension to its language. VS Code's own 24 built-in
extensions that use `configurationDefaults` set no colour either.

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
