import { describe, expect, it } from 'vitest';
import { getDefinition, listComponents } from './registry.js';
import { project, component, wire } from './model.js';
import { solveDC } from './solver.js';
import { simulateTransient } from './transient.js';

const CORE_ACTIVE = ['capacitor', 'inductor', 'potentiometer', 'zener', 'bjt-npn', 'mosfet-n', 'and', 'not', 'arduino-uno'];
const ALL_EXPECTED = ['ground','dc-source','resistor','diode','led','capacitor','inductor','potentiometer','zener','bjt-npn','mosfet-n','and','not','arduino-uno','analog-sensor','pushbutton','dc-motor','servo','lcd-1602','i2c-temp','i2c-eeprom','spi-dac','spi-flash'];

describe('complete component library', () => {
  it('registers every shipped component and leaves no planned entries', () => {
    const defs = listComponents();
    for (const type of ALL_EXPECTED) expect(getDefinition(type), type).not.toBeNull();
    expect(defs.some(d => d.status === 'planned')).toBe(false);
    for (const type of CORE_ACTIVE) expect(getDefinition(type)?.status).toBe('modelled');
  });

  it('exposes a device model for every modelled component', () => {
    for (const def of listComponents().filter(d => d.status === 'modelled')) expect(typeof def.device, `${def.type} should have a device model`).toBe('function');
  });

  it('solves a potentiometer divider', () => {
    const p = project({ components:[component('v','dc-source',{voltage:5}),component('pot','potentiometer',{resistance:10000,wiper:.5}),component('g','ground')], wires:[wire('v','plus','pot','a'),wire('pot','b','g','gnd'),wire('v','minus','g','gnd')] });
    expect(solveDC(p).ok).toBe(true);
  });

  it('solves a MOSFET switched load', () => {
    const p = project({ components:[component('v','dc-source',{voltage:5}),component('r','resistor',{resistance:220}),component('m','mosfet-n',{vth:2,rdsOn:.05}),component('g','ground')], wires:[wire('v','plus','r','1'),wire('r','2','m','d'),wire('m','s','g','gnd'),wire('v','minus','g','gnd'),wire('v','plus','m','g')] });
    expect(solveDC(p).ok).toBe(true);
  });

  it('supports an RL transient circuit', () => {
    const p = project({ components:[component('v','dc-source',{voltage:5}),component('r','resistor',{resistance:10}),component('l','inductor',{inductance:.01,seriesResistance:.1}),component('g','ground')], wires:[wire('v','plus','r','1'),wire('r','2','l','1'),wire('l','2','g','gnd'),wire('v','minus','g','gnd')] });
    const result = simulateTransient(p,{duration:.01,step:.0001,probe:{compId:'r',pinId:'2'}});
    expect(result.ok).toBe(true);
    expect(result.time.length).toBeGreaterThan(1);
  });
});
