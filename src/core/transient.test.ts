import { describe, expect, it } from 'vitest';
import { component, project, wire } from './model.js';
import { simulateTransient } from './transient.js';

describe('RC transient simulator', () => {
  it('charges a capacitor toward the source voltage', () => {
    const source = component('v1', 'dc-source', { voltage: 5 }, { x: 0, y: 0 });
    const resistor = component('r1', 'resistor', { resistance: 1000 }, { x: 100, y: 0 });
    const capacitor = component('c1', 'capacitor', { capacitance: 1e-6 }, { x: 200, y: 0 });
    const ground = component('g1', 'ground', {}, { x: 200, y: 100 });

    const circuit = project({
      name: 'RC charge test',
      components: [source, resistor, capacitor, ground],
      wires: [
        wire('v1', 'plus', 'r1', '1'),
        wire('r1', '2', 'c1', '1'),
        wire('c1', '2', 'g1', 'gnd'),
        wire('v1', 'minus', 'g1', 'gnd'),
      ],
    });

    const result = simulateTransient(circuit, {
      duration: 0.005,
      step: 0.00001,
      probe: { compId: 'c1', pinId: '1' },
    });

    expect(result.ok).toBe(true);
    expect(result.voltage.length).toBeGreaterThan(400);
    expect(result.voltage[0]).toBeCloseTo(0, 6);
    expect(result.voltage[result.voltage.length - 1]).toBeGreaterThan(4.95);
    expect(result.maxVoltage).toBeGreaterThan(result.minVoltage);
  });
});
