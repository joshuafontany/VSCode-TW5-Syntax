// The specimens must meet the FORMS the house writes, not only the names.
//
//   node --test tools/sigil-shape.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool, ROOT } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');

const SEED = path.resolve(ROOT, '..', 'bags', 'lares', 'ha.ka.ba', 'lares', 'api', 'noosphere-boot.mem');
const live = { skip: fs.existsSync(SEED) ? false : 'no boot seed stands beside this checkout', timeout: 600000 };

// A NAME IS NOT A FORM. `sigil-vocabulary` asks whether every sigil the seed WRITES stands in a
// specimen, and it read green for a whole session while the bearing arrow arrived in two tokens in
// every carrier this house writes — because one prose specimen reached the arrow's scope and the
// in-sigil form reached nothing. Coverage counted the name and never the shape it wears.
test('every sigil shape the seed writes stands in a specimen', live, () => {
  const { code, out } = runTool('sigil-shape.js');
  assert.match(out, /\d+ shape\(s\) the seed writes across \d+ specimen\(s\), 0 unexercised/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// The fault: the house starts writing a form and no specimen ever meets it.
test('a shape the seed writes and no specimen carries fails the gate', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      // The seed stands OUTSIDE the sandbox, so the provocation moves the specimens instead.
      // IT MUST REACH EVERY SPECIMEN: striking a form from one named file leaves it exercised the
      // moment a second carrier writes it, and the collision then plants no fault while reading green.
      let struck = 0;
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, e.name);
          if (e.isDirectory()) { walk(file); continue; }
          if (!file.endsWith('.mem')) continue;
          const before = fs.readFileSync(file, 'utf8');
          // Strike the BEARING form: a sigil carrying an arrow between two named ends.
          // A SIGIL CLOSES ON `>>`, never on one `>`. A strike reading its body as `[^>]` truncates
          // at the angle INSIDE the arrow and leaves the form standing — the same blindness the
          // arrow itself carried, and the instrument this collides carried it too.
          // AN ANCHORED GLOBAL REPLACE STRIKES ONCE PER ANCHOR, never once per occurrence: a lazy
          // match consumes the `<<~` and a SECOND arrow in the same sigil has none left to match on.
          // So the strike takes the whole sigil and clears every arrow inside it.
          const after = before.replace(/<<~(?:[^>\n]|>(?!>))*>>/g,
            (sigil) => sigil.replace(/[ \t]*->[ \t]*/g, ' '));
          if (after === before) continue;
          fs.writeFileSync(file, after); struck += 1;
        }
      };
      walk(path.join(sandbox, 'corpus', 'memetic'));
      walk(path.join(sandbox, 'tests', 'samples'));
      assert.ok(struck > 0, 'the provocation changed nothing, so it plants no fault');
    },
    ['tools/sigil-shape.js']);
  assert.match(out, /bearing/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a shape went unexercised and the gate held anyway');
});

// A shape beyond the seed reads as a FINDING rather than a fault, the way a sigil beyond it does.
test('a shape no seed writes reads as a finding rather than a fault', live, () => {
  const { code } = runTool('sigil-shape.js');
  assert.strictEqual(code, 0, 'a shape carried beyond the seed failed the gate, where it names a finding');
});
