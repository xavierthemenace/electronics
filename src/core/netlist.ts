/**
 * Netlist builder: components + wires → conductive nets with node indices.
 *
 * Ground (node 0) is established by:
 *   - any component flagged `isGround` (its pin's net),
 *   - or a net explicitly named "GND"/"0".
 *
 * @module core/netlist
 */

import { getDefinition } from './registry.js';
import type { CircuitProject, Netlist, PinNode, CircuitNet, TerminalRef } from './model.js';

/** A compact union-find. */
function makeUnionFind() {
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // path compression
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  }
  function union(a: string, b: string): string {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
    return rb;
  }
  return { find, union };
}

/** Canonical key for a terminal: "cid:pid". */
function tkey(cid: string, pid: string): string {
  return `${cid}:${pid}`;
}

/**
 * Build a netlist from a CircuitProject.
 * @param project CircuitProject
 * @returns Netlist with pinNodes, nodeCount, and nets
 */
export function buildNetlist(project: CircuitProject): Netlist {
  const uf = makeUnionFind();
  const terminalNet = new Map<string, string>(); // tkey -> root representative
  const explicitNames = new Map<string, string>(); // root -> name

  // Seed every pin as its own net, then merge wires.
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def) {
      throw new Error(`Unknown component type "${c.type}" (id ${c.id})`);
    }
    for (const p of def.pins) {
      const k = tkey(c.id, p.id);
      uf.find(k); // register
      terminalNet.set(k, k);
    }
    if (def.isGround) {
      // Merge all ground pins to a single sentinel net named "0".
      for (const p of def.pins) uf.union(tkey(c.id, p.id), '0');
      explicitNames.set('0', 'GND');
    }
  }

  for (const w of project.wires) {
    const a = tkey(w.a.cid, w.a.pid);
    const b = tkey(w.b.cid, w.b.pid);
    uf.union(a, b);
  }

  // Collect roots and assign node indices. Ground root first -> index 0.
  const rootToIndex = new Map<string, number>();
  rootToIndex.set('0', 0); // node 0 is ground even if no ground component yet (used by floor)

  // Determine all roots.
  const roots = new Set<string>();
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def) continue;
    for (const p of def.pins) roots.add(uf.find(tkey(c.id, p.id)));
  }

  // Ensure ground root is present and first.
  let nextIdx = 1;
  for (const root of roots) {
    if (root === '0') continue;
    if (!rootToIndex.has(root)) rootToIndex.set(root, nextIdx++);
  }

  // Map each (component, pin) to its node index.
  const pinNodes: PinNode[] = [];
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def) continue;
    for (const p of def.pins) {
      const root = uf.find(tkey(c.id, p.id));
      pinNodes.push({
        compId: c.id,
        compType: c.type,
        pinId: p.id,
        node: rootToIndex.get(root) ?? -1,
        root,
      });
    }
  }

  // Net summary for the editor / ERC (names + members).
  const rootMembers = new Map<string, TerminalRef[]>();
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def) continue;
    for (const p of def.pins) {
      const root = uf.find(tkey(c.id, p.id));
      if (!rootMembers.has(root)) rootMembers.set(root, []);
      rootMembers.get(root)!.push({ cid: c.id, pid: p.id });
    }
  }
  const nets: CircuitNet[] = [...rootMembers.entries()].map(([root, members]) => ({
    id: root,
    node: rootToIndex.get(root) ?? -1,
    name: explicitNames.get(root) ?? `N${String(rootToIndex.get(root) ?? 0).padStart(3, '0')}`,
    isGround: root === '0',
    members,
  }));

  const nodeCount = nextIdx; // total non-ground nodes + 1 (ground)

  return { pinNodes, nodeCount, nets };
}

/** Look up the node index for a given (compId, pinId). */
export function nodeOf(netlist: Netlist, compId: string, pinId: string): number {
  const entry = netlist.pinNodes.find((p) => p.compId === compId && p.pinId === pinId);
  return entry ? entry.node : -1;
}