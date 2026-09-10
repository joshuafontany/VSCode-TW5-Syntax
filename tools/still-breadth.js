#!/usr/bin/env node
// How many causes one ruling key spans — a probe, so a sandbox can answer for a key.
//
// A test asking whether breadth moves when the corpus grows needs the reading from INSIDE a
// sandbox, where the grown corpus stands. Nothing else prints it.

'use strict';

const { kindsSpanned } = require('./still.js');

kindsSpanned(process.argv[2]).then((n) => console.log(n));
