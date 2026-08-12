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
  wires: Map<number, Wire>;  // Changed from array to Map for stable wire IDs
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
  getWire: (wireId: number) => Wire | undefined;
  getConnectedWires: (compId: string, pinId: string) => { wire: Wire; id: number }[];
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const DEFAULT_GRID_SIZE = 20;

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

    // Components
    addComponent: (comp) => set((state) => {
      state.components.set(comp.id, comp);
    }),

    removeComponent: (id) => set((state) => {
      // Remove connected wires
      const wiresToRemove: number[] = [];
      state.wires.forEach((w, wireId) => {
        if (w.a.cid === id || w.b.cid === id) {
          wiresToRemove.push(wireId);
        }
      });
      wiresToRemove.forEach(wireId => {
        state.wires.delete(wireId);
        state.selection.wireIds.delete(wireId);
      });
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
    addWire: (wire: Wire) => {
      let newWireId: number;
      set((state) => {
        newWireId = state.nextWireId++;
        state.wires.set(newWireId, wire);
      });
      return newWireId!;
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
      wiresToRemove.forEach(wireId => {
        state.wires.delete(wireId);
        state.selection.wireIds.delete(wireId);
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
      state.selection.wireIds.clear();
      state.components.forEach((_, id) => state.selection.componentIds.add(id));
      state.wires.forEach((_, wireId) => state.selection.wireIds.add(wireId));
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
      state.wires.clear();
      // Restore wires with stable IDs
      let maxWireId = -1;
      proj.wires.forEach((wire, idx) => {
        const wireId = idx; // Use sequential IDs from saved project
        state.wires.set(wireId, wire);
        if (wireId > maxWireId) maxWireId = wireId;
      });
      state.nextWireId = maxWireId + 1;
      state.selection.componentIds.clear();
      state.selection.wireIds.clear();
      if (proj.metadata?.gridSize) state.gridSize = proj.metadata.gridSize;
    }),

    getProject: () => {
      const { components, wires, gridSize } = get();
      return createProject({
        name: 'Untitled Circuit',
        components: [...components.values()],
        wires: [...wires.values()],
        metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize },
      });
    },

    // Utility
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