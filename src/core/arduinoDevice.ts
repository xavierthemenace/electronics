import type { CircuitComponent } from './model.js';

export interface ArduinoBranch {
  pinId: string;
  voltage: number;
}

/** Return actively driven Arduino output pins as voltage-source branches. */
export function arduinoBranches(component: CircuitComponent): ArduinoBranch[] {
  if (component.type !== 'arduino-uno') return [];
  const result: ArduinoBranch[] = [];
  for (const pin of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
    const drive = component.params[`d${pin}Drive`];
    if (drive !== 'HIGH' && drive !== 'LOW' && drive !== 'PWM') continue;
    const voltage = Number(component.params[`d${pin}Voltage`] ?? (drive === 'HIGH' ? Number(component.params.vcc ?? 5) : 0));
    if (Number.isFinite(voltage)) result.push({ pinId: `d${pin}`, voltage });
  }
  return result;
}

export function isArduino(component: CircuitComponent): boolean {
  return component.type === 'arduino-uno';
}
