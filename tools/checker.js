#!/usr/bin/env node
// Shortcut checker.
//
// Generates puzzles with a fixed seed and measures, per level:
//   rules     rules per puzzle
//   need      size of the smallest set of rules that leaves only the answer among the six options
//   wneed     the same, with each rule weighted by its tier (easy 1, medium 2, hard 3)
//   rndneed   rules needed if they are applied in random order (always shown next to need; it flatters)
//   option    the best strategy that looks only at the six options. Chance is 1 in 6 (16.7%).
//   grid      the best cheap strategy that also looks at the grid without solving it
//   analogy   three-cell analogy: take the cells above, left of and diagonal to the blank, predict
//             "left cell, changed the way the diagonal changes into the cell above", pick the best match.
//             This is real solving, not a tell. A high rate means the puzzle is easy.
//
// Usage: node tools/checker.js [--n 300] [--seed 20261111] [--mode timed|practice] [--type rings] [--md] [--all] [--gate]
//   --md    print a Markdown table (for the README)
//   --gate  exit with an error if an option-only shortcut beats GATE at levels 5 to 10
'use strict';
const { load } = require('./load');

const GATE = 0.25;
const TIERW = { easy: 1, medium: 2, hard: 3 };
const J = x => JSON.stringify(x);
const bits = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };

// ---------- difficulty ----------
function difficulty(P) {
  const ans = P.opts[P.correct], wrong = P.opts.filter((o, i) => i !== P.correct);
  const F = P.rules.map(u => u.feat), W = P.rules.map(u => TIERW[u.tier] || 2);
  const other = Object.keys(ans).filter(f => !F.includes(f));
  // an option that changes something no rule touches can be struck out without working out any rule
  const live = wrong.filter(o => other.every(f => J(o[f]) === J(ans[f])));
  // for each live wrong option: bitmask of the rules that rule it out
  const kill = live.map(o => F.reduce((m, f, i) => m | (J(o[f]) !== J(ans[f]) ? 1 << i : 0), 0));
  const isolates = m => kill.every(k => k & m);
  let need = Infinity, wneed = Infinity;
  for (let m = 0; m < 1 << F.length; m++) {
    if (!isolates(m)) continue;
    need = Math.min(need, bits(m));
    wneed = Math.min(wneed, F.reduce((s, f, i) => s + (m >> i & 1 ? W[i] : 0), 0));
  }
  // random order: average over every order of the rules of how many are used before only the answer is left
  let total = 0, count = 0;
  const walk = (m, used, depth) => {
    if (isolates(m)) { let ways = 1; for (let k = F.length - depth; k > 1; k--) ways *= k; total += depth * ways; count += ways; return; }
    for (let i = 0; i < F.length; i++) if (!(used >> i & 1)) walk(m | 1 << i, used | 1 << i, depth + 1);
  };
  walk(0, 0, 0);
  return { need, wneed, rndneed: total / count };
}

// ---------- shortcut strategies ----------
// A strategy gives each option a score and picks the highest. Ties are split evenly, so the rate is the
// expected hit rate of the strategy, not one lucky draw.
const credit = (scores, correct) => {
  const mx = Math.max(...scores), top = scores.filter(s => s === mx).length;
  return scores[correct] === mx ? 1 / top : 0;
};
const DARK = { white: 0, striped: 1, gray: 2, black: 3 };
const FILL4 = ['white', 'gray', 'black', 'striped'];
const digits4 = n => [0, 1, 2, 3].map(i => Math.floor(n / Math.pow(4, i)) % 4);
// rough amount of drawn ink an attribute value adds
const INK = {
  count: x => x, size: x => x, ngon: x => x, sides: x => Math.abs(x),
  lines: bits, figs: bits, spokes: bits, ringo: bits, ringi: bits, ringc: bits,
  fill: x => DARK[x], ifill: x => DARK[x],
  build: x => digits4(x).filter(Boolean).length,
  nest: x => (x % 10 ? 1 : 0),
  ma: x => DARK[FILL4[Math.floor(x / 3)]] + x % 3, mb: x => DARK[FILL4[Math.floor(x / 3)]] + x % 3, mc: x => DARK[FILL4[Math.floor(x / 3)]] + x % 3,
};
const SIZE = { count: 1, size: 1, ngon: 1, sides: 1, lines: 1, figs: 1, spokes: 1, ringo: 1, ringi: 1, ringc: 1 };

function optionOnly(P) {
  const O = P.opts, c = P.correct, out = {};
  const V = Object.keys(O[0]).filter(f => O.some(o => J(o[f]) !== J(O[0][f])));
  const share = f => O.map(o => O.filter(x => J(x[f]) === J(o[f])).length);
  const typical = O.map((o, i) => V.reduce((s, f) => s + share(f)[i], 0));
  const dist = (a, b) => V.filter(f => J(a[f]) !== J(b[f])).length;
  const near = O.map(o => O.filter(x => x !== o && dist(o, x) === 1).length);
  const far = O.map(o => O.reduce((s, x) => s + dist(o, x), 0));
  const ink = O.map(o => V.reduce((s, f) => s + (INK[f] ? INK[f](o[f]) : 0), 0));
  const neg = a => a.map(x => -x);
  out['most typical'] = credit(typical, c);
  out['least typical (odd one out)'] = credit(neg(typical), c);
  out['most one-detail-off neighbours'] = credit(near, c);
  out['fewest one-detail-off neighbours'] = credit(neg(near), c);
  out['closest to the other options'] = credit(neg(far), c);
  out['furthest from the other options'] = credit(far, c);
  out['most ink'] = credit(ink, c);
  out['least ink'] = credit(neg(ink), c);
  // one attribute at a time: the commonest value, the rarest value, the biggest, the smallest
  const single = {};
  for (const f of V) {
    const s = share(f);
    single['commonest value of one attribute (' + f + ')'] = credit(s, c);
    single['rarest value of one attribute (' + f + ')'] = credit(neg(s), c);
    if (SIZE[f]) {
      const n = O.map(o => INK[f](o[f]));
      single['largest ' + f] = credit(n, c);
      single['smallest ' + f] = credit(neg(n), c);
    }
  }
  return { out, single };
}

function gridAware(P) {
  const O = P.opts, c = P.correct, out = {}, cells = P.cells;
  const V = Object.keys(O[0]).filter(f => O.some(o => J(o[f]) !== J(O[0][f])));
  const g8 = cells.flat().slice(0, 8), left = cells[2][1], above = cells[1][2];
  const row3 = [cells[2][0], cells[2][1]], col3 = [cells[0][2], cells[1][2]];
  const neg = a => a.map(x => -x);
  const same = (o, S) => V.reduce((s, f) => s + S.filter(x => J(x[f]) === J(o[f])).length, 0);
  const diffAll = (o, S) => V.filter(f => S.every(x => J(x[f]) !== J(o[f]))).length;
  const unseen = O.map(o => diffAll(o, g8));
  out['differs most from the cells left and above'] = credit(O.map(o => -same(o, [left, above])), c);
  out['most like the cells left and above'] = credit(O.map(o => same(o, [left, above])), c);
  out['most like the cell to the left'] = credit(O.map(o => same(o, [left])), c);
  out['most like the cell above'] = credit(O.map(o => same(o, [above])), c);
  out['values new to its row'] = credit(O.map(o => diffAll(o, row3)), c);
  out['values new to its column'] = credit(O.map(o => diffAll(o, col3)), c);
  out['values new to its row and column'] = credit(O.map(o => diffAll(o, row3) + diffAll(o, col3)), c);
  out['most values seen often in the grid'] = credit(O.map(o => same(o, g8)), c);
  out['most values seen rarely in the grid'] = credit(O.map(o => -same(o, g8)), c);
  out['fewest values that appear in no grid cell'] = credit(neg(unseen), c);
  out['most values that appear in no grid cell'] = credit(unseen, c);
  out['not a copy of a grid cell'] = credit(O.map(o => g8.some(x => V.every(f => J(x[f]) === J(o[f]))) ? 0 : 1), c);
  return out;
}

// ---------- three-cell analogy ----------
// FROZEN. The rates this solver produces are the baseline for comparing puzzle types, so do not change it.
// tools/analogy.test.js replays saved puzzles to catch any drift. A stronger solver should be added beside
// this one under a new name, with its own column.
// Each attribute is read the way a solver would read it: a position on a wheel (clock arithmetic), a plain
// number, a set of marks, or one of a few named values. Attributes that pack two things into one figure
// (shading and size of a figure, outer and inner shape) are split into their parts first.
const WHEEL = { rot: 360, pos: 8, pos2: 8, hide: 5, mpos: 3, mir: 2, size: 3, hand: 8 };
// Attributes added after the freeze are only registered here, each under the kind a solver would read it as.
// Rings of eight arcs: if the cell above is the diagonal cell's pattern turned, turn the left cell the same
// way; otherwise treat the arcs as a set of marks.
const RING8 = { ringo: 1, ringi: 1, ringc: 1 };
const turn8 = (m, k) => ((m << k) | (m >> (8 - k))) & 255;
const LINEAR = { count: 1, ngon: 1, sides: 1 };
const MASK = { lines: 1, figs: 1, spokes: 1 };
const PARTS = {
  ma: x => [['name', Math.floor(x / 3)], ['wheel3', x % 3]], mb: x => [['name', Math.floor(x / 3)], ['wheel3', x % 3]], mc: x => [['name', Math.floor(x / 3)], ['wheel3', x % 3]],
  nest: x => [['name', Math.floor(x / 10)], ['name', x % 10]],
  build: x => digits4(x).map(v => ['name', v]),
};
const wrap = (x, n) => ((x % n) + n) % n;
// returns a test "does this value fit the analogy?", or null when the three cells give no simple prediction
function predict(kind, d, a, l) {
  if (kind === 'linear') return v => v === l + a - d;
  if (kind === 'mask') return v => v === (l ^ d ^ a);
  if (kind === 'ring8') { for (let k = 1; k < 8; k++) if (turn8(d, k) === a && turn8(d, k) !== d) return v => v === turn8(l, k); return v => v === (l ^ d ^ a); }
  if (kind.startsWith('wheel')) { const n = +kind.slice(5); return v => v === wrap(l + a - d, n); }
  // named values, treated as a cycle of three: same change applied to the left cell
  if (J(d) === J(a)) return v => J(v) === J(l);
  if (J(d) === J(l)) return v => J(v) === J(a);
  if (J(a) === J(l)) return v => J(v) !== J(a) && J(v) !== J(d);
  return v => J(v) === J(d);
}
function analogy(P) {
  const O = P.opts, cells = P.cells, diag = cells[1][1], above = cells[1][2], left = cells[2][1];
  const V = Object.keys(O[0]).filter(f => O.some(o => J(o[f]) !== J(O[0][f])));
  const scores = O.map(() => 0);
  for (const f of V) {
    const split = PARTS[f] || (x => [[WHEEL[f] ? 'wheel' + WHEEL[f] : LINEAR[f] ? 'linear' : MASK[f] ? 'mask' : RING8[f] ? 'ring8' : 'name', x]]);
    const D = split(diag[f]), A = split(above[f]), L = split(left[f]);
    const tests = D.map((p, i) => predict(p[0], p[1], A[i][1], L[i][1]));
    O.forEach((o, i) => { if (split(o[f]).every((p, k) => tests[k](p[1]))) scores[i]++; });
  }
  return credit(scores, P.correct);
}

// ---------- run ----------
function measure(G, level, n, seed, mode, type) {
  G.seed(seed + level);
  const sum = { rules: 0, need: 0, wneed: 0, rndneed: 0, analogy: 0 }, opt = {}, grid = {}, single = {}, singleN = {};
  for (let i = 0; i < n; i++) {
    const P = type === 'rings' ? G.genRings(level) : G.gen(level, null, mode === 'timed' ? { timed: 1 } : {});
    const d = difficulty(P);
    sum.rules += P.rules.length; sum.need += d.need; sum.wneed += d.wneed; sum.rndneed += d.rndneed; sum.analogy += analogy(P);
    const oo = optionOnly(P), ga = gridAware(P);
    for (const k in oo.out) opt[k] = (opt[k] || 0) + oo.out[k];
    for (const k in ga) grid[k] = (grid[k] || 0) + ga[k];
    for (const k in oo.single) { single[k] = (single[k] || 0) + oo.single[k]; singleN[k] = (singleN[k] || 0) + 1; }
  }
  // a one-attribute strategy guesses blind on puzzles where that attribute does not vary
  for (const k in single) opt[k] = single[k] + (n - singleN[k]) / 6;
  const best = t => Object.entries(t).sort((a, b) => b[1] - a[1])[0];
  const bo = best(opt), bg = best(grid);
  return {
    level, n, rules: sum.rules / n, need: sum.need / n, wneed: sum.wneed / n, rndneed: sum.rndneed / n, analogy: sum.analogy / n,
    option: { name: bo[0], rate: bo[1] / n }, grid: { name: bg[0], rate: bg[1] / n },
    all: { option: opt, grid },
  };
}

function run(o) {
  o = Object.assign({ n: 300, seed: 20261111, mode: 'timed', file: undefined }, o);
  const G = load(o.file);
  const rows = [];
  for (let level = o.type === 'rings' ? 8 : 1; level <= G.MAXL; level++) rows.push(measure(G, level, o.n, o.seed, o.mode, o.type));
  return rows;
}

const pct = x => Math.round(x * 100) + '%';
function markdown(rows) {
  const L = ['| Level | Rules | need | wneed | rndneed | Best option-only shortcut | Best grid-aware shortcut | Three-cell analogy |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) L.push(`| ${r.level} | ${r.rules.toFixed(2)} | ${r.need.toFixed(2)} | ${r.wneed.toFixed(2)} | ${r.rndneed.toFixed(2)} | ${pct(r.option.rate)} (${r.option.name}) | ${pct(r.grid.rate)} (${r.grid.name}) | ${pct(r.analogy)} |`);
  return L.join('\n');
}
function text(rows) {
  const L = ['level  rules  need  wneed  rndneed  analogy  option-only                                   grid-aware'];
  for (const r of rows) L.push(`${String(r.level).padStart(5)}  ${r.rules.toFixed(2).padStart(5)}  ${r.need.toFixed(2)}  ${r.wneed.toFixed(2).padStart(5)}  ${r.rndneed.toFixed(2).padStart(7)}  ${pct(r.analogy).padStart(7)}  ${(pct(r.option.rate) + ' ' + r.option.name).padEnd(44)}  ${pct(r.grid.rate)} ${r.grid.name}`);
  return L.join('\n');
}

if (require.main === module) {
  const arg = process.argv.slice(2), val = k => { const i = arg.indexOf(k); return i < 0 ? undefined : arg[i + 1]; };
  const o = {};
  if (val('--n')) o.n = +val('--n');
  if (val('--seed')) o.seed = +val('--seed');
  if (val('--mode')) o.mode = val('--mode');
  if (val('--file')) o.file = val('--file');
  if (val('--type')) o.type = val('--type');   // 'rings': ring puzzles only, levels 8 to 10
  const rows = run(o);
  if (arg.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else console.log(arg.includes('--md') ? markdown(rows) : text(rows));
  if (arg.includes('--all')) for (const r of rows) {
    console.log(`\nlevel ${r.level}`);
    for (const kind of ['option', 'grid']) Object.entries(r.all[kind]).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`  ${kind.padEnd(6)} ${pct(v / r.n).padStart(4)}  ${k}`));
  }
  if (arg.includes('--gate')) {
    const bad = rows.filter(r => r.level >= 5 && r.option.rate > GATE);
    if (bad.length) { console.error('\nFAIL: option-only shortcut above ' + pct(GATE) + ' at level ' + bad.map(r => r.level).join(', ')); process.exit(1); }
    console.log('\nOK: no option-only shortcut above ' + pct(GATE) + ' at levels 5 to 10 (chance is 17%).');
  }
}

module.exports = { run, measure, difficulty, optionOnly, gridAware, analogy, markdown };
