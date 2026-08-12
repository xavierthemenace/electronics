import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';
import { peripheralDefs } from './peripherals.js';
import { actuatorDefs } from './devices.js';
import { displayDefs } from './display.js';
import { busPeripheralDefs } from './busPeripheralDefs.js';
import { activeModelDefs } from './activeModels.js';

export const groundDef = defineComponent({
  type: 'ground', name: 'Ground', category: 'infrastructure', status: 'modelled',
  pins: [{ id: 'gnd', name: 'GND', kind: 'ground' }], params: {}, docs: { description: '0 V reference.' }, isGround: true,
  device: () => ({ pins: ['gnd'], isNonlinear: false, stamp() {} }),
});

export const dcSourceDef = defineComponent({
  type: 'dc-source', name: 'DC Voltage Source', category: 'power', status: 'modelled',
  pins: [{ id: 'plus', name: '+', kind: 'power', currentLimit: 2 }, { id: 'minus', name: '−', kind: 'power' }],
  params: { voltage: { default: 5, unit: 'V', min: -24, max: 24 } }, docs: { description: 'Ideal DC voltage source.' },
  device(params: Record<string, unknown>) {
    const V = Number(params.voltage ?? 5);
    return { pins: ['plus', 'minus'], isNonlinear: false, branches: [{ p: 'plus', n: 'minus', V }], current(ctx: any) { return ctx.branchCurrent(0); } };
  },
});

export const resistorDef = defineComponent({
  type: 'resistor', name: 'Resistor', category: 'passive', status: 'modelled',
  pins: [{ id: '1', name: '1', kind: 'passive' }, { id: '2', name: '2', kind: 'passive' }],
  params: { resistance: { default: 220, unit: 'Ω', min: 0.01, max: 1e7 }, powerRating: { default: 0.25, unit: 'W', min: 0, max: 10 } },
  docs: { description: "Linear resistor obeying Ohm's law V = I·R." },
  device(params: Record<string, unknown>) {
    const R = Math.max(0.01, Number(params.resistance ?? 220));
    return { pins: ['1', '2'], isNonlinear: false,
      stamp(ctx: any) { ctx.G(ctx.node('1'), ctx.node('2'), 1 / R); },
      current(ctx: any) { return (ctx.vPin('1') - ctx.vPin('2')) / R; },
      power(ctx: any) { const i = (ctx.vPin('1') - ctx.vPin('2')) / R; return i * i * R; },
    };
  },
});

function diodeModel(type: 'diode' | 'led') {
  return (params: Record<string, unknown>) => {
    const Is = Number(params.saturationCurrent ?? (type === 'led' ? 1e-17 : 8.2e-10));
    const n = Number(params.ideality ?? (type === 'led' ? 2.3 : 1.7));
    const nVt = n * 0.02585;
    return { pins: ['a', 'k'], isNonlinear: true,
      id(vd: number) { return Is * (Math.exp(Math.min(vd / nVt, 700)) - 1); },
      stamp(ctx: any) { const na = ctx.node('a'); const nk = ctx.node('k'); const vd = ctx.limit(ctx.v(na) - ctx.v(nk), na, nk, 0.8); const ev = Math.exp(Math.min(vd / nVt, 700)); const id = Is * (ev - 1); const gd = (Is * ev) / nVt; ctx.G(na, nk, gd); const jeq = id - gd * vd; ctx.I(na, -jeq); ctx.I(nk, jeq); },
      current(ctx: any) { return (this as any).id?.(ctx.v(ctx.node('a')) - ctx.v(ctx.node('k'))) ?? 0; },
      ...(type === 'led' ? { brightness(ctx: any) { const i = (this as any).id?.(ctx.v(ctx.node('a')) - ctx.v(ctx.node('k'))) ?? 0; return Math.max(0, Math.min(1, i / 0.02)); } } : {}),
    } as any;
  };
}

export const diodeDef = defineComponent({ type: 'diode', name: 'Diode', category: 'semiconductor', status: 'modelled', pins: [{ id: 'a', name: 'Anode', kind: 'passive' }, { id: 'k', name: 'Cathode', kind: 'passive' }], params: { saturationCurrent: { default: 8.2e-10, unit: 'A' }, ideality: { default: 1.7, unit: '' }, seriesResistance: { default: 0, unit: 'Ω' } }, docs: { description: 'Shockley diode educational model.' }, device: diodeModel('diode') });
export const ledDef = defineComponent({ type: 'led', name: 'LED', category: 'actuator', status: 'modelled', pins: [{ id: 'a', name: 'Anode (+)', kind: 'passive' }, { id: 'k', name: 'Cathode (−)', kind: 'passive' }], params: { saturationCurrent: { default: 1e-17, unit: 'A' }, ideality: { default: 2.3, unit: '' }, forwardVoltage: { default: 2, unit: 'V' }, maxForwardCurrent: { default: 0.02, unit: 'A' }, reverseVoltageMax: { default: 5, unit: 'V' }, color: { default: 'red', unit: '' } }, docs: { description: 'Light-emitting diode with an educational Shockley approximation.' }, device: diodeModel('led') });

const _byType = new Map<string, ComponentDef>();
function _register(def: ComponentDef): void { if (_byType.has(def.type)) throw new Error(`Duplicate component type: ${def.type}`); _byType.set(def.type, def); }
[groundDef, dcSourceDef, resistorDef, diodeDef, ledDef, ...activeModelDefs, ...peripheralDefs, ...actuatorDefs, ...displayDefs, ...busPeripheralDefs].forEach(_register);
export function getDefinition(type: string): ComponentDef | null { return _byType.get(type) ?? null; }
export function listComponents(): ComponentDef[] { return [..._byType.values()]; }
export function isModelled(type: string): boolean { const d = getDefinition(type); return !!d && d.status === 'modelled'; }
