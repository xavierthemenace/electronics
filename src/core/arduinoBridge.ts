/**
 * Bridges the educational Arduino runtime into the electrical circuit model.
 * The runtime remains deterministic and safe; this adapter converts GPIO/PWM
 * outputs into explicit MCU pin voltage parameters consumed by the solver.
 */

import type { ArduinoRunResult } from './arduinoRuntime.js';
import type { CircuitComponent, CircuitProject } from './model.js';

export const ARDUINO_PINS = {
  digital: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  analog: [0, 1, 2, 3, 4, 5],
};

function pwmVoltage(duty: number, vcc = 5): number {
  return (Math.max(0, Math.min(255, duty)) / 255) * vcc;
}

/**
 * Apply runtime outputs to Arduino component params without mutating the
 * original editor state. Inputs remain high impedance because the educational
 * runtime does not claim an input voltage that it did not measure.
 */
export function applyArduinoRuntimeToProject(
  project: CircuitProject,
  runtime: ArduinoRunResult,
): CircuitProject {
  const components = project.components.map((component): CircuitComponent => {
    if (component.type !== 'arduino-uno') return { ...component, params: { ...component.params } };

    const vcc = Number(component.params.vcc ?? 5);
    const pinMode = runtime.state.pinMode ?? {};
    const digital = runtime.state.digital ?? {};
    const pwm = runtime.state.pwm ?? {};

    const nextParams: Record<string, unknown> = { ...component.params };

    for (const pin of ARDUINO_PINS.digital) {
      if (pinMode[pin] !== 'OUTPUT') {
        nextParams[`d${pin}Drive`] = 'Z';
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(pwm, pin)) {
        nextParams[`d${pin}Drive`] = 'PWM';
        nextParams[`d${pin}Voltage`] = pwmVoltage(pwm[pin], vcc);
      } else {
        nextParams[`d${pin}Drive`] = 'HIGH' in (digital[pin] === 1 ? { HIGH: true } : {}) ? 'HIGH' : 'LOW';
        nextParams[`d${pin}Voltage`] = digital[pin] ? vcc : 0;
      }
    }

    return { ...component, params: nextParams };
  });

  return { ...project, components };
}

export function buildArduinoRuntimeProject(project: CircuitProject, runtime: ArduinoRunResult): CircuitProject {
  return applyArduinoRuntimeToProject(project, runtime);
}
