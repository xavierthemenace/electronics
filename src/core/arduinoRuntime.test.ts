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
    expect(result.state.elapsedMs).toBeGreaterThanOrEqual(100);
  });

  it('reports missing Arduino entry points', () => {
    const result = runArduino('digitalWrite(13, HIGH);');
    expect(result.errors).toContain('Missing setup() function.');
    expect(result.errors).toContain('Missing loop() function.');
  });
});
