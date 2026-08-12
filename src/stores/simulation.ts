/**
 * Simulation store — manages the simulation engine state and results.
 * Pure data + actions; connects to the pure-TS solver.
 *
 * @module stores/simulation
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { solveDC, deviceResult, nodeVoltage, type DeviceResult } from '../core/solver.js';
import { runERC, type Violation } from '../core/erc.js';
import { useCircuitStore } from './circuit.js';

interface SimulationState {
  // Simulation status
  running: boolean;
  lastSolveTime: number;

  // DC solve results
  dcResult: Awaited<ReturnType<typeof solveDC>> | null;
  dcViolations: Violation[];

  // Transient simulation (future)
  transientRunning: boolean;
  timeStep: number;
  currentTime: number;

  // Actions
  runDC: () => void;
  stopSimulation: () => void;
  clearResults: () => void;

  // Queries
  getNodeVoltage: (nodeIndex: number) => number;
  getDeviceCurrent: (compId: string) => number | null;
  getDevicePower: (compId: string) => number | null;
  getDeviceBrightness: (compId: string) => number | null;
  getViolations: () => Violation[];
}

function createInitialState() {
  return {
    running: false,
    lastSolveTime: 0,
    dcResult: null,
    dcViolations: [],
    transientRunning: false,
    timeStep: 1e-6,
    currentTime: 0,
  };
}

type SimulationActions = {
  runDC: () => void;
  stopSimulation: () => void;
  clearResults: () => void;
  getNodeVoltage: (nodeIndex: number) => number;
  getDeviceCurrent: (compId: string) => number | null;
  getDevicePower: (compId: string) => number | null;
  getDeviceBrightness: (compId: string) => number | null;
  getViolations: () => Violation[];
};

export const useSimulationStore = create<SimulationState & SimulationActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    runDC: () => {
      const circuitStore = useCircuitStore.getState();
      const proj = circuitStore.getProject();

      if (proj.components.length === 0) {
        set((state) => {
          state.dcResult = null;
          state.dcViolations = [];
          state.running = false;
        });
        return;
      }

      set((state) => { state.running = true; });

      try {
        const result = solveDC(proj);
        const violations = runERC(proj, result);

        set((state) => {
          state.dcResult = result;
          state.dcViolations = violations;
          state.lastSolveTime = Date.now();
          state.running = false;
        });
      } catch (err) {
        set((state) => {
          state.running = false;
          state.dcResult = { ok: false, error: String(err) } as any;
        });
        console.error('DC solve failed:', err);
      }
    },

    stopSimulation: () => set((state) => {
      state.running = false;
      state.transientRunning = false;
    }),

    clearResults: () => set((state) => {
      state.dcResult = null;
      state.dcViolations = [];
    }),

    getNodeVoltage: (nodeIndex) => {
      const { dcResult } = get();
      if (!dcResult || !dcResult.ok) return 0;
      return nodeVoltage(dcResult, nodeIndex);
    },

    getDeviceCurrent: (compId) => {
      const { dcResult } = get();
      if (!dcResult || !dcResult.ok) return null;
      const d = deviceResult(dcResult, compId);
      return d?.current ?? null;
    },

    getDevicePower: (compId) => {
      const { dcResult } = get();
      if (!dcResult || !dcResult.ok) return null;
      const d = deviceResult(dcResult, compId);
      return d?.power ?? null;
    },

    getDeviceBrightness: (compId) => {
      const { dcResult } = get();
      if (!dcResult || !dcResult.ok) return null;
      const d = deviceResult(dcResult, compId);
      return d?.brightness ?? null;
    },

    getViolations: () => get().dcViolations,
  }))
);

// Re-export for convenience
export type { DeviceResult };