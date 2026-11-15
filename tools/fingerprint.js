// Seeded fingerprint of the generator: 300 gen() plus 50 genMulti() puzzles per level, hashed.
// If a change is meant to leave puzzles untouched (a cleanup, a rename), the fingerprints must not move.
// If a change is meant to alter puzzles, run `node tools/fingerprint.js --update` and commit the new values.
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./load');

const SEED = 20261114;
const EXPECTED_FILE = path.join(__dirname, 'fingerprints.txt');

// FNV-1a, 32 bit
function hash(s, h) {
  h = h === undefined ? 0x811c9dc5 : h;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const snapshot = P => JSON.stringify({ level: P.level, cells: P.cells, opts: P.opts, correct: P.correct, flags: P.flags, rules: P.rules.map(u => [u.feat, u.tier, u.cat, u.text]) });

function fingerprints(file) {
  const G = load(file), out = [];
  for (let level = 1; level <= G.MAXL; level++) {
    G.seed(SEED + level);
    let h;
    for (let i = 0; i < 300; i++) h = hash(snapshot(G.gen(level)), h);
    for (let i = 0; i < 50; i++) { const P = G.genMulti(level); h = hash(P ? snapshot(P) : 'null', h); }
    out.push(h.toString(16).padStart(8, '0'));
  }
  return out;
}
const expected = () => fs.readFileSync(EXPECTED_FILE, 'utf8').trim().split(/\s+/);

if (require.main === module) {
  const arg = process.argv.slice(2), i = arg.indexOf('--file');
  const fp = fingerprints(i < 0 ? undefined : arg[i + 1]);
  if (arg.includes('--update')) fs.writeFileSync(EXPECTED_FILE, fp.join('\n') + '\n');
  console.log(fp.join(' '));
}

module.exports = { fingerprints, expected };
