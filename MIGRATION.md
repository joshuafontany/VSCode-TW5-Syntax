# Scope name migration — 2.2.1 to 2.3.0

A theme rule and an `editor.tokenColorCustomizations` entry both name a scope. A scope that
moves takes the reader's colour with it, and VS Code reports nothing: the rule simply stops
matching, and the construct goes the colour of prose.

This repository declares **460** scope names at `v2.2.1` and **521** at `2.3.0`. Between them,
**108** names stand gone and **169** stand new. Every gone name appears below, with what it
stands as now or why it retired.

The table derives from the two grammars rather than from a hand-written list, and
`tools/invariants/scope-migration.test.js` holds it to them: a name this record calls gone that
still stands, or a replacement the grammar does not declare, fails that gate.

## The principle most of these share

A TextMate selector reaches a scope by a **dot-bounded prefix**, so only the segments at the
FRONT of a name can be selected on. A name carrying its qualifier in front of its family root —
`bold.punctuation.definition.markup.begin`, `caption.markup.other.table`,
`colspan.left.meta.cell.td`, `numbered.ordered.ol.li.markup.list`, `mvv.attribute.html` —
stands outside every theme rule written against `punctuation`, `markup`, `meta` or `entity`. No
theme's root selector ever reached them, which is why nothing reported the names as broken:
they painted the colour of prose in every bundled theme, and they did so from the day they
were written.

Their replacements put the root first and keep the qualifier as a suffix, so a rule on the
family root reaches the construct and a deeper rule can still single it out. **39 of the 108**
gone names moved for exactly that reason.

If your customization named one of these, it was already painting nothing. Adopting the new
name is the first time it will take effect.

## Seven that keep their colour

A filter operand's brackets spelled themselves `string.punctuation.definition.operand.begin`,
`variable.…` and `entity.name.…`, nesting `punctuation` under the content root. A theme reached
those marks through the content root alone — `string` in 62 of 65 bundled themes, `variable` in
58, `entity` in 40 — and never through `punctuation`, which the name buried where no selector
reaches.

Each stands as two scopes on one span: `punctuation.definition.operand.<kind>.<bound>` first,
and the content family the mark bounds LAST. The content scope stands innermost, so every theme
paints these marks exactly the colour it painted before, and a rule written against
`punctuation` now reaches them as well. A customization naming one of the gone names wants the
new punctuation name; a customization naming `string`, `variable` or `entity` needs no change.

A heading's `!` mark wore the same fault from the other side. It carried two scopes already —
`punctuation.definition.heading` and `markup.heading.punctuation.definition` — the second of
which nested punctuation under a content root. It stands as `markup.heading`, which reaches the
same 55 of 65 themes through the same `markup.heading` rules, so nothing a reader sees moves.

## Names that moved

| gone at 2.2.1 | stands as at 2.3.0 | why |
| --- | --- | --- |
| `bold.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.bold.tiddlywiki5` | root first |
| `bold.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.bold.tiddlywiki5` | root first |
| `caption.markup.other.table.tiddlywiki5` | `markup.other.table.caption.tiddlywiki5` | root first |
| `caption.meta.table.tiddlywiki5` | `meta.table.caption.tiddlywiki5` | root first |
| `classes.markup.other.table.tiddlywiki5` | `markup.other.table.classes.tiddlywiki5` | root first |
| `classes.meta.table.tiddlywiki5` | `meta.table.classes.tiddlywiki5` | root first |
| `colspan.left.meta.cell.td.tiddlywiki5` | `meta.cell.td.colspan.left.tiddlywiki5` | root first |
| `colspan.left.punctuation.definition.cell.tiddlywiki5` | `punctuation.definition.cell.colspan.left.tiddlywiki5` | root first |
| `colspan.right.meta.cell.td.tiddlywiki5` | `meta.cell.td.colspan.right.tiddlywiki5` | root first |
| `colspan.right.punctuation.definition.cell.tiddlywiki5` | `punctuation.definition.cell.colspan.right.tiddlywiki5` | root first |
| `entity.name.punctuation.definition.operand.begin.tiddlywiki5` | `punctuation.definition.operand.indirect.begin.tiddlywiki5` | punctuation stacks, never nests |
| `entity.name.punctuation.definition.operand.end.tiddlywiki5` | `punctuation.definition.operand.indirect.end.tiddlywiki5` | punctuation stacks, never nests |
| `entity.name.variable-parameter.tiddlywiki5` | `variable.name.substitute-variable.tiddlywiki5` | substitution vocabulary |
| `filtered.attribute.html.tiddlywiki5` | `meta.attribute.filtered.html.tiddlywiki5` | root first |
| `heading.th.meta.cell.tiddlywiki5` | `meta.cell.heading.th.tiddlywiki5` | root first |
| `indirect.attribute.html.tiddlywiki5` | `meta.attribute.indirect.html.tiddlywiki5` | root first |
| `italic.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.italic.tiddlywiki5` | root first |
| `italic.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.italic.tiddlywiki5` | root first |
| `keyword.control.directive.function.html.tiddlywiki5` | `keyword.control.directive.function.tiddlywiki5` | names this grammar, not HTML |
| `keyword.control.directive.procedure.html.tiddlywiki5` | `keyword.control.directive.procedure.tiddlywiki5` | names this grammar, not HTML |
| `keyword.control.directive.widget.html.tiddlywiki5` | `keyword.control.directive.widget.tiddlywiki5` | names this grammar, not HTML |
| `keyword.control.operator.prefix.negation.tiddlywiki5` | `keyword.operator.prefix.negation.tiddlywiki5` | a filter operator is an operator |
| `keyword.control.operator.suffix.tiddlywiki5` | `keyword.operator.suffix.separator.tiddlywiki5` | a filter operator is an operator |
| `keyword.control.raw.tick.tiddlywiki5` | `keyword.control.raw.fence.tiddlywiki5` | names what it marks |
| `keyword.other.variable.variable-parameter.begin.tiddlywiki5` | `keyword.other.variable.substitute-parameter.begin.tiddlywiki5` | substitution vocabulary |
| `keyword.other.variable.variable-parameter.end.tiddlywiki5` | `keyword.other.variable.substitute-parameter.end.tiddlywiki5` | substitution vocabulary |
| `keyword.other.variable.variable-reference.begin.tiddlywiki5` | `keyword.other.variable.substitute-variable.begin.tiddlywiki5` | substitution vocabulary |
| `keyword.other.variable.variable-reference.end.tiddlywiki5` | `keyword.other.variable.substitute-variable.end.tiddlywiki5` | substitution vocabulary |
| `list.attribute.image.tiddlywiki5` | `meta.attribute.list.image.tiddlywiki5` | root first |
| `listquote.quote.markup.list.tiddlywiki5` | `markup.list.listquote.quote.tiddlywiki5` | root first |
| `markup.heading.punctuation.definition.tiddlywiki5` | `markup.heading.tiddlywiki5` | punctuation stacks, never nests |
| `markup.other.variable.variable-parameter.tiddlywiki5` | `markup.other.variable.substitute-parameter.tiddlywiki5` | substitution vocabulary |
| `markup.other.variable.variable-reference.tiddlywiki5` | `markup.other.variable.substitute-variable.tiddlywiki5` | substitution vocabulary |
| `markup.underline.link.wikilink.tiddlywiki5` | `meta.link.wikilink.tiddlywiki5` | family a theme rules on |
| `meta.multids.tiddler.title.text.htmltiddlywiki5.multids-file` | `meta.multids.tiddler.title.text.html.tiddlywiki5.multids-file` | one segment, one word |
| `meta.tiddler.fields.tiddlywiki5` | `meta.text.tiddler.fields.tiddlywiki5` | root first |
| `mvv.attribute.html.tiddlywiki5` | `meta.attribute.mvv.html.tiddlywiki5` | root first |
| `mvv.default.parameter.tiddlywiki5` | `variable.parameter.mvv.default.tiddlywiki5` | root first |
| `numbered.ordered.ol.li.markup.list.tiddlywiki5` | `markup.list.numbered.ordered.ol.li.tiddlywiki5` | root first |
| `punctuation.definition.link.inner.begin.tiddlywiki5` | `punctuation.definition.link.begin.tiddlywiki5` | one mark, one token |
| `punctuation.definition.link.inner.end.tiddlywiki5` | `punctuation.definition.link.end.tiddlywiki5` | one mark, one token |
| `punctuation.definition.link.outer.end.tiddlywiki5` | `punctuation.definition.link.end.tiddlywiki5` | one mark, one token |
| `punctuation.definition.substituted.triple..attribute.begin.tiddlywiki5` | `punctuation.definition.substituted.triple.attribute.begin.tiddlywiki5` | empty segment |
| `punctuation.definition.text-reference.index..tiddlywiki5` | `punctuation.definition.text-reference.index.tiddlywiki5` | empty segment |
| `punctuation.separator.function.macro.parameter.tiddlywiki5` | `punctuation.separator.parameters.tiddlywiki5` | call vocabulary |
| `row.tbody.body.meta.table.tiddlywiki5` | `meta.table.row.tbody.body.tiddlywiki5` | root first |
| `row.tfoot.footer.markup.other.table.tiddlywiki5` | `markup.other.table.row.tfoot.footer.tiddlywiki5` | root first |
| `row.tfoot.footer.meta.table.tiddlywiki5` | `meta.table.row.tfoot.footer.tiddlywiki5` | root first |
| `row.thead.header.markup.other.table.tiddlywiki5` | `markup.other.table.row.thead.header.tiddlywiki5` | root first |
| `row.thead.header.meta.table.tiddlywiki5` | `meta.table.row.thead.header.tiddlywiki5` | root first |
| `rowspan.down.meta.cell.td.tiddlywiki5` | `meta.cell.td.rowspan.down.tiddlywiki5` | root first |
| `rowspan.down.punctuation.definition.cell.tiddlywiki5` | `punctuation.definition.cell.rowspan.down.tiddlywiki5` | root first |
| `string.punctuation.definition.operand.begin.tiddlywiki5` | `punctuation.definition.operand.string.begin.tiddlywiki5` | punctuation stacks, never nests |
| `string.punctuation.definition.operand.end.tiddlywiki5` | `punctuation.definition.operand.string.end.tiddlywiki5` | punctuation stacks, never nests |
| `strikethrough.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.strikethrough.tiddlywiki5` | root first |
| `strikethrough.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.strikethrough.tiddlywiki5` | root first |
| `subscript.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.subscript.tiddlywiki5` | root first |
| `subscript.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.subscript.tiddlywiki5` | root first |
| `superscript.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.superscript.tiddlywiki5` | root first |
| `superscript.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.superscript.tiddlywiki5` | root first |
| `underscore.punctuation.definition.markup.begin.tiddlywiki5` | `punctuation.definition.markup.begin.underscore.tiddlywiki5` | root first |
| `underscore.punctuation.definition.markup.end.tiddlywiki5` | `punctuation.definition.markup.end.underscore.tiddlywiki5` | root first |
| `unnumbered.description.dl.dd.markup.list.tiddlywiki5` | `markup.list.unnumbered.description.dl.dd.tiddlywiki5` | root first |
| `unnumbered.term.dl.dt.markup.list.tiddlywiki5` | `markup.list.unnumbered.term.dl.dt.tiddlywiki5` | root first |
| `unnumbered.unordered.ul.li.markup.list.tiddlywiki5` | `markup.list.unnumbered.unordered.ul.li.tiddlywiki5` | root first |
| `variable.punctuation.definition.operand.begin.tiddlywiki5` | `punctuation.definition.operand.variable.begin.tiddlywiki5` | punctuation stacks, never nests |
| `variable.punctuation.definition.operand.end.tiddlywiki5` | `punctuation.definition.operand.variable.end.tiddlywiki5` | punctuation stacks, never nests |
| `variable.name.variable-reference.tiddlywiki5` | `variable.name.substitute-variable.tiddlywiki5` | substitution vocabulary |

## Names that retired

### The `invalid.*` family, 12 names to 1

A grammar marks invalid what TiddlyWiki refuses, never what a different language retired.
TiddlyWiki parses any tag name and any attribute name into a node, so `<center>`, `<dir>` and
`align=` build and render. Every verdict resting on HTML's deprecations came out — fourteen
sites — and the tags and attributes carry their ordinary `entity.name.tag` and
`entity.other.attribute-name` names. A construct that drew a verdict and no longer draws one
now paints as what it is.

A verdict answers to a refusal the host SAYS, too. TiddlyWiki keeps an ampersand outside
`entity.js`'s window and a tag whose attribute list it cannot read as plain text, and raises no
diagnostic over either, so the three verdicts that stood there invented a refusal. They came out,
and the characters read as the text the host keeps.

| retired | why |
| --- | --- |
| `invalid.deprecated.entity.other.attribute-name.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.deprecated.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.bad-angle-bracket.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.characters-not-allowed-here.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.event-handler-in-wikitext.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.no-longer-supported.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.unrecognized-tag.html.tiddlywiki5` | a verdict answers to what TiddlyWiki refuses |
| `invalid.illegal.ambiguous-ampersand.html.tiddlywiki5` | TiddlyWiki keeps the ampersand as text and raises nothing |
| `invalid.illegal.character-not-allowed-here.html.tiddlywiki5` | TiddlyWiki keeps the malformed tag as text and raises nothing |
| `invalid.illegal.unexpected-equals-sign.html.tiddlywiki5` | TiddlyWiki keeps the malformed tag as text and raises nothing |

### The memetic dialect's own vocabulary, 30 names

`memetic-wikitext` holds wikitext entire and adds to it. A sigil call `<<~ name arg >>` reads as
a wikitext macro call, so it paints under the call vocabulary the base grammar already writes —
`meta.variable.call.*`, `punctuation.definition.call.*`, `variable.name.call` — rather than
under a parallel `meta.sigil.*` family only this dialect knew. The dialect's remaining names
cover what wikitext has no construct for: a `lar://` URI and its parts.

A theme rule naming any of these painted `.mem` files alone. A rule on the wikitext call
vocabulary now reaches both.

**Two returned, on the rule's own criterion.** `entity.name.function.sigil` and
`punctuation.definition.sigil.close` stand again, because a sigil's VERB names what wikitext has no
construct for: TiddlyWiki reads `<<~ set …>>` as a call on a variable spelled `~`, binds the verb as
a POSITIONAL argument, and the base paints it `string.unquoted.html` — the same reading any value
gets. And the reason the others went does not reach these: measured, `entity.name.function.sigil`
paints in 65 of 65 themes through `entity.name.function`, where the retired `meta.sigil.*` family
painted in none. A name reaching a conventional root reaches every theme; a name inventing a family
reaches only the files that carry it.

| retired | reads through |
| --- | --- |
| `constant.language.bearing.unresolved.memetic-wikitext` | the base grammar's own vocabulary |
| `constant.other.blockcheck.memetic-wikitext` | the base grammar's own vocabulary |
| `entity.name.function.sigil.definition.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.carrier.eot.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.carrier.etx.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.carrier.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.carrier.soh.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.carrier.stx.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.declaration.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.sharktooth.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.sharktooth.pragma.memetic-wikitext` | the base grammar's own vocabulary |
| `keyword.control.sharktooth.unresolved.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.control.eot.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.control.etx.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.control.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.control.soh.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.control.stx.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.carrier.declaration.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.sigil.close.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.sigil.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.sigil.pragma.memetic-wikitext` | the base grammar's own vocabulary |
| `meta.sigil.unresolved.memetic-wikitext` | the base grammar's own vocabulary |
| `punctuation.definition.sigil.begin.memetic-wikitext` | the base grammar's own vocabulary |
| `punctuation.definition.sigil.end.memetic-wikitext` | the base grammar's own vocabulary |
| `punctuation.separator.key-value.memetic-wikitext` | the base grammar's own vocabulary |
| `string.quoted.bracket.memetic-wikitext` | the base grammar's own vocabulary |
| `string.quoted.double.memetic-wikitext` | the base grammar's own vocabulary |
| `string.quoted.single.memetic-wikitext` | the base grammar's own vocabulary |

### One name standing alone

| retired | why |
| --- | --- |
| `row.tbody.body.markup.other.table.tiddlywiki5` | the markup twin of a table body row — its `meta.table.row.tbody.body` counterpart stands, and the `thead` and `tfoot` rows keep both names |

## One mark, one token

A pretty link's `[[` and `]]` each stand as ONE mark, and each now arrives as one token carrying
one name. No grammar among twenty splits a multi-character delimiter into two separately named
sequential tokens: VS Code html emits `</` as one token, Liquid's `{%-` as one token of three
characters, Handlebars' `{{~{>` as one of arbitrary length, and the TextMate 1.x manual's own
`captures` example fuses `@selector(`. Measured across the 65 bundled themes, the two halves
painted identically in every one, so the split reached machines and no reader.

The outer and inner names stand where the brackets enclose different things — `[img[` opens an
attribute list and then a source, `[ext[` a caption and then an address — and both keep them.

`punctuation.definition.link.outer.begin.tiddlywiki5` still stands, on `[ext[`'s outer bracket.
A customization naming it for a pretty link's `[[` reaches the fused mark under
`punctuation.definition.link.begin.tiddlywiki5`.

## Reading the new names yourself

```
npm run rule-inventory      # every scope the grammars declare, by the rule declaring it
npm run theme-paint         # what each bundled theme paints a construct
```
