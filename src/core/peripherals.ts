import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

export const analogSensorDef: ComponentDef = defineComponent({
  type: 'analog-sensor',
  name: 'Analog Sensor',
  category: 'sensor',
  status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power', voltageLimits: { min: 0, max: 5.5 } },
    { id: 'out', name: 'OUT', kind: 'analog', voltageLimits: { min: 0, max: 5.5 } },
    { id: 'gnd', name: 'GND', kind: 'ground' },
  ],
  params: {
    outputVoltage: { default: 2.5, unit: 'V', min: 0, max: 5 },
    outputResistance: { default: 100, unit: 'Ω', min: 1, max: 1e6 },
  },
  docs: {
    description: 'Educational three-wire analog sensor with an adjustable Thevenin-equivalent output voltage and source resistance.',
  },
  device(params: Record<string, unknown>) {
    const voltage = Number(params.outputVoltage ?? 2.5);
    const resistance = Math.max(1, Number(params.outputResistance ?? 100));
    return {
      pins: ['vcc', 'out', 'gnd'],
      isNonlinear: false,
      branches: [{ p: 'out', n: 'gnd', V: Number.isFinite(voltage) ? voltage : 2.5 }],
      current(ctx: any) {
        const out = ctx.vPin('out');
        const source = Number.isFinite(voltage) ? voltage : 2.5;
        return (source - out) / resistance;
      },
    };
  },
});

export const pushbuttonDef: ComponentDef = defineComponent({
  type: 'pushbutton',
  name: 'Pushbutton',
  category: 'input',
  status: 'modelled',
  pins: [
    { id: '1', name: '1', kind: 'passive' },
    { id: '2', name: '2', kind: 'passive' },
  ],
  params: {
    pressed: { default: false, unit: '' },
    closedResistance: { default: 0.1, unit: 'Ω', min: 0.001, max: 100 },
    openResistance: { default: 1e9, unit: 'Ω', min: 1e3, max: 1e12 },
  },
  docs: {
    description: 'Momentary switch. When pressed it becomes a low-resistance path; when released it is effectively open.',
  },
  device(params: Record<string, unknown>) {
    const pressed = Boolean(params.pressed);
    const R = Math.max(pressed ? 0.001 : 1e3, Number(params[pressed ? 'closedResistance' : 'openResistance'] ?? (pressed ? 0.1 : 1e9)));
    return {
      pins: ['1', '2'],
      isNonlinear: false,
      stamp(ctx: any) {
        ctx.G(ctx.node('1'), ctx.node('2'), 1 / R);
      },
      current(ctx: any) {
        return (ctx.vPin('1') - ctx.vPin('2')) / R;
      },
      power(ctx: any) {
        const i = (ctx.vPin('1') - ctx.vPin('2')) / R;
        return i * i * R;
      },
    };
  },
});

export const peripheralDefs: ComponentDef[] = [analogSensorDef, pushbuttonDef];
