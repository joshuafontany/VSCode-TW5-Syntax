# Reader signals

A peer reader's harvest, written by a tool and edited by nobody.

Two readers ask this repository's gates the same questions: the TiddlyWiki checkout a developer
points `TW5_PATH` at, and the pinned `tiddlywiki` devDependency CI boots. Several harvests differ by
reader even where every gate holds — a summary line naming the version it booted against reads
differently under each. So the PRIMARY reader's harvest ships as a tiddler the edition carries
(`editions/tw5-syntax/tiddlers/GrammarSignals.tid`, `GateReport.tid`), and every other reader's
lands here, keyed on its version, so `--check` compares each reader against its own baseline.

| file | written by |
|---|---|
| `<version>.json` | `tools/grammar-signals.js` — what the host knows |
| `gate-report.<version>.json` | `tools/gate-report.js` — what every gate said |

`tools/reader-scope.js` carries the one name for this directory and for the version flattening, so
neither writer spells it a second way.

**Why it stands outside `corpus/`.** The corpus holds what a hand authored; a harvest is derived;
they do not share a directory. These files once stood under `corpus/reader-signals/`, and
`tools/still.js` counts the token stacks of every file under `corpus/` that does not end `.txt` or
`.md` — so each `.json` snapshot joined the ground the ruled share is measured over. Measured on one
tree with nothing else changed: 50.2% of corpus tokens ruled with the snapshots present, 53.2% with
them removed. The moved figure then rode into the next harvest's own summary line, so the report
described a corpus the report had changed; one reader met that as a line that wobbled between runs
and went looking in the walk order instead.

`tools/invariants/a-harvest-moves-no-measurement.test.js` holds the door shut: it harvests, reads the
measurement, harvests something else, and requires the two readings byte-identical.
