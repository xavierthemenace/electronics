/**
 * Electrical Rule Checking — turns electrical problems into teaching moments.
 *
 * Each violation carries a human message, explanation, suggested fix, and the
 * expected result of the fix (per the spec's explainability requirement).
 *
 * @module core/erc
 */

import { getDefinition } from './registry.js';
import { resolveParams } from './define.js';
import { buildNetlist } from './netlist.js';
import type { CircuitProject } from './model.js';
import type { DeviceResult } from './solver.js';

/** ERC violation with educational context. */
export interface Violation {
  severity: 'info' | 'warning' | 'error' | 'critical';
  code: string;
  componentIds: string[];
  message: string;
  explanation: string;
  suggestedFix?: string;
  expected?: string;
}

/** Format a current in mA with up to 1 decimal. */
const mA = (a: number): string => `${(a * 1000).toFixed(1)} mA`;

/**
 * Run ERC against a project + DC solve result.
 * @param project CircuitProject
 * @param solve Result from solveDC()
 * @returns Violation[]
 */
export function runERC(
  project: CircuitProject,
  solve: ReturnType<typeof import('./solver.js').solveDC>
): Violation[] {
  const violations: Violation[] = [];
  const netlist = solve?.netlist ?? buildNetlist(project);

  // --- NO_GROUND: no node is node 0 -------------------------------------------------
  const hasGround = netlist.nets.some((n) => n.isGround);
  if (!hasGround) {
    violations.push({
      severity: 'error',
      code: 'NO_GROUND',
      componentIds: [],
      message: 'No ground reference found.',
      explanation:
        'A nodal solver needs a 0 V reference to compute node voltages. Without ground, the circuit has infinite valid solutions and cannot be simulated.',
      suggestedFix: 'Connect at least one Ground component into the circuit.',
      expected: 'All node voltages are then measured relative to 0 V.',
    });
  }

  // --- Unmodelled components -------------------------------------------------------
  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def) {
      violations.push({
        severity: 'critical',
        code: 'UNKNOWN_COMPONENT',
        componentIds: [c.id],
        message: `Unknown component type "${c.type}" (${c.id}).`,
        explanation: 'No definition exists in the registry; the simulator cannot evaluate it.',
        suggestedFix: 'Remove it or register a model for this type.',
      });
      continue;
    }
    if (def.status !== 'modelled') {
      violations.push({
        severity: 'info',
        code: 'UNMODELLED',
        componentIds: [c.id],
        message: `${def.name} is recognised but not yet simulated.`,
        explanation:
          'It is listed in the component registry for palette/curriculum use, but no electrical model is implemented yet. It does not affect the solve.',
        suggestedFix: 'Use modelled components (ground, DC source, resistor, diode, LED) for now.',
      });
    }
  }

  if (!solve || !solve.ok || !hasGround) return violations;

  // --- Per-component checks --------------------------------------------------------
  const findDevice = (cid: string): DeviceResult | undefined =>
    solve.devBranches.find((d) => d.compId === cid);

  for (const c of project.components) {
    const def = getDefinition(c.type);
    if (!def || def.status !== 'modelled') continue;
    const params = resolveParams(def, c.params);

    // LED overcurrent — the flagship explainable error.
    if (c.type === 'led') {
      const d = findDevice(c.id);
      const i = d?.current ?? 0;
      const max = (params.maxForwardCurrent as number) ?? 0.02;
      if (Math.abs(i) > max) {
        violations.push({
          severity: 'error',
          code: 'LED_OVERCURRENT',
          componentIds: [c.id],
          message: `LED current is approximately ${mA(i)}.`,
          explanation:
            `This exceeds the recommended ${mA(max)} operating current. ` +
            `Excessive current will overdrive the LED, shortening its life or destroying it.`,
          suggestedFix:
            'Add a series current-limiting resistor, or increase the existing series resistance.',
          expected:
            'Approximately 10–15 mA for a 2 V forward drop, e.g. (5 − 2) / 220 Ω ≈ 13.6 mA.',
        });
      } else if (i < 0.5e-3 && i >= 0) {
        violations.push({
          severity: 'info',
          code: 'LED_DIM',
          componentIds: [c.id],
          message: `LED current is only about ${mA(i)}.`,
          explanation: 'Below ~0.5 mA the LED will be very dim or dark.',
          suggestedFix: 'Reduce the series resistance to increase current toward the recommended 10–20 mA range.',
          expected: 'Visible illumination typically begins above ~1 mA.',
        });
      }
    }

    // Resistor power exceeded.
    if (c.type === 'resistor') {
      const d = findDevice(c.id);
      const p = d?.power ?? 0;
      const rating = (params.powerRating as number) ?? 0.25;
      if (p > rating * 1.05) {
        violations.push({
          severity: 'warning',
          code: 'R_POWER',
          componentIds: [c.id],
          message: `Resistor dissipates approximately ${(p * 1000).toFixed(0)} mW.`,
          explanation: `Rated for ${(rating * 1000).toFixed(0)} mW. Exceeding the rating overheats and may damage the resistor.`,
          suggestedFix: 'Use a higher-value resistor, a higher-wattage part, or reduce the applied voltage.',
          expected: `Under ${(rating * 1000).toFixed(0)} mW for reliable operation.`,
        });
      }
    }
  }

  // --- Shorts: two voltage sources on the same net with low impedance ----------------
  // Detected indirectly via the singular-matrix error; surface a clear message.
  if (solve.error && /singular/i.test(solve.error)) {
    violations.push({
      severity: 'critical',
      code: 'SHORT',
      componentIds: project.components
        .filter((c) => c.type === 'dc-source')
        .map((c) => c.id),
      message: 'The circuit contains a short circuit or an ungrounded loop.',
      explanation:
        'The matrix is singular, which usually means two voltage sources fight to impose different voltages on the same low-impedance net, or the circuit has no ground reference.',
      suggestedFix:
        'Check for two supplies sharing a net without resistance between them, and confirm there is exactly one ground reference.',
      expected: 'A solvable circuit has one ground and no competing ideal sources on a common net.',
    });
  }

  return violations;
}

/** Pretty-print violations (used by the console demo). */
export function formatViolations(violations: Violation[]): string {
  return violations.map((v) => {
    const sym = { info: 'ⓘ', warning: '⚠', error: '✗', critical: '⛔' }[v.severity];
    return [
      `  ${sym} [${v.code}] ${v.message}`,
      `     why: ${v.explanation}`,
      v.suggestedFix ? `     try: ${v.suggestedFix}` : null,
      v.expected ? `     expected: ${v.expected}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n\n');
}