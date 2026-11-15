// The three-cell analogy solver is frozen: its rate is a baseline that later puzzle types are compared
// against, so the solver must not drift. This test replays 120 saved puzzles (the three cells around the
// blank, the six options, the answer) and checks the solver scores each one exactly as it did when frozen.
// The saved puzzles do not depend on the generator, so this keeps passing when new puzzle types are added.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { analogy } = require('./checker');

test('three-cell analogy solver scores the saved puzzles as it did when frozen', () => {
  const lines = fs.readFileSync(path.join(__dirname, 'analogy-fixture.txt'), 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 120);
  lines.forEach((line, i) => {
    const x = JSON.parse(line);
    const P = { cells: [[null, null, null], [null, x.diag, x.above], [null, x.left, null]], opts: x.opts, correct: x.correct };
    assert.ok(Math.abs(analogy(P) - x.credit) < 1e-5, 'saved puzzle ' + (i + 1) + ' scored differently');
  });
});
