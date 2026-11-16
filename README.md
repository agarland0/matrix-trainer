# Matrix Trainer

A free practice tool for 3×3 matrix reasoning puzzles. Not an IQ test, not a diagnostic, and not prep for any specific test. It gives no scores beyond your own results on its puzzles.

**Play it:** https://matrix-trainer-app.github.io/matrix-trainer/

- **Learn:** the rule types, with worked examples.
- **Practice:** untimed puzzles at levels 1 to 10, rules shown after each answer.
- **Timed:** 20 adaptive puzzles, 2 minutes each.
- **Weak:** misses counted by the rule you actually got wrong.

All puzzles are generated. From level 5 up, the wrong answers are balanced so that guessing from the options alone, without the grid, stays near chance (about 1 in 6).

## Measured, not claimed

`tools/checker.js` generates 300 timed-mode puzzles per level with a fixed seed and tries to beat them without solving them. It runs on every push.

| Level | Rules | need | wneed | rndneed | Best option-only shortcut | Best grid-aware shortcut | Three-cell analogy |
|---|---|---|---|---|---|---|---|
| 1 | 1.00 | 1.00 | 1.00 | 1.00 | 23% (least ink) | 81% (most like the cells left and above) | 100% |
| 2 | 2.00 | 1.93 | 1.93 | 1.95 | 26% (most one-detail-off neighbours) | 61% (most like the cells left and above) | 100% |
| 3 | 2.00 | 1.97 | 3.67 | 1.98 | 30% (most one-detail-off neighbours) | 37% (fewest values that appear in no grid cell) | 74% |
| 4 | 2.74 | 2.03 | 3.51 | 2.28 | 30% (most ink) | 75% (most values seen rarely in the grid) | 84% |
| 5 | 3.12 | 2.36 | 5.32 | 2.77 | 19% (most one-detail-off neighbours) | 40% (most values seen rarely in the grid) | 81% |
| 6 | 3.69 | 2.33 | 5.67 | 3.18 | 18% (most typical) | 40% (values new to its row) | 83% |
| 7 | 3.66 | 2.39 | 6.31 | 3.23 | 21% (most typical) | 51% (most values seen rarely in the grid) | 83% |
| 8 | 4.48 | 2.35 | 5.80 | 3.75 | 19% (most typical) | 62% (most values seen rarely in the grid) | 85% |
| 9 | 4.11 | 2.38 | 6.56 | 3.50 | 19% (most one-detail-off neighbours) | 45% (most values seen rarely in the grid) | 84% |
| 10 | 4.16 | 2.42 | 6.84 | 3.58 | 21% (most one-detail-off neighbours) | 40% (most values seen rarely in the grid) | 84% |

These numbers are the baseline (v1.0, November 2026). Later changes to the puzzles are compared against this table, and the three-cell analogy solver is frozen so its column stays comparable.

How to read it:

- **need** is the headline difficulty: the smallest number of rules you must work out before only the answer is left among the six options. **wneed** weights each rule by its tier (easy 1, medium 2, hard 3). **rndneed** is the count if you apply rules in random order; it flatters, so it is only shown next to need.
- **Option-only shortcuts** look at the six options and nothing else: most typical, odd one out, most or least ink, most near-duplicates, the commonest or rarest value of one attribute, and so on. Chance is 1 in 6 (17%). From level 5 up the best of them stays near chance. Levels 1 to 4 use simpler options and do leak (up to 30%).
- **Grid-aware shortcuts** also look at the grid without working out a rule. These are not at chance. The strongest picks the option whose values show up least in the grid. It works only through attributes that take three values, each in three of the nine cells: the answer's value is then the one seen twice. Made blind to those attributes, the same strategy falls to 17%. So it is a way of solving "one of each" rules by counting, not a flaw in the options, but it does mean such a rule can be solved without understanding it.
- **Three-cell analogy** uses only the three cells around the blank. It is real solving, not a trick, but a high rate means a puzzle can be done without reading the whole grid. It solves about 84% of level 9 and 10 puzzles today.

Limits, stated plainly: with six options, about 2 to 3 rules can be forced, however many rules a puzzle has. The need column tops out near 2.4. Nobody has been measured on these puzzles, so the levels map to no outside score.

Run it yourself (Node 22 or newer, no install):

```
node tools/checker.js            # the table above
node tools/checker.js --all      # every shortcut tried, per level
node --test tools/*.test.js      # fails if puzzles change unexpectedly or the analogy solver drifts
```

## Run it locally

Download the repo and open `index.html` in a browser. No install or build step.

## Privacy

Your results stay in your browser. The page counts visits with [GoatCounter](https://www.goatcounter.com/), which sets no cookies and collects no personal data.

## License

MIT. See [LICENSE](LICENSE).
