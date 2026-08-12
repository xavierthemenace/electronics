import { describe, expect, it } from 'vitest';
import {
  DigitalSimulator,
  fallingEdges,
  logicGate,
  logicNot,
  resolveDrivers,
  risingEdges,
} from './digital.js';

describe('digital logic primitives', () => {
  it('implements basic tri-state logic', () => {
    expect(logicNot(0)).toBe(1);
    expect(logicNot(1)).toBe(0);
    expect(logicNot('Z')).toBe('X');
    expect(logicGate('AND', [1, 1])).toBe(1);
    expect(logicGate('AND', [1, 0])).toBe(0);
    expect(logicGate('OR', [0, 1])).toBe(1);
    expect(logicGate('XOR', [1, 0])).toBe(1);
    expect(logicGate('XOR', [1, 'Z'])).toBe('X');
  });

  it('resolves floating and contending drivers', () => {
    expect(resolveDrivers([])).toBe('Z');
    expect(resolveDrivers(['Z', 1])).toBe(1);
    expect(resolveDrivers([0, 0, 'Z'])).toBe(0);
    expect(resolveDrivers([0, 1])).toBe('X');
  });

  it('propagates a gate after its configured delay', () => {
    const sim = new DigitalSimulator();
    sim.addGate({ id: 'not1', kind: 'NOT', inputs: ['a'], output: 'y', delay: 10 });

    sim.setNet('a', 0, 0);
    sim.run(5);
    expect(sim.getNet('y')).toBe('X');

    sim.run(10);
    expect(sim.getNet('y')).toBe(1);
    expect(sim.waveform('y').samples).toEqual([{ time: 10, value: 1 }]);
  });

  it('captures edges for a logic analyzer', () => {
    const sim = new DigitalSimulator();
    sim.setNet('clk', 0, 0);
    sim.setNet('clk', 1, 5);
    sim.setNet('clk', 0, 10);
    sim.setNet('clk', 1, 15);
    sim.run(20);

    const waveform = sim.waveform('clk');
    expect(risingEdges(waveform)).toEqual([5, 15]);
    expect(fallingEdges(waveform)).toEqual([10]);
  });
});
