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

## A fence language carrying a slash or a dot

`codeblock.js:23` matches ```` ```([\w-]*)\r?\n ````, so ```` ```text/vnd.tiddlywiki ````
opens no code block in TiddlyWiki — the line renders as an ordinary paragraph. This grammar
reads it as a code block and hands the body back to wikitext, which is wider than upstream
on purpose: the wikitext-in-a-fence convenience rests on it, and `tests/samples/release-check.tid`
pins it.

`tiddlywiki5.codeblock-fence.tw5.test` states the upstream-faithful reading. Narrowing the
begin lookahead and `\G` language capture to `[\w-]` makes it pass and removes the convenience.
That trade belongs to the operator, so the grammar keeps the wider form and the spec sits here.

## A closing fence carrying leading whitespace

`codeblock.js:26` sets `reEnd = /(^|\r?\n)```$/mg`, so an indented ```` ``` ```` does not close
a block in TiddlyWiki — the block runs to the end of the tiddler. This grammar closes on
`^(?!\s*```)`, which is lenient by one leading-whitespace run.

Held deliberately. Tightening it converts a benign leniency into an unbounded swallow, and a
run that opens and never closes has been this grammar's costliest defect family. The corpus
carries one indented closing fence.
