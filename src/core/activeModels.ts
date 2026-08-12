import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

const groundPins = [
  { id: 'gnd', name: 'GND', kind: 'ground' as const },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const capacitorDef: ComponentDef = defineComponent({
  type: 'capacitor',
  name: 'Capacitor',
  category: 'passive',
  status: 'modelled',
  pins: [{ id: '1', name: '1', kind: 'passive' }, { id: '2', name: '2', kind: 'passive' }],
  params: { capacitance: { default: 1e-6, unit: 'F', min: 1e-15, max: 1000 }, initialVoltage: { default: 0, unit: 'V', min: -1000, max: 1000 } },
  docs: { description: 'Capacitor with physical value and transient behavior. In DC it is represented by a tiny leakage conductance; the transient solver uses C/dt companion modeling.' },
  device(params) {
    const leakage = 1e-12;
    const initialVoltage = Number(params.initialVoltage ?? 0);
    return {
      pins: ['1', '2'],
      isNonlinear: false,
      stamp(ctx: any) {
        ctx.G(ctx.node('1'), ctx.node('2'), leakage);
        if (initialVoltage !== 0) {
          const g = leakage;
          ctx.I(ctx.node('1'), g * initialVoltage);
          ctx.I(ctx.node('2'), -g * initialVoltage);
        }
      },
      current(ctx: any) { return (ctx.vPin('1') - ctx.vPin('2') - initialVoltage) * leakage; },
      power(ctx: any) { return Math.abs((ctx.vPin('1') - ctx.vPin('2')) * ((ctx.vPin('1') - ctx.vPin('2') - initialVoltage) * leakage)); },
    };
  },
});

export const inductorDef: ComponentDef = defineComponent({
  type: 'inductor',
  name: 'Inductor',
  category: 'passive',
  status: 'modelled',
  pins: [{ id: '1', name: '1', kind: 'passive' }, { id: '2', name: '2', kind: 'passive' }],
  params: { inductance: { default: 1e-3, unit: 'H', min: 1e-12, max: 10000 }, seriesResistance: { default: 0.1, unit: 'Ω', min: 0.0001, max: 1e6 } },
  docs: { description: 'Inductor with a finite winding resistance. The DC operating point is its winding resistance; transient inductance is exposed as component data.' },
  device(params) {
    const R = Math.max(1e-4, Number(params.seriesResistance ?? 0.1));
    return {
      pins: ['1', '2'],
      isNonlinear: false,
      stamp(ctx: any) { ctx.G(ctx.node('1'), ctx.node('2'), 1 / R); },
      current(ctx: any) { return (ctx.vPin('1') - ctx.vPin('2')) / R; },
      power(ctx: any) { const i = (ctx.vPin('1') - ctx.vPin('2')) / R; return i * i * R; },
    };
  },
});

export const potentiometerDef: ComponentDef = defineComponent({
  type: 'potentiometer',
  name: 'Potentiometer',
  category: 'passive',
  status: 'modelled',
  pins: [{ id: 'a', name: 'A', kind: 'passive' }, { id: 'w', name: 'Wiper', kind: 'output' }, { id: 'b', name: 'B', kind: 'passive' }],
  params: { resistance: { default: 10000, unit: 'Ω', min: 1, max: 1e7 }, wiper: { default: 0.5, unit: '', min: 0, max: 1 } },
  docs: { description: 'Three-terminal variable resistor with a movable wiper.' },
  device(params) {
    const R = Math.max(1, Number(params.resistance ?? 10000));
    const w = clamp(Number(params.wiper ?? 0.5), 0, 1);
    const ra = Math.max(1e-3, R * w);
    const rb = Math.max(1e-3, R * (1 - w));
    return {
      pins: ['a', 'w', 'b'],
      isNonlinear: false,
      stamp(ctx: any) {
        ctx.G(ctx.node('a'), ctx.node('w'), 1 / ra);
        ctx.G(ctx.node('w'), ctx.node('b'), 1 / rb);
      },
      current(ctx: any) { return (ctx.vPin('a') - ctx.vPin('w')) / ra; },
      power(ctx: any) {
        const ia = (ctx.vPin('a') - ctx.vPin('w')) / ra;
        const ib = (ctx.vPin('w') - ctx.vPin('b')) / rb;
        return Math.abs(ia * (ctx.vPin('a') - ctx.vPin('w')) + ib * (ctx.vPin('w') - ctx.vPin('b')));
      },
    };
  },
});

export const zenerDef: ComponentDef = defineComponent({
  type: 'zener',
  name: 'Zener Diode',
  category: 'semiconductor',
  status: 'modelled',
  pins: [{ id: 'a', name: 'Anode', kind: 'passive' }, { id: 'k', name: 'Cathode', kind: 'passive' }],
  params: { zenerVoltage: { default: 5.1, unit: 'V', min: 1, max: 100 }, kneeResistance: { default: 8, unit: 'Ω', min: 0.01, max: 1e5 } },
  docs: { description: 'Piecewise educational Zener model: forward diode behavior and reverse breakdown around the configured Zener voltage.' },
  device(params) {
    const vz = Math.max(1, Number(params.zenerVoltage ?? 5.1));
    const rz = Math.max(0.01, Number(params.kneeResistance ?? 8));
    const rf = 0.1;
    return {
      pins: ['a', 'k'],
      isNonlinear: true,
      stamp(ctx: any) {
        const a = ctx.node('a');
        const k = ctx.node('k');
        const vd = ctx.v(a) - ctx.v(k);
        let g: number;
        let iAtV: number;
        if (vd < -vz) {
          g = 1 / rz;
          iAtV = -(Math.abs(vd) - vz) / rz;
        } else if (vd > 0.65) {
          g = 1 / rf;
          iAtV = (vd - 0.65) / rf;
        } else {
          g = 1e-9;
          iAtV = 1e-9 * vd;
        }
        ctx.G(a, k, g);
        const ieq = iAtV - g * vd;
        ctx.I(a, -ieq);
        ctx.I(k, ieq);
      },
      current(ctx: any) {
        const vd = ctx.vPin('a') - ctx.vPin('k');
        if (vd < -vz) return -(Math.abs(vd) - vz) / rz;
        if (vd > 0.65) return (vd - 0.65) / rf;
        return 1e-9 * vd;
      },
    };
  },
});

export const bjtNpnDef: ComponentDef = defineComponent({
  type: 'bjt-npn',
  name: 'BJT (NPN)',
  category: 'semiconductor',
  status: 'modelled',
  pins: [{ id: 'b', name: 'Base', kind: 'input' }, { id: 'c', name: 'Collector', kind: 'passive' }, { id: 'e', name: 'Emitter', kind: 'passive' }],
  params: { beta: { default: 100, unit: '', min: 1, max: 1000 }, vbe: { default: 0.7, unit: 'V', min: 0.4, max: 1.2 }, baseResistance: { default: 1000, unit: 'Ω', min: 1, max: 1e6 }, outputResistance: { default: 10000, unit: 'Ω', min: 10, max: 1e9 } },
  docs: { description: 'Educational NPN transistor switching model with beta, base-emitter knee, and finite collector output resistance.' },
  device(params) {
    const beta = Math.max(1, Number(params.beta ?? 100));
    const vbe0 = Number(params.vbe ?? 0.7);
    const rb = Math.max(1, Number(params.baseResistance ?? 1000));
    const ro = Math.max(10, Number(params.outputResistance ?? 10000));
    return {
      pins: ['b', 'c', 'e'], isNonlinear: true,
      stamp(ctx: any) {
        const vb = ctx.vPin('b');
        const ve = ctx.vPin('e');
        const vc = ctx.vPin('c');
        const gbe = 1 / rb;
        const ib = Math.max(0, (vb - ve - vbe0) * gbe);
        const ic = beta * ib;
        ctx.G(ctx.node('b'), ctx.node('e'), gbe);
        ctx.I(ctx.node('b'), gbe * vbe0);
        ctx.I(ctx.node('e'), -gbe * vbe0);
        ctx.G(ctx.node('c'), ctx.node('e'), 1 / ro);
        ctx.I(ctx.node('c'), -ic);
        ctx.I(ctx.node('e'), ic);
        void vc;
      },
      current(ctx: any) {
        const ib = Math.max(0, (ctx.vPin('b') - ctx.vPin('e') - vbe0) / rb);
        return beta * ib + (ctx.vPin('c') - ctx.vPin('e')) / ro;
      },
      power(ctx: any) {
        const ic = Math.max(0, (ctx.vPin('b') - ctx.vPin('e') - vbe0) / rb) * beta;
        return Math.abs(ic * (ctx.vPin('c') - ctx.vPin('e')));
      },
    };
  },
});

export const mosfetNDef: ComponentDef = defineComponent({
  type: 'mosfet-n',
  name: 'MOSFET (N-channel)',
  category: 'semiconductor',
  status: 'modelled',
  pins: [{ id: 'g', name: 'Gate', kind: 'input' }, { id: 'd', name: 'Drain', kind: 'passive' }, { id: 's', name: 'Source', kind: 'passive' }],
  params: { vth: { default: 2, unit: 'V', min: 0.1, max: 10 }, rdsOn: { default: 0.05, unit: 'Ω', min: 0.001, max: 1000 }, offResistance: { default: 1e9, unit: 'Ω', min: 1e3, max: 1e12 } },
  docs: { description: 'Logic-level NMOS model. Gate voltage above threshold switches the drain-source path to RDS(on).'},
  device(params) {
    const vth = Number(params.vth ?? 2);
    const ron = Math.max(0.001, Number(params.rdsOn ?? 0.05));
    const roff = Math.max(1e3, Number(params.offResistance ?? 1e9));
    return {
      pins: ['g', 'd', 's'], isNonlinear: true,
      stamp(ctx: any) {
        const vgs = ctx.vPin('g') - ctx.vPin('s');
        const r = vgs >= vth ? ron : roff;
        ctx.G(ctx.node('d'), ctx.node('s'), 1 / r);
      },
      current(ctx: any) {
        const vgs = ctx.vPin('g') - ctx.vPin('s');
        const r = vgs >= vth ? ron : roff;
        return (ctx.vPin('d') - ctx.vPin('s')) / r;
      },
      power(ctx: any) { return Math.abs((ctx.vPin('d') - ctx.vPin('s')) * ((ctx.vPin('d') - ctx.vPin('s')) / (ctx.vPin('g') - ctx.vPin('s') >= vth ? ron : roff))); },
    };
  },
});

function logicGateDef(type: 'and' | 'not'): ComponentDef {
  const pins = type === 'and'
    ? [{ id: 'a', name: 'A', kind: 'input' as const }, { id: 'b', name: 'B', kind: 'input' as const }, { id: 'y', name: 'Y', kind: 'output' as const }, ...groundPins, { id: 'vcc', name: 'VCC', kind: 'power' as const }]
    : [{ id: 'a', name: 'A', kind: 'input' as const }, { id: 'y', name: 'Y', kind: 'output' as const }, ...groundPins, { id: 'vcc', name: 'VCC', kind: 'power' as const }];
  return defineComponent({
    type,
    name: type === 'and' ? 'AND Gate' : 'NOT Gate',
    category: 'digital',
    status: 'modelled',
    pins,
    params: { vHigh: { default: 5, unit: 'V', min: 1, max: 24 }, threshold: { default: 2.5, unit: 'V', min: 0.1, max: 20 }, outputResistance: { default: 25, unit: 'Ω', min: 0.1, max: 10000 } },
    docs: { description: type === 'and' ? 'Two-input powered AND gate with thresholded digital inputs.' : 'Powered NOT gate with thresholded input.' },
    device(params) {
      const vh = Number(params.vHigh ?? 5);
      const vt = Number(params.threshold ?? 2.5);
      const ro = Math.max(0.1, Number(params.outputResistance ?? 25));
      return {
        pins: pins.map(p => p.id), isNonlinear: true,
        stamp(ctx: any) {
          const a = ctx.vPin('a') > vt;
          const outputHigh = type === 'and' ? (a && ctx.vPin('b') > vt) : !a;
          const reference = outputHigh ? vh : 0;
          ctx.G(ctx.node('y'), ctx.node('gnd'), 1 / ro);
          ctx.I(ctx.node('y'), reference / ro);
        },
        current(ctx: any) {
          const a = ctx.vPin('a') > vt;
          const out = type === 'and' ? (a && ctx.vPin('b') > vt) : !a;
          return out ? 1 : 0;
        },
      };
    },
  });
}

export const andGateDef = logicGateDef('and');
export const notGateDef = logicGateDef('not');

export const arduinoUnoDef: ComponentDef = defineComponent({
  type: 'arduino-uno',
  name: 'Arduino Uno',
  category: 'embedded',
  status: 'modelled',
  pins: [
    { id: '5v', name: '5V', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'd2', name: 'D2', kind: 'digital' }, { id: 'd3', name: 'D3', kind: 'digital' }, { id: 'd4', name: 'D4', kind: 'digital' },
    { id: 'd5', name: 'D5', kind: 'pwm' }, { id: 'd6', name: 'D6', kind: 'pwm' }, { id: 'd7', name: 'D7', kind: 'digital' },
    { id: 'd8', name: 'D8', kind: 'digital' }, { id: 'd9', name: 'D9', kind: 'pwm' }, { id: 'd10', name: 'D10', kind: 'pwm' },
    { id: 'd11', name: 'D11', kind: 'pwm' }, { id: 'd12', name: 'D12', kind: 'digital' }, { id: 'd13', name: 'D13', kind: 'digital' },
    { id: 'a0', name: 'A0', kind: 'analog' }, { id: 'a1', name: 'A1', kind: 'analog' }, { id: 'a2', name: 'A2', kind: 'analog' },
    { id: 'a3', name: 'A3', kind: 'analog' }, { id: 'a4', name: 'A4', kind: 'analog' }, { id: 'a5', name: 'A5', kind: 'analog' },
  ],
  params: { vcc: { default: 5, unit: 'V', min: 3, max: 5.5 } },
  docs: { description: 'Arduino Uno teaching model with GPIO, PWM, ADC, UART, I²C and SPI runtime support.' },
  device(params) {
    const vcc = Number(params.vcc ?? 5);
    return {
      pins: ['5v', 'gnd'],
      isNonlinear: false,
      branches: [{ p: '5v', n: 'gnd', V: vcc }],
    };
  },
});

export const activeModelDefs: ComponentDef[] = [
  capacitorDef,
  inductorDef,
  potentiometerDef,
  zenerDef,
  bjtNpnDef,
  mosfetNDef,
  andGateDef,
  notGateDef,
  arduinoUnoDef,
];
