import { describe, expect, it } from 'vitest';
import { component, project, wire } from './model.js';
import { buildArduinoDeviceRuntimeProject } from './deviceBridge.js';

const runtime = (pwm: Record<number, number>) => ({
  state: {
    pinMode: { 9: 'OUTPUT' as const },
    digital: {}, analog: {}, pwm,
    serial: [], serialEvents: [], transitions: [], elapsedMs: 0, warnings: [],
  },
  steps: 1,
  errors: [],
  inputs: { digital: {}, analog: {} },
});

describe('Arduino device bridge', () => {
  it('maps D9 PWM to a wired servo signal and angle', () => {
    const p = project({
      components: [component('mcu', 'arduino-uno'), component('servo', 'servo')],
      wires: [wire('mcu', 'd9', 'servo', 'signal')],
    });
    const out = buildArduinoDeviceRuntimeProject(p, runtime({ 9: 127 }));
    const servo = out.components.find(c => c.id === 'servo')!;
    expect(Number(servo.params.signalVoltage)).toBeCloseTo(127 / 255 * 5, 5);
    expect(Number(servo.params.angle)).toBe(90);
  });

  it('drives the LCD virtual text state from lcd.print()', () => {
    const p = project({ components: [component('mcu', 'arduino-uno'), component('lcd', 'lcd-1602', { text: '' })] });
    const out = buildArduinoDeviceRuntimeProject(p, runtime({}), 'lcd.print("HELLO");');
    expect(out.components.find(c => c.id === 'lcd')?.params.text).toBe('HELLO');
  });
});
