import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CircuitComponent, Wire, Position, CircuitProject } from '../core/model.js';
import { project as createProject } from '../core/model.js';

interface SelectionState { componentIds: Set<string>; wireIds: Set<number>; }
interface CircuitState {
  components: Map<string, CircuitComponent>;
  wires: Wire[];
  selection: SelectionState;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number; snapToGrid: boolean;
  history: CircuitProject[]; historyIndex: number; maxHistory: number;
  addComponent: (comp: CircuitComponent) => void; removeComponent: (id: string) => void;
  moveComponent: (id: string, position: Position) => void; rotateComponent: (id: string, rotation: number) => void;
  updateComponentParams: (id: string, params: Record<string, unknown>) => void;
  setComponentPosition: (id: string, position: Position) => void;
  addWire: (wire: Wire) => number; removeWire: (wireId: number) => void;
  removeWiresConnectedTo: (compId: string, pinId: string) => void;
  selectComponent: (id: string, multi?: boolean) => void; selectWire: (wireId: number, multi?: boolean) => void;
  clearSelection: () => void; selectAll: () => void;
  setViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void; resetViewport: () => void;
  setGridSize: (size: number) => void; toggleSnapToGrid: () => void; snapPosition: (pos: Position) => Position;
  saveToHistory: () => void; undo: () => void; redo: () => void; canUndo: () => boolean; canRedo: () => boolean;
  loadProject: (proj: CircuitProject) => void; getProject: () => CircuitProject;
  getComponent: (id: string) => CircuitComponent | undefined; getWire: (wireId: number) => Wire | undefined;
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const DEFAULT_GRID_SIZE = 20;

function normalizeComponent(comp: CircuitComponent): CircuitComponent {
  const raw = comp as CircuitComponent & { position?: Position };
  const x = Number.isFinite(raw.position?.x) ? raw.position!.x : 0;
  const y = Number.isFinite(raw.position?.y) ? raw.position!.y : 0;
  const rotation = Number.isFinite(raw.rotation) ? raw.rotation! : 0;
  return { ...raw, id: String(raw.id), type: String(raw.type), params: raw.params && typeof raw.params === 'object' ? raw.params : {}, position: { x, y }, rotation: ((rotation % 360) + 360) % 360 };
}

function cloneProject(proj: CircuitProject): CircuitProject { return JSON.parse(JSON.stringify(proj)) as CircuitProject; }

export const useCircuitStore = create<CircuitState>()(immer((set, get) => ({
  components: new Map(), wires: [], selection: { componentIds: new Set(), wireIds: new Set() },
  viewport: { ...DEFAULT_VIEWPORT }, gridSize: DEFAULT_GRID_SIZE, snapToGrid: true,
  history: [], historyIndex: -1, maxHistory: 100,

  addComponent: (comp) => set((state) => { const c = normalizeComponent(comp); state.components.set(c.id, c); }),

  removeComponent: (id) => set((state) => {
    for (let i = state.wires.length - 1; i >= 0; i--) {
      const w = state.wires[i];
      if (w.a.cid === id || w.b.cid === id) {
        state.wires.splice(i, 1);
        state.selection.wireIds = new Set([...state.selection.wireIds].filter(n => n !== i).map(n => n > i ? n - 1 : n));
      }
    }
    state.components.delete(id); state.selection.componentIds.delete(id);
  }),

  moveComponent: (id, position) => set((state) => { const c = state.components.get(id); if (!c) return; if (Number.isFinite(position.x)) c.position.x = position.x; if (Number.isFinite(position.y)) c.position.y = position.y; }),
  rotateComponent: (id, rotation) => set((state) => { const c = state.components.get(id); if (c && Number.isFinite(rotation)) c.rotation = ((rotation % 360) + 360) % 360; }),
  updateComponentParams: (id, params) => set((state) => { const c = state.components.get(id); if (c) c.params = { ...c.params, ...params }; }),
  setComponentPosition: (id, position) => set((state) => {
    const c = state.components.get(id); if (!c) return; const g = state.gridSize;
    const p = state.snapToGrid ? { x: Math.round(position.x / g) * g, y: Math.round(position.y / g) * g } : position;
    if (Number.isFinite(p.x)) c.position.x = p.x; if (Number.isFinite(p.y)) c.position.y = p.y;
  }),

  addWire: (wire) => { let id = -1; set((state) => { id = state.wires.length; state.wires.push(wire); }); return id; },
  removeWire: (wireId) => set((state) => {
    if (wireId < 0 || wireId >= state.wires.length) return;
    state.wires.splice(wireId, 1);
    state.selection.wireIds = new Set([...state.selection.wireIds].filter(n => n !== wireId).map(n => n > wireId ? n - 1 : n));
  }),
  removeWiresConnectedTo: (compId, pinId) => set((state) => {
    for (let i = state.wires.length - 1; i >= 0; i--) {
      const w = state.wires[i];
      if ((w.a.cid === compId && w.a.pid === pinId) || (w.b.cid === compId && w.b.pid === pinId)) state.wires.splice(i, 1);
    }
    state.selection.wireIds.clear();
  }),

  selectComponent: (id, multi = false) => set((state) => { if (!state.components.has(id)) return; if (!multi) { state.selection.componentIds.clear(); state.selection.wireIds.clear(); } state.selection.componentIds.add(id); }),
  selectWire: (wireId, multi = false) => set((state) => { if (!state.wires[wireId]) return; if (!multi) { state.selection.componentIds.clear(); state.selection.wireIds.clear(); } state.selection.wireIds.add(wireId); }),
  clearSelection: () => set((state) => { state.selection.componentIds.clear(); state.selection.wireIds.clear(); }),
  selectAll: () => set((state) => { state.selection.componentIds.clear(); state.selection.wireIds.clear(); for (const id of state.components.keys()) state.selection.componentIds.add(id); state.wires.forEach((_, i) => state.selection.wireIds.add(i)); }),

  setViewport: (vp) => set((state) => { if (Number.isFinite(vp.x)) state.viewport.x = vp.x!; if (Number.isFinite(vp.y)) state.viewport.y = vp.y!; if (Number.isFinite(vp.zoom)) state.viewport.zoom = Math.max(.1, Math.min(8, vp.zoom!)); }),
  resetViewport: () => set((state) => { state.viewport = { ...DEFAULT_VIEWPORT }; }),
  setGridSize: (size) => set((state) => { state.gridSize = Math.max(5, Math.min(100, size)); }),
  toggleSnapToGrid: () => set((state) => { state.snapToGrid = !state.snapToGrid; }),
  snapPosition: (pos) => { const { gridSize, snapToGrid } = get(); return snapToGrid ? { x: Math.round(pos.x / gridSize) * gridSize, y: Math.round(pos.y / gridSize) * gridSize } : pos; },

  saveToHistory: () => {
    const snapshot = cloneProject(get().getProject());
    set((state) => {
      const next = state.history.slice(0, state.historyIndex + 1);
      if (!next.length || JSON.stringify(next[next.length - 1]) !== JSON.stringify(snapshot)) next.push(snapshot);
      while (next.length > state.maxHistory) next.shift();
      state.history = next; state.historyIndex = next.length - 1;
    });
  },
  undo: () => { const { history, historyIndex } = get(); if (historyIndex <= 0) return; const p = cloneProject(history[historyIndex - 1]); set((state) => { state.historyIndex = historyIndex - 1; state.components.clear(); for (const c of p.components) state.components.set(c.id, normalizeComponent(c)); state.wires = [...p.wires]; state.selection.componentIds.clear(); state.selection.wireIds.clear(); }); },
  redo: () => { const { history, historyIndex } = get(); if (historyIndex >= history.length - 1) return; const p = cloneProject(history[historyIndex + 1]); set((state) => { state.historyIndex = historyIndex + 1; state.components.clear(); for (const c of p.components) state.components.set(c.id, normalizeComponent(c)); state.wires = [...p.wires]; state.selection.componentIds.clear(); state.selection.wireIds.clear(); }); },
  canUndo: () => get().historyIndex > 0, canRedo: () => get().historyIndex < get().history.length - 1,

  loadProject: (proj) => set((state) => {
    state.components.clear();
    for (const c of proj.components ?? []) { const n = normalizeComponent(c); state.components.set(n.id, n); }
    state.wires = (proj.wires ?? []).filter(w => !!w?.a?.cid && !!w?.a?.pid && !!w?.b?.cid && !!w?.b?.pid);
    state.selection.componentIds.clear(); state.selection.wireIds.clear(); state.gridSize = proj.metadata?.gridSize ?? DEFAULT_GRID_SIZE; state.viewport = { ...DEFAULT_VIEWPORT };
  }),

  getProject: () => { const { components, wires, gridSize } = get(); return createProject({ name: 'Untitled Circuit', components: [...components.values()].map(normalizeComponent), wires: [...wires], metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize } }); },
  getComponent: (id) => get().components.get(id),
  getWire: (wireId) => get().wires[wireId],
  getConnectedWires: (compId, pinId) => get().wires.map((wire, id) => ({ wire, id })).filter(({ wire }) => (wire.a.cid === compId && (!pinId || wire.a.pid === pinId)) || (wire.b.cid === compId && (!pinId || wire.b.pid === pinId))),
})));