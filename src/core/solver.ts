import { createSystem, clearSystem, solveLinear } from './matrix.js';
import { getDefinition } from './registry.js';
import { resolveParams } from './define.js';
import { buildNetlist, nodeOf } from './netlist.js';
import type { CircuitProject } from './model.js';

interface VoltageSourceBranchInfo {
  compId: string;
  p: string;
  n: string;
  V: number;
  devIndex: number;
  globalIndex: number;
}

const NODE_CAP = 256;
const MAX_NR_ITERS = 60;
const NR_TOL = 1e-7;

export function solveDC(project: CircuitProject) {
  const netlist = buildNetlist(project);
  const vsBranches: VoltageSourceBranchInfo[] = [];

  for (const c of project.components) {
    const def = getDefinition(c.type);
    const dev = typeof def?.device === 'function' ? def.device(resolveParams(def, c.params)) : null;
    if (!dev?.branches) continue;
    for (let i = 0; i < dev.branches.length; i++) {
      vsBranches.push({ compId: c.id, ...dev.branches[i], devIndex: i, globalIndex: vsBranches.length });
    }
  }

  const n = netlist.nodeCount - 1;
  const m = vsBranches.length;
  const size = n + m;
  if (size > NODE_CAP) {
    return { ok: false, nodeVoltages: new Float64Array(n), branchCurrents: new Float64Array(m), devBranches: [], iterations: 0, error: `circuit too large (${n}+${m}>${NODE_CAP})`, netlist };
  }

  let nodeVoltages = new Float64Array(n);
  const limitState = new Map<string, { prevVd: number; dir: number }>();
  const makeCtx = (sys: ReturnType<typeof createSystem>) => ({
    G(i: number, j: number, g: number): void {
      if (i > 0 && j > 0) { sys.A[i - 1][i - 1] += g; sys.A[j - 1][j - 1] += g; sys.A[i - 1][j - 1] -= g; sys.A[j - 1][i - 1] -= g; }
      else if (i > 0) sys.A[i - 1][i - 1] += g;
      else if (j > 0) sys.A[j - 1][j - 1] += g;
    },
    I(i: number, a: number): void { if (i > 0) sys.z[i - 1] += a; },
    v(nn: number): number { return nn <= 0 ? 0 : nodeVoltages[nn - 1]; },
    nodeOf(compId: string, pinId: string): number { return nodeOf(netlist, compId, pinId); },
    branchCurrent(_globalIndex: number): number { return 0; },
    limit(vd: number, na: number, nk: number, lim: number): number {
      if (!Number.isFinite(vd)) vd = 0;
      const key = `${na}|${nk}`;
      const state = limitState.get(key) ?? { prevVd: 0, dir: 0 };
      const delta = vd - state.prevVd;
      const step = Math.max(-lim, Math.min(lim, delta));
      const limitedVd = state.prevVd + step;
      limitState.set(key, { prevVd: limitedVd, dir: Math.sign(step) || state.dir });
      return limitedVd;
    },
  });

  function makeDeviceCtx(baseCtx: ReturnType<typeof makeCtx>, compId: string, branchBaseIndex = 0) {
    const node = (pinId: string) => baseCtx.nodeOf(compId, pinId);
    return Object.assign(Object.create(baseCtx), {
      node,
      vPin(pinId: string) { return baseCtx.v(node(pinId)); },
      current(_pinId: string) { return baseCtx.branchCurrent(branchBaseIndex); },
    });
  }

  const sys = createSystem(size);
  let iters = 0;
  let converged = false;
  let lastErr: string | null = null;

  for (iters = 0; iters < MAX_NR_ITERS; iters++) {
    clearSystem(sys);
    const ctx = makeCtx(sys);

    for (const c of project.components) {
      const def = getDefinition(c.type);
      if (!def || def.status !== 'modelled') continue;
      const dev = typeof def.device === 'function' ? def.device(resolveParams(def, c.params)) : null;
      if (!dev) continue;

      if (dev.branches) {
        for (let bi = 0; bi < dev.branches.length; bi++) {
          const br = dev.branches[bi];
          const branch = vsBranches.find(b => b.compId === c.id && b.devIndex === bi);
          if (!branch) continue;
          const np = nodeOf(netlist, c.id, br.p);
          const nn = nodeOf(netlist, c.id, br.n);
          const row = n + branch.globalIndex;
          if (np > 0) sys.A[row][np - 1] += 1;
          if (nn > 0) sys.A[row][nn - 1] -= 1;
          if (np > 0) sys.A[np - 1][row] -= 1;
          if (nn > 0) sys.A[nn - 1][row] += 1;
          sys.z[row] += br.V;
        }
      }

      if (dev.stamp) dev.stamp(makeDeviceCtx(ctx, c.id, vsBranches.find(b => b.compId === c.id)?.globalIndex ?? 0));
    }

    const x = solveLinear(sys);
    if (!x) { lastErr = 'singular matrix — likely a short circuit or no ground reference'; break; }

    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x[i] - nodeVoltages[i]);
      if (d > maxDelta) maxDelta = d;
      nodeVoltages[i] = x[i];
    }
    if (maxDelta < NR_TOL && iters > 0) { converged = true; break; }
  }

  if (!converged && !lastErr) lastErr = `failed to converge in ${MAX_NR_ITERS} iterations`;

  const branchCurrents = new Float64Array(m);
  for (let i = 0; i < m; i++) branchCurrents[i] = sys.z[n + i];

  const ctx = makeCtx(sys);
  ctx.branchCurrent = (idx: number) => branchCurrents[idx];

  const devBranches: DeviceResult[] = [];
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def || def.status !== 'modelled') continue;
    const dev = typeof def.device === 'function' ? def.device(resolveParams(def, c.params)) : null;
    if (!dev) continue;
    const branchBase = vsBranches.find(b => b.compId === c.id)?.globalIndex ?? 0;
    const dctx = makeDeviceCtx(ctx, c.id, branchBase);
    const entry: DeviceResult = { compId: c.id, compType: c.type };
    if (dev.current) entry.current = dev.current(dctx);
    if (dev.power) entry.power = dev.power(dctx);
    if (dev.brightness) entry.brightness = dev.brightness(dctx);
    devBranches.push(entry);
  }

  return { ok: converged || iters > 0, nodeVoltages, branchCurrents, devBranches, iterations: iters, netlist, error: converged ? undefined : lastErr };
}

export interface DeviceResult { compId: string; compType: string; current?: number; power?: number; brightness?: number; }

export function nodeVoltage(result: Awaited<ReturnType<typeof solveDC>>, nodeIndex: number): number {
  return nodeIndex <= 0 ? 0 : result.nodeVoltages[nodeIndex - 1] ?? 0;
}

export function deviceResult(result: Awaited<ReturnType<typeof solveDC>>, compId: string): DeviceResult | undefined {
  return result.devBranches.find(d => d.compId === compId);
}
