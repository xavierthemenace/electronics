import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

export const dcMotorDef: ComponentDef = defineComponent({
  type: 'dc-motor', name: 'DC Motor', category: 'actuator', status: 'modelled',
  pins: [
    { id: 'plus', name: '+', kind: 'power' },
    { id: 'minus', name: '−', kind: 'ground' },
  ],
  params: {
    windingResistance: { default: 4, unit: 'Ω', min: 0.05, max: 1e4 },
    backEmf: { default: 0, unit: 'V', min: 0, max: 24 },
    speed: { default: 0, unit: '%', min: 0, max: 100 },
    maxBackEmf: { default: 5, unit: 'V', min: 0, max: 24 },
    torqueConstant: { default: 0.02, unit: 'N·m/A', min: 0.0001, max: 10 },
  },
  docs: { description: 'Simplified DC motor with winding resistance and configurable back-EMF.' },
  device(params: Record<string, unknown>) {
    const R = Math.max(0.05, Number(params.windingResistance ?? 4));
    const speed = Math.max(0, Math.min(100, Number(params.speed ?? 0))) / 100;
    const maxBackEmf = Math.max(0, Number(params.maxBackEmf ?? 5));
    const E = Math.max(0, Number(params.backEmf ?? speed * maxBackEmf));
    const kt = Math.max(0.0001, Number(params.torqueConstant ?? 0.02));
    return {
      pins: ['plus', 'minus'], isNonlinear: false,
      stamp(ctx: any) {
        const G = 1 / R;
        ctx.G(ctx.node('plus'), ctx.node('minus'), G);
        const sourceCurrent = G * E;
        ctx.I(ctx.node('plus'), -sourceCurrent);
        ctx.I(ctx.node('minus'), sourceCurrent);
      },
      current(ctx: any) { return (ctx.vPin('plus') - ctx.vPin('minus') - E) / R; },
      power(ctx: any) {
        const i = (ctx.vPin('plus') - ctx.vPin('minus') - E) / R;
        return Math.abs(i * (ctx.vPin('plus') - ctx.vPin('minus')));
      },
      id() { return speed; },
      brightness(ctx: any) {
        const i = Math.abs((ctx.vPin('plus') - ctx.vPin('minus') - E) / R);
        return Math.max(0, Math.min(1, speed + i * kt));
      },
    };
  },
});

export const servoDef: ComponentDef = defineComponent({
  type: 'servo', name: 'Servo Motor', category: 'actuator', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power', currentLimit: 1.5 },
    { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'signal', name: 'Signal', kind: 'pwm' },
  ],
  params: {
    angle: { default: 90, unit: '°', min: 0, max: 180 },
    signalVoltage: { default: 0, unit: 'V', min: 0, max: 5 },
    idleCurrent: { default: 0.01, unit: 'A', min: 0, max: 1 },
    activeCurrent: { default: 0.25, unit: 'A', min: 0, max: 3 },
  },
  docs: { description: 'Educational three-wire servo model with VCC/GND power and PWM-like signal.' },
  device(params: Record<string, unknown>) {
    const angle = Math.max(0, Math.min(180, Number(params.angle ?? 90)));
    const idleCurrent = Math.max(0, Number(params.idleCurrent ?? 0.01));
    const activeCurrent = Math.max(idleCurrent, Number(params.activeCurrent ?? 0.25));
    const signalVoltage = Math.max(0, Math.min(5, Number(params.signalVoltage ?? 0)));
    const effective = signalVoltage > 0 ? activeCurrent : idleCurrent;
    return {
      pins: ['vcc', 'gnd', 'signal'], isNonlinear: false,
      stamp(ctx: any) { ctx.G(ctx.node('vcc'), ctx.node('gnd'), 1e-6); },
      current() { return effective; },
      power(ctx: any) { return Math.abs(ctx.vPin('vcc') - ctx.vPin('gnd')) * effective; },
      id() { return angle / 180; },
    };
  },
});

export const actuatorDefs: ComponentDef[] = [dcMotorDef, servoDef];
