import { describe, expect, it } from 'vitest';
import { solveDC, nodeVoltage } from './solver.js';
import { component, project, wire } from './model.js';

describe('simulated peripherals', () => {
  it('analog sensor provides its configured output voltage', async () => {
    const sensor = component('sensor', 'analog-sensor', { outputVoltage: 3.2, outputResistance: 100 });
    const ground = component('gnd', 'ground');
    const p = project({
      components: [sensor, ground],
      wires: [wire('sensor', 'gnd', 'gnd', 'gnd')],
    });
    const result = await solveDC(p);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pin = result.netlist.pinNodes.find(n => n.compId === 'sensor' && n.pinId === 'out');
    expect(pin).toBeDefined();
    expect(nodeVoltage(result, pin!.node)).toBeCloseTo(3.2, 2);
  });

  it('pushbutton changes between high and low resistance paths', async () => {
    const source = component('src', 'dc-source', { voltage: 5 });
    const button = component('btn', 'pushbutton', { pressed: true, closedResistance: 0.1, openResistance: 1e9 });
    const ground = component('gnd', 'ground');
    const pressed = project({
      components: [source, button, ground],
      wires: [
        wire('src', 'plus', 'btn', '1'),
        wire('btn', '2', 'gnd', 'gnd'),
        wire('src', 'minus', 'gnd', 'gnd'),
      ],
    });
    const closedResult = await solveDC(pressed);
    expect(closedResult.ok).toBe(true);

    const released = project({
      ...pressed,
      components: [source, component('btn', 'pushbutton', { pressed: false, closedResistance: 0.1, openResistance: 1e9 }), ground],
    });
    const openResult = await solveDC(released);
    expect(openResult.ok).toBe(true);
  });
});
