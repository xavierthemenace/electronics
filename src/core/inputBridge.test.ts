import { describe, expect, it } from 'vitest';
import { component, project, wire } from './model.js';
import { deriveArduinoInputs } from './inputBridge.js';

describe('deriveArduinoInputs', () => {
  it('maps an analog sensor wired to A0 into a 10-bit ADC value', () => {
    const p = project({
      components: [
        component('mcu', 'arduino-uno'),
        component('sensor', 'analog-sensor', { outputVoltage: 2.5, outputResistance: 100 }),
      ],
      wires: [wire('mcu', 'a0', 'sensor', 'out')],
    });
    const result = deriveArduinoInputs(p, { digital: {}, analog: {} });
    expect(result.analog[0]).toBe(512);
  });

  it('maps a pressed pushbutton wired to D2 into a HIGH input', () => {
    const p = project({
      components: [
        component('mcu', 'arduino-uno'),
        component('button', 'pushbutton', { pressed: true }),
      ],
      wires: [wire('mcu', 'd2', 'button', '1')],
    });
    const result = deriveArduinoInputs(p, { digital: {}, analog: {} });
    expect(result.digital[2]).toBe(1);
  });

  it('preserves manual inputs when no modeled peripheral is connected', () => {
    const p = project({ components: [component('mcu', 'arduino-uno')], wires: [] });
    const result = deriveArduinoInputs(p, { digital: { 2: 1 }, analog: { 0: 300 } });
    expect(result.digital[2]).toBe(1);
    expect(result.analog[0]).toBe(300);
  });
});
