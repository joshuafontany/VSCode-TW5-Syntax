# Corpus

Broad ground, gated on invariants. `tests/samples` holds frozen specimens and pins every
token of each; a snapshot there moves only in a commit that moves the sample. These files answer
a different question, and answer it about far more constructs than a pinned suite can carry.

```sh
npm run corpus           # the gate
npm run corpus-verbose   # and every scope nothing reaches
```

**Coverage.** Every scope the grammar declares should be reached by some file here. The tool
reads the declared set from the grammar's own `name` and `contentName` fields, so no
hand-kept list can drift from it. `coverage-floor.txt` ratchets the count: a rule the
corpus used to exercise cannot quietly stop being exercised.

**Containment.** The gate appends a sentence to each file and requires that sentence to
carry only what the same sentence carries alone — measuring the baseline from a control
file, never assuming it. The `degenerate.*` files hold unterminated constructs on purpose
and stand exempt.

**Rule coverage.** Every rule TiddlyWiki itself stands must fire in some file here. The
population comes from the host through `activeRules`, so a construct the grammar never learned
reaches no scope, goes unmissed, and cannot leave coverage reading full. One rule, `whitespace`,
builds no node at all and stands named with that reason.

**The cut sweep.** `npm run swallow-witness` cuts every file here at every line, appends a blank
line and a sentinel, and asks TiddlyWiki and the grammar about the same offset. The run prints how
many cuts it made and across how many files, so that count answers to the corpus on disk rather
than to a figure typed here. A `.tid` keeps its header and the sentinel lands in its body, which
asks whether a field value left open colours what follows it. Two files carry the record:
`swallow-ledger.txt` holds every divergence with the reason it stands and fails on a ruling that
explains nothing; `unasked-regions-ceiling.txt` counts the regions with no line bound that no cut
here ever opens.

**What a delimiter inherits.** `contentName` names a region's interior, so the marks that open and
close it fall outside the content family by construction and nothing downstream notices. `npm run
delimiters` reads every `contentName` in `syntaxes/` and keys each by the family of its content
against the families its delimiters carry; `delimiter-ledger.txt` rules every shape and says
whether the parting serves a reader or costs one. A shape nobody ruled fails the gate, and so does
a ruling naming a shape the tree stopped declaring.

**What stands here, and what does not.** THIS DIRECTORY HOLDS WHAT A HAND AUTHORED. A harvest is
derived — the host's own answer, or the gates' — and stands outside, under `reader-signals/` for a
peer reader's snapshot and among the edition's tiddlers for the primary reader's. Measured, which is
why the law reads this way: the peer snapshots once stood under `corpus/reader-signals/`, and
`still.js` counts the token stacks of every file here that does not end `.txt` or `.md` — so each
`.json` snapshot joined the ground the ruled share is measured over, at 50.2% with them present
against 53.2% without, and the figure then rode into the next harvest's own summary line.
`tools/invariants/a-harvest-moves-no-measurement.test.js` holds that door shut.

The bench seeds its workspace from here, so you look at the same files that gate the
grammar.

| directory | ground |
|---|---|
| `wikitext/` | blocks, inline runs, html, pragmas, and two degenerate files |
| `tid/` | `.tid`, `.meta` and `.multids` files |
| `memetic/` | sigils, `lar:` URIs, the control set, fences, and a degenerate file |
