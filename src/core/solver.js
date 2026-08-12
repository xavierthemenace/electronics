/**
 * MNA (Modified Nodal Analysis) DC solver with Newton–Raphson for nonlinear
 * devices (diodes, LEDs). Pure TS: no DOM, no async — testable in Node.
 *
 * Stamp conventions (after Ngspice/Qucs):
 *   G(i, j, g)  — adds conductance g between nodes i, j (symmetric)
 *   I(i, a)     — injects current a into node i (flows into the node)
 *
 * Voltage sources add an extra unknown (branch current) and an extra row:
 *   v(plus) − v(minus) = V  →  row says: +1·v(+) − 1·v(−) + 0 = +V
 * The branch current is unknown and read back via `branchCurrent(i)`.
 *
 * @module core/solver
 */

import { createSystem, clearSystem, solveLinear } from "./matrix.js";
import { getDefinition } from "./registry.js";
import { resolveParams } from "./define.js";
import { buildNetlist, nodeOf } from "./netlist.js";

const NODE_CAP = 256; // safety: PR3 target is ≤ ~100 nodes
const MAX_NR_ITERS = 60;
const NR_TOL = 1e-7;   // node voltage convergence (V)
const STEP_TOL = 1e-3; // ΔV allowed per NR iteration for diodes/LEDs

/**
 * @typedef {Object} StampedContext
 * @property {(i:number,j:number,g:number)=>void} G
 * @property {(i:number,a:number)=>void} I
 * @property {(n:number)=>number} v
 * @property {(compId:string,pinId:string)=>number} nodeOf
 * @property {(branchIndex:number)=>number} branchCurrent
 * @property {(vd:number,na:number,nk:number,limit:number)=>number} limit
 */

/**
 * Solve the DC operating point of a project.
 * @param {import("./model.js").CircuitProject} project
 * @returns {{ ok:boolean, nodeVoltages:Float64Array, branchCurrents:Float64Array, devBranches:object[], iterations:number, error?:string }}
 */
export function solveDC(project) {
  const netlist = buildNetlist(project);

  // Count voltage-source branches (one extra unknown per source).
  const vsBranches = []; // {compId, plus, minus, V}
  const deviceBranches = []; // {compId, compType, indexFromPin} resolved below
  for (const c of project.components) {
    const def = getDefinition(c.type);
    const dev = typeof def?.device === "function" ? def.device(resolveParams(def, c.params)) : null;
    if (!dev) continue;
    if (dev.branches) {
      for (let i = 0; i < dev.branches.length; i++) {
        vsBranches.push({ compId: c.id, ...dev.branches[i], devIndex: i });
      }
    }
  }

  const n = netlist.nodeCount - 1; // non-ground nodes (nodeCount includes ground=0)
  const m = vsBranches.length; // voltage source branches
  const size = n + m;
  if (size > NODE_CAP)
    return { ok: false, nodeVoltages: new Float64Array(n), branchCurrents: new Float64Array(m), devBranches: [], iterations: 0, error: `circuit too large (${n}+${m}>${NODE_CAP})` };

  // nodeVoltages: index 0..n-1 are non-ground voltages (ground=0).
  let nodeVoltages = new Float64Array(n);

  // Step-limiting memory per (node pair) to stabilise nonlinear Newton.
  // Map from "na|nk" -> { prevVd: number, dir: number }
  const limitState = new Map();

  const makeCtx = (sys) => {
    // Resolve device branch unknown index: branch i lives at row n+i.
    // branchCurrent(index) reads the solution slot n+index after solve.
    const branchMap = new Map(); // "compId:devIndex" -> row n+i
    vsBranches.forEach((b, i) => branchMap.set(`${b.compId}:${b.devIndex}`, n + i));

    return {
      G(i, j, g) {
        // Conductance stamp into A: +g on (i,i),(j,j); -g on (i,j),(j,i).
        // Ground rows/cols are dropped (index 0 means ground).
        if (i > 0 && j > 0) {
          sys.A[i - 1][i - 1] += g;
          sys.A[j - 1][j - 1] += g;
          sys.A[i - 1][j - 1] -= g;
          sys.A[j - 1][i - 1] -= g;
        } else if (i > 0 && j <= 0) {
          sys.A[i - 1][i - 1] += g;
        } else if (j > 0 && i <= 0) {
          sys.A[j - 1][j - 1] += g;
        }
      },
      I(i, a) {
        // Inject current a into node i (positive = into the node).
        if (i > 0) sys.z[i - 1] += a;
      },
      v(nn) {
        return nn <= 0 ? 0 : nodeVoltages[nn - 1];
      },
      nodeOf(compId, pinId) {
        return nodeOf(netlist, compId, pinId);
      },
      branchCurrent(devIndex) {
        // Not available during stamping; only after solve. Returns 0 mid-iter.
        return 0;
      },
      limit(vd, na, nk, lim) {
        // Limit the CHANGE in diode voltage per iteration (ΔV ≤ lim),
        // not the absolute voltage. This allows the voltage to creep up
        // toward the forward voltage over multiple NR iterations.
        if (!Number.isFinite(vd)) vd = 0;
        const key = `${na}|${nk}`;
        const state = limitState.get(key) ?? { prevVd: 0, dir: 0 };
        // Determine direction of change from previous iteration.
        const delta = vd - state.prevVd;
        const step = Math.max(-lim, Math.min(lim, delta));
        const limitedVd = state.prevVd + step;
        // Update state for next iteration.
        limitState.set(key, { prevVd: limitedVd, dir: Math.sign(step) || state.dir });
        return limitedVd;
      },
    };
  };

  /**
   * Per-component context bound to an instance id. Lets device models call
   * `ctx.node("1")`, `ctx.v("a")`, etc. without re-passing their own compId.
   */
  function makeDeviceCtx(baseCtx, compId) {
    const node = (pinId) => baseCtx.nodeOf(compId, pinId);
    return Object.assign(Object.create(baseCtx), {
      node,
      vPin(pinId) {
        return baseCtx.v(node(pinId));
      },
      current(pinId) {
        // Only meaningful for a voltage-source branch owned by this device.
        return baseCtx.branchCurrent(0);
      },
    });
  }

  // Build branch metadata (for stamping voltage sources + reading currents).
  const sys = createSystem(size);
  let iters = 0;
  let converged = false;
  let lastErr = null;

  for (iters = 0; iters < MAX_NR_ITERS; iters++) {
    clearSystem(sys);
    const ctx = makeCtx(sys);

    // Stamp every modelled device.
    for (const c of project.components) {
      const def = getDefinition(c.type);
      if (!def || def.status !== "modelled") continue;
      const dev = typeof def.device === "function" ? def.device(resolveParams(def, c.params)) : null;
      if (!dev) continue;

      // Voltage source branch rows.
      if (dev.branches) {
        for (let bi = 0; bi < dev.branches.length; bi++) {
          const br = dev.branches[bi];
          const np = nodeOf(netlist, c.id, br.p);
          const nn = nodeOf(netlist, c.id, br.n);
          const row = n + bi; // absolute row index in the system
          // V-source MNA: V(p) - V(n) = Vsource
          // Row:  +1·V(p) - 1·V(n) + 0·I_br = Vsource  →  A[row][p]=1, A[row][n]=-1, A[row][row]=0
          if (np > 0) sys.A[row][np - 1] += 1;
          if (nn > 0) sys.A[row][nn - 1] -= 1;
          // Column (KCL): at p: -I_br flows out of node; at n: +I_br flows into node
          if (np > 0) sys.A[np - 1][row] -= 1;
          if (nn > 0) sys.A[nn - 1][row] += 1;
          sys.z[row] += br.V;
        }
      }

      // General stamp (linear + nonlinear companion models).
      if (dev.stamp) dev.stamp(makeDeviceCtx(ctx, c.id));
    }

    const x = solveLinear(sys);
    if (!x) {
      lastErr = "singular matrix — likely a short circuit or no ground reference";
      break;
    }

    // Check convergence.
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x[i] - nodeVoltages[i]);
      if (d > maxDelta) maxDelta = d;
      nodeVoltages[i] = x[i];
    }
    if (maxDelta < NR_TOL && iters > 0) {
      converged = true;
      break;
    }
  }

  if (!converged && !lastErr) lastErr = `failed to converge in ${MAX_NR_ITERS} iterations`;

  // Read back branch currents.
  const branchCurrents = new Float64Array(m);
  for (let i = 0; i < m && i < size - n; i++) {
    branchCurrents[i] = sys.z[n + i]; // currently unused; recomputed via device.current below
  }

  // Rebuild a final ctx so device.current/voltage queries work post-solve.
  const ctx = makeCtx(sys);
  ctx.branchCurrent = (idx) => branchCurrents[idx];

  // deviceBranches: per-device {compId, compType, current, power, brightness?}
  const devBranches = [];
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def || def.status !== "modelled") continue;
    const dev = typeof def.device === "function" ? def.device(resolveParams(def, c.params)) : null;
    if (!dev) continue;
    const dctx = makeDeviceCtx(ctx, c.id);
    const entry = { compId: c.id, compType: c.type };
    if (dev.current) entry.current = dev.current(dctx);
    if (dev.power) entry.power = dev.power(dctx);
    if (dev.brightness) entry.brightness = dev.brightness(dctx);
    devBranches.push(entry);
  }

  return {
    ok: converged || iters > 0,
    nodeVoltages,
    branchCurrents,
    devBranches,
    iterations: iters,
    netlist,
    error: converged ? undefined : lastErr,
  };
}

/** Convenience: voltage of a named node (e.g. "GND" → 0). */
export function nodeVoltage(result, nodeIndex) {
  if (nodeIndex <= 0) return 0;
  return result.nodeVoltages[nodeIndex - 1];
}

/** Find the device result for a component id. */
export function deviceResult(result, compId) {
  return result.devBranches.find((d) => d.compId === compId) ?? null;
}
