import { computeWorkspace, evaluatePose } from './workspace.js';
import {
  clamp,
  singularValues,
  randomNormal,
  degToRad,
  radToDeg,
  average,
} from './math.js';

const EPS = 1e-9;

const DEFAULT_DESIGN_SPACE = {
  baseRadius: [90, 160],
  platformRadius: [40, 120],
  platformHeight: [100, 180],
  hornLengthBounds: [30, 120],
  rodLengthBounds: [160, 420],
  betaJitterRad: degToRad(20),
  anchorJitter: 6,
  platformJitter: 6,
  baseZJitter: 2,
  mutationHorn: 4,
  mutationRod: 6,
  mutationAngle: degToRad(4),
  // Rectangular topology controls
  rectXBounds: [40, 90],     // half-width of rectangle along X
  rectYBounds: [25, 80],     // half-height of rectangle along Y
  rectZJitterBounds: [0, 15], // alternating z-stagger to break planar singularity
};

function randomInRange([min, max]) {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function wrapAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function cloneLayout(layout) {
  return JSON.parse(JSON.stringify(layout));
}

function layoutToJSON(layout, metrics = {}) {
  return {
    base_anchors: layout.baseAnchors.map((a) => a.slice()),
    platform_anchors: layout.platformAnchors.map((a) => a.slice()),
    beta_angles: layout.betaAngles.slice(),
    horn_length: layout.hornLength,
    rod_length: layout.rodLength,
    servo_range: layout.servoRangeRad.map((rad) => radToDeg(rad)),
    home_height: layout.homeHeight,
    topology: layout.topology || 'circular',
    ball_joint_max_deg: Number.isFinite(layout._ballJointLimitDeg)
      ? layout._ballJointLimitDeg
      : null,
    metadata: {
      coverage: metrics.coverage ?? null,
      dexterity: metrics.dexterity ?? null,
      stiffness: metrics.stiffness ?? null,
      torque: metrics.torque ?? null,
      speed_demand: metrics.speedDemand ?? null,
      load_balance: metrics.loadBalance ?? null,
      isotropy: metrics.isotropy ?? null,
      limit_margin: metrics.limitMargin ?? null,
      fatigue: metrics.fatigue ?? null,
    },
    workspace_stats: metrics.workspace?.stats ?? null,
  };
}

function normalizedObjectives(objectives) {
  return objectives.map((value) => (Number.isFinite(value) ? value : -Infinity));
}

// The compact 4-objective set is the default. NSGA-II degenerates above ~4
// objectives because Pareto dominance becomes near-vacuous in high dimensions
// (almost every solution is non-dominated, so selection pressure collapses).
// All 9 sub-metrics are still computed and reported for analysis; only the
// objective vector used for ranking is reduced.
const COMPACT_OBJECTIVE_KEYS = ['coverage', 'isotropy', 'limitMargin', 'negTorque'];
const FULL_OBJECTIVE_KEYS = [
  'coverage', 'dexterity', 'stiffnessScore', 'loadBalance',
  'isotropy', 'limitMargin', 'negTorque', 'negSpeedDemand', 'negFatigue',
];

function buildObjectiveVector(metrics, keys) {
  const lookup = {
    coverage: metrics.coverage,
    dexterity: metrics.dexterity,
    stiffnessScore: metrics.stiffnessScore,
    loadBalance: metrics.loadBalance,
    isotropy: metrics.isotropy,
    limitMargin: metrics.limitMargin,
    negTorque: -metrics.torque,
    negSpeedDemand: -metrics.speedDemand,
    negFatigue: -metrics.fatigue,
  };
  return keys.map((k) => lookup[k]);
}

export class Optimizer {
  constructor(requirements = {}, {
    populationSize = 40,
    generations = 25,
    ranges = {},
    mutationRate = 0.35,
    designSpace = {},
    ballJointLimitDeg = 52,
    ballJointClamp = true,
    topology = 'circular',                  // 'circular' | 'rectangular' | 'free'
    referenceLayout = null,                 // optional layout JSON to seed the population
    sampleStrategy = 'halton',              // 'halton' | 'random' | 'grid'
    sampleCount = 1024,
    objectiveSet = 'compact',               // 'compact' (4 obj) | 'full' (9 obj)
    progressCallback = null,                // ({evalsDone, totalEvals, generation, ...}) => void
    stopFlag = null,                        // { stopped: boolean } — set stopped=true to abort
    servoMaxTorqueNm = null,                // optional: enables torqueMargin metric
    servoMaxSpeedRadPerS = null,            // optional: enables speedMargin metric
  } = {}) {
    this.requirements = requirements;
    this.populationSize = Math.max(4, populationSize);
    this.generations = Math.max(1, generations);
    this.ranges = ranges;
    this.mutationRate = clamp(mutationRate, 0, 1);
    this.ballJointLimitDeg = requirements.ball_joint_max_deg ?? ballJointLimitDeg;
    this.ballJointClamp = ballJointClamp;
    this.payload = requirements.mass_kg ?? 0;
    this.stroke = requirements.cycle_mm ?? 0;
    this.frequency = requirements.frequency_hz ?? 0;
    this.cycleAxis = requirements.cycle_axis ?? 'z';
    this.topology = topology;
    this.referenceLayout = referenceLayout;
    this.sampleStrategy = sampleStrategy;
    this.sampleCount = Math.max(8, Math.floor(sampleCount));
    this.objectiveSet = objectiveSet;
    this.objectiveKeys = objectiveSet === 'full' ? FULL_OBJECTIVE_KEYS : COMPACT_OBJECTIVE_KEYS;
    this.progressCallback = progressCallback;
    this.stopFlag = stopFlag || { stopped: false };

    // Optional servo capability specs. When provided, the optimizer reports
    // torque margin / speed margin instead of just demand. When null, the
    // demand metric tells the user the *minimum* servo spec the layout
    // requires (the "tell me what I need" mode).
    const reqTorque = requirements.servo_max_torque_nm;
    const reqSpeedDeg = requirements.servo_max_speed_deg_per_sec;
    this.servoMaxTorqueNm = (Number.isFinite(servoMaxTorqueNm) && servoMaxTorqueNm > 0)
      ? servoMaxTorqueNm
      : (Number.isFinite(reqTorque) && reqTorque > 0 ? reqTorque : null);
    this.servoMaxSpeedRadPerS = (Number.isFinite(servoMaxSpeedRadPerS) && servoMaxSpeedRadPerS > 0)
      ? servoMaxSpeedRadPerS
      : (Number.isFinite(reqSpeedDeg) && reqSpeedDeg > 0 ? degToRad(reqSpeedDeg) : null);

    const hornBounds = requirements.horn_length_bounds_mm || DEFAULT_DESIGN_SPACE.hornLengthBounds;
    const rodBounds = requirements.rod_length_bounds_mm || DEFAULT_DESIGN_SPACE.rodLengthBounds;
    this.servoRangeDeg = requirements.servo_travel_bounds_deg || [-120, 120];

    this.designSpace = {
      ...DEFAULT_DESIGN_SPACE,
      ...designSpace,
      hornLengthBounds: hornBounds,
      rodLengthBounds: rodBounds,
    };

    this.servoRangeRad = this.servoRangeDeg.map((deg) => degToRad(deg));

    this.population = [];
    this.fitness = [];
    this.pareto = [];
    this.generation = 0;
    this.running = false;
    this.nextLayoutId = 1;
    this.evalsDone = 0;
    this.totalEvalsExpected = this.populationSize * (this.generations + 1);
    this.startTime = null;
    this.bestSnapshot = null;
  }

  // --- Layout generation ---------------------------------------------------

  createRandomLayout() {
    if (this.topology === 'rectangular') return this.createRectangularLayout();
    if (this.topology === 'free') return this.createFreeLayout();
    return this.createCircularLayout();
  }

  createCircularLayout() {
    const layout = {
      id: this.nextLayoutId++,
      topology: 'circular',
      baseAnchors: [],
      platformAnchors: [],
      betaAngles: [],
      hornLength: randomInRange(this.designSpace.hornLengthBounds),
      rodLength: randomInRange(this.designSpace.rodLengthBounds),
      servoRangeRad: this.servoRangeRad.slice(),
      homeHeight: 120,
    };

    const baseRadius = randomInRange(this.designSpace.baseRadius);
    const platformRadius = clamp(randomInRange(this.designSpace.platformRadius), 20, baseRadius - 10);
    const platformHeight = randomInRange(this.designSpace.platformHeight);
    const baseOffset = Math.random() * 2 * Math.PI;
    const platformOffset = baseOffset + Math.PI / 6;

    for (let i = 0; i < 6; i++) {
      const angle = baseOffset + i * (Math.PI / 3) + randomNormal() * degToRad(3);
      const platformAngle = platformOffset + i * (Math.PI / 3) + randomNormal() * degToRad(3);
      const baseAnchor = [
        baseRadius * Math.cos(angle) + randomNormal() * this.designSpace.anchorJitter,
        baseRadius * Math.sin(angle) + randomNormal() * this.designSpace.anchorJitter,
        randomNormal() * this.designSpace.baseZJitter,
      ];
      const platformAnchor = [
        platformRadius * Math.cos(platformAngle) + randomNormal() * this.designSpace.platformJitter,
        platformRadius * Math.sin(platformAngle) + randomNormal() * this.designSpace.platformJitter,
        0,
      ];
      const beta = angle + Math.PI / 2 + randomNormal() * this.designSpace.betaJitterRad;

      layout.baseAnchors.push(baseAnchor);
      layout.platformAnchors.push(platformAnchor);
      layout.betaAngles.push(wrapAngle(beta));
    }

    layout.homeHeight = platformHeight;
    this.finalizeLayout(layout);
    return layout;
  }

  createRectangularLayout() {
    // Three pairs of anchors at y ∈ {-yR, 0, +yR}, x ∈ {-xR, +xR}.
    // Optional alternating z-stagger on the BASE breaks planar singularity
    // and recovers full 6-DOF (the SR6/AYVA-style coplanar layout is 5-DOF;
    // staggering z restores the missing rotational DOF).
    const layout = {
      id: this.nextLayoutId++,
      topology: 'rectangular',
      baseAnchors: [],
      platformAnchors: [],
      betaAngles: [],
      hornLength: randomInRange(this.designSpace.hornLengthBounds),
      rodLength: randomInRange(this.designSpace.rodLengthBounds),
      servoRangeRad: this.servoRangeRad.slice(),
      homeHeight: 120,
    };

    const xBase = randomInRange(this.designSpace.rectXBounds);
    const yBase = randomInRange(this.designSpace.rectYBounds);
    const xPlat = clamp(xBase * (0.4 + Math.random() * 0.4), 10, xBase - 5);
    const yPlat = yBase;
    const zJitter = randomInRange(this.designSpace.rectZJitterBounds);

    // Anchor order: row 0 (y = -yR), row 1 (y = 0), row 2 (y = +yR), each with -x then +x.
    const rowYs = [-yBase, 0, yBase];
    const rowYsP = [-yPlat, 0, yPlat];
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let s = 0; s < 2; s++) {
        const xSign = s === 0 ? -1 : 1;
        const zStaggerSign = (idx % 2 === 0) ? 1 : -1;
        const baseAnchor = [
          xSign * xBase + randomNormal() * this.designSpace.anchorJitter * 0.5,
          rowYs[r] + randomNormal() * this.designSpace.anchorJitter * 0.5,
          zStaggerSign * zJitter + randomNormal() * this.designSpace.baseZJitter,
        ];
        const platformAnchor = [
          xSign * xPlat + randomNormal() * this.designSpace.platformJitter * 0.5,
          rowYsP[r] + randomNormal() * this.designSpace.platformJitter * 0.5,
          0,
        ];
        // Default beta: servo horn perpendicular to the long X-axis (push
        // along Y), alternating sign so opposite servos counter-rotate.
        const beta = (xSign > 0 ? Math.PI / 2 : -Math.PI / 2) + randomNormal() * this.designSpace.betaJitterRad;
        layout.baseAnchors.push(baseAnchor);
        layout.platformAnchors.push(platformAnchor);
        layout.betaAngles.push(wrapAngle(beta));
        idx++;
      }
    }

    layout.homeHeight = randomInRange(this.designSpace.platformHeight);
    this.finalizeLayout(layout);
    return layout;
  }

  createFreeLayout() {
    // All six anchors placed independently in a bounding box; no symmetry.
    // The most expressive topology — the GA can find non-obvious optima but
    // converges slower than the structured topologies.
    const layout = {
      id: this.nextLayoutId++,
      topology: 'free',
      baseAnchors: [],
      platformAnchors: [],
      betaAngles: [],
      hornLength: randomInRange(this.designSpace.hornLengthBounds),
      rodLength: randomInRange(this.designSpace.rodLengthBounds),
      servoRangeRad: this.servoRangeRad.slice(),
      homeHeight: 120,
    };

    const baseRadius = randomInRange(this.designSpace.baseRadius);
    const platformRadius = clamp(randomInRange(this.designSpace.platformRadius), 20, baseRadius - 10);

    for (let i = 0; i < 6; i++) {
      const baseAngle = Math.random() * 2 * Math.PI;
      const platAngle = Math.random() * 2 * Math.PI;
      const baseR = baseRadius * (0.6 + 0.4 * Math.random());
      const platR = platformRadius * (0.6 + 0.4 * Math.random());
      layout.baseAnchors.push([
        baseR * Math.cos(baseAngle),
        baseR * Math.sin(baseAngle),
        randomNormal() * this.designSpace.baseZJitter * 2,
      ]);
      layout.platformAnchors.push([
        platR * Math.cos(platAngle),
        platR * Math.sin(platAngle),
        0,
      ]);
      layout.betaAngles.push(Math.random() * 2 * Math.PI - Math.PI);
    }

    layout.homeHeight = randomInRange(this.designSpace.platformHeight);
    this.finalizeLayout(layout);
    return layout;
  }

  // Convert a user-supplied reference layout (in the export-JSON schema) into
  // the internal layout shape so it can seed the GA population.
  adaptReferenceLayout(refJson) {
    if (!refJson || !Array.isArray(refJson.base_anchors) || !Array.isArray(refJson.platform_anchors)) {
      throw new Error('Reference layout must include base_anchors and platform_anchors arrays.');
    }
    if (refJson.base_anchors.length !== 6 || refJson.platform_anchors.length !== 6) {
      throw new Error('Reference layout must have exactly 6 base and 6 platform anchors.');
    }
    const betaAngles = Array.isArray(refJson.beta_angles) && refJson.beta_angles.length === 6
      ? refJson.beta_angles.slice()
      : new Array(6).fill(0);

    const servoRange = Array.isArray(refJson.servo_range) && refJson.servo_range.length === 2
      ? refJson.servo_range.map((deg) => degToRad(deg))
      : this.servoRangeRad.slice();

    const layout = {
      id: this.nextLayoutId++,
      topology: refJson.topology || 'reference',
      baseAnchors: refJson.base_anchors.map((a) => a.slice()),
      platformAnchors: refJson.platform_anchors.map((a) => a.slice()),
      betaAngles,
      hornLength: Number(refJson.horn_length) || 50,
      rodLength: Number(refJson.rod_length) || 130,
      servoRangeRad: servoRange,
      homeHeight: Number(refJson.home_height) || 120,
    };
    this.finalizeLayout(layout);
    return layout;
  }

  finalizeLayout(layout) {
    const hornMin = this.designSpace.hornLengthBounds[0];
    const hornMax = this.designSpace.hornLengthBounds[1];
    const rodMin = this.designSpace.rodLengthBounds[0];
    const rodMax = this.designSpace.rodLengthBounds[1];
    layout.hornLength = clamp(layout.hornLength, hornMin, hornMax);
    layout.rodLength = clamp(layout.rodLength, rodMin, rodMax);

    const heightContributions = [];
    let requiredRodSq = rodMin * rodMin;

    for (let i = 0; i < 6; i++) {
      const base = layout.baseAnchors[i];
      const platform = layout.platformAnchors[i];
      const dx = platform[0] - base[0];
      const dy = platform[1] - base[1];
      const horizontalSq = dx * dx + dy * dy;
      const required = horizontalSq - layout.hornLength * layout.hornLength + 1;
      if (required > requiredRodSq) {
        requiredRodSq = required;
      }
    }

    layout.rodLength = clamp(Math.max(layout.rodLength, Math.sqrt(Math.max(requiredRodSq, 0))), rodMin, rodMax);

    for (let i = 0; i < 6; i++) {
      const base = layout.baseAnchors[i];
      const platform = layout.platformAnchors[i];
      const dx = platform[0] - base[0];
      const dy = platform[1] - base[1];
      const horizontalSq = dx * dx + dy * dy;
      const radicand = layout.rodLength * layout.rodLength
        + layout.hornLength * layout.hornLength
        - horizontalSq;
      heightContributions.push(Math.sqrt(Math.max(radicand, 0)));
    }

    layout.homeHeight = average(heightContributions);
    layout.servoRangeRad = this.servoRangeRad.slice();
    layout._ballJointLimitDeg = this.ballJointLimitDeg;
    return layout;
  }

  mutateLayout(source) {
    const layout = cloneLayout(source);
    for (let i = 0; i < 6; i++) {
      layout.baseAnchors[i][0] += randomNormal() * this.designSpace.anchorJitter;
      layout.baseAnchors[i][1] += randomNormal() * this.designSpace.anchorJitter;
      layout.baseAnchors[i][2] += randomNormal() * this.designSpace.baseZJitter;
      layout.platformAnchors[i][0] += randomNormal() * this.designSpace.platformJitter;
      layout.platformAnchors[i][1] += randomNormal() * this.designSpace.platformJitter;
      layout.betaAngles[i] = wrapAngle(layout.betaAngles[i] + randomNormal() * this.designSpace.mutationAngle);
    }

    layout.hornLength += randomNormal() * this.designSpace.mutationHorn;
    layout.rodLength += randomNormal() * this.designSpace.mutationRod;

    return this.finalizeLayout(layout);
  }

  crossoverLayouts(a, b) {
    const layout = cloneLayout(a);
    const split = Math.floor(Math.random() * 6);
    for (let i = split; i < 6; i++) {
      layout.baseAnchors[i] = b.baseAnchors[i].slice();
      layout.platformAnchors[i] = b.platformAnchors[i].slice();
      layout.betaAngles[i] = b.betaAngles[i];
    }
    layout.hornLength = (a.hornLength + b.hornLength) / 2;
    layout.rodLength = (a.rodLength + b.rodLength) / 2;
    layout.servoRangeRad = this.servoRangeRad.slice();
    return this.finalizeLayout(layout);
  }

  // --- Evaluation ----------------------------------------------------------

  async evaluateLayout(layout) {
    // Compute home pose FIRST to get reference rod directions and home
    // servo angles. The workspace evaluator uses these to compute proper
    // ball joint deflections (angle from joint's neutral, not from horn).
    const homeResult = evaluatePose(layout, {
      x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0,
    }, {
      ballJointLimitDeg: this.ballJointLimitDeg,
      ballJointClamp: true,    // never reject home pose for ball joint reasons
      servoRangeRad: layout.servoRangeRad,
      recordLegData: true,
    });

    if (homeResult.reachable && Array.isArray(homeResult.legDirections) && homeResult.legDirections.length === 6) {
      layout.homeRodDirections = homeResult.legDirections.map((d) => d.slice());
      layout.homeServoAngles = homeResult.servoAngles.slice();
    } else {
      // Home unreachable: ball joint check will fall back to the coarse
      // horn-vs-rod measurement. The layout will score poorly anyway.
      layout.homeRodDirections = null;
      layout.homeServoAngles = null;
    }

    const workspaceResult = await computeWorkspace(layout, this.ranges, {
      payload: this.payload,
      stroke: this.stroke,
      frequency: this.frequency,
      ballJointLimitDeg: this.ballJointLimitDeg,
      ballJointClamp: this.ballJointClamp,
      sampleStrategy: this.sampleStrategy,
      sampleCount: this.sampleCount,
    });

    const coverage = Number.isFinite(workspaceResult.coverage) ? workspaceResult.coverage : 0;
    const stats = workspaceResult.stats || {};

    let dexterity = 0;
    let stiffness = 0;
    let condition = Infinity;
    if (homeResult.reachable && homeResult.jacobianRows.length === 6) {
      const sv = singularValues(homeResult.jacobianRows);
      const sigmaMax = Math.max(...sv, EPS);
      const sigmaMin = sv.filter((v) => v > EPS).reduce((min, val) => Math.min(min, val), Infinity);
      if (sigmaMax > EPS && sigmaMin < Infinity) {
        dexterity = sigmaMin / sigmaMax;
        stiffness = sigmaMin;
        condition = sigmaMax / sigmaMin;
      }
    }

    const torque = this.computeTorque(layout);
    const speedDemand = this.computeSpeedDemand(stats);
    const loadBalance = stats.loadBalanceScore ?? 0;
    const isotropy = stats.averageIsotropy ?? 0;
    const stiffnessScore = stats.averageStiffness > 0 ? stats.averageStiffness : stiffness;
    const ballLimit = degToRad(this.ballJointLimitDeg || 0);
    const ballMarginRaw = ballLimit > 0 && Number.isFinite(stats.ballJointOverallMax)
      ? 1 - stats.ballJointOverallMax / ballLimit
      : 1;
    const violationMargin = 1 - (stats.violationRate ?? 0);
    const limitMargin = clamp(Math.max(ballMarginRaw, 0) * Math.max(violationMargin, 0), 0, 1);
    const fatigue = this.computeFatigue(stats);

    // Servo margin metrics: positive = headroom, 0 = at limit, negative = exceeds
    // spec. Null when no spec was provided (the "report demand only" mode).
    const torqueMargin = (this.servoMaxTorqueNm !== null && this.servoMaxTorqueNm > 0)
      ? (this.servoMaxTorqueNm - torque) / this.servoMaxTorqueNm
      : null;
    const speedMargin = (this.servoMaxSpeedRadPerS !== null && this.servoMaxSpeedRadPerS > 0)
      ? (this.servoMaxSpeedRadPerS - speedDemand) / this.servoMaxSpeedRadPerS
      : null;

    const metrics = {
      coverage, dexterity, stiffnessScore, loadBalance, isotropy,
      limitMargin, torque, speedDemand, fatigue,
      torqueMargin, speedMargin,
    };
    const objectives = buildObjectiveVector(metrics, this.objectiveKeys);

    return {
      layout,
      workspace: workspaceResult,
      coverage,
      dexterity,
      stiffness: stiffnessScore,
      torque,
      speedDemand,
      loadBalance,
      isotropy,
      limitMargin,
      fatigue,
      condition,
      torqueMargin,
      speedMargin,
      servoMaxTorqueNm: this.servoMaxTorqueNm,
      servoMaxSpeedRadPerS: this.servoMaxSpeedRadPerS,
      objectives,
      objectiveKeys: this.objectiveKeys,
      homePose: homeResult,
      rank: Infinity,
      crowding: 0,
    };
  }

  computeTorque(layout) {
    if (!this.payload || layout.hornLength <= 0) return 0;
    const amplitudeMeters = (this.stroke / 2) / 1000;
    const accel = Math.pow(2 * Math.PI * this.frequency, 2) * amplitudeMeters;
    const dynamicForce = this.payload * accel;
    const staticForce = this.payload * 9.81;
    const totalForce = dynamicForce + staticForce;
    const hornLengthMeters = layout.hornLength / 1000;
    return (totalForce * hornLengthMeters) / 6;
  }

  computeSpeedDemand(stats) {
    if (!stats || !Number.isFinite(stats.servoUsagePeak)) return 0;
    const servoAmplitude = stats.servoUsagePeak / 2;
    return servoAmplitude * 2 * Math.PI * this.frequency;
  }

  computeFatigue(stats) {
    if (!stats) return 0;
    const ballJointAvg = Number.isFinite(stats.ballJointAverage) ? stats.ballJointAverage : 0;
    const servoAvg = Number.isFinite(stats.servoUsageAvg) ? stats.servoUsageAvg : 0;
    const ballLimit = degToRad(this.ballJointLimitDeg || 0);
    const ballRatio = ballLimit > 0 ? ballJointAvg / ballLimit : 0;
    const servoSpan = Math.abs(this.servoRangeRad[1] - this.servoRangeRad[0]) || Math.PI;
    const servoDuty = servoSpan > 0 ? servoAvg / servoSpan : 0;
    const strokeMeters = this.stroke / 1000;
    return (Math.max(ballRatio, 0) + Math.max(servoDuty, 0)) * this.frequency * strokeMeters;
  }

  // --- NSGA-II -------------------------------------------------------------

  dominates(a, b) {
    const objA = normalizedObjectives(a);
    const objB = normalizedObjectives(b);
    let betterInAny = false;
    for (let i = 0; i < objA.length; i++) {
      if (objA[i] < objB[i]) return false;
      if (objA[i] > objB[i]) betterInAny = true;
    }
    return betterInAny;
  }

  fastNonDominatedSort(evaluations) {
    const n = evaluations.length;
    const dominationCounts = new Array(n).fill(0);
    const dominatedSets = Array.from({ length: n }, () => []);
    const fronts = [];

    for (let i = 0; i < n; i++) {
      evaluations[i].rank = Infinity;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (this.dominates(evaluations[i].objectives, evaluations[j].objectives)) {
          dominatedSets[i].push(j);
        } else if (this.dominates(evaluations[j].objectives, evaluations[i].objectives)) {
          dominationCounts[i] += 1;
        }
      }
      if (dominationCounts[i] === 0) {
        evaluations[i].rank = 0;
        if (!fronts[0]) fronts[0] = [];
        fronts[0].push(i);
      }
    }

    let frontIndex = 0;
    while (fronts[frontIndex] && fronts[frontIndex].length) {
      const nextFront = [];
      for (const idx of fronts[frontIndex]) {
        for (const dominatedIdx of dominatedSets[idx]) {
          dominationCounts[dominatedIdx] -= 1;
          if (dominationCounts[dominatedIdx] === 0) {
            evaluations[dominatedIdx].rank = frontIndex + 1;
            nextFront.push(dominatedIdx);
          }
        }
      }
      if (nextFront.length) fronts.push(nextFront);
      frontIndex += 1;
    }

    return fronts;
  }

  assignCrowdingDistance(fronts, evaluations) {
    for (const front of fronts) {
      if (!front || front.length === 0) continue;
      for (const idx of front) {
        evaluations[idx].crowding = 0;
      }
      const objectiveCount = evaluations[front[0]].objectives.length;
      for (let m = 0; m < objectiveCount; m++) {
        const sorted = front.slice().sort((a, b) => {
          const va = evaluations[a].objectives[m];
          const vb = evaluations[b].objectives[m];
          return va - vb;
        });
        const minVal = evaluations[sorted[0]].objectives[m];
        const maxVal = evaluations[sorted[sorted.length - 1]].objectives[m];
        evaluations[sorted[0]].crowding = Infinity;
        evaluations[sorted[sorted.length - 1]].crowding = Infinity;
        if (maxVal - minVal === 0) continue;
        for (let i = 1; i < sorted.length - 1; i++) {
          if (!Number.isFinite(evaluations[sorted[i]].crowding)) continue;
          const prev = evaluations[sorted[i - 1]].objectives[m];
          const next = evaluations[sorted[i + 1]].objectives[m];
          evaluations[sorted[i]].crowding += (next - prev) / (maxVal - minVal);
        }
      }
    }
  }

  tournamentSelect(evaluations) {
    const pick = () => evaluations[Math.floor(Math.random() * evaluations.length)];
    const a = pick();
    const b = pick();
    if (a.rank < b.rank) return a;
    if (b.rank < a.rank) return b;
    if (a.crowding > b.crowding) return a;
    if (b.crowding > a.crowding) return b;
    return Math.random() < 0.5 ? a : b;
  }

  createOffspring(evaluations) {
    const offspring = [];
    while (offspring.length < this.populationSize) {
      const parentA = this.tournamentSelect(evaluations);
      const parentB = this.tournamentSelect(evaluations);
      let child = this.crossoverLayouts(parentA.layout, parentB.layout);
      if (Math.random() < this.mutationRate) {
        child = this.mutateLayout(child);
      }
      offspring.push(child);
    }
    return offspring;
  }

  selectFromFronts(evaluations, fronts) {
    const selected = [];
    for (const front of fronts) {
      const frontEvaluations = front.map((idx) => evaluations[idx]);
      if (selected.length + frontEvaluations.length <= this.populationSize) {
        selected.push(...frontEvaluations);
      } else {
        const remaining = this.populationSize - selected.length;
        if (remaining > 0) {
          const sorted = frontEvaluations
            .slice()
            .sort((a, b) => (b.crowding ?? -Infinity) - (a.crowding ?? -Infinity));
          selected.push(...sorted.slice(0, remaining));
        }
        break;
      }
    }
    return selected;
  }

  updateState(evaluations, fronts) {
    this.population = evaluations.map((ev) => cloneLayout(ev.layout));
    this.fitness = evaluations;
    this.pareto = fronts[0]?.map((idx) => evaluations[idx]) || [];
    // Update best-by-coverage snapshot for progress reporting
    const best = this.fitness.slice().sort((a, b) => b.coverage - a.coverage)[0];
    if (best) {
      this.bestSnapshot = {
        coverage: best.coverage,
        isotropy: best.isotropy,
        limitMargin: best.limitMargin,
        torque: best.torque,
        loadBalance: best.loadBalance,
        stiffness: best.stiffness,
      };
    }
  }

  reportProgress() {
    if (typeof this.progressCallback !== 'function') return;
    this.progressCallback({
      startTime: this.startTime,
      evalsDone: this.evalsDone,
      totalEvals: this.totalEvalsExpected,
      generation: this.generation,
      totalGenerations: this.generations,
      paretoSize: this.pareto.length,
      best: this.bestSnapshot,
    });
  }

  async evaluatePopulation(layouts) {
    const results = [];
    for (const layout of layouts) {
      if (this.stopFlag.stopped) break;
      results.push(await this.evaluateLayout(layout));
      this.evalsDone += 1;
      this.reportProgress();
    }
    return results;
  }

  // --- Initialization & main loop -----------------------------------------

  initializePopulation() {
    if (this.referenceLayout) {
      // Seed with the reference verbatim, then fill the population with
      // mutations of it. This focuses the GA's initial search around a
      // known-good geometry instead of starting from random hexagons.
      const seed = this.adaptReferenceLayout(this.referenceLayout);
      this.population = [seed];
      while (this.population.length < this.populationSize) {
        this.population.push(this.mutateLayout(seed));
      }
    } else {
      this.population = Array.from({ length: this.populationSize }, () => this.createRandomLayout());
    }
  }

  async run() {
    this.startTime = Date.now();
    this.evalsDone = 0;
    this.totalEvalsExpected = this.populationSize * (this.generations + 1);

    this.initializePopulation();
    let evaluations = await this.evaluatePopulation(this.population);
    if (this.stopFlag.stopped) {
      this.finalizeStoppedRun(evaluations);
      return;
    }

    let fronts = this.fastNonDominatedSort(evaluations);
    this.assignCrowdingDistance(fronts, evaluations);
    this.updateState(evaluations, fronts);
    this.reportProgress();

    for (let gen = 0; gen < this.generations; gen++) {
      if (this.stopFlag.stopped) break;
      this.generation = gen + 1;
      const offspringLayouts = this.createOffspring(evaluations);
      const offspringEvaluations = await this.evaluatePopulation(offspringLayouts);
      if (this.stopFlag.stopped) {
        this.finalizeStoppedRun(evaluations.concat(offspringEvaluations));
        return;
      }
      const combined = evaluations.concat(offspringEvaluations);
      fronts = this.fastNonDominatedSort(combined);
      this.assignCrowdingDistance(fronts, combined);
      evaluations = this.selectFromFronts(combined, fronts);
      fronts = this.fastNonDominatedSort(evaluations);
      this.assignCrowdingDistance(fronts, evaluations);
      this.updateState(evaluations, fronts);
      this.reportProgress();
    }
  }

  finalizeStoppedRun(evaluations) {
    if (!evaluations.length) return;
    const fronts = this.fastNonDominatedSort(evaluations);
    this.assignCrowdingDistance(fronts, evaluations);
    this.updateState(evaluations, fronts);
    this.reportProgress();
  }

  start(callback) {
    if (this.running) return;
    this.running = true;
    this.run()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.running = false;
        if (typeof callback === 'function') callback(this);
      });
  }

  stop() {
    this.stopFlag.stopped = true;
    this.running = false;
  }

  exportBest(format = 'json') {
    if (!this.fitness.length) {
      console.warn('No evaluated layouts available for export.');
      return;
    }
    const bestFront = this.pareto.length ? this.pareto : this.fitness;
    const best = bestFront.slice().sort((a, b) => b.coverage - a.coverage)[0];
    if (!best) {
      console.warn('Unable to determine best layout.');
      return;
    }
    if (format !== 'json') {
      console.warn('Only JSON export is currently supported.');
      return;
    }
    const json = layoutToJSON(best.layout, best);
    const data = JSON.stringify(json, null, 2);
    this.download(data, 'optimized_layout.json', 'application/json');
  }

  download(data, filename, mime) {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export { layoutToJSON };
