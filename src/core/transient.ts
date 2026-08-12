/**
 * Educational transient simulator for RC circuits.
 *
 * Uses backward-Euler capacitor companions and the same MNA matrix layer as
 * the DC solver. This is intentionally a focused Phase 2/3 slice: DC sources,
 * resistors, capacitors, and ground are supported. Unsupported device types
 * fail explicitly instead of being silently approximated.
 *
 * @module core/transient
 */

import { createSystem, clearSystem, solveLinear } from './matrix.js';
import { buildNetlist, nodeOf } from './netlist.js';
import { getDefinition } from './registry.js';
import { resolveParams } from './define.js';
import type { CircuitProject } from './model.js';

export interface TransientOptions {
  duration: number;
  step: number;
  probe?: { compId: string; pinId: string };
}

export interface TransientResult {
  ok: boolean;
  time: Float64Array;
  voltage: Float64Array;
  probeNode: number;
  maxVoltage: number;
  minVoltage: number;
  error?: string;
}

const MAX_POINTS = 20000;

function stampConductance(sys: ReturnType<typeof createSystem>, a: number, b: number, g: number): void {
  if (a > 0 && b > 0) {
    sys.A[a - 1][a - 1] += g;
    sys.A[b - 1][b - 1] += g;
    sys.A[a - 1][b - 1] -= g;
    sys.A[b - 1][a - 1] -= g;
  } else if (a > 0) {
    sys.A[a - 1][a - 1] += g;
  } else if (b > 0) {
    sys.A[b - 1][b - 1] += g;
  }
}

function injectCurrent(sys: ReturnType<typeof createSystem>, node: number, amount: number): void {
  if (node > 0) sys.z[node - 1] += amount;
}

export function simulateTransient(project: CircuitProject, options: TransientOptions): TransientResult {
  const duration = Number.isFinite(options.duration) && options.duration > 0 ? options.duration : 0.1;
  const step = Number.isFinite(options.step) && options.step > 0 ? options.step : 1e-3;
  const points = Math.floor(duration / step) + 1;

  if (points > MAX_POINTS) {
    return {
      ok: false,
      time: new Float64Array(0),
      voltage: new Float64Array(0),
      probeNode: 0,
      maxVoltage: 0,
      minVoltage: 0,
      error: `Transient run would create ${points} points; maximum is ${MAX_POINTS}. Increase the timestep or reduce the duration.`,
    };
  }

  const supported = new Set(['ground', 'dc-source', 'resistor', 'capacitor']);
  const unsupported = project.components.filter((c) => !supported.has(c.type));
  if (unsupported.length > 0) {
    return {
      ok: false,
      time: new Float64Array(0),
      voltage: new Float64Array(0),
      probeNode: 0,
      maxVoltage: 0,
      minVoltage: 0,
      error: `Transient RC mode currently supports DC source, resistor, capacitor, and ground. Unsupported: ${unsupported.map(c => c.type).join(', ')}.`,
    };
  }

  const netlist = buildNetlist(project);
  const n = netlist.nodeCount - 1;

  const voltageSources = project.components
    .filter((c) => c.type === 'dc-source')
    .map((c) => {
      const def = getDefinition(c.type)!;
      const params = resolveParams(def, c.params);
      return {
        compId: c.id,
        plus: nodeOf(netlist, c.id, 'plus'),
        minus: nodeOf(netlist, c.id, 'minus'),
        voltage: Number(params.voltage ?? 5),
      };
    });

  const capacitors = project.components
    .filter((c) => c.type === 'capacitor')
    .map((c) => {
      const def = getDefinition(c.type)!;
      const params = resolveParams(def, c.params);
      return {
        id: c.id,
        p: nodeOf(netlist, c.id, '1'),
        n: nodeOf(netlist, c.id, '2'),
        capacitance: Math.max(Number(params.capacitance ?? 1e-6), 1e-15),
        previousVoltage: 0,
      };
    });

  const resistors = project.components
    .filter((c) => c.type === 'resistor')
    .map((c) => {
      const def = getDefinition(c.type)!;
      const params = resolveParams(def, c.params);
      return {
        p: nodeOf(netlist, c.id, '1'),
        n: nodeOf(netlist, c.id, '2'),
        resistance: Math.max(Number(params.resistance ?? 220), 1e-12),
      };
    });

  const size = n + voltageSources.length;
  if (size <= 0) {
    return {
      ok: false,
      time: new Float64Array(0),
      voltage: new Float64Array(0),
      probeNode: 0,
      maxVoltage: 0,
      minVoltage: 0,
      error: 'Circuit contains no solvable nodes.',
    };
  }

  const probeNode = options.probe ? nodeOf(netlist, options.probe.compId, options.probe.pinId) : 0;
  const times = new Float64Array(points);
  const voltages = new Float64Array(points);
  const sys = createSystem(size);
  let previous = new Float64Array(n);

  for (let k = 0; k < points; k++) {
    clearSystem(sys);

    for (const source of voltageSources) {
      const row = n + voltageSources.indexOf(source);
      if (source.plus > 0) sys.A[row][source.plus - 1] += 1;
      if (source.minus > 0) sys.A[row][source.minus - 1] -= 1;
      if (source.plus > 0) sys.A[source.plus - 1][row] -= 1;
      if (source.minus > 0) sys.A[source.minus - 1][row] += 1;
      sys.z[row] += source.voltage;
    }

    for (const resistor of resistors) {
      stampConductance(sys, resistor.p, resistor.n, 1 / resistor.resistance);
    }

    // Backward-Euler capacitor companion: G=C/dt plus a history current source.
    for (const capacitor of capacitors) {
      const g = capacitor.capacitance / step;
      stampConductance(sys, capacitor.p, capacitor.n, g);
      const historyCurrent = g * capacitor.previousVoltage;
      injectCurrent(sys, capacitor.p, historyCurrent);
      injectCurrent(sys, capacitor.n, -historyCurrent);
    }

    const x = solveLinear(sys);
    if (!x) {
      return {
        ok: false,
        time: times.subarray(0, k),
        voltage: voltages.subarray(0, k),
        probeNode,
        maxVoltage: 0,
        minVoltage: 0,
        error: `Transient solve became singular at t=${(k * step).toExponential(3)} s. Check grounding and source connections.`,
      };
    }

    const current = new Float64Array(n);
    current.set(x.subarray(0, n));

    for (const capacitor of capacitors) {
      capacitor.previousVoltage = (capacitor.p > 0 ? current[capacitor.p - 1] : 0) -
        (capacitor.n > 0 ? current[capacitor.n - 1] : 0);
    }

    previous = current;
    times[k] = k * step;
    voltages[k] = probeNode > 0 ? current[probeNode - 1] : 0;
  }

  let minVoltage = Infinity;
  let maxVoltage = -Infinity;
  for (const v of voltages) {
    minVoltage = Math.min(minVoltage, v);
    maxVoltage = Math.max(maxVoltage, v);
  }

  // Keep the local variable explicit: it documents that each timestep starts
  // from the previous solved state, which is the core of the companion model.
  void previous;

  return {
    ok: true,
    time: times,
    voltage: voltages,
    probeNode,
    maxVoltage: Number.isFinite(maxVoltage) ? maxVoltage : 0,
    minVoltage: Number.isFinite(minVoltage) ? minVoltage : 0,
  };
}
