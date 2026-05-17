# StewartOptimizerV2 Architecture Design Explanation (Codex - GPT 5.5 - High - 5/17/2026)

## Important Caveat

I inspected the repo directly, and the intended architecture is visible, but the checked-in file layout appears scrambled. Several filenames do not match their contents, which likely prevents the app from running as-is:

- `requirements.js` is actually the Web Worker entry file.
- `Sample_Requirements.json` is actually the requirements parser module.
- `optimizer-worker.js` is actually the optimizer/domain algorithm module.
- `optimizer.js` is actually the math utility module.
- `workspace.js` is actually the simulator HTML page.
- `simulator.html` is actually sample requirements JSON.

That naming mismatch is the most important architectural finding.

## 1. Application Purpose

This is a browser-based Stewart platform design tool. It appears to serve builders, mechanical designers, robotics hobbyists, or engineers who need to design a six-leg Stewart platform that satisfies payload, workspace, rotation, servo, rod, horn, and ball-joint constraints.

The main problem it solves is: given motion and mechanical requirements, generate candidate platform geometries, evaluate their reachable workspace and mechanical quality, expose Pareto-optimal options, then let the user export or simulate the selected layout.

## 2. High-Level Architecture

The intended architecture is a static client-side application with no backend server.

Major pieces:

- Optimizer UI: `index.html` contains the main optimizer page, inline styles, form controls, progress UI, Pareto chart rendering, export logic, and Worker orchestration.
- Requirements parser: intended to live in `requirements.js`, but currently lives in `Sample_Requirements.json`. It normalizes nested or flat requirements JSON into a common structure.
- Worker boundary: intended Worker entry is currently in `requirements.js`. It receives `start` and `stop` messages, instantiates the optimizer, posts `started`, `progress`, `done`, and `error`.
- Optimizer/domain engine: currently in `optimizer-worker.js`. It implements layout generation, mutation, crossover, evaluation, NSGA-II selection, and Pareto ranking.
- Math utilities: currently in `optimizer.js`. It contains vector math, Euler rotation, singular values, Halton sampling, statistics, and helpers.
- Simulator: actual simulator page is `workspace.js`. It uses p5, Quaternion, and Stewart.js-style APIs for 3D visualization, IK validation, animation, serial streaming, and layout round-tripping.
- Data layer: there is no database. Data is local JSON: requirements, layouts, generated metrics, and URL-hash encoded layout payloads.
- Routing: separate static pages are used, primarily `index.html` and intended `simulator.html`, with `#layout=<base64-json>` for passing layouts between optimizer and simulator.
- Deployment: there is no package manifest, build step, or bundler. It appears intended for direct static hosting, likely GitHub Pages given `.nojekyll`.

## 3. Design Approach

The intended design is a browser-only, service-oriented frontend:

- The UI is imperative DOM code, not framework-based component architecture.
- CPU-heavy optimization is separated into a Web Worker.
- Domain logic is partially separated into modules for math, requirements parsing, and optimization.
- The optimizer uses a genetic multi-objective approach, specifically NSGA-II-style Pareto ranking and crowding distance.
- State management is mostly closure/global state inside page scripts: `worker`, `lastBestSerialized`, `lastParetoSerialized`, `selectedParetoIdx`, simulator `position`, `rotation`, `platform`, `animator`, and related state.
- The simulator is highly coupled: rendering, IK checks, DOM controls, animation, serial I/O, and hash import/export live in one large script.

Architecturally, it is halfway between "static monolith" and "modular browser app." The module boundaries are sensible in concept, but the current file layout breaks those boundaries.

## 4. Implementation Explanation

Key implementation pieces:

- `index.html` defines the optimizer UI: requirements input, topology selection, optimization depth, objective set, workspace ranges, safety constraints, servo specs, progress, Pareto chart, and exports.
- `index.html` starts optimization by parsing requirements, reading UI controls, selecting sample strategy, creating a Worker, and posting the optimization payload.
- `index.html` defines metric metadata used by the Pareto chart.
- `index.html` encodes/decodes layout JSON in URL hashes for optimizer/simulator round-trip.
- `index.html` builds Fusion 360 CSV/Python export artifacts.
- `Sample_Requirements.json` contains `parseRequirements()`, which accepts nested `{ payload, workspace, rotations, constraints }` or flat requirement objects.
- `optimizer-worker.js` creates circular, rectangular, or free layouts.
- `optimizer-worker.js` evaluates each layout using a home pose, workspace coverage, singular values, torque, speed demand, load balance, isotropy, limit margin, and fatigue.
- `optimizer-worker.js` implements Pareto dominance, non-dominated sorting, crowding distance, tournament selection, crossover, and mutation.
- `workspace.js` validates simulator poses against IK, servo range, horn/rod geometry, and ball-joint constraints.
- `workspace.js` creates the p5 sketch and draw loop.
- `workspace.js` rebuilds the Stewart platform from either parametric controls or an imported optimizer layout.
- `workspace.js` integrates Web Serial for streaming servo angles.

## 5. General Application Flow

Intended optimizer flow:

1. Browser loads `index.html`.
2. The page imports requirement parsing and loads sample requirements.
3. User edits requirements and optimization settings.
4. User clicks Run.
5. UI parses requirements and workspace ranges.
6. UI creates `new Worker('./optimizer-worker.js', { type: 'module' })`.
7. Worker creates an `Optimizer`, initializes a population, evaluates layouts, evolves generations, and posts progress.
8. UI updates progress, ETA, best-so-far, and Pareto chart.
9. User selects a Pareto point.
10. User downloads JSON, opens selected layout in the simulator, or exports Fusion 360 files.

Intended simulator flow:

1. Browser loads simulator page.
2. p5, Quaternion, and Stewart platform libraries load.
3. Simulator builds a default platform or decodes `#layout=...`.
4. Draw loop applies user/animation pose, validates IK, clamps unsafe movement, renders platform, updates servo angles.
5. Optional serial connection streams current servo angles.
6. User can send the current simulator layout back to optimizer via URL hash.

Actual current flow likely fails early because imports and static asset paths are inconsistent.

## 6. Design And Implementation Review

Strengths:

- Good product shape: requirements in, optimized layouts out, simulation and CAD export included.
- Web Worker separation is the right choice for CPU-heavy optimization.
- Pareto front UX is useful because this is a multi-objective mechanical tradeoff problem.
- Requirements normalization supports both nested and flat schemas.
- URL-hash layout round-trip is simple and backend-free.
- The optimizer captures multiple relevant metrics, not only reachability.

Concerns:

- The current file layout/import graph is broken. This is the top issue.
- `index.html` and `workspace.js` are very large monoliths, making changes risky.
- Domain logic is coupled to simulator/UI concerns. The optimizer imports `computeWorkspace` and `evaluatePose` from `workspace.js`, but that file is HTML, not a clean module.
- There is duplicated math and IK-related logic between optimizer and simulator.
- No tests, package manifest, linting, bundling, or import smoke checks are present.
- Static dependency paths are wrong: simulator references `js/p5.min.js`, `js/quaternion.min.js`, and `js/stewart.min.js`, but there is no `js` directory.
- Several files have misleading extensions: JSON files contain JS or HTML, and HTML files contain JSON.
- Exhaustive workspace grids can explode combinatorially.
- NSGA-II sorting is O(n^2), acceptable for small populations but a scaling risk.
- Error handling exists at the UI level, but module-load failures, invalid fixture paths, and missing assets will fail before most app-level handlers can help.

## 7. Recommendations

Highest impact:

1. Repair the file layout and imports.
   Put the parser in `requirements.js`, math in `math.js`, optimizer class in `optimizer.js`, Worker entry in `optimizer-worker.js`, simulator HTML in `simulator.html`, and valid sample JSON in `Sample_Requirements.json`.

2. Extract pure kinematics/workspace code.
   Create a real module such as `workspace-core.js` exporting `evaluatePose()` and `computeWorkspace()`. Both optimizer and simulator should use it.

3. Add a minimal build/test harness.
   Add `package.json`, a static dev server, ESLint, and a smoke test that imports every module and opens both pages.

4. Add focused unit tests.
   Cover requirements parsing, range derivation, layout serialization, hash round-trip, IK pose evaluation, ball-joint limits, and optimizer ranking.

Medium impact:

5. Split page scripts into modules.
   For `index.html`: worker client, requirements UI, Pareto chart, export/Fusion, hash routing.
   For simulator: controls, platform model, IK safety, rendering, animation, serial.

6. Fix dependency management.
   Either place assets under the referenced `js/` directory or manage p5/quaternion/Stewart dependencies through a bundler.

7. Add schema validation.
   A JSON Schema or Zod-style validator would make requirements and layout errors much clearer.

8. Improve optimization scalability.
   Chunk evaluation work, support resumable progress, consider multiple Workers, and guard exhaustive mode with estimated evaluation counts.

The core idea is strong. The immediate problem is not the algorithmic concept, it is repo hygiene and module boundaries. Once the file/import structure is corrected, the application can evolve into a maintainable static engineering tool.

## Prompt Used To Generate This Analysis (Codex - GPT 5.5 - High - 5/17/2026)

```text
Analyze this application thoroughly and produce a high-level architectural design explanation.

Your response should cover:

1. Application Purpose
Explain what the application does, who it appears to serve, and the main problem it solves.

2. High-Level Architecture
Describe the major architectural components of the application, including frontend, backend, data layer, services, configuration, routing, state management, APIs, integrations, and any build/deployment structure you find.

3. Design Approach
Explain the architectural approach used in the application. Identify patterns such as layered architecture, component-based design, service-oriented structure, MVC/MVVM, repository patterns, domain separation, or other relevant design choices.

4. Implementation Explanation
Walk through how the application is implemented at a practical level. Describe the key files, modules, classes, components, services, data models, and important dependencies. Explain how these pieces work together.

5. General Application Flow
Describe the normal runtime flow of the application from startup through user interaction or request handling. Include how data moves through the system, how user actions are processed, and how results are rendered or returned.

6. Design and Implementation Review
After explaining the system, perform a follow-up review of the design and implementation. Identify:

- Strengths of the current architecture
- Areas of unnecessary complexity
- Coupling or cohesion issues
- Maintainability concerns
- Scalability risks
- Testing gaps
- Error-handling or reliability concerns
- Opportunities for simplification or refactoring

7. Recommendations
Provide practical recommendations for improving the architecture and implementation. Prioritize recommendations by impact and effort.

Please inspect the codebase directly rather than guessing. Reference specific files and code paths where useful. Keep the explanation high-level enough for technical stakeholders, but concrete enough that an engineer could understand how the system is structured and how it works.
```
