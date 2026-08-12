import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

export const lcd1602Def: ComponentDef = defineComponent({
  type: 'lcd-1602',
  name: '16×2 LCD',
  category: 'display',
  status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' },
    { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sda', name: 'SDA', kind: 'bidirectional' },
    { id: 'scl', name: 'SCL', kind: 'input' },
  ],
  params: {
    contrast: { default: 0.5, unit: '', min: 0, max: 1 },
    text: { default: 'Electronics Lab', unit: '' },
  },
  docs: {
    description: 'Educational I²C-style 16×2 character display. Text is exposed as device state and can be driven by the display panel or future I²C firmware support.',
  },
  device(params: Record<string, unknown>) {
    const text = String(params.text ?? '');
    const contrast = Math.max(0, Math.min(1, Number(params.contrast ?? 0.5)));
    return {
      pins: ['vcc', 'gnd', 'sda', 'scl'],
      isNonlinear: false,
      stamp(ctx: any) {
        // High-impedance digital bus inputs; provide tiny leakage to keep the
        // analog solver well-conditioned without affecting the intended circuit.
        ctx.G(ctx.node('sda'), ctx.node('gnd'), 1e-9);
        ctx.G(ctx.node('scl'), ctx.node('gnd'), 1e-9);
      },
      id() { return Math.min(1, text.length / 32); },
      brightness() { return contrast; },
    };
  },
});

export const displayDefs: ComponentDef[] = [lcd1602Def];
