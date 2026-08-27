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

## Fence rules, against a moving upstream

TiddlyWiki's fence rule changed under
[PR #9920](https://github.com/TiddlyWiki/TiddlyWiki5/pull/9920): an opening fence takes three
or more backticks and closes only on a fence at least as long, the info string admits any
character but a backtick, and either fence may carry up to three spaces of indentation.

The gap that stood here — this grammar reading ```` ```text/vnd.tiddlywiki ```` as a code block
where `codeblock.js` refused it — closed by upstream moving. Three gaps open the other way, and
belong to the 2.2.0 line:

- the info string still reads `[\w\-/.]*`, so ```` ```C++ ```` and ```` ```js {highlight} ````
  scope nothing;
- a fence of four or more backticks opens no block, so a nested sample reads as plain text;
- the leniency below is no longer leniency.

## A closing fence carrying leading whitespace

`codeblock.js:26` sets `reEnd = /(^|\r?\n)```$/mg`, so an indented ```` ``` ```` does not close
a block in TiddlyWiki — the block runs to the end of the tiddler. This grammar closes on
`^(?!\s*```)`, which is lenient by one leading-whitespace run.

Upstream now closes on a fence carrying up to three spaces of indentation, so this grammar and
the parser agree for one to three spaces and part company beyond them. What stood as deliberate
leniency now reads as a near-alignment that wants finishing on the 2.2.0 line.
