/**
 * Project store — handles project metadata, file operations, export/import.
 *
 * @module stores/project
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CircuitProject } from '../core/model.js';
import { useCircuitStore } from './circuit.js';

interface ProjectState {
  // Project metadata
  name: string;
  modified: boolean;
  fileHandle: FileSystemFileHandle | null;
  lastSaved: number;

  // Actions
  setName: (name: string) => void;
  markModified: () => void;
  markSaved: () => void;

  // File operations
  newProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  loadProjectFile: (file: File) => Promise<void>;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  exportToHandle: (handle: FileSystemFileHandle) => Promise<void>;


  // Circuit integration
  loadCircuitProject: (proj: CircuitProject) => void;
  getCircuitProject: () => CircuitProject;
}

const DEFAULT_PROJECT_NAME = 'Untitled Circuit';

function createInitialState() {
  return {
    name: DEFAULT_PROJECT_NAME,
    modified: false,
    fileHandle: null,
    lastSaved: 0,
  };
}

type ProjectActions = {
  setName: (name: string) => void;
  markModified: () => void;
  markSaved: () => void;
  newProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  loadProjectFile: (file: File) => Promise<void>;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  exportToHandle: (handle: FileSystemFileHandle) => Promise<void>;
  loadCircuitProject: (proj: CircuitProject) => void;
  getCircuitProject: () => CircuitProject;
};

export const useProjectStore = create<ProjectState & ProjectActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    setName: (name) => set((state) => {
      state.name = name;
      state.modified = true;
    }),

    markModified: () => set((state) => { state.modified = true; }),
    markSaved: () => set((state) => {
      state.modified = false;
      state.lastSaved = Date.now();
    }),

    newProject: async () => {
      if (get().modified) {
        if (!confirm('Discard unsaved changes?')) return;
      }
      useCircuitStore.getState().loadProject({
        name: DEFAULT_PROJECT_NAME,
        components: [],
        wires: [],
        metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize: 20 },
      });
      set((state) => {
        state.name = DEFAULT_PROJECT_NAME;
        state.modified = false;
        state.fileHandle = null;
        state.lastSaved = 0;
      });
    },

    saveProject: async () => {
      if (get().fileHandle) {
        await get().exportToHandle(get().fileHandle!);
        get().markSaved();
      } else {
        await get().saveProjectAs();
      }
    },

    saveProjectAs: async () => {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: get().name + '.circuit.json',
          types: [{
            description: 'Circuit Project',
            accept: { 'application/json': ['.circuit.json', '.json'] },
          }],
        });
        await get().exportToHandle(handle);
        set((state) => {
          state.fileHandle = handle;
          state.name = handle.name.replace('.circuit.json', '').replace('.json', '');
        });
        get().markSaved();
      } catch (err) {
        console.error('Save failed:', err);
      }
    },

    loadProjectFile: async (file: File) => {
      const text = await file.text();
      get().importJSON(text);
      set((state) => {
        state.name = file.name.replace('.circuit.json', '').replace('.json', '');
        state.modified = false;
      });
    },

    exportJSON: () => {
      const proj = get().getCircuitProject();
      return JSON.stringify(proj, null, 2);
    },

    importJSON: (json: string) => {
      try {
        const proj = JSON.parse(json) as CircuitProject;
        get().loadCircuitProject(proj);
      } catch (err) {
        console.error('Import failed:', err);
        throw err;
      }
    },

    // Internal helper for FileSystemAccess API
    exportToHandle: async (handle: FileSystemFileHandle) => {
      const writable = await handle.createWritable();
      await writable.write(get().exportJSON());
      await writable.close();
    },

    loadCircuitProject: (proj: CircuitProject) => {
      useCircuitStore.getState().loadProject(proj);
      useCircuitStore.getState().saveToHistory();
    },

    getCircuitProject: () => useCircuitStore.getState().getProject(),
  }))
);