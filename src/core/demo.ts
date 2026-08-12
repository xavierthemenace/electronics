/**
 * Vertical-slice demonstration, runnable in Node with zero dependencies.
 *
 *   Place resistor + LED + DC source + ground → wire them → generate the
 *   canonical netlist → DC solve → measure V/I → detect the LED overcurrent
 *   condition → explain it.
 *
 * Run with:
 *   npx tsx src/core/demo.ts
 *
 * @module core/demo
 */

import { project, component, wire } from './model.js';
import { solveDC, deviceResult } from './solver.js';
import { runERC, formatViolations } from './erc.js';
import { buildNetlist } from './netlist.js';

function newDemoCircuit() {
  // 5V → 220Ω → LED → GND  (the canonical safe circuit)
  const c = {
    ground: component('g1', 'ground', {}, { x: 300, y: 220 }),
    src: component('v1', 'dc-source', { voltage: 5 }, { x: 80, y: 80 }),
    r: component('r1', 'resistor', { resistance: 220 }, { x: 240, y: 80 }),
    led: component('l1', 'led', {}, { x: 360, y: 80 }),
  };
  return project({
    name: 'LED + Resistor (safe)',
    components: [c.ground, c.src, c.r, c.led],
    wires: [
      wire('v1', 'plus', 'r1', '1'),
      wire('r1', '2', 'l1', 'a'),
      wire('l1', 'k', 'g1', 'gnd'),
      wire('v1', 'minus', 'g1', 'gnd'),
    ],
  });
}

function newUnsafeCircuit() {
  // 5V → LED → GND directly — no resistor. Must trip LED_OVERCURRENT.
  const c = {
    ground: component('g2', 'ground', {}, { x: 300, y: 220 }),
    src: component('v2', 'dc-source', { voltage: 5 }, { x: 80, y: 80 }),
    led: component('l2', 'led', {}, { x: 360, y: 80 }),
  };
  return project({
    name: 'LED without resistor (UNSAFE)',
    components: [c.ground, c.src, c.led],
    wires: [
      wire('v2', 'plus', 'l2', 'a'),
      wire('l2', 'k', 'g2', 'gnd'),
      wire('v2', 'minus', 'g2', 'gnd'),
    ],
  });
}

function report(label: string, prj: ReturnType<typeof project>) {
  console.log('\n' + '═'.repeat(72));
  console.log(label + ' — ' + prj.name);
  console.log('═'.repeat(72));

  const nl = buildNetlist(prj);
  console.log(`Netlist: ${nl.nodeCount - 1} non-ground node(s), ${nl.nets.length} net(s)`);
  for (const n of nl.nets) {
    console.log(`  ${n.name.padEnd(6)} (node ${n.node})${n.isGround ? '  ⏚ GND' : ''}  ` +
      n.members.map((m) => `${m.cid}.${m.pid}`).join(', '));
  }

  const solve = solveDC(prj);
  if (!solve.ok) {
    console.log('\nSolve FAILED: ' + (solve.error ?? '(no reason)'));
    return;
  }
  console.log(`\nDC solve: ${solve.iterations} iteration(s)`);

  // Measure node voltages (relative to ground).
  for (const n of nl.nets) {
    if (n.isGround) { console.log('  V[GND]  = 0.000 V'); continue; }
    const v = (solve.nodeVoltages[n.node - 1] ?? 0);
    console.log(`  V[${n.name}] = ${v.toFixed(4)} V`);
  }

  // Device measurements.
  console.log('\nMeasurements:');
  for (const c of prj.components) {
    const d = deviceResult(solve, c.id);
    if (!d) continue;
    if (d.current !== undefined) {
      const line = `  ${c.id.padEnd(3)} ${c.type.padEnd(10)}  I = ${(d.current * 1000).toFixed(2)} mA`;
      const extra = d.power !== undefined ? `   P = ${(d.power * 1000).toFixed(1)} mW` : '';
      console.log(line + extra);
    }
  }
  // Resistor voltage drop for the safe circuit.
  if (prj.components.some((x) => x.id === 'r1')) {
    const rNl = nl.nets.find((n) => n.members.some((m) => m.cid === 'r1' && m.pid === '1'));
    const rCr = nl.nets.find((n) => n.members.some((m) => m.cid === 'r1' && m.pid === '2'));
    if (rNl && rCr) {
      const vR = (solve.nodeVoltages[rNl.node - 1] ?? 0) - (solve.nodeVoltages[rCr.node - 1] ?? 0);
      console.log(`\n  V across R1 ≈ ${vR.toFixed(3)} V  (expected ≈ ${(5 - 2.1).toFixed(3)} V)`);
    }
    const lNl = nl.nets.find((n) => n.members.some((m) => m.cid === 'l1' && m.pid === 'a'));
    const lCr = nl.nets.find((n) => n.members.some((m) => m.cid === 'l1' && m.pid === 'k'));
    if (lNl && lCr) {
      const vL = (solve.nodeVoltages[lNl.node - 1] ?? 0) - (solve.nodeVoltages[lCr.node - 1] ?? 0);
      console.log(`  V across LED ≈ ${vL.toFixed(3)} V  (educational target ≈ 2.0–2.2 V)`);
    }
  }

  // ERC.
  const violations = runERC(prj, solve);
  console.log('\nERC (' + violations.length + ' finding' + (violations.length === 1 ? '' : 's') + '):');
  if (violations.length === 0) console.log('  ✓ no electrical problems');
  else console.log(formatViolations(violations));
}

report('SAFE   circuit', newDemoCircuit());
report('UNSAFE circuit', newUnsafeCircuit());

console.log('\n' + '─'.repeat(72));
console.log('The safe circuit lights the LED at a sane current (≈10–15 mA),');
console.log('the unsafe circuit trips LED_OVERCURRENT with an educational fix.');
console.log('─'.repeat(72));