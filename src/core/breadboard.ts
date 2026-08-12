/**
 * Breadboard topology primitives.
 * Models a common half-size solderless breadboard with five-hole terminal
 * strips, a center trench, and power rails. This is intentionally independent
 * of React so the same topology can later feed the canonical netlist.
 */

export type BreadboardSide = 'top' | 'bottom';
export type RailPolarity = '+' | '-';

export interface BreadboardHole {
  id: string;
  row: number;
  column: number;
  bank: 'left' | 'right';
  side: BreadboardSide;
  rail?: RailPolarity;
}

export interface BreadboardJumper {
  id: string;
  a: string;
  b: string;
}

export interface BreadboardPlacement {
  componentId: string;
  pinId: string;
  holeId: string;
}

export interface BreadboardTopology {
  rows: number;
  columns: number;
  holes: BreadboardHole[];
  jumpers: BreadboardJumper[];
  placements: BreadboardPlacement[];
}

export function holeId(row: number, column: number, bank: 'left' | 'right'): string {
  return `tb-${bank}-${row + 1}-${column + 1}`;
}

export function railId(polarity: RailPolarity, side: BreadboardSide, column: number): string {
  return `rail-${polarity}-${side}-${column + 1}`;
}

export function createBreadboard(rows = 30, columns = 5): BreadboardTopology {
  const holes: BreadboardHole[] = [];
  for (const side of ['top', 'bottom'] as BreadboardSide[]) {
    for (let row = 0; row < rows; row++) {
      for (let bankIndex = 0; bankIndex < 2; bankIndex++) {
        const bank = bankIndex === 0 ? 'left' : 'right';
        for (let column = 0; column < columns; column++) {
          holes.push({ id: holeId(row, column, bank), row, column, bank, side });
        }
      }
    }
  }
  return { rows, columns, holes, jumpers: [], placements: [] };
}

/** Returns the holes that are physically connected inside the breadboard. */
export function intrinsicGroup(topology: BreadboardTopology, hole: BreadboardHole): string[] {
  return topology.holes
    .filter(other => other.side === hole.side && other.bank === hole.bank && other.row === hole.row)
    .map(h => h.id);
}

/**
 * Build electrical connectivity groups using physical strips + user jumpers.
 * Rails are represented by their own IDs and can be connected using jumpers.
 */
export function connectivityGroups(topology: BreadboardTopology): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (!p || p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const hole of topology.holes) parent.set(hole.id, hole.id);
  for (const jumper of topology.jumpers) {
    if (!parent.has(jumper.a)) parent.set(jumper.a, jumper.a);
    if (!parent.has(jumper.b)) parent.set(jumper.b, jumper.b);
    union(jumper.a, jumper.b);
  }

  // Physical five-hole strips.
  for (const hole of topology.holes) {
    for (const connected of intrinsicGroup(topology, hole)) union(hole.id, connected);
  }

  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    const group = groups.get(root) ?? [];
    group.push(id);
    groups.set(root, group);
  }
  return [...groups.values()];
}

export function addJumper(topology: BreadboardTopology, a: string, b: string): BreadboardJumper {
  if (a === b) throw new Error('A jumper must connect two different holes.');
  if (!topology.holes.some(h => h.id === a) || !topology.holes.some(h => h.id === b)) {
    throw new Error('Both jumper endpoints must be valid breadboard holes.');
  }
  const id = `jumper-${topology.jumpers.length + 1}`;
  const jumper = { id, a, b };
  topology.jumpers.push(jumper);
  return jumper;
}

export function placePin(topology: BreadboardTopology, componentId: string, pinId: string, targetHole: string): BreadboardPlacement {
  if (!topology.holes.some(h => h.id === targetHole)) throw new Error(`Unknown breadboard hole: ${targetHole}`);
  const existing = topology.placements.find(p => p.componentId === componentId && p.pinId === pinId);
  if (existing) existing.holeId = targetHole;
  else topology.placements.push({ componentId, pinId, holeId: targetHole });
  return existing ?? topology.placements[topology.placements.length - 1];
}

export function validateBreadboard(topology: BreadboardTopology): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const placement of topology.placements) {
    const key = `${placement.componentId}:${placement.pinId}`;
    if (seen.has(key)) errors.push(`Duplicate placement for ${key}.`);
    seen.add(key);
    if (!topology.holes.some(h => h.id === placement.holeId)) errors.push(`Placement ${key} references missing hole ${placement.holeId}.`);
  }
  for (const jumper of topology.jumpers) {
    if (jumper.a === jumper.b) errors.push(`Jumper ${jumper.id} has identical endpoints.`);
  }
  return errors;
}
