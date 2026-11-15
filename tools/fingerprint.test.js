'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { fingerprints, expected } = require('./fingerprint');
const { load } = require('./load');
const { difficulty } = require('./checker');

test('generator fingerprints match the recorded ones, level 1 to 10', () => {
  assert.deepStrictEqual(fingerprints(), expected());
});

test('same seed gives the same puzzle, different seed a different one', () => {
  const G = load(), snap = s => { G.seed(s); return JSON.stringify(G.gen(8).cells); };
  assert.strictEqual(snap(1), snap(1));
  assert.notStrictEqual(snap(1), snap(2));
});

test('every puzzle has six distinct options and need never exceeds its rule count', () => {
  const G = load();
  for (let level = 1; level <= G.MAXL; level++) {
    G.seed(99 + level);
    for (let i = 0; i < 40; i++) {
      const P = G.gen(level, null, { timed: 1 }), d = difficulty(P);
      assert.strictEqual(new Set(P.opts.map(o => JSON.stringify(o))).size, 6);
      assert.ok(d.need >= 0 && d.need <= P.rules.length);
      assert.ok(d.rndneed >= d.need - 1e-9);
    }
  }
});
