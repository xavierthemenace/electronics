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
  // Circuit data
  components: Map<string, CircuitComponent>;
  wires: Wire[];
  nextWireId: number;

  // Selection
  selection: SelectionState;

  // Viewport
  viewport: { x: number; y: number; zoom: number };

  // Grid
  gridSize: number;
  snapToGrid: boolean;

  // History for undo/redo
  history: CircuitProject[];
  historyIndex: number;
  maxHistory: number;

  // Actions
  // Components
  addComponent: (comp: CircuitComponent) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, position: Position) => void;
  rotateComponent: (id: string, rotation: number) => void;
  updateComponentParams: (id: string, params: Record<string, unknown>) => void;
  setComponentPosition: (id: string, position: Position) => void;

  // Wires
  addWire: (wire: Wire) => number;
  removeWire: (wireId: number) => void;
  removeWiresConnectedTo: (compId: string, pinId: string) => void;

  // Selection
  selectComponent: (id: string, multi?: boolean) => void;
  selectWire: (wireId: number, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Viewport
  setViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void;
  resetViewport: () => void;

  // Grid
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  snapPosition: (pos: Position) => Position;

  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Project load/save
  loadProject: (proj: CircuitProject) => void;
  getProject: () => CircuitProject;

  // Utility
  getComponent: (id: string) => CircuitComponent | undefined;
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const DEFAULT_GRID_SIZE = 20;

function createInitialState(): Omit<CircuitState, keyof CircuitActions> {
  return {
    components: new Map(),
    wires: [],
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
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
};

export const useCircuitStore = create<CircuitState & CircuitActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    // Components
    addComponent: (comp) => set((state) => {
      state.components.set(comp.id, comp);
    }),

    removeComponent: (id) => set((state) => {
      const comp = state.components.get(id);
      if (!comp) return;
      // Remove connected wires
      state.wires = state.wires.filter((w, idx) => {
        const connected = w.a.cid === id || w.b.cid === id;
        if (connected) {
          state.selection.wireIds.delete(idx);
        }
        return !connected;
      });
      // Re-index wire IDs after removal
      state.wires = state.wires; // keep as is, indices shift but selection uses Set
      state.components.delete(id);
      state.selection.componentIds.delete(id);
    }),

    moveComponent: (id, position) => set((state) => {
      const comp = state.components.get(id);
      if (comp) comp.position = position;
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
      if (comp && get().snapToGrid) {
        const snap = get().snapPosition(position);
        comp.position = snap;
      } else if (comp) {
        comp.position = position;
      }
    }),

    // Wires
    addWire: ((wire: Wire) => set((state): number => {
      const id = state.nextWireId++;
      state.wires.push(wire);
      return id;
    })) as (wire: Wire) => number,

    removeWire: (wireId) => set((state) => {
      if (wireId >= 0 && wireId < state.wires.length) {
        state.wires[wireId] = null as any; // Mark as deleted, keep indices stable
        state.selection.wireIds.delete(wireId);
      }
    }),

    removeWiresConnectedTo: (compId, pinId) => set((state) => {
      state.wires = state.wires.map((w, idx) => {
        if (w && ((w.a.cid === compId && w.a.pid === pinId) || (w.b.cid === compId && w.b.pid === pinId))) {
          state.selection.wireIds.delete(idx);
          return null as any;
        }
        return w;
      });
    }),

    // Selection
    selectComponent: (id, multi = false) => set((state) => {
      if (!multi) {
        state.selection.componentIds.clear();
        state.selection.wireIds.clear();
      }
      state.selection.componentIds.add(id);
    }),

    selectWire: (wireId, multi = false) => set((state) => {
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
      state.components.forEach((_, id) => state.selection.componentIds.add(id));
      state.wires.forEach((_, idx) => state.selection.wireIds.add(idx));
    }),

    // Viewport
    setViewport: (vp) => set((state) => {
      state.viewport = { ...state.viewport, ...vp };
    }),

    resetViewport: () => set((state) => {
      state.viewport = DEFAULT_VIEWPORT;
    }),

    // Grid
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
      return {
        x: Math.round(pos.x / g) * g,
        y: Math.round(pos.y / g) * g,
      };
    },

    // History
    saveToHistory: () => set((state) => {
      const proj = get().getProject();
      // Truncate future history
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(proj);
      if (state.history.length > state.maxHistory) {
        state.history.shift();
      } else {
        state.historyIndex++;
      }
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

    // Project load/save
    loadProject: (proj) => set((state) => {
      state.components.clear();
      for (const c of proj.components) state.components.set(c.id, c);
      state.wires = proj.wires.filter(Boolean);
      state.nextWireId = state.wires.length;
      state.selection.componentIds.clear();
      state.selection.wireIds.clear();
      if (proj.metadata?.gridSize) state.gridSize = proj.metadata.gridSize;
    }),

    getProject: () => {
      const { components, wires, gridSize } = get();
      return createProject({
        name: 'Untitled Circuit',
        components: [...components.values()],
        wires: wires.filter(Boolean) as Wire[],
        metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize },
      });
    },

    // Utility
    getComponent: (id) => get().components.get(id),

    getConnectedWires: (compId, pinId) => {
      const { wires } = get();
      return wires
        .map((w, idx) => ({ wire: w, id: idx }))
        .filter(({ wire }) => wire &&
          ((wire.a.cid === compId && wire.a.pid === pinId) ||
           (wire.b.cid === compId && wire.b.pid === pinId)));
    },
  }))
);