import { describe, expect, it } from 'vitest';
import { createPIDState, pidStep, runClosedLoop } from './control.js';

describe('control primitives', () => {
  it('produces bounded PID output', () => {
    const result = pidStep(1, 0, 0.1, { kp: 2, ki: 0, kd: 0, outputMin: 0, outputMax: 1 }, createPIDState());
    expect(result.output).toBe(1);
  });

  it('closed loop moves the plant toward setpoint', () => {
    const trace = runClosedLoop(200, 0.8, { value: 0, gain: 1, timeConstant: 0.3 }, { kp: 2, ki: 0.8, kd: 0.02, outputMin: 0, outputMax: 1 }, 0.01);
    expect(trace.length).toBe(200);
    expect(trace[trace.length - 1].measurement).toBeGreaterThan(0.4);
  });
});
