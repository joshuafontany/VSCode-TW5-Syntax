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
line and a sentinel, and asks TiddlyWiki and the grammar about the same offset — 757 cuts across
35 files. A `.tid` keeps its header and the sentinel lands in its body, which asks whether a field
value left open colours what follows it. Two files carry the record: `swallow-ledger.txt` holds
every divergence with the reason it stands and fails on a ruling that explains nothing;
`unasked-regions-ceiling.txt` counts the regions with no line bound that no cut here ever opens.

The bench seeds its workspace from here, so you look at the same files that gate the
grammar.

| directory | ground |
|---|---|
| `wikitext/` | blocks, inline runs, html, pragmas, and two degenerate files |
| `tid/` | `.tid`, `.meta` and `.multids` files |
| `memetic/` | sigils, `lar:` URIs, the control set, fences, and a degenerate file |
