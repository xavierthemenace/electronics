import type { BreadboardTopology } from './breadboard.js';
import { connectivityGroups } from './breadboard.js';
import type { CircuitProject, Wire } from './model.js';

/**
 * Convert breadboard physical connectivity into solver-only wires.
 * The editor's canonical project is never mutated. Existing schematic wires
 * remain intact; each breadboard connectivity group gets a star connection
 * between its placed component pins.
 */
export function buildBreadboardRuntimeProject(project: CircuitProject, topology?: BreadboardTopology): CircuitProject {
  if (!topology || topology.placements.length < 2) return project;

  const componentById = new Set(project.components.map(c => c.id));
  const validPlacements = topology.placements.filter(p => componentById.has(p.componentId) && topology.holes.some(h => h.id === p.holeId));
  if (validPlacements.length < 2) return project;

  const groups = connectivityGroups(topology);
  const wires: Wire[] = [...(project.wires ?? []).map(w => ({ a: { ...w.a }, b: { ...w.b } }))];
  const existing = new Set(wires.map(w => `${w.a.cid}:${w.a.pid}|${w.b.cid}:${w.b.pid}`));

  for (const group of groups) {
    const pins = validPlacements.filter(p => group.includes(p.holeId));
    if (pins.length < 2) continue;
    const anchor = pins[0];
    for (const pin of pins.slice(1)) {
      const a = `${anchor.componentId}:${anchor.pinId}|${pin.componentId}:${pin.pinId}`;
      const b = `${pin.componentId}:${pin.pinId}|${anchor.componentId}:${anchor.pinId}`;
      if (existing.has(a) || existing.has(b)) continue;
      existing.add(a);
      wires.push({ a: { cid: anchor.componentId, pid: anchor.pinId }, b: { cid: pin.componentId, pid: pin.pinId } });
    }
  }

  return { ...project, wires };
}
