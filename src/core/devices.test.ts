import { describe, expect, it } from 'vitest';
import { getDefinition, isModelled } from './registry.js';

describe('device registry', () => {
  it('registers modelled motor, servo, and LCD devices', () => {
    expect(isModelled('dc-motor')).toBe(true);
    expect(isModelled('servo')).toBe(true);
    expect(isModelled('lcd-1602')).toBe(true);
  });

  it('exposes useful motor parameters', () => {
    const def = getDefinition('dc-motor');
    expect(def?.params.windingResistance.default).toBe(4);
    expect(def?.params.speed.default).toBe(0);
    expect(def?.pins.map(p => p.id)).toEqual(['plus', 'minus']);
  });

  it('exposes servo angle and signal controls', () => {
    const def = getDefinition('servo');
    expect(def?.params.angle.default).toBe(90);
    expect(def?.params.signalVoltage.default).toBe(0);
    expect(def?.pins.map(p => p.id)).toEqual(['vcc', 'gnd', 'signal']);
  });

  it('exposes LCD text and contrast controls', () => {
    const def = getDefinition('lcd-1602');
    expect(def?.params.text.default).toBe('Electronics Lab');
    expect(def?.params.contrast.default).toBe(0.5);
    expect(def?.pins.map(p => p.id)).toEqual(['vcc', 'gnd', 'sda', 'scl']);
  });
});
