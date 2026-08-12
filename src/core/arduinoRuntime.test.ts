import { describe, expect, it } from 'vitest';
import { runArduino } from './arduinoRuntime.js';

describe('Arduino teaching runtime', () => {
  it('executes digital output and serial statements', () => {
    const result = runArduino(`
      const int LED = 13;
      void setup() { pinMode(LED, OUTPUT); Serial.begin(9600); }
      void loop() { digitalWrite(LED, HIGH); Serial.println("ON"); delay(100); digitalWrite(LED, LOW); }
    `);
    expect(result.errors).toEqual([]);
    expect(result.state.digital[13]).toBe(0);
    expect(result.state.serial).toContain('ON');
    expect(result.state.serialEvents[0]).toMatchObject({ timeMs: 0, text: 'ON', newline: true });
    expect(result.state.elapsedMs).toBeGreaterThanOrEqual(100);
    expect(result.state.transitions.length).toBeGreaterThanOrEqual(2);
    expect(result.state.transitions[0]).toMatchObject({ pin: 13, timeMs: 0, value: 1 });
    expect(result.state.transitions[1]).toMatchObject({ pin: 13, timeMs: 100, value: 0 });
  });

  it('captures PWM output as a digital transition', () => {
    const result = runArduino(`
      void setup() { analogWrite(9, 255); }
      void loop() { }
    `);
    expect(result.errors).toEqual([]);
    expect(result.state.pinMode[9]).toBe('OUTPUT');
    expect(result.state.pwm[9]).toBe(255);
    expect(result.state.transitions).toContainEqual({ pin: 9, timeMs: 0, value: 1 });
  });

  it('reports missing Arduino entry points', () => {
    const result = runArduino('digitalWrite(13, HIGH);');
    expect(result.errors).toContain('Missing setup() function.');
    expect(result.errors).toContain('Missing loop() function.');
  });
});
