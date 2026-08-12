/**
 * Component registry.
 *
 * Each definition declares pins, parameters, and — when a real electrical
 * model exists — a `device` factory that the solver stamps into the MNA
 * matrix. Components without a device are marked `status: 'planned'` so the
 * palette can still list them (extensibility) without faking behaviour
 * (rule 10: do not fake physical behaviour).
 *
 * @module core/registry
 */

import { defineComponent } from "./define.js";

// ---------------------------------------------------------------------------
// Real, simulated core components (the first vertical slice)
// ---------------------------------------------------------------------------

export const groundDef = defineComponent({
  type: "ground",
  name: "Ground",
  category: "infrastructure",
  status: "modelled",
  pins: [{ id: "gnd", name: "GND", kind: "ground" }],
  params: {},
  docs: {
    description:
      "0 V reference. The circuit must connect to ground for the nodal solver to have a voltage reference.",
  },
  // Ground pins are flagged so the netlist builder turns their nets into node 0.
  isGround: true,
  // Ground is modelled but contributes no stamps — its effect is routing its pin
  // to node 0 in the netlist. A no-op device keeps the stamp loop uniform.
  device: () => ({ pins: ["gnd"], isNonlinear: false, stamp() {} }),
});

export const dcSourceDef = defineComponent({
  type: "dc-source",
  name: "DC Voltage Source",
  category: "power",
  status: "modelled",
  pins: [
    { id: "plus", name: "+", kind: "power", currentLimit: 2 },
    { id: "minus", name: "−", kind: "power" },
  ],
  params: { voltage: { default: 5, unit: "V", min: -24, max: 24 } },
  docs: {
    description:
      "Ideal DC voltage source. Connect + and − into the circuit. Branch current is reported through the + terminal.",
  },
  device(params) {
    const V = params.voltage ?? 5;
    return {
      pins: ["plus", "minus"],
      isNonlinear: false,
      branches: [{ p: "plus", n: "minus", V }],
      current(ctx) {
        // +→− current delivered by the source.
        return ctx.branchCurrent(0);
      },
    };
  },
});

export const resistorDef = defineComponent({
  type: "resistor",
  name: "Resistor",
  category: "passive",
  status: "modelled",
  pins: [
    { id: "1", name: "1", kind: "passive" },
    { id: "2", name: "2", kind: "passive" },
  ],
  params: {
    resistance: { default: 220, unit: "Ω", min: 0.01, max: 1e7 },
    powerRating: { default: 0.25, unit: "W", min: 0, max: 10 },
  },
  docs: {
    description:
      "Linear resistor obeying Ohm's law V = I·R. Power dissipated is I²R.",
  },
  device(params) {
    const R = params.resistance ?? 220;
    return {
      pins: ["1", "2"],
      isNonlinear: false,
      stamp(ctx) {
        const G = 1 / R;
        ctx.G(ctx.node("1"), ctx.node("2"), G);
      },
      current(ctx) {
        const v1 = ctx.v(ctx.node("1"));
        const v2 = ctx.v(ctx.node("2"));
        return (v1 - v2) / R; // current from pin 1 → pin 2
      },
      power(ctx) {
        const i = this.current(ctx);
        return i * i * R;
      },
    };
  },
});

export const diodeDef = defineComponent({
  type: "diode",
  name: "Diode",
  category: "semiconductor",
  status: "modelled",
  pins: [
    { id: "a", name: "Anode", kind: "passive" },
    { id: "k", name: "Cathode", kind: "passive" },
  ],
  params: {
    saturationCurrent: { default: 8.2e-10, unit: "A" }, // 1N4148-ish, turns on ~0.6–0.7 V
    ideality: { default: 1.7, unit: "" },
    seriesResistance: { default: 0, unit: "Ω" },
  },
  docs: {
    description:
      "Shockley diode model I = Is·(exp(qV/(n·kT)) − 1). Educational approximation.",
  },
  device(params) {
    const Is = params.saturationCurrent ?? 8.2e-10;
    const n = params.ideality ?? 1.7;
    const Vt = 0.02585; // thermal voltage at ~300 K
    const nVt = n * Vt;
    const Rs = params.seriesResistance ?? 0;
    return {
      pins: ["a", "k"],
      isNonlinear: true,
      id(ctx, vd) {
        if (vd >= 0.8) vd = 0.8 + (vd - 0.8) * 0.05; // limit overflow for huge forward bias
        const e = Math.exp(Math.min(vd / nVt, 700));
        return Is * (e - 1);
      },
      stamp(ctx) {
        const na = ctx.node("a");
        const nk = ctx.node("k");
        const va = ctx.v(na);
        const vk = ctx.v(nk);
        let vd = va - vk;
        // Voltage-step limiting for NR stability (limit ΔV per iter).
        vd = ctx.limit(vd, na, nk, 0.8);
        const e = Math.exp(Math.min(vd / nVt, 700));
        const id = Is * (e - 1);
        const gd = (Is * e) / nVt; // dI/dV
        // Norton companion: I = gd·Vd + (id − gd·vd)
        ctx.G(na, nk, gd);
        ctx.I(na, -(id - gd * vd));
        ctx.I(nk, id - gd * vd);
        if (Rs > 0) ctx.G(na, nk, 1 / Rs);
      },
      current(ctx) {
        const vd = ctx.v(ctx.node("a")) - ctx.v(ctx.node("k"));
        return this.id(ctx, vd);
      },
    };
  },
});

export const ledDef = defineComponent({
  type: "led",
  name: "LED",
  category: "actuator",
  status: "modelled",
  pins: [
    { id: "a", name: "Anode (+)", kind: "passive" },
    { id: "k", name: "Cathode (−)", kind: "passive" },
  ],
  params: {
    saturationCurrent: { default: 1e-17, unit: "A" }, // tuned for Vf ≈ 2.1 V at 14 mA
    ideality: { default: 2.3, unit: "" },
    forwardVoltage: { default: 2.0, unit: "V" }, // nominal; the Shockley model gives the real IV
    maxForwardCurrent: { default: 0.02, unit: "A" }, // 20 mA
    reverseVoltageMax: { default: 5, unit: "V" },
    color: { default: "red", unit: "" },
  },
  docs: {
    description:
      "Light-emitting diode. Modelled with the Shockley equation tuned to a typical forward voltage. Requires a series current-limiting resistor.",
  },
  device(params) {
    const Is = params.saturationCurrent ?? 1e-17;
    const n = params.ideality ?? 2.3;
    const Vt = 0.02585;
    const nVt = n * Vt;
    return {
      pins: ["a", "k"],
      isNonlinear: true,
      maxCurrent: params.maxForwardCurrent ?? 0.02,
      id(ctx, vd) {
        const ev = Math.exp(Math.min(vd / nVt, 700));
        return Is * (ev - 1);
      },
      stamp(ctx) {
        const na = ctx.node("a");
        const nk = ctx.node("k");
        const vd = ctx.limit(ctx.v(na) - ctx.v(nk), na, nk, 0.8);
        const ev = Math.exp(Math.min(vd / nVt, 700));
        const id = Is * (ev - 1);
        const gd = (Is * ev) / nVt;
        ctx.G(na, nk, gd);
        const jeq = id - gd * vd;
        ctx.I(na, -jeq);
        ctx.I(nk, jeq);
      },
      current(ctx) {
        const vd = ctx.v(ctx.node("a")) - ctx.v(ctx.node("k"));
        return this.id(ctx, vd);
      },
      // Relative brightness 0..1 for the renderer (anchored to 20 mA full-scale).
      brightness(ctx) {
        const i = this.current(ctx);
        return Math.max(0, Math.min(1, i / 0.02));
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Planned components — registered so the palette/curriculum can reference them
// and so adding a real model later is just a registry entry. They are NOT
// simulated yet; placing one in a circuit yields an ERC "unmodelled" notice
// rather than a fake result.
// ---------------------------------------------------------------------------

const planned = (type, name, category, pins, params = {}, description = "") =>
  defineComponent({
    type,
    name,
    category,
    status: "planned",
    pins,
    params,
    docs: { description },
  });

export const plannedDefs = [
  planned("capacitor", "Capacitor", "passive",
    [{ id: "1", name: "1", kind: "passive" }, { id: "2", name: "2", kind: "passive" }],
    { capacitance: { default: 1e-6, unit: "F" } },
    "Transient energy storage. RC charging/discharging lands in Phase 3 transient."),
  planned("inductor", "Inductor", "passive",
    [{ id: "1", name: "1", kind: "passive" }, { id: "2", name: "2", kind: "passive" }],
    { inductance: { default: 1e-3, unit: "H" } },
    "Magnetic energy storage. DC: short; transients follow L/R."),
  planned("potentiometer", "Potentiometer", "passive",
    [{ id: "a", name: "A", kind: "passive" }, { id: "w", name: "Wiper", kind: "passive" },
     { id: "b", name: "B", kind: "passive" }],
    { resistance: { default: 10000, unit: "Ω" }, wiper: { default: 0.5, unit: "" } },
    "Variable voltage divider; the wiper position sets the tap."),
  planned("zener", "Zener Diode", "semiconductor",
    [{ id: "a", name: "Anode", kind: "passive" }, { id: "k", name: "Cathode", kind: "passive" }],
    { zenerVoltage: { default: 5.1, unit: "V" } },
    "Reverse-breakdown voltage regulation. Forward: like a diode."),
  planned("bjt-npn", "BJT (NPN)", "semiconductor",
    [{ id: "b", name: "Base", kind: "input" }, { id: "c", name: "Collector", kind: "passive" },
     { id: "e", name: "Emitter", kind: "passive" }],
    { beta: { default: 100, unit: "" } },
    "Bipolar junction transistor switching model (Ebers-Moll)."),
  planned("mosfet-n", "MOSFET (N-channel)", "semiconductor",
    [{ id: "g", name: "Gate", kind: "input" }, { id: "d", name: "Drain", kind: "passive" },
     { id: "s", name: "Source", kind: "passive" }],
    { vth: { default: 2.0, unit: "V" }, rdsOn: { default: 0.05, unit: "Ω" } },
    "Logic-level NMOS switch: cutoff / triode / saturation regions."),
  planned("and", "AND Gate", "digital",
    [{ id: "a", name: "A", kind: "input" }, { id: "b", name: "B", kind: "input" },
     { id: "y", name: "Y", kind: "output" }], {},
    "Combinational logic. Phase 10 digital event simulator."),
  planned("not", "NOT Gate", "digital",
    [{ id: "a", name: "A", kind: "input" }, { id: "y", name: "Y", kind: "output" }], {},
    "Inverter. Phase 10."),
  planned("arduino-uno", "Arduino Uno", "embedded",
    [{ id: "5v", name: "5V", kind: "power" }, { id: "gnd", name: "GND", kind: "ground" },
     { id: "d13", name: "D13", kind: "digital" }, { id: "d9", name: "D9", kind: "pwm" },
     { id: "a0", name: "A0", kind: "analog" }],
    { vcc: { default: 5, unit: "V" } },
    "ATmega328P-compatible MCU. GPIO/ADC/PWM/UART driven by firmware (Phase 5)."),
];

// ---------------------------------------------------------------------------
// Registry facade
// ---------------------------------------------------------------------------

const _byType = new Map();
function _register(def) {
  if (_byType.has(def.type))
    throw new Error(`Duplicate component type: ${def.type}`);
  _byType.set(def.type, def);
}
[
  groundDef, dcSourceDef, resistorDef, diodeDef, ledDef, ...plannedDefs,
].forEach(_register);

export function getDefinition(type) {
  return _byType.get(type) ?? null;
}

export function listComponents() {
  return [..._byType.values()];
}

export function isModelled(type) {
  const d = getDefinition(type);
  return !!d && d.status === "modelled";
}
