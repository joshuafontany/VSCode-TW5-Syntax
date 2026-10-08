# Attic

Fixtures kept whole, and out of the run.

`run_tests.sh` globs `tests/memetic-wikitext/*.mem.test`, so nothing here executes. Each file
stands readable because it encodes what a retired grammar MEANT, and a rewrite that discards its
assertions discards the intent that justified them.

Every fixture here asserts the vocabulary of `syntaxes/attic/memetic-wikitext.sketch.json` —
`meta.sigil.memetic-wikitext`, `keyword.control.sharktooth.memetic-wikitext`,
`constant.character.carrier.*`. That grammar replaced the base reading on six of seven memetic
constructs rather than adding to it, and the vocabulary went with it.

Rewriting these to assert whatever the base now reads would turn a test of INTENT into a record of
BEHAVIOUR — the failure mode the snapshot literature names, where a suite reports stability and
nobody can say whether either reading was ever correct. So they wait here until the seed grows a
vocabulary of its own, and each one either returns wearing it or retires with a reason.

`gradient-floor` did NOT come here: the invariant it carries — a malformed sigil surfaces as itself
and never swallows what follows — stands independent of any vocabulary, and it now asserts that
floor in the reading the base gives.

`lar-uri-query` came here for a different reason. It asserts the URI's own anatomy — scheme,
path, query, fragment — standing INSIDE a sigil, and the seed cannot reach there: the memetic
vocabulary arrives through an `R:` injection, which fires only where the base names nothing, and
inside a call the base always names `meta.variable.procedure.parameters`. Quoting the value does
not open it either, since a positional argument opens no string region for an injection to enter.
The same anatomy stands asserted in prose by `lar-uri-in-prose.mem.test`, which passes.
