# Scope names — the policy

A scope name reads as **a promise about meaning**. It says what a span IS, so a reader who learns
one name learns something true about the construct wearing it.

Three positions stand available. A scope name could read as **public API**, which would make every
name permanent and every correction a breaking change. It could read as **implementation**, which
would make a name a detail nobody outside the grammar need trust. This repository has chosen the
third twice, under pressure, before anybody wrote it down — and this page writes it down.

The two rejected positions each answer a real question, and the choice costs something. Naming as
public API buys stability; this repository pays for that elsewhere, in `MIGRATION.md`, which
records every name that moved and what it stands as now. Naming as implementation buys freedom;
this repository declines it, because a theme rule, a customization and a downstream tool all name
scopes, so the names reach people whatever the grammar intends.

## Why this page sits here

`MIGRATION.md` records what moved between two versions and names the principle behind 39 of the
111 moves. It carries no rule, because a migration record answers about the past. `contributing.md`
carries how to work the tree. `README.md` tells a reader which scope to name in their own settings.
Each of the three needs this one, and none of them should hold it: a rule living inside a record
goes stale with the record, and a rule living inside a contributor guide never reaches the reader
writing a colour rule. So it stands beside them, at the root, where both audiences already look.

## The rule

**A scope name says what a span is.** Every other consideration — reach, colour, convenience,
symmetry with another grammar — answers after that one, never before it.

Three precedents settled it, each with its measurement.

### `keyword.control.list` — declined at 100% reach

A list bullet named `keyword.control.list` would reach a rule in **every** bundled theme. The name
calls a bullet a keyword, and a bullet controls nothing. The reach measured real and the name
measured false, so the name went.

> **Reach bought by misnaming buys nothing a reader can trust.** A reader who learns that this
> grammar calls bullets keywords has learned that its names mean whatever paints.

### Markdown's list-marker name — declined at +19 points

Borrowing markdown's scope name for a list marker measured **nineteen points** of additional theme
reach. The gain came entirely from markdown's popularity, not from any claim about the construct.

> **A grammar that borrows a language's name to borrow its colour has stopped describing what it
> parses.** TiddlyWiki's list markup is not markdown's, and a name that says otherwise trades a
> true statement for a colour.

### 2.3.0 — 126 names moved, 39 of them for one reason

The `2.3.0` release moved **126** of 460 declared names and added **253**. Thirty-nine moved for a
single shape: a qualifier standing in front of the family root —
`bold.punctuation.definition.markup.begin`, `caption.markup.other.table`, `mvv.attribute.html`.

A TextMate selector reaches a scope by **dot-bounded prefix**, so only the segments at the FRONT
can be selected on. Those names stood outside every theme rule written against `punctuation`,
`markup`, `meta` or `entity` — and had done so from the day they were written. Nothing reported
them, because painting the colour of prose looks exactly like a theme with no opinion.

> **A name a selector cannot reach makes no promise at all.** Root first, qualifier as suffix: a
> rule on the family reaches the construct, and a deeper rule can still single it out.

## What the policy forbids

### Root first

A name opens on one of the fourteen TextMate roots — `comment`, `constant`, `entity`, `invalid`,
`keyword`, `markup`, `meta`, `punctuation`, `source`, `storage`, `string`, `support`, `text`,
`variable` — and puts its qualifiers after. **Checked.** Zero stand violated.

### Punctuation stacks, never nests

Where a mark should take its content's family, the second family goes on the mark as a **second
scope, space-separated**, with the published name kept and the new one last:

```
"name": "punctuation.definition.markup.begin.subscript.tiddlywiki5 markup.subscript.tiddlywiki5"
```

The rejected alternative writes one name that NESTS punctuation under a content root —
`string.punctuation.definition.*`, `markup.heading.punctuation.definition`. Measured across
thirteen flagship grammars, that literal shape returns **zero**, and Sublime's own scope-naming
guidance rules against it. It also states something false: no span is a kind of
heading-punctuation.

VS Code's own TypeScript grammar ships the stacked form on its template backticks, and
MagicPython ships twelve of them, both for exactly this reason — `contentName` covers only a
region's interior, so a delimiter loses whatever its content carries unless somebody puts it back
by hand.

**Checked, at a floor of 0.** A filter operand's brackets wore the nested shape three ways —
`string.`, `variable.` and `entity.name.punctuation.definition.operand.*` — and each stands as
two scopes on one span, the punctuation name first and the content family last. A theme reached
those marks through the content root alone, `string` in 62 of the 65 bundled themes, `variable`
in 58 and `entity` in 40, and through `punctuation` in none; the stacked spelling keeps every one
of those and adds the 40 `punctuation` rules that never reached them. Measured after: 424 scopes,
zero readings moved in `colour-witness`, zero in `construct-legibility`, zero snapshots drifted.

A heading's `!` mark carried the additive device and spelled it backwards, nesting
`punctuation.definition` under `markup.heading`; it stands as
`punctuation.definition.heading.tiddlywiki5 markup.heading.tiddlywiki5`, reaching the same 55 of
65 themes through the same rules.

**The device answers to measurement, not to symmetry.** `corpus/delimiter-ledger.txt` carries the
same cure declined four times: stacking an emphasis run's family onto its own marks makes the
whole construct read in one ink, and a construct reading in one ink stops parting from a
NEIGHBOUR reading in that same ink. Measured one family at a time against a control arm stacking
nothing, bold cost three pairs, italic three, and the underline and strikethrough families four
between them — the worst a fall from 46 themes to 28 on a system link against an underline run.
`corpus/legibility-floor.txt` rules that a count may rise and may never fall, so those four stand
declined with the numbers that declined them. Three where the cure cost nothing — subscript,
superscript and the hard-linebreak run — stand cured.

### One segment, one word

A dropped dot fuses two segments into a word no selector reaches — neither the family before it
nor the suffix after. **Checked, at a floor of 0.** A multids title line spelled its wikitext
family `text.htmltiddlywiki5`, running `html` and `tiddlywiki5` together; it stands as
`meta.multids.tiddler.title.text.html.tiddlywiki5.multids-file`, and `MIGRATION.md` carries the
row. Every gate read green over the fused spelling, because the name still read as a name — the
check derives its provocation by dropping a dot out of a name the grammars declare TODAY, so a
hand-copied example cannot go stale into a green reading.

### No borrowed language name — stated, not checked

A name may carry another language's word where the span genuinely holds that language, and may
not carry it to inherit that language's colour. **This one resists automation and stays a
reading.** Measured: the only candidate a mechanical check flags,
`meta.tag.metadata.processing.xml.html.tiddlywiki5`, names an XML processing instruction — the
word `xml` says what the span holds, so the check would report a violation where the policy sees
none. A gate that fires on the true case and the false one alike teaches a contributor to ignore
it.

## Reading it yourself

```sh
node --test tools/invariants/scope-name-policy.test.js   # the three checkable parts
npm run rule-inventory                                   # every scope, by the rule declaring it
npm run delimiters                                       # what each delimiter inherits, and what it owes
```

A floor fails when the count grows **and** when it shrinks without somebody lowering it, so a cure
lands with its gain pinned and nothing quietly regrows.
