import { describe, expect, it } from 'vitest';
import { getDefinition, listComponents } from './registry.js';
import { project, component, wire } from './model.js';
import { solveDC } from './solver.js';

const CORE_ACTIVE = ['capacitor', 'inductor', 'potentiometer', 'zener', 'bjt-npn', 'mosfet-n', 'and', 'not', 'arduino-uno'];

describe('complete component library', () => {
  it('has no planned core components left', () => {
    const core = listComponents().filter(d => ['infrastructure', 'power', 'passive', 'semiconductor', 'digital', 'embedded'].includes(d.category));
    expect(core.some(d => d.status === 'planned')).toBe(false);
    for (const type of CORE_ACTIVE) expect(getDefinition(type)?.status).toBe('modelled');
  });

  it('exposes a device model for every modelled component', () => {
    for (const def of listComponents().filter(d => d.status === 'modelled')) {
      expect(typeof def.device, `${def.type} should have a device model`).toBe('function');
    }
  });

  it('solves a potentiometer divider', () => {
    const p = project({
      components: [
        component('v', 'dc-source', { voltage: 5 }, { x: 0, y: 0 }),
        component('pot', 'potentiometer', { resistance: 10000, wiper: 0.5 }, { x: 100, y: 0 }),
        component('g', 'ground', {}, { x: 200, y: 0 }),
      ],
      wires: [wire('v', 'plus', 'pot', 'a'), wire('pot', 'b', 'g', 'gnd'), wire('v', 'minus', 'g', 'gnd')],
    });
    const result = solveDC(p);
    expect(result.ok).toBe(true);
  });

  it('solves a MOSFET switched resistor load without crashing', () => {
    const p = project({
      components: [
        component('v', 'dc-source', { voltage: 5 }, { x: 0, y: 0 }),
        component('r', 'resistor', { resistance: 220 }, { x: 100, y: 0 }),
        component('m', 'mosfet-n', { vth: 2, rdsOn: 0.05 }, { x: 200, y: 0 }),
        component('g', 'ground', {}, { x: 300, y: 0 }),
      ],
      wires: [wire('v', 'plus', 'r', '1'), wire('r', '2', 'm', 'd'), wire('m', 's', 'g', 'gnd'), wire('v', 'minus', 'g', 'gnd'), wire('v', 'plus', 'm', 'g')],
    });
    const result = solveDC(p);
    expect(result.ok).toBe(true);
  });
});
