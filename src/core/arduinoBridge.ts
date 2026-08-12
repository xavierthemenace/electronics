import type { ArduinoRunResult } from './arduinoRuntime.js';
import type { CircuitComponent, CircuitProject, Wire } from './model.js';

export const ARDUINO_PINS = {
  digital: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  analog: [0, 1, 2, 3, 4, 5],
};

function pwmVoltage(duty: number, vcc = 5): number {
  return (Math.max(0, Math.min(255, duty)) / 255) * vcc;
}

/**
 * Build a solver-only project in which actively driven Arduino GPIO pins are
 * represented by ordinary ideal DC sources. The editor project is never
 * mutated and the virtual components/wires are not persisted.
 */
export function buildArduinoRuntimeProject(
  project: CircuitProject,
  runtime: ArduinoRunResult,
): CircuitProject {
  const arduino = project.components.find(c => c.type === 'arduino-uno');
  const ground = project.components.find(c => c.type === 'ground');
  if (!arduino || !ground) return project;

  const anchor = arduino.position ?? { x: 0, y: 0 };
  const vcc = Number(arduino.params?.vcc ?? 5);
  const components: CircuitComponent[] = project.components.map(c => ({
    ...c,
    params: { ...(c.params ?? {}) },
    position: c.position ?? { x: 0, y: 0 },
  }));
  const wires: Wire[] = [...(project.wires ?? []).map(w => ({ a: { ...w.a }, b: { ...w.b } }))];

  for (const pin of ARDUINO_PINS.digital) {
    const mode = runtime.state.pinMode[pin];
    if (mode !== 'OUTPUT') continue;

    const hasPwm = Object.prototype.hasOwnProperty.call(runtime.state.pwm, pin);
    const voltage = hasPwm
      ? pwmVoltage(runtime.state.pwm[pin], vcc)
      : (runtime.state.digital[pin] ? vcc : 0);

    const virtualId = `__arduino_gpio_${arduino.id}_d${pin}`;
    if (components.some(c => c.id === virtualId)) continue;

    components.push({
      id: virtualId,
      type: 'dc-source',
      params: { voltage },
      position: { x: anchor.x, y: anchor.y },
      rotation: 0,
    });

    wires.push({
      a: { cid: virtualId, pid: 'plus' },
      b: { cid: arduino.id, pid: `d${pin}` },
    });
    wires.push({
      a: { cid: virtualId, pid: 'minus' },
      b: { cid: ground.id, pid: 'gnd' },
    });
  }

  return { ...project, components, wires };
}
