import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CircuitProject } from '../core/model.js';
import { useCircuitStore } from './circuit.js';
import { useBreadboardStore } from './breadboard.js';
import { DEFAULT_ARDUINO_CODE, useCodeStore } from './code.js';

interface ProjectState {
  name: string; modified: boolean; fileHandle: FileSystemFileHandle | null; lastSaved: number;
  setName: (name: string) => void; markModified: () => void; markSaved: () => void;
  newProject: () => Promise<void>; saveProject: () => Promise<void>; saveProjectAs: () => Promise<void>;
  loadProjectFile: (file: File) => Promise<void>; exportJSON: () => string; importJSON: (json: string) => void;
  exportToHandle: (handle: FileSystemFileHandle) => Promise<void>;
  loadCircuitProject: (proj: CircuitProject) => void; getCircuitProject: () => CircuitProject;
}

const DEFAULT_PROJECT_NAME = 'Untitled Circuit';
const createInitialState = () => ({ name: DEFAULT_PROJECT_NAME, modified: false, fileHandle: null as FileSystemFileHandle | null, lastSaved: 0 });

export const useProjectStore = create<ProjectState>()(immer((set, get) => ({
  ...createInitialState(),
  setName: (name) => set(s => { s.name = name; s.modified = true; }),
  markModified: () => set(s => { s.modified = true; }),
  markSaved: () => set(s => { s.modified = false; s.lastSaved = Date.now(); }),

  newProject: async () => {
    if (get().modified && !confirm('Discard unsaved changes?')) return;
    const fresh = { name: DEFAULT_PROJECT_NAME, components: [], wires: [], sourceCode: DEFAULT_ARDUINO_CODE, metadata: { createdAt: Date.now(), modifiedAt: Date.now(), version: 1, gridSize: 20 } } as CircuitProject;
    useCircuitStore.getState().loadProject(fresh);
    useBreadboardStore.getState().reset();
    useCodeStore.getState().loadSourceCode(DEFAULT_ARDUINO_CODE);
    set(s => { s.name = DEFAULT_PROJECT_NAME; s.modified = false; s.fileHandle = null; s.lastSaved = 0; });
  },

  saveProject: async () => { if (get().fileHandle) { await get().exportToHandle(get().fileHandle!); get().markSaved(); } else await get().saveProjectAs(); },
  saveProjectAs: async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: `${get().name}.circuit.json`, types: [{ description: 'Circuit Project', accept: { 'application/json': ['.circuit.json', '.json'] } }] });
      await get().exportToHandle(handle);
      set(s => { s.fileHandle = handle; s.name = handle.name.replace('.circuit.json', '').replace('.json', ''); });
      get().markSaved();
    } catch (err) { if ((err as Error)?.name !== 'AbortError') console.error('Save failed:', err); }
  },
  loadProjectFile: async (file) => { await file.text().then(text => get().importJSON(text)); set(s => { s.name = file.name.replace('.circuit.json', '').replace('.json', ''); s.modified = false; }); },
  exportJSON: () => JSON.stringify(get().getCircuitProject(), null, 2),
  importJSON: (json) => { const proj = JSON.parse(json) as CircuitProject; get().loadCircuitProject(proj); },
  exportToHandle: async (handle) => { const writable = await handle.createWritable(); await writable.write(get().exportJSON()); await writable.close(); },
  loadCircuitProject: (proj) => {
    useCircuitStore.getState().loadProject(proj);
    useBreadboardStore.getState().load(proj.breadboard as any);
    useCodeStore.getState().loadSourceCode(proj.sourceCode);
    useCircuitStore.getState().saveToHistory();
  },
  getCircuitProject: () => ({
    ...useCircuitStore.getState().getProject(),
    name: get().name,
    sourceCode: useCodeStore.getState().sourceCode,
    breadboard: useBreadboardStore.getState().get(),
  }),
})));