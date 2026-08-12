/**
 * Circuit store — manages the visual circuit (components, wires, selection).
 * Pure data + actions; no simulation logic here.
 *
 * @module stores/circuit
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CircuitComponent, Wire, Position, CircuitProject } from '../core/model.js';
import { project as createProject } from '../core/model.js';

interface SelectionState {
  componentIds: Set<string>;
  wireIds: Set<number>;
}

interface CircuitState {
  components: Map<string, CircuitComponent>;
  wires: Map<number, Wire>;
  nextWireId: number;
  selection: SelectionState;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number;
  snapToGrid: boolean;
  history: CircuitProject[];
  historyIndex: number;
  maxHistory: number;
  addComponent: (comp: CircuitComponent) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, position: Position) => void;
  rotateComponent: (id: string, rotation: number) => void;
  updateComponentParams: (id: string, params: Record<string, unknown>) => void;
  setComponentPosition: (id: string, position: Position) => void;
  addWire: (wire: Wire) => number;
  removeWire: (wireId: number) => void;
  removeWiresConnectedTo: (compId: string, pinId: string) => void;
  selectComponent: (id: string, multi?: boolean) => void;
  selectWire: (wireId: number, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void;
  resetViewport: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  snapPosition: (pos: Position) => Position;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadProject: (proj: CircuitProject) => void;
  getProject: () => CircuitProject;
  getComponent: (id: string) => CircuitComponent | undefined;
  getWire: (wireId: number) => Wire | undefined;
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const DEFAULT_GRID_SIZE = 20;

/**
 * Circuit data is persisted and can also arrive from older/incomplete editor
 * state. Normalize required component fields at the store boundary so every
 * component in the canonical Map satisfies the CircuitComponent contract.
 */
function normalizeComponent(comp: CircuitComponent): CircuitComponent {
  const raw = comp as CircuitComponent & { position?: Position };
  const x = Number.isFinite(raw.position?.x) ? raw.position.x : 0;
  const y = Number.isFinite(raw.position?.y) ? raw.position.y : 0;
  const rotation = Number.isFinite(raw.rotation) ? raw.rotation : 0;
  return {
    ...raw,
    id: String(raw.id),
    type: String(raw.type),
    params: raw.params && typeof raw.params === 'object' ? raw.params : {},
    position: { x, y },
    rotation: ((rotation % 360) + 360) % 360,
  };
}

function createInitialState(): Omit<CircuitState, keyof CircuitActions> {
  return {
    components: new Map(),
    wires: new Map(),
    nextWireId: 0,
    selection: { componentIds: new Set(), wireIds: new Set() },
    viewport: DEFAULT_VIEWPORT,
    gridSize: DEFAULT_GRID_SIZE,
    snapToGrid: true,
    history: [],
    historyIndex: -1,
    maxHistory: 100,
  };
}

type CircuitActions = {
  addComponent: (comp: CircuitComponent) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, position: Position) => void;
  rotateComponent: (id: string, rotation: number) => void;
  updateComponentParams: (id: string, params: Record<string, unknown>) => void;
  setComponentPosition: (id: string, position: Position) => void;
  addWire: (wire: Wire) => number;
  removeWire: (wireId: number) => void;
  removeWiresConnectedTo: (compId: string, pinId: string) => void;
  selectComponent: (id: string, multi?: boolean) => void;
  selectWire: (wireId: number, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void;
  resetViewport: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  snapPosition: (pos: Position) => Position;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadProject: (proj: CircuitProject) => void;
  getProject: () => CircuitProject;
  getComponent: (id: string) => CircuitComponent | undefined;
  getWire: (wireId: number) => Wire | undefined;
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
};

export const useCircuitStore = create<CircuitState & CircuitActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    addComponent: (comp) => set((state) => {
      const normalized = normalizeComponent(comp);
      state.components.set(normalized.id, normalized);
    }),

    removeComponent: (id) => set((state) => {
      const wiresToRemove: number[] = [];
      state.wires.forEach((w, wireId) => {
        if (w.a.cid === id || w.b.cid === id) wiresToRemove.push(wireId);
      });
      wiresToRemove.forEach((wireId) => {
        state.wires.delete(wireId);
        state.selection.wireIds.delete(wireId);
      });
      state.components.delete(id);
      state.selection.componentIds.delete(id);
    }),

    moveComponent: (id, position) => set((state) => {
      const comp = state.components.get(id);
      if (!comp) return;
      comp.position = {
        x: Number.isFinite(position.x) ? position.x : comp.position.x,
        y: Number.isFinite(position.y) ? position.y : comp.position.y,
      };
    }),

    rotateComponent: (id, rotation) => set((state) => {
      const comp = state.components.get(id);
      if (comp) comp.rotation = ((rotation % 360) + 360) % 360;
    }),

    updateComponentParams: (id, params) => set((state) => {
      const comp = state.components.get(id);
      if (comp) comp.params = { ...comp.params, ...params };
    }),

    setComponentPosition: (id, position) => set((state) => {
      const comp = state.components.get(id);
      if (!comp) return;
      const next = get().snapToGrid ? get().snapPosition(position) : position;
      comp.position = {
        x: Number.isFinite(next.x) ? next.x : comp.position.x,
        y: Number.isFinite(next.y) ? next.y : comp.position.y,
      };
    }),

    addWire: (wire: Wire) => {
      let newWireId = 0;
      set((state) => {
        newWireId = state.nextWireId++;
        state.wires.set(newWireId, wire);
      });
      return newWireId;
    },

    removeWire: (wireId) => set((state) => {
      state.wires.delete(wireId);
      state.selection.wireIds.delete(wireId);
    }),

    removeWiresConnectedTo: (compId, pinId) => set((state) => {
      const wiresToRemove: number[] = [];
      state.wires.forEach((w, wireId) => {
        if ((w.a.cid === compId && w.a.pid === pinId) || (w.b.cid === compId && w.b.pid === pinId)) {
          wiresToRemove.push(wireId);
        }
      });
      wiresToRemove.forEach((wireId) => {
        state.wires.delete(wireId);
        state.selection.wireIds.delete(wireId);
      });
    }),

    selectComponent: (id, multi = false) => set((state) => {
      // Never create a dangling selection. This is the invariant that keeps
      // InspectorPanel and other consumers safe during rapid UI transitions.
      if (!state.components.has(id)) return;
      if (!multi) {
        state.selection.componentIds.clear();
        state.selection.wireIds.clear();
      }
      state.selection.componentIds.add(id);
    }),

    selectWire: (wireId, multi = false) => set((state) => {
      if (!state.wires.has(wireId)) return;
      if (!multi) {
        state.selection.componentIds.clear();
        state.selection.wireIds.clear();
      }
      state.selection.wireIds.add(wireId);
    }),

    clearSelection: () => set((state) => {
      state.selection.componentIds.clear();
      state.selection.wireIds.clear();
    }),

    selectAll: () => set((state) => {
      state.selection.componentIds.clear();
      state.selection.wireIds.clear();
      state.components.forEach((_, id) => state.selection.componentIds.add(id));
      state.wires.forEach((_, wireId) => state.selection.wireIds.add(wireId));
    }),

    setViewport: (vp) => set((state) => {
      state.viewport = { ...state.viewport, ...vp };
    }),

    resetViewport: () => set((state) => {
      state.viewport = { ...DEFAULT_VIEWPORT };
    }),

    setGridSize: (size) => set((state) => {
      state.gridSize = Math.max(5, Math.min(100, size));
    }),

    toggleSnapToGrid: () => set((state) => {
      state.snapToGrid = !state.snapToGrid;
    }),

    snapPosition: (pos) => {
      const { gridSize, snapToGrid } = get();
      if (!snapToGrid) return pos;
      const g = gridSize;
      return { x: Math.round(pos.x / g) * g, y: Math.round(pos.y / g) * g };
    },

    saveToHistory: () => set((state) => {
      const proj = get().getProject();
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(proj);
      if (state.history.length > state.maxHistory) state.history.shift();
      else state.historyIndex++;
    }),

    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        const proj = state.history[state.historyIndex];
        get().loadProject(proj);
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const proj = state.history[state.historyIndex];
        get().loadProject(proj);
      }
    }),

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    loadProject: (proj) => set((state) => {
      state.components.clear();
      for (const c of proj.components ?? []) {
        const normalized = normalizeComponent(c);
        state.components.set(normalized.id, normalized);
      }

      state.wires.clear();
      let maxWireId = -1;
      for (const wire of proj.wires ?? []) {
        const wireId = maxWireId + 1;
        state.wires.set(wireId, wire);
        maxWireId = wireId;
      }
      state.nextWireId = maxWireId + 1;

      // Projects currently do not persist selection. Always start with a
      // selection that is guaranteed to reference the loaded state.
      state.selection.componentIds.clear();
      state.selection.wireIds.clear();
      if (proj.metadata?.gridSize) state.gridSize = proj.metadata.gridSize;
    }),

    getProject: () => {
      const { components, wires, gridSize } = get();
      return createProject({
        name: 'Untitled Circuit',
        components: [...components.values()].map(normalizeComponent),
        wires: [...wires.values()],
        metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize },
      });
    },

    getComponent: (id) => get().components.get(id),

    getWire: (wireId) => get().wires.get(wireId),

    getConnectedWires: (compId, pinId) => {
      const { wires } = get();
      const result: { wire: Wire; id: number }[] = [];
      wires.forEach((wire, wireId) => {
        if ((wire.a.cid === compId && wire.a.pid === pinId) ||
            (wire.b.cid === compId && wire.b.pid === pinId)) {
          result.push({ wire, id: wireId });
        }
      });
      return result;
    },
  }))
);
