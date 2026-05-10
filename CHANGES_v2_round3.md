# StewartOptimizer v2 — Round 2 changes

Round 1 (Web Worker, ETA, Halton sampling, depth presets, topology toggle,
reference seeding, reduced objectives, AYVA obfuscation) is described in
`CHANGES_v2.md`. This file covers what's new in round 2.

## What's new

### 1. Pareto front scatterplot

After a run completes, a scatter chart appears between the progress panel
and the result textarea. It plots every layout on the Pareto front using
two metrics you choose from dropdowns above the chart.

- **X axis** and **Y axis** dropdowns each list all 9 sub-metrics:
  Coverage, Isotropy, Dexterity, Stiffness, Limit Margin, Load Balance,
  Torque, Speed Demand, Fatigue. Defaults: X = Coverage, Y = Isotropy.
- Each Pareto solution is one circle. Hover for a tooltip showing the
  X and Y values for that layout.
- **Click any circle** to select that layout. The result textarea updates
  to show its full JSON, and the **Download Selected Layout** /
  **Open Selected in Simulator** buttons act on it.
- The currently selected layout is highlighted yellow and drawn larger.

This is what you actually want from a multi-objective optimizer — not
"give me the best by coverage" but "show me the trade-off frontier and
let me pick where I want to be on it."

### 2. Combined repo: optimizer + simulator side by side

The simulator (formerly the standalone StewartSim project) is now
included in this repo as `simulator.html`, with its dependencies in
`js/`. Two URLs from one repo:

- `https://linc-hub.github.io/StewartOptimizerV2/` → optimizer
- `https://linc-hub.github.io/StewartOptimizerV2/simulator.html` → simulator

Two-way round-trip via URL hash:

- **Optimizer → Simulator**: select a layout in the Pareto chart, click
  **Open Selected in Simulator**. A new tab opens at
  `simulator.html#layout=<base64-JSON>`. The simulator decodes, calls
  `Stewart.init({ getLegs: ... })` with the explicit per-anchor
  coordinates from the optimizer, and renders that exact geometry —
  not a parametric approximation. Sliders are disabled while the
  imported layout is active; click "Clear and use sliders" to discard.
- **Simulator → Optimizer**: click the new **Open in Optimizer** button
  in the simulator's right panel. A new tab opens at
  `index.html#layout=<base64-JSON>` with the simulator's current
  geometry. The optimizer pastes it into the **Reference Layout**
  textarea and expands the section. From there you can run a new
  optimization seeded from that geometry.

This works because `Stewart.init()` (in `stewart.min.js`) accepts a
custom `getLegs` callback returning `{baseJoint, platformJoint,
motorRotation}` per leg, which lets us bypass the parametric
`initHexagonal()` constructor and use whatever 6-anchor geometry we
want.

## File-by-file summary (round 2)

| File | Status |
| ---- | ------ |
| `index.html` (optimizer) | Modified — Pareto chart panel, axis dropdowns, "Open Selected in Simulator" button, hash decode for incoming layouts, button rename "Download Best" → "Download Selected" |
| `simulator.html` | **New (imported from StewartSim)** — added "Open in Optimizer" button, layout-import notice, hash decode on startup, `applyImportedLayout()` that disables sliders while active, `getCurrentLayoutForExport()` to package geometry for round-trip |
| `js/p5.min.js` | **New (StewartSim dep)** |
| `js/quaternion.min.js` | **New (StewartSim dep)** |
| `js/stewart.min.js` | **New (StewartSim dep)** |
| `optimizer-worker.js` | Patched — done payload now includes `bestIndex` so the chart pre-selects the right point |

## Still deferred

- **Fusion 360 CSV export** — for note #6 in your original list. Easy
  to add now that the layout JSON is well-defined; just a CSV writer
  with named points for base anchors, horn tips, platform anchors, and
  centroid.
- **Float64Array hot-loop rewrite** — perf lever, not needed yet.
- **WebAssembly** — almost certainly skipping.

## Quick test plan

1. Hit `https://linc-hub.github.io/StewartOptimizerV2/`. Run with default
   settings. After ~30 seconds you should see the Pareto scatter
   appear above the result textarea.
2. Switch the Y-axis dropdown to "Limit Margin" or "Torque (N·m)" and
   confirm the chart redraws.
3. Click a different point in the chart. Confirm the result textarea
   updates and the selected point turns yellow.
4. Click **Open Selected in Simulator**. A new tab should open with the
   simulator showing that exact geometry. The left-panel mechanical
   sliders should be disabled and a "Layout imported from optimizer"
   notice should appear in the right panel.
5. In the simulator, click **Clear and use sliders**. The sliders
   re-enable and the platform reverts to the parametric default.
6. Move some sliders to a custom configuration, then click
   **Open in Optimizer**. A new optimizer tab should open with the
   geometry pre-populated in the Reference Layout textarea.
7. Run the optimizer with that reference seed. The first generation's
   best should be very close to the seed.
