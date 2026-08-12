import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { solveDC, deviceResult, nodeVoltage, type DeviceResult } from '../core/solver.js';
import { runERC, type Violation } from '../core/erc.js';
import { simulateTransient, type TransientResult } from '../core/transient.js';
import { runArduino, type ArduinoRunResult } from '../core/arduinoRuntime.js';
import { buildArduinoRuntimeProject } from '../core/arduinoBridge.js';
import { buildArduinoDeviceRuntimeProject } from '../core/deviceBridge.js';
import { buildBreadboardRuntimeProject } from '../core/breadboardBridge.js';
import { deriveArduinoInputs } from '../core/inputBridge.js';
import { useCircuitStore } from './circuit.js';
import { useCodeStore } from './code.js';
import { useBreadboardStore } from './breadboard.js';

interface SimulationState {
  running: boolean;
  lastSolveTime: number;
  dcResult: Awaited<ReturnType<typeof solveDC>> | null;
  dcViolations: Violation[];
  arduinoResult: ArduinoRunResult | null;
  arduinoDigitalInputs: Record<number, 0 | 1>;
  arduinoAnalogInputs: Record<number, number>;
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
  setArduinoDigitalInput: (pin: number, value: 0 | 1) => void;
  setArduinoAnalogInput: (pin: number, value: number) => void;
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
    arduinoDigitalInputs: {} as Record<number, 0 | 1>,
    arduinoAnalogInputs: {} as Record<number, number>,
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
  'runDC' | 'runFirmware' | 'setArduinoDigitalInput' | 'setArduinoAnalogInput' | 'runTransient' | 'stopSimulation' | 'clearResults' | 'setTransientStep' |
  'setTransientDuration' | 'setTransientProbe' | 'getNodeVoltage' | 'getDeviceCurrent' |
  'getDevicePower' | 'getDeviceBrightness' | 'getViolations'>;

export const useSimulationStore = create<SimulationState & SimulationActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    runFirmware: () => {
      const source = useCodeStore.getState().sourceCode;
      const project = useCircuitStore.getState().getProject();
      const derived = deriveArduinoInputs(project, {
        digital: get().arduinoDigitalInputs,
        analog: get().arduinoAnalogInputs,
      });
      const result = runArduino(source, derived);
      set((state) => { state.arduinoResult = result; });
      return result;
    },

    setArduinoDigitalInput: (pin, value) => set((state) => { state.arduinoDigitalInputs[pin] = value; }),
    setArduinoAnalogInput: (pin, value) => set((state) => { state.arduinoAnalogInputs[pin] = Math.max(0, Math.min(1023, Math.round(value))); }),

    runDC: () => {
      const circuitStore = useCircuitStore.getState();
      let proj = circuitStore.getProject();
      if (proj.components.length === 0) {
        set((state) => { state.dcResult = null; state.dcViolations = []; state.running = false; state.arduinoResult = null; });
        return;
      }
      set((state) => { state.running = true; });
      try {
        const arduino = proj.components.some(c => c.type === 'arduino-uno');
        const firmware = arduino ? get().runFirmware() : null;
        if (firmware && firmware.errors.length > 0) {
          set((state) => { state.running = false; state.dcResult = { ok: false, error: firmware.errors.join(' '), nodeVoltages: new Float64Array(0), branchCurrents: new Float64Array(0), devBranches: [], iterations: 0, netlist: { pinNodes: [], nodeCount: 1, nets: [] } } as any; });
          return;
        }
        proj = buildBreadboardRuntimeProject(proj, useBreadboardStore.getState().get());
        if (firmware && arduino) {
          proj = buildArduinoRuntimeProject(proj, firmware);
          proj = buildArduinoDeviceRuntimeProject(proj, firmware);
        }
        const result = solveDC(proj);
        const violations = runERC(proj, result);
        set((state) => { state.dcResult = result; state.dcViolations = violations; state.lastSolveTime = Date.now(); state.running = false; });
      } catch (err) {
        set((state) => { state.running = false; state.dcResult = { ok: false, error: String(err) } as any; });
        console.error('DC solve failed:', err);
      }
    },

    runTransient: (probe) => {
      let proj = useCircuitStore.getState().getProject();
      const selectedProbe = probe ?? get().transientProbe ?? null;
      set((state) => { state.transientRunning = true; });
      try {
        proj = buildBreadboardRuntimeProject(proj, useBreadboardStore.getState().get());
        const result = simulateTransient(proj, { duration: get().transientDuration, step: get().transientStep, probe: selectedProbe ?? undefined });
        set((state) => { state.transientRunning = false; state.transientResult = result; state.transientTime = result.time; state.transientVoltage = result.voltage; state.transientProbe = selectedProbe; state.currentTime = result.time.length ? result.time[result.time.length - 1] : 0; });
      } catch (err) {
        const failure: TransientResult = { ok: false, time: new Float64Array(0), voltage: new Float64Array(0), probeNode: 0, maxVoltage: 0, minVoltage: 0, error: String(err) };
        set((state) => { state.transientRunning = false; state.transientResult = failure; state.transientTime = failure.time; state.transientVoltage = failure.voltage; });
      }
    },

    stopSimulation: () => set((state) => { state.running = false; state.transientRunning = false; }),
    clearResults: () => set((state) => { state.dcResult = null; state.dcViolations = []; state.arduinoResult = null; state.transientResult = null; state.transientTime = new Float64Array(0); state.transientVoltage = new Float64Array(0); state.currentTime = 0; }),
    setTransientStep: (step) => set((state) => { state.transientStep = Math.max(1e-6, Math.min(1, step)); }),
    setTransientDuration: (duration) => set((state) => { state.transientDuration = Math.max(1e-3, Math.min(10, duration)); }),
    setTransientProbe: (probe) => set((state) => { state.transientProbe = probe; }),
    getNodeVoltage: (nodeIndex) => { const { dcResult } = get(); return !dcResult || !dcResult.ok ? 0 : nodeVoltage(dcResult, nodeIndex); },
    getDeviceCurrent: (compId) => { const { dcResult } = get(); if (!dcResult || !dcResult.ok) return null; return deviceResult(dcResult, compId)?.current ?? null; },
    getDevicePower: (compId) => { const { dcResult } = get(); if (!dcResult || !dcResult.ok) return null; return deviceResult(dcResult, compId)?.power ?? null; },
    getDeviceBrightness: (compId) => { const { dcResult } = get(); if (!dcResult || !dcResult.ok) return null; return deviceResult(dcResult, compId)?.brightness ?? null; },
    getViolations: () => get().dcViolations,
  }))
);

export type { DeviceResult };
