// The gate must name a construct that goes dark, and must not name one that reads plain by design.
//
// A gate reporting nothing reads the same whether every construct reaches a theme or the gate
// stopped looking. Both halves get checked: the grammar as it stands accounts for every plain
// construct, and a heading stripped of the names themes rule on gets named.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');

const ROOT = path.resolve(__dirname, '..');
const THEMES = path.join(ROOT, 'node_modules', 'tm-themes', 'themes');
const live = { skip: fs.existsSync(THEMES) ? false : 'no bundled themes', timeout: 600000 };

const run = () => runTool('dark-construct.js', ['--verbose']);

test('every construct that reads plain carries a reason', live, () => {
  const { code, out } = run();
  assert.match(out, /0 unaccounted/, out.slice(-500));
  assert.strictEqual(code, 0);
});

// Plain reading often serves the reader — a paragraph, the words inside a bullet — so the gate finds
// constructs standing plain and let them, rather than reporting an empty list.
test('the gate finds the constructs that read plain, rather than none', live, () => {
  const { out } = run();
  const match = /(\d+) plain/.exec(out);
  assert.ok(match && Number(match[1]) >= 8, `only ${match && match[1]} construct(s) read plain — the probe found too little to be measuring`);
  assert.match(out, /meta\.paragraph/, 'prose must show among them');
});

// The collision runs against a COPY of the working tree. This gate reads the PINNED SNAPSHOTS,
// so the fault lands there: a grammar swapped in the sandbox would leave the snapshots reading
// what the grammar said at the last commit.
test('a heading stripped of the names themes rule on stands named', live, () => {
  const { code, out } = runInSandbox((sandbox) => {
    const samples = path.join(sandbox, 'tests', 'samples');
    for (const name of fs.readdirSync(samples).filter((f) => f.endsWith('.snap'))) {
      const file = path.join(samples, name);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
        .replaceAll('markup.heading.1.tiddlywiki5 ', '')
        .replaceAll(' entity.name.section.tiddlywiki5', ''));
    }
  }, ['tools/dark-construct.js']);
  assert.match(out, /meta\.heading\.heading-1\.tiddlywiki5 stands dark/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'the gate must fail, not only print');
});
