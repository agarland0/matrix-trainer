// Loads the puzzle generator out of index.html and runs it in Node with a seeded random source,
// so every run of the checker and the fingerprint test sees exactly the same puzzles.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const START = '// ---------- utilities ----------';
const END = '// ---------- drawing ----------';

// mulberry32: small seeded generator, good enough to make runs repeatable
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function load(file) {
  file = file || path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('Could not find the generator section in ' + file);
  const ctx = vm.createContext({ window: {}, __rand: Math.random });
  vm.runInContext('Math.random=()=>__rand();', ctx);
  vm.runInContext(html.slice(a, b) + '\n;globalThis.__api={gen,genMulti,LV,HAS,MAXL};', ctx, { filename: 'index.html#generator' });
  const api = ctx.__api;
  return {
    gen: api.gen,
    genMulti: api.genMulti,
    LV: api.LV,
    HAS: api.HAS,
    MAXL: api.MAXL,
    seed(s) { ctx.__rand = rng(s); },
  };
}

module.exports = { load, rng };
