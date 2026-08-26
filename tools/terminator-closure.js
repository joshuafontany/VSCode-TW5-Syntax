#!/usr/bin/env node
// Terminator closure.
//
// A delimited region may admit a nested region only if that nested region cannot
// consume the outer region's terminator.
//
// A region whose nested regions can consume its `end` cannot close reliably: the
// child eats the terminator, the parent runs on, and — because an unclosed child
// blocks its parent's `end` outright — the colouring compounds to end of file.
//
// Only nested regions carry this risk. A `match` rule consumes a bounded token and
// returns, so it never holds its parent open.
//
// This reports every region that breaks the closure, naming the rule that breaks it.
// It reads the grammar alone: no corpus, no list of widget or attribute names.
//
// Precision. The extractor reads guaranteed literals out of a regex and skips what
// carries none: character classes, wide alternations, negative lookarounds, inline
// flags. It expands a counted repetition, so ">{2}" terminates on ">>". Two further
// cuts keep it honest: a child that closes ON the outer terminator hands it back
// rather than eating it, and only a nested REGION can hold a parent open at all.
//
// It discriminates rather than floods — memetic-wikitext, tw5-fields, tw5-tid-file
// and tw5-multids-file each report zero. tiddlywiki5.json reports 77, dominated by
// single-character tag punctuation where HTML regions nest legitimately, so read that
// number as a triage list and not as a defect count. Run it as a ratchet on a grammar
// already at zero.

const fs = require('fs');

const grammarPath = process.argv[2] || 'syntaxes/tiddlywiki5.json';
const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
const repo = grammar.repository || {};

// The literal runs a regex source can emit, ignoring anchors, classes and groups.
function literals(source) {
  if (!source) return [];
  // A lookaround in an `end` still requires its characters in the stream, so keep
  // the contents and drop only the marker. Character classes and quantified atoms
  // carry no guaranteed literal, so they are dropped.
  const stripped = String(source)
    .replace(/\(\?[a-zA-Z]+\)/g, ' ')     // inline flags: (?i) carries no literal
    .replace(/\(\?<?![^)]*\)/g, ' ')      // negative lookaround: requires absence
    .replace(/\(\?<?[:=]/g, '(')
    // A counted repetition carries its literal n times: ">{2}" terminates on ">>".
    .replace(/(\\?.)\{(\d+)(?:,\d*)?\}/g, (_, ch, n) => ch.repeat(Math.min(+n, 8)))
    .replace(/\[(?:\\.|[^\]])*\]/g, ' ')
    .replace(/[()|]/g, ' ');
  const out = [];
  let run = '';
  let escaped = false;
  const flush = () => { if (run) out.push(run); run = ''; };
  for (const ch of stripped) {
    if (escaped) {
      if (/[a-zA-Z0-9]/.test(ch)) flush();   // \s \w \b — a class, not a literal
      else run += ch;                        // \) \[ \^ — the character itself
      escaped = false;
      continue;
    }
    if (ch === '\\') { escaped = true; continue; }
    if (/[\s*+?{}^$.]/.test(ch)) { flush(); continue; }
    run += ch;
  }
  flush();
  return out.filter(s => s.trim().length >= 1);
}

function resolve(ref, seen) {
  if (typeof ref === 'string') {
    if (!ref.startsWith('#')) return [];
    const name = ref.slice(1);
    if (seen.has(name)) return [];
    seen.add(name);
    return repo[name] ? collect(repo[name], seen) : [];
  }
  return collect(ref, seen);
}

function collect(rule, seen) {
  let out = [];
  if (!rule || typeof rule !== 'object') return out;
  // Only a nested REGION can swallow a terminator and keep going. A `match` rule
  // consumes a bounded token and returns, so it cannot hold the parent open.
  if (rule.begin && rule.end) out.push({ src: rule.begin, end: rule.end, name: rule.name || '' });
  for (const p of rule.patterns || []) out = out.concat(resolve(p.include || p, seen));
  return out;
}

const findings = [];

function scan(rule, path) {
  if (!rule || typeof rule !== 'object') return;
  if (rule.begin && rule.end && Array.isArray(rule.patterns)) {
    const terms = literals(rule.end);
    const emitters = [];
    for (const p of rule.patterns) emitters.push(...resolve(p.include || p, new Set()));
    for (const term of terms) {
      const culprit = emitters.find(e => {
        const opens = literals(e.src);
        if (opens.length > 6) return false;      // a wide alternation guarantees no single branch
        if (!opens.some(l => l.includes(term))) return false;
        // A nested region that closes ON the outer terminator hands it back rather than
        // eating it. Only a region whose own end ignores the terminator can swallow it.
        const closes = literals(e.end);
        if (closes.some(l => l.includes(term))) return false;
        return true;
      });
      if (culprit) {
        findings.push({
          path,
          name: rule.name || rule.contentName || '',
          end: rule.end,
          term,
          by: culprit.src
        });
        break;
      }
    }
  }
  for (const [key, value] of Object.entries(rule)) {
    if (key === 'patterns' && Array.isArray(value)) {
      value.forEach((p, i) => scan(p, path + '[' + i + ']'));
    } else if (value && typeof value === 'object' && !key.endsWith('aptures')) {
      scan(value, path + '.' + key);
    }
  }
}

for (const [name, rule] of Object.entries(repo)) scan(rule, name);
scan({ patterns: grammar.patterns || [] }, '<top>');

const seen = new Set();
const unique = findings.filter(f => {
  const key = f.path + '|' + f.term;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log('terminator-closure  ' + grammarPath);
console.log('  regions breaking closure: ' + unique.length + '\n');
for (const f of unique) {
  console.log('  ' + f.path);
  console.log('      name       ' + f.name);
  console.log('      end        ' + JSON.stringify(f.end));
  console.log('      emittable  ' + JSON.stringify(f.term) + '  by  ' + JSON.stringify(f.by).slice(0, 72));
}
process.exit(unique.length ? 1 : 0);
