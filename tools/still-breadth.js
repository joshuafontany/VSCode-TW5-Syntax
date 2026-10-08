#!/usr/bin/env node
// How many causes one ruling key spans — a probe, so a sandbox can answer for a key.
//
// A test asking whether breadth moves when the corpus grows needs the reading from INSIDE a
// sandbox, where the grown corpus stands. Nothing else prints it.

'use strict';

const { kindsSpanned } = require('./still.js');

// A NUMBER FOR A MACHINE GOES OUT AS TEXT. `console.log` hands a number to `util.inspect`, which
// colours it wherever colour stands forced — `FORCE_COLOR` in an environment is enough — and the
// reading then arrives wrapped in escape codes that `Number()` reads as NaN. Measured: the caller
// asking whether a ruling's breadth moved read NaN against 1 and named the corpus, where the fault
// sat in the environment. One number, written plainly, cannot be recoloured.
kindsSpanned(process.argv[2]).then((n) => process.stdout.write(`${n}\n`));
