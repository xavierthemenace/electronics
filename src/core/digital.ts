/**
 * Digital event simulation primitives.
 *
 * This module intentionally stays independent of React and the analog solver.
 * It provides tri-state logic, deterministic event ordering, combinational gates,
 * edge detection, and waveform capture. The circuit editor can later map actual
 * component nets into these primitives without changing the API.
 */

export type LogicValue = 0 | 1 | 'Z' | 'X';

export interface DigitalEvent {
  time: number;
  net: string;
  value: LogicValue;
}

export interface DigitalSample {
  time: number;
  value: LogicValue;
}

export interface DigitalWaveform {
  net: string;
  samples: DigitalSample[];
}

export type GateKind = 'NOT' | 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR';

export interface GateDefinition {
  id: string;
  kind: GateKind;
  inputs: string[];
  output: string;
  delay: number;
}

function normalize(value: LogicValue): LogicValue {
  return value === 0 || value === 1 || value === 'Z' || value === 'X' ? value : 'X';
}

function resolveInput(value: LogicValue): 0 | 1 | 'unknown' {
  if (value === 0 || value === 1) return value;
  return 'unknown';
}

export function logicNot(value: LogicValue): LogicValue {
  const v = resolveInput(value);
  return v === 'unknown' ? 'X' : v === 0 ? 1 : 0;
}

export function logicGate(kind: GateKind, inputs: LogicValue[]): LogicValue {
  const values = inputs.map(resolveInput);
  if (kind === 'NOT') return logicNot(inputs[0] ?? 'X');
  if (!values.length) return 'X';

  if (kind === 'AND' || kind === 'NAND') {
    if (values.includes(0)) return kind === 'AND' ? 0 : 1;
    if (values.includes('unknown')) return 'X';
    return kind === 'AND' ? 1 : 0;
  }

  if (kind === 'OR' || kind === 'NOR') {
    if (values.includes(1)) return kind === 'OR' ? 1 : 0;
    if (values.includes('unknown')) return 'X';
    return kind === 'OR' ? 0 : 1;
  }

  // XOR: any unknown input makes the parity unknown. Z is treated as unknown.
  if (values.includes('unknown')) return 'X';
  const ones = values.filter(v => v === 1).length;
  const result = (ones % 2) as 0 | 1;
  return kind === 'XOR' ? result : 'X';
}

/** Resolve multiple drivers on one net using simple digital contention rules. */
export function resolveDrivers(drivers: LogicValue[]): LogicValue {
  const active = drivers.filter(v => v !== 'Z');
  if (!active.length) return 'Z';
  if (active.includes('X')) return 'X';
  const has0 = active.includes(0);
  const has1 = active.includes(1);
  if (has0 && has1) return 'X';
  return has1 ? 1 : 0;
}

export class DigitalSimulator {
  private readonly values = new Map<string, LogicValue>();
  private readonly gates = new Map<string, GateDefinition>();
  private readonly queue: DigitalEvent[] = [];
  private readonly waveforms = new Map<string, DigitalSample[]>();
  private _time = 0;

  get time(): number { return this._time; }

  addGate(gate: GateDefinition): void {
    if (gate.kind === 'NOT' && gate.inputs.length !== 1) {
      throw new Error(`NOT gate ${gate.id} requires exactly one input`);
    }
    if (gate.inputs.length < 2 && gate.kind !== 'NOT') {
      throw new Error(`${gate.kind} gate ${gate.id} requires at least two inputs`);
    }
    if (!Number.isFinite(gate.delay) || gate.delay < 0) {
      throw new Error(`Gate ${gate.id} has an invalid delay`);
    }
    this.gates.set(gate.id, { ...gate, inputs: [...gate.inputs] });
    if (!this.values.has(gate.output)) this.values.set(gate.output, 'X');
  }

  setNet(net: string, value: LogicValue, time = this._time): void {
    this.schedule({ time, net, value: normalize(value) });
  }

  schedule(event: DigitalEvent): void {
    if (!Number.isFinite(event.time) || event.time < this._time) {
      throw new Error(`Cannot schedule digital event in the past: ${event.time}`);
    }
    this.queue.push({ ...event, value: normalize(event.value) });
    this.queue.sort((a, b) => a.time - b.time);
  }

  run(until: number): void {
    if (!Number.isFinite(until) || until < this._time) throw new Error('Invalid simulation end time');

    while (this.queue.length && this.queue[0].time <= until) {
      const event = this.queue.shift()!;
      this._time = event.time;
      const previous = this.values.get(event.net) ?? 'X';
      if (previous === event.value) continue;
      this.values.set(event.net, event.value);
      this.record(event.net, event.time, event.value);
      this.propagate(event.net, event.time);
    }

    this._time = until;
  }

  getNet(net: string): LogicValue {
    return this.values.get(net) ?? 'Z';
  }

  waveform(net: string): DigitalWaveform {
    return { net, samples: [...(this.waveforms.get(net) ?? [])] };
  }

  reset(): void {
    this.values.clear();
    this.queue.length = 0;
    this.waveforms.clear();
    this._time = 0;
    for (const gate of this.gates.values()) this.values.set(gate.output, 'X');
  }

  private record(net: string, time: number, value: LogicValue): void {
    const samples = this.waveforms.get(net) ?? [];
    if (!samples.length || samples[samples.length - 1].value !== value) {
      samples.push({ time, value });
      this.waveforms.set(net, samples);
    }
  }

  private propagate(changedNet: string, time: number): void {
    for (const gate of this.gates.values()) {
      if (!gate.inputs.includes(changedNet)) continue;
      const inputs = gate.inputs.map(input => this.values.get(input) ?? 'Z');
      const output = logicGate(gate.kind, inputs);
      const at = time + gate.delay;
      this.schedule({ time: at, net: gate.output, value: output });
    }
  }
}

export function risingEdges(waveform: DigitalWaveform): number[] {
  const edges: number[] = [];
  for (let i = 1; i < waveform.samples.length; i++) {
    const a = waveform.samples[i - 1];
    const b = waveform.samples[i];
    if (a.value === 0 && b.value === 1) edges.push(b.time);
  }
  return edges;
}

export function fallingEdges(waveform: DigitalWaveform): number[] {
  const edges: number[] = [];
  for (let i = 1; i < waveform.samples.length; i++) {
    const a = waveform.samples[i - 1];
    const b = waveform.samples[i];
    if (a.value === 1 && b.value === 0) edges.push(b.time);
  }
  return edges;
}
