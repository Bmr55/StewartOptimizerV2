# StewartOptimizer v2 — Round 3 changes (kinematic limits audit)

This round audits and fixes how servo limits, rod lengths, and ball joint
angles are enforced — making sure the optimizer can't propose layouts
that exceed real-world hardware limits, and the simulator correctly
flags poses that would be physically impossible.

## ⚠ Ball joint angle convention

The "Ball Joint Half-Angle" input on both pages is the **cone half-angle**
— the maximum the rod is allowed to deflect from the joint's neutral
direction. It is *not* the total swivel range. To convert from common
manufacturer specs:

| Manufacturer says…                            | What to enter |
| --------------------------------------------- | ------------- |
| "Swivel range 65° limit-to-limit"             | **32.5**      |
| "±25° misalignment"                           | **25**        |
| "Articulation 50° total"                      | **25**        |
| "Cone half-angle 35°" / "Misalignment 35°"    | **35**        |

Reference points: cheap plastic rod ends typically allow 25°–30°,
standard metal rod ends 30°–35°, McMaster "high misalignment" / uniball
parts 32°–45°, premium spherical bearings up to 50°+. When in doubt,
enter the smaller of the two interpretations and tighten from there.

Internally, both the optimizer (`workspace.js → evaluatePose`) and
simulator (`simulator.html → isPoseValid`) compute `acos(rodDir · neutral)`
which yields the deflection from neutral, then compare against the
input value (converted to radians). At home pose this comes out to 0
by construction.

## What was wrong before

### Optimizer (workspace.js)
- ✅ Servo angle range: correctly enforced.
- ✅ Rod length: implicit via the IK closed-form `|ratio| ≤ 1` test, plus
  an explicit 0.5 mm tolerance check after solving.
- ❌ **Ball joint angle: measured incorrectly.** Old code computed the
  angle between the horn vector and the rod vector. For a typical
  Stewart geometry — horns roughly horizontal, rods roughly vertical —
  this angle is ≈ 70°–90° at the *home pose*. With a 45° limit, every
  pose registered as a violation, and `limitMargin` ended up near zero
  for most layouts. The optimizer couldn't actually distinguish "ball
  joints fine" from "ball joints binding."

### Simulator (simulator.html / stewart.min.js)
- ✅ Servo angle range: `getServoAngles()` returns null for any leg out
  of range.
- ✅ Horn stretch: explicit check that hornTip is exactly `hornLength`
  away from the base.
- ⚠️ Rod length: only implicitly checked via `|ratio| ≤ 1` inside
  `getServoAngles`. No explicit tolerance check.
- ❌ **Ball joint angles: not checked at all.** A pose that physically
  required joints to fold past 90° would still report "IK: OK".

## What changed

### Proper ball joint kinematics

The physical model: each ball joint has a cone half-angle (typically 30°–55°)
measured from the joint's *neutral direction*. Neutral = the direction
the rod points at home pose, in the joint body's local frame. A ball
joint binds when the rod deflects more than the cone half-angle from
neutral.

Each leg has TWO ball joints — one at the horn tip (lower), one at the
platform anchor (upper). Their bodies move with their host:
- Lower joint body rotates with the horn around the servo shaft. So
  its neutral rotates the same way: `lower_neutral = R(shaft_axis, Δα) · home_rod_dir`,
  where `Δα = α_current − α_home`.
- Upper joint body rotates with the platform. So its neutral rotates by
  the platform's current rotation: `upper_neutral = R_platform · home_rod_dir`.

Per-leg ball joint angle = max of the two deflections. Enforced against
the configurable limit.

### Optimizer

- `Optimizer.evaluateLayout()` now evaluates the home pose **first**,
  captures `homeRodDirections` and `homeServoAngles` per leg, and stamps
  them on the layout object. The workspace evaluator then uses these as
  references for all subsequent pose evaluations.
- `workspace.evaluatePose()` computes per-leg `lowerBallAngle` and
  `upperBallAngle` and reports the larger as the ball joint deflection.
  At home pose, both angles are 0 by construction.
- Falls back to the old "horn vs rod" heuristic only when home reference
  data isn't available (which currently can only happen if the layout
  is unreachable at home — those score poorly anyway).
- `layoutToJSON()` now includes `ball_joint_max_deg` so it round-trips
  to the simulator.

### Simulator

- New **Ball Joint Limit (°)** input in the Safety panel. Defaults to 45°.
  Drives the new ball joint check.
- New **Rod Length Tol. (mm)** input in the Safety panel. Defaults to
  0.5 mm. Drives an explicit rod-length tolerance check that catches
  numerical drift the closed-form IK might tolerate.
- `rebuildPlatform()` now calls `captureHomeRodReference()` after every
  rebuild. This snapshots the home rod directions and servo angles
  whenever geometry changes (sliders, imported layout, reset).
- `isPoseValid()` extended to four checks instead of two:
  1. Servo angle range / IK feasibility (was already checked).
  2. Horn stretch (was already checked, now reports which leg).
  3. **Rod length tolerance** (NEW — explicit check using the configurable tolerance).
  4. **Ball joint deflection** (NEW — both upper and lower per leg).
- `setIKStatus()` now also reports max ball joint angle on success
  (e.g. "IK: OK (max ball joint 23°)") so you can see how close you are
  to the limit while moving sliders. Failure messages are more specific
  ("ball joint at leg 4: 47°" instead of just "blocked").
- When a layout is imported via `#layout=...`, the simulator picks up
  `ball_joint_max_deg` and `servo_range` from the layout and updates
  its inputs accordingly.
- When exporting back to the optimizer, the simulator includes its
  current ball joint limit so the optimizer can use it.

### Cross-side round-trip

- Optimizer → Simulator: layout JSON now carries `ball_joint_max_deg`.
  The simulator picks it up and configures its safety inputs.
- Simulator → Optimizer: layout export now carries the simulator's
  current `ball_joint_max_deg`. The optimizer sets its safety field
  before you run the next optimization.

## Files changed (this round)

| File | What changed |
| ---- | ------------ |
| `math.js` | Added `rotateAroundAxis(v, axis, angle)` (Rodrigues) |
| `workspace.js` | Imports `rotateAroundAxis`. Replaces broken ball joint check with proper two-joint deflection from `layout.homeRodDirections` and `layout.homeServoAngles`. Falls back to the old heuristic if those aren't set |
| `optimizer.js` | `evaluateLayout()` evaluates home pose first and stamps `homeRodDirections` + `homeServoAngles` onto the layout. `finalizeLayout()` stamps `_ballJointLimitDeg`. `layoutToJSON()` exports `ball_joint_max_deg` |
| `simulator.html` | Added Ball Joint Limit + Rod Length Tol inputs in Safety panel. Added `captureHomeRodReference()` (called by `rebuildPlatform`). Added `computeBallJointAnglesAtCurrent()`. Extended `isPoseValid()` and `setIKStatus()`. `applyImportedLayout()` syncs limit + servo range from imported JSON. `getCurrentLayoutForExport()` includes the limit |
| `index.html` (optimizer) | `consumeIncomingLayoutHash()` syncs `ballJointLimitInput` from incoming layout |

## How to verify

1. Open the simulator. The IK status should now say something like
   "IK: OK (max ball joint 0°)" at home pose. Move the X+ translation
   slider all the way; the angle should grow into the teens or twenties.
   Push hard rotations and you should see it climb toward the limit.
2. Drop the **Ball Joint Limit** to 10°. The status should change to
   "IK: Blocked — ball joint at leg N: XX°" and most rotation/translation
   slider moves should be blocked while "Enforce Valid Kinematics" is on.
3. Run the optimizer. The Pareto front should now have layouts with
   *meaningfully different* `limitMargin` values (not all near zero).
   Layouts with high `limitMargin` should be ones where typical workspace
   poses don't push ball joints near their limit.
4. Open the simulator from a Pareto layout. The simulator's ball joint
   limit input should auto-populate to whatever the optimizer used. The
   IK status should report the actual max ball angle reached as you move.
5. Optimizer → simulator → adjust geometry slightly → "Open in Optimizer"
   → confirm the optimizer's safety field reflects the simulator's limit.
