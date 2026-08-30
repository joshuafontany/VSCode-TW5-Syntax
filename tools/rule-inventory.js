#!/usr/bin/env node
// The configurable surface of TiddlyWiki's parser, derived from TiddlyWiki.
//
// Every wikitext rule answers to a tiddler: $:/config/WikiParserRules/<Type>/<name>, read
// by WikiParser.setupRules. A rule whose tiddler holds anything other than "enable" gets
// DELETED from WikiParser.prototype, so the wiki's configuration decides the rule set
// before a single character parses.
//
// Two readings shape this inventory, and both come off the host rather than a list:
//
// - THE DEFAULT IS AN ABSENCE. setupRules reads getTiddlerText(key,"enable"), so a rule
//   with no config tiddler stands enabled. TiddlyWiki ships exactly ONE such tiddler —
//   core/wiki/config/wikilink.tid, holding "disable" — so the shipped default table reads
//   "every rule on, except the one TiddlyWiki turned off in PR #7513".
// - A RULE MAY CARRY SEVERAL KEYS. The config prefix comes from the rule's TYPE, and a
//   rule declaring two types answers to two tiddlers independently: `conditional` runs
//   inline and block, `commentblock` runs block and pragma.
//
//   node tools/rule-inventory.js [--json|--configuration]
//
// --configuration emits the contributes.configuration properties block, so the extension's
// settings are generated from TiddlyWiki's rule modules rather than transcribed from them.
//
// The deciding half — configKeysFor, readShippedDefaults, buildInventory — stands under
// test in tests/tools/rule-inventory.test.js.

const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

// wikiparser.js reads one prefix per rule type. The pragma prefix is PLURAL and the other
// two are singular; nothing derives that, so it is transcribed and pinned by a test.
const PREFIX = { pragma: 'Pragmas', block: 'Block', inline: 'Inline' };

/**
 * The config tiddler keys a rule answers to, one per type it declares.
 *
 * @param {string[]} types  the type names from exports.types
 * @returns {string[]}      e.g. ['Inline/wikilink'], or ['Block/commentblock', 'Pragmas/commentblock']
 */
function configKeysFor(name, types) {
  return types.filter((t) => PREFIX[t]).map((t) => `${PREFIX[t]}/${name}`);
}

/**
 * The rule modules TiddlyWiki ships, with the types each declares.
 *
 * Read from the modules themselves: a rule added upstream appears here without anyone
 * amending a list, and a rule whose types change carries its new keys the same way.
 *
 * @param {string} twPath
 * @returns {{name:string, types:string[]}[]}
 */
function readRuleModules(twPath) {
  const dir = path.join(twPath, 'core/modules/parsers/wikiparser/rules');
  const files = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? files(p) : e.name.endsWith('.js') ? [p] : [];
    });
  return files(dir)
    .map((file) => {
      const src = fs.readFileSync(file, 'utf8');
      const name = /exports\.name\s*=\s*"([^"]+)"/.exec(src);
      const types = /exports\.types\s*=\s*\{([^}]*)\}/.exec(src);
      if (!name) return null;
      return {
        name: name[1],
        types: types ? [...types[1].matchAll(/(\w+)\s*:\s*true/g)].map((m) => m[1]) : []
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The WikiParserRules tiddlers TiddlyWiki actually ships, as key -> value.
 *
 * Only a tiddler that STANDS appears. Every rule without one defaults to enable, so the
 * absence carries the answer and this map stays as small as TiddlyWiki keeps it.
 *
 * @param {string} twPath
 * @returns {Map<string,string>}
 */
function readShippedDefaults(twPath) {
  const out = new Map();
  const dir = path.join(twPath, 'core/wiki');
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.tid')) {
        const text = fs.readFileSync(p, 'utf8');
        const m = /^title:\s*\$:\/config\/WikiParserRules\/(\S+)\s*$/m.exec(text);
        if (m) out.set(m[1], text.slice(text.indexOf('\n\n') + 2).trim());
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Every rule, the keys it answers to, and what TiddlyWiki ships for each.
 *
 * @param {string} twPath
 * @returns {{name:string, types:string[], keys:{key:string, shipped:string, standsByDefault:boolean}[]}[]}
 */
function buildInventory(twPath) {
  const shipped = readShippedDefaults(twPath);
  return readRuleModules(twPath).map(({ name, types }) => ({
    name,
    types,
    keys: configKeysFor(name, types).map((key) => {
      // setupRules reads getTiddlerText(key,"enable"): an absent tiddler answers "enable",
      // and any value other than "enable" deletes the rule.
      const shippedValue = shipped.has(key) ? shipped.get(key) : null;
      return { key, shipped: shippedValue, standsByDefault: (shippedValue ?? 'enable') === 'enable' };
    })
  }));
}

/**
 * The contributes.configuration properties for a per-rule setting surface.
 *
 * One boolean per config key, defaulted to what TiddlyWiki ships, scoped `resource` so a
 * workspace folder may answer differently from the user's global setting.
 *
 * @param {ReturnType<typeof buildInventory>} inventory
 * @returns {object}
 */
function configurationProperties(inventory) {
  const props = {};
  for (const rule of inventory) {
    for (const { key, standsByDefault, shipped } of rule.keys) {
      props[`tw5-syntax.rules.${key.replace('/', '.')}`] = {
        type: 'boolean',
        default: standsByDefault,
        scope: 'resource',
        markdownDescription:
          `Scope the \`${rule.name}\` rule (\`$:/config/WikiParserRules/${key}\`). ` +
          (shipped === null
            ? 'TiddlyWiki ships no tiddler for this rule, so it stands enabled.'
            : `TiddlyWiki ships \`${shipped}\` for this rule.`)
      };
    }
  }
  return props;
}

module.exports = { PREFIX, configKeysFor, readRuleModules, readShippedDefaults, buildInventory, configurationProperties };

if (require.main === module) {
  const tw = resolveTiddlyWiki();
  if (!tw) {
    console.error('no TiddlyWiki checkout resolved — set TW5_PATH');
    process.exit(2);
  }
  const inventory = buildInventory(tw);
  if (process.argv.includes('--configuration')) {
    console.log(JSON.stringify(configurationProperties(inventory), null, 2));
    process.exit(0);
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(inventory, null, 2));
    process.exit(0);
  }
  const keys = inventory.flatMap((r) => r.keys);
  console.log(`rule-inventory  ${inventory.length} rules, ${keys.length} config keys\n`);
  for (const r of inventory) {
    for (const k of r.keys) {
      const mark = k.standsByDefault ? '  on' : ' OFF';
      const note = k.shipped === null ? 'no tiddler ships — enabled by absence' : `ships "${k.shipped}"`;
      console.log(`  ${mark}  ${k.key.padEnd(34)} ${note}`);
    }
  }
  const off = keys.filter((k) => !k.standsByDefault);
  console.log(`\n  rules TiddlyWiki ships switched OFF: ${off.length}${off.length ? ` — ${off.map((k) => k.key).join(' ')}` : ''}`);
}
