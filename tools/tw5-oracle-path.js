#!/usr/bin/env node
// Which TiddlyWiki this run resolved — a probe, so a sandbox can say which host it met.
//
// A sandbox stands where no checkout stands beside it, and `resolveTiddlyWiki` falls back to the
// pinned package there. That difference decides what every collision measures, and nothing else
// prints it.

'use strict';

const { resolveTiddlyWiki } = require('./tw5-oracle.js');

console.log(resolveTiddlyWiki() || '');
