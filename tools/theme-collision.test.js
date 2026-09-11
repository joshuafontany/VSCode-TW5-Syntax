// The ruler's own collision, collided.
//
// `theme-collision.js` answers one question — does `theme-model.js` say what `vscode-textmate`
// paints — and a gate answering that can fail two ways a green run cannot tell apart: it can compare
// a value against ITSELF, and it can read the wrong bits and find them equal on both sides. Both
// look identical to a real pass.
//
// So the tool carries `--must-fail`, which paints theme N through the engine and answers for theme
// N+1 through the model. A wiring that compares one reading against itself stays green under that;
// this holds the tool to going RED.
//
//   node --test tools/theme-collision.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { runTool } = require('./run-tool.js');

const run = (...args) => runTool('theme-collision.js', args);

// A handful of themes carries every shape the model answers for — a scopeless rule, a missing
// `editor.foreground`, a short-hex colour, an alpha, and a light base — and runs in seconds where
// the whole set runs in minutes. The gate itself reads all sixty-five.
const FEW = '--themes=catppuccin-frappe,min-dark,slack-ochin,nord,one-light,vesper,synthwave-84';

test('the model says what the engine paints', () => {
  const { code, out } = run(FEW);
  assert.match(out, /0 where the model parts from the engine/, out.trim());
  assert.match(out, /0 control fault\(s\)/, out.trim());
  assert.strictEqual(code, 0, out.trim());
});

// THE TEETH. A comparison of a reading against itself reads green forever, and the wiring that does
// it looks identical to the wiring that does not.
test('the collision goes red where the two sides answer for different themes', () => {
  const { code, out } = run(FEW, '--must-fail');
  assert.strictEqual(code, 0, `the shuffled run found no divergence, so the collision compares one reading against itself\n${out}`);
  assert.doesNotMatch(out, / 0 where the model parts/, out.trim());
});
