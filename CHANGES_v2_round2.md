# StewartOptimizer v2 — Changes from the original

This is round 1 of the planned rebuild. Round 2 (Pareto scatterplot UI,
StewartSim round-trip export, Fusion 360 CSV export) is **not** included
yet — those will come once we've confirmed this round runs cleanly on
your machine.

## What was broken in the original

1. **Computational infeasibility.** The default workspace sweep was a 6D
   Cartesian product with step = span/10, which produces 11⁶ ≈ 1.77 million
   poses *per layout*. Multiplied by 40 population × (25+1) generations =
   1040 layouts, that's ≈ 1.84 *billion* pose evaluations on the main
   thread, with no Web Worker, no progress reporting, and no way to stop.
   The page simply appeared frozen for tens of minutes to hours.

2. **AYVA-style topology was unreachable.** The GA initialization
   hard-coded a hexagonal anchor pattern (`i * π / 3`), and offspring
   came from random hex layouts plus mutation. There was no way for the
   GA to discover the rectangular SR6-style geometry from any practical
   number of mutations.

3. **9 objectives degraded NSGA-II.** Pareto dominance becomes
   near-vacuous above ~4 objectives — almost every solution is
   non-dominated, so selection pressure collapses and the GA wanders.

4. **`OPTIMIZER_REPRODUCTION.md` was stale.** It claimed several modules
   were stubbed; in fact most of them were complete. It was a "next-Codex
   prompt" never updated after the skeleton phase.

## What changed

### Performance & UX

- **Web Worker.** All optimization runs in `optimizer-worker.js`. The
  main thread stays responsive; the page no longer appears to hang.
- **Live progress + ETA.** New progress panel shows: `Started at` (clock
  time), `ETA Finish` (clock time + remaining duration), generation
  counter, evaluation counter (`287 / 1040 (28%)`), Pareto front size,
  and a snapshot of the best-so-far metrics. The bar updates as each
  candidate finishes.
- **Stop button.** Sends a stop message to the worker; the worker
  finishes the current evaluation, returns the best result so far, and
  shuts down cleanly.
- **Halton-sequence sampling.** The workspace sweep can now use
  deterministic low-discrepancy quasi-random sampling instead of an
  exhaustive grid. With 1024 samples in 6D you get coverage estimates
  with ≈ 1.5% standard error, ≈ 1700× fewer pose evaluations than the
  old grid.
- **Calculation Depth presets.** New dropdown:
    - **Quick** (256 Halton samples) — interactive iteration.
    - **Standard** (1024 samples) — default; few seconds per layout.
    - **Thorough** (4096 samples) — tighter variance.
    - **Exhaustive** — full Cartesian grid (the old behavior). Slow.

### Search space

- **Topology dropdown.** New "Base Topology" selector:
    - `circular` — hexagonal anchor pattern (the original behavior).
    - `rectangular` — 3-row, 2-column paired anchors. Includes an
      alternating Z-stagger on the BASE side, sampled from
      `rectZJitterBounds`. With Z-jitter = 0 you get the SR6/AYVA-style
      planar layout (5-DOF, redundantly actuated). With Z-jitter > 0
      the planar singularity breaks and you get a true 6-DOF rectangular
      Stewart. The optimizer naturally evolves toward whichever the
      objectives reward.
    - `free` — all six anchors placed independently in a bounding box.
      Most expressive, slowest to converge.
- **Reference Layout seeding.** Optional textarea where you can paste
  a layout JSON (in the export schema) — the GA seeds population[0]
  with that layout verbatim and fills the rest with mutations of it.
  Overrides the topology selector.
- **Compact 4-objective set as default.** `coverage`, `isotropy`,
  `limitMargin`, `−torque`. Toggle to "Full (9 objectives)" via the
  dropdown if you want the original behavior. All 9 sub-metrics are
  always computed and reported in the export — only the ranking vector
  is reduced.

### Obfuscation

- `AYVA_Optimized_Layout.json` → `Linear_Paired_Layout.json`.
- All "AYVA" references stripped from `README.md`,
  `Stewart_Optimizer_Quick_Start.md`,
  `Stewart_Optimizer_Comprehensive_Guide.md`. Replaced with
  "Linear-Paired" / "rectangular" terminology that is generic.
- `grep -ri "ayva" .` returns nothing.

### Cleanup

- Deleted `OPTIMIZER_REPRODUCTION.md` (stale and misleading).
- Deleted `Raw Information/Stuff from Old Project/` (p5/quaternion/stewart
  libraries from the StewartSim repo, never used).

## File-by-file summary

| File | Status |
| ---- | ------ |
| `index.html` | Rewritten — new controls, progress panel, worker plumbing |
| `optimizer.js` | Rewritten — topology branch, reference seeding, reduced objectives, progress callbacks, stop support |
| `optimizer-worker.js` | **New** — Web Worker entry point |
| `workspace.js` | Rewritten — Halton/random/grid sampling strategies |
| `math.js` | Patched — added `haltonValue`, `haltonSample6D`, `uniformSample6D` |
| `requirements.js` | Unchanged |
| `Additional_Repo_Stuff/examples/Linear_Paired_Layout.json` | Renamed from AYVA file |
| `Additional_Repo_Stuff/README.md` | Patched — AYVA refs removed |
| `Additional_Repo_Stuff/docs/Stewart_Optimizer_Quick_Start.md` | Patched |
| `Additional_Repo_Stuff/docs/Stewart_Optimizer_Comprehensive_Guide.md` | Patched |
| `OPTIMIZER_REPRODUCTION.md` | **Deleted** |
| `Raw Information/Stuff from Old Project/` | **Deleted** |

## How to deploy

It's drop-in compatible with the existing GitHub Pages deployment.
Replace the contents of the repo with these files and push.

⚠ One requirement: **module workers** (`new Worker(url, { type: 'module' })`).
Supported in Chrome/Edge since 80 (early 2020), Firefox since 114 (mid 2023),
and Safari since 16.4 (early 2023). All modern browsers should be fine; if
someone's browser is too old, the page will show "Worker error" in the
status panel rather than failing silently.

## Known limitations / round 2 work

These are intentionally not in this round:

- **Pareto scatterplot UI.** Currently the result panel still shows the
  single layout with the highest coverage. The full Pareto front is sent
  to the UI from the worker, but rendering it as an interactive 2D
  scatter (so you can pick a different trade-off) is round 2.
- **Round-trip export to StewartSim.** The exported JSON is *almost* in
  StewartSim's import format but is wrapped in a metrics envelope.
  Round 2 will add a separate "Export for StewartSim" button that
  strips the envelope, plus an "Open in Optimizer" button on the
  StewartSim side.
- **Fusion 360 CSV export.** Deferred to round 2.
- **Float64Array hot-loop rewrite.** Probably not needed once Halton
  sampling is in — Standard depth runs in a few seconds per layout
  even on the unoptimized JS — but it's the next perf lever if Thorough
  / Exhaustive feel too slow.
- **WebAssembly.** Skipping unless the above proves insufficient.

## Quick test plan

1. Open `index.html` (serve via any HTTP server — module workers don't
   work over `file://`). On Pages it will Just Work.
2. Sample requirements should auto-load. Click **Run Optimization**.
3. Confirm: progress panel shows "Started at … / ETA …", evaluation
   counter advances, progress bar fills.
4. Click **Stop** mid-run. Confirm it returns a best-so-far layout
   within a couple of seconds.
5. Set **Calculation Depth → Quick**, **Topology → Rectangular**, and
   re-run. Should finish in well under a minute.
6. Paste an existing layout into **Reference Layout**, run with
   **Topology → Free**. Confirm the first generation's best is close
   to the reference (the seed is the reference verbatim).
