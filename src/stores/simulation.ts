/**
 * Simulation store — manages DC and transient simulation state.
 * Pure data + actions; connects to the pure-TS solvers.
 *
 * @module stores/simulation
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { solveDC, deviceResult, nodeVoltage, type DeviceResult } from '../core/solver.js';
import { runERC, type Violation } from '../core/erc.js';
import { simulateTransient, type TransientResult } from '../core/transient.js';
import { runArduino, type ArduinoRunResult } from '../core/arduinoRuntime.js';
import { buildArduinoRuntimeProject } from '../core/arduinoBridge.js';
import { buildBreadboardRuntimeProject } from '../core/breadboardBridge.js';
import { useCircuitStore } from './circuit.js';
import { useCodeStore } from './code.js';
import { useBreadboardStore } from './breadboard.js';

interface SimulationState {
  running: boolean;
  lastSolveTime: number;
  dcResult: Awaited<ReturnType<typeof solveDC>> | null;
  dcViolations: Violation[];
  arduinoResult: ArduinoRunResult | null;
  transientRunning: boolean;
  transientTime: Float64Array;
  transientVoltage: Float64Array;
  transientStep: number;
  transientDuration: number;
  transientProbe: { compId: string; pinId: string } | null;
  transientResult: TransientResult | null;
  timeStep: number;
  currentTime: number;
  runDC: () => void;
  runFirmware: () => ArduinoRunResult | null;
  runTransient: (probe?: { compId: string; pinId: string }) => void;
  stopSimulation: () => void;
  clearResults: () => void;
  setTransientStep: (step: number) => void;
  setTransientDuration: (duration: number) => void;
  setTransientProbe: (probe: { compId: string; pinId: string } | null) => void;
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
    arduinoResult: null,
    transientRunning: false,
    transientTime: new Float64Array(0),
    transientVoltage: new Float64Array(0),
    transientStep: 1e-3,
    transientDuration: 0.1,
    transientProbe: null,
    transientResult: null,
    timeStep: 1e-6,
    currentTime: 0,
  };
}

type SimulationActions = Pick<SimulationState,
  'runDC' | 'runFirmware' | 'runTransient' | 'stopSimulation' | 'clearResults' | 'setTransientStep' |
  'setTransientDuration' | 'setTransientProbe' | 'getNodeVoltage' | 'getDeviceCurrent' |
  'getDevicePower' | 'getDeviceBrightness' | 'getViolations'>;

export const useSimulationStore = create<SimulationState & SimulationActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    runFirmware: () => {
      const source = useCodeStore.getState().sourceCode;
      const result = runArduino(source);
      set((state) => { state.arduinoResult = result; });
      return result;
    },

    runDC: () => {
      const circuitStore = useCircuitStore.getState();
      let proj = circuitStore.getProject();

      if (proj.components.length === 0) {
        set((state) => {
          state.dcResult = null;
          state.dcViolations = [];
          state.running = false;
          state.arduinoResult = null;
        });
        return;
      }

      set((state) => { state.running = true; });

      try {
        const arduino = proj.components.some(c => c.type === 'arduino-uno');
        const firmware = arduino ? get().runFirmware() : null;
        if (firmware && firmware.errors.length > 0) {
          set((state) => {
            state.running = false;
            state.dcResult = { ok: false, error: firmware.errors.join(' '), nodeVoltages: new Float64Array(0), branchCurrents: new Float64Array(0), devBranches: [], iterations: 0, netlist: { pinNodes: [], nodeCount: 1, nets: [] } } as any;
          });
          return;
        }

        proj = buildBreadboardRuntimeProject(proj, useBreadboardStore.getState().get());
        if (firmware && arduino) proj = buildArduinoRuntimeProject(proj, firmware);

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

    runTransient: (probe) => {
      const circuitStore = useCircuitStore.getState();
      let proj = circuitStore.getProject();
      const selectedProbe = probe ?? get().transientProbe ?? null;

      set((state) => { state.transientRunning = true; });
      try {
        proj = buildBreadboardRuntimeProject(proj, useBreadboardStore.getState().get());
        const result = simulateTransient(proj, {
          duration: get().transientDuration,
          step: get().transientStep,
          probe: selectedProbe ?? undefined,
        });
        set((state) => {
          state.transientRunning = false;
          state.transientResult = result;
          state.transientTime = result.time;
          state.transientVoltage = result.voltage;
          state.transientProbe = selectedProbe;
          state.currentTime = result.time.length ? result.time[result.time.length - 1] : 0;
        });
      } catch (err) {
        const failure: TransientResult = {
          ok: false,
          time: new Float64Array(0),
          voltage: new Float64Array(0),
          probeNode: 0,
          maxVoltage: 0,
          minVoltage: 0,
          error: String(err),
        };
        set((state) => {
          state.transientRunning = false;
          state.transientResult = failure;
          state.transientTime = failure.time;
          state.transientVoltage = failure.voltage;
        });
      }
    },

    stopSimulation: () => set((state) => {
      state.running = false;
      state.transientRunning = false;
    }),

    clearResults: () => set((state) => {
      state.dcResult = null;
      state.dcViolations = [];
      state.arduinoResult = null;
      state.transientResult = null;
      state.transientTime = new Float64Array(0);
      state.transientVoltage = new Float64Array(0);
      state.currentTime = 0;
    }),

    setTransientStep: (step) => set((state) => {
      state.transientStep = Math.max(1e-6, Math.min(1, step));
    }),

    setTransientDuration: (duration) => set((state) => {
      state.transientDuration = Math.max(1e-3, Math.min(10, duration));
    }),

    setTransientProbe: (probe) => set((state) => {
      state.transientProbe = probe;
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

export type { DeviceResult };
