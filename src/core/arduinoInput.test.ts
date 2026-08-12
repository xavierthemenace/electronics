import { describe, expect, it } from 'vitest';
import { runArduino } from './arduinoRuntime.js';

describe('Arduino external input simulation', () => {
  it('reads a simulated digital input', () => {
    const result = runArduino(`
      void setup() { pinMode(2, INPUT); }
      void loop() { int pressed = digitalRead(2); Serial.println(pressed); }
    `, { digitalInputs: { 2: 1 } });

    expect(result.errors).toEqual([]);
    expect(result.state.serial).toContain('1');
    expect(result.inputs.digital[2]).toBe(1);
  });

  it('reads a simulated analog input', () => {
    const result = runArduino(`
      void setup() { }
      void loop() { int value = analogRead(A0); Serial.println(value); }
    `, { analogInputs: { 0: 731 } });

    expect(result.errors).toEqual([]);
    expect(result.state.analog[0]).toBe(731);
    expect(result.state.serial).toContain('731');
  });
});
