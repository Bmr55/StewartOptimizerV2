// Web Worker entry point for the Stewart Platform Optimizer.
// All numerical work happens here so the main UI thread stays responsive.
// Spawned from index.html as: new Worker('./optimizer-worker.js', { type: 'module' })

import { Optimizer, layoutToJSON } from './optimizer.js';
import { parseRequirements } from './requirements.js';

let currentOptimizer = null;
const stopFlag = { stopped: false };

function serializeEvaluation(ev) {
  if (!ev) return null;
  return {
    metrics: {
      coverage: ev.coverage,
      dexterity: ev.dexterity,
      stiffness: ev.stiffness,
      torque: ev.torque,
      speedDemand: ev.speedDemand,
      loadBalance: ev.loadBalance,
      isotropy: ev.isotropy,
      limitMargin: ev.limitMargin,
      fatigue: ev.fatigue,
      condition: Number.isFinite(ev.condition) ? ev.condition : null,
      torqueMargin: ev.torqueMargin,
      speedMargin: ev.speedMargin,
      servoMaxTorqueNm: ev.servoMaxTorqueNm,
      servoMaxSpeedRadPerS: ev.servoMaxSpeedRadPerS,
      objectives: ev.objectives,
      objectiveKeys: ev.objectiveKeys,
    },
    layout: layoutToJSON(ev.layout, ev),
    workspaceStats: ev.workspace?.stats ?? null,
    workspaceCounts: ev.workspace?.counts ?? null,
    workspaceStrategy: ev.workspace?.strategy ?? null,
    workspaceTotal: ev.workspace?.total ?? null,
  };
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'start') {
    if (currentOptimizer) {
      self.postMessage({ type: 'error', payload: { message: 'Optimizer already running.' } });
      return;
    }
    try {
      const {
        requirementsText,
        populationSize,
        generations,
        ranges,
        ballJointLimitDeg,
        ballJointClamp,
        topology,
        referenceLayout,
        sampleStrategy,
        sampleCount,
        objectiveSet,
        mutationRate,
        servoMaxTorqueNm,
        servoMaxSpeedDegPerS,
      } = payload;

      const { normalized } = parseRequirements(requirementsText);

      // Convert deg/s → rad/s here so the Optimizer's internal speedDemand
      // (which is in rad/s) compares apples to apples.
      const servoMaxSpeedRadPerS =
        Number.isFinite(servoMaxSpeedDegPerS) && servoMaxSpeedDegPerS > 0
          ? servoMaxSpeedDegPerS * Math.PI / 180
          : null;

      stopFlag.stopped = false;
      currentOptimizer = new Optimizer(normalized, {
        populationSize,
        generations,
        ranges,
        ballJointLimitDeg,
        ballJointClamp,
        topology,
        referenceLayout,
        sampleStrategy,
        sampleCount,
        objectiveSet,
        mutationRate,
        servoMaxTorqueNm: (Number.isFinite(servoMaxTorqueNm) && servoMaxTorqueNm > 0) ? servoMaxTorqueNm : null,
        servoMaxSpeedRadPerS,
        stopFlag,
        progressCallback: (info) => {
          self.postMessage({ type: 'progress', payload: info });
        },
      });

      self.postMessage({ type: 'started', payload: {
        startTime: Date.now(),
        totalEvals: currentOptimizer.totalEvalsExpected,
        populationSize: currentOptimizer.populationSize,
        generations: currentOptimizer.generations,
        sampleStrategy: currentOptimizer.sampleStrategy,
        sampleCount: currentOptimizer.sampleCount,
        objectiveSet: currentOptimizer.objectiveSet,
      }});

      await currentOptimizer.run();

      const pareto = currentOptimizer.pareto && currentOptimizer.pareto.length
        ? currentOptimizer.pareto
        : currentOptimizer.fitness;
      const sortedByCoverage = pareto.slice().sort((a, b) => b.coverage - a.coverage);
      const best = sortedByCoverage[0];
      const bestIndex = best ? pareto.indexOf(best) : -1;

      self.postMessage({
        type: 'done',
        payload: {
          stopped: stopFlag.stopped,
          best: serializeEvaluation(best),
          bestIndex,
          pareto: pareto.map(serializeEvaluation),
          generationsCompleted: currentOptimizer.generation,
          evalsCompleted: currentOptimizer.evalsDone,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: { message: error.message || String(error), stack: error.stack || null },
      });
    } finally {
      currentOptimizer = null;
    }
    return;
  }

  if (type === 'stop') {
    stopFlag.stopped = true;
    if (currentOptimizer) currentOptimizer.stop();
    return;
  }
});
