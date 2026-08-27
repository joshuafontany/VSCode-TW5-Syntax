# Known gaps

A test in here states what the grammar *should* do and does not yet. It stands written so
the specification survives, and it stands outside `npm test` so a known gap does not read
as a regression.

Run one with:

```
bash ./run_tests.sh './tests/known-gaps/*.tw5.test'
```

## tiddlywiki5.widget-body

A widget that opens and closes on one line carries no inline wikitext:

```
a {{X}} b                      → 3 transclusion scopes
<$button>{{X}}</$button>       → 0
```

TiddlyWiki parses a widget's content as wikitext. Here the tag rules end at their own `>`,
so the body falls back to block context where no inline rule reaches it — and TiddlyWiki's
own core is full of `<$button>{{$:/core/images/…}}</$button>`.

A region in `#htmlwidget` spanning an opening tag to its matching close, including
`#htmlwidget-tags-valid` and `#inline`, makes these four assertions pass — and swallows a
`\parsermode` pragma two sections away in `tests/samples/release-check.tid`. The html
family carries half this grammar; the repair wants its own sitting, with the composition
check and the canary watching.

## A closing fence carrying leading whitespace

Both this grammar and `codeblock.js` now close on a fence carrying up to three spaces of
indentation, and refuse one indented further. Nothing stands open here.
