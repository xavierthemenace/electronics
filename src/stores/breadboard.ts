import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { addJumper, createBreadboard, placePin, type BreadboardTopology } from '../core/breadboard.js';

interface BreadboardState {
  topology: BreadboardTopology;
  reset: () => void;
  jumper: (a: string, b: string) => void;
  place: (componentId: string, pinId: string, holeId: string) => void;
  load: (topology?: BreadboardTopology) => void;
  get: () => BreadboardTopology;
}

export const useBreadboardStore = create<BreadboardState>()(immer((set, get) => ({
  topology: createBreadboard(),
  reset: () => set(s => { s.topology = createBreadboard(); }),
  jumper: (a, b) => set(s => { addJumper(s.topology, a, b); }),
  place: (componentId, pinId, holeId) => set(s => { placePin(s.topology, componentId, pinId, holeId); }),
  load: (topology) => set(s => { s.topology = topology ? structuredClone(topology) : createBreadboard(); }),
  get: () => get().topology,
})));
