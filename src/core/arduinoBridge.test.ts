import { describe, expect, it } from 'vitest';
import { runArduino } from './arduinoRuntime.js';
import { buildArduinoRuntimeProject } from './arduinoBridge.js';
import { component, project, wire } from './model.js';
import { solveDC } from './solver.js';

describe('Arduino GPIO electrical bridge', () => {
  it('drives an LED through a series resistor when D13 is HIGH', () => {
    const arduino = component('u1', 'arduino-uno', { vcc: 5 }, { x: 0, y: 0 });
    const resistor = component('r1', 'resistor', { resistance: 220 }, { x: 120, y: 0 });
    const led = component('d1', 'led', {}, { x: 220, y: 0 });
    const ground = component('g1', 'ground', {}, { x: 220, y: 100 });
    const circuit = project({
      name: 'Arduino LED bridge',
      components: [arduino, resistor, led, ground],
      wires: [
        wire('u1', 'd13', 'r1', '1'),
        wire('r1', '2', 'd1', 'a'),
        wire('d1', 'k', 'g1', 'gnd'),
      ],
    });

    const firmware = runArduino(`
      void setup() { pinMode(13, OUTPUT); }
      void loop() { digitalWrite(13, HIGH); }
    `);
    const runtimeProject = buildArduinoRuntimeProject(circuit, firmware);
    const result = solveDC(runtimeProject);

    expect(result.ok).toBe(true);
    const ledResult = result.devBranches.find(d => d.compId === 'd1');
    expect(ledResult?.current ?? 0).toBeGreaterThan(0.005);
  });
});
