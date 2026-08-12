import type { ArduinoRunResult } from './arduinoRuntime.js';
import type { CircuitComponent, CircuitProject } from './model.js';

function findPwmForDevice(project: CircuitProject, componentId: string, pinId: string, runtime: ArduinoRunResult, arduinoId: string): number | null {
  const wire = project.wires.find(w =>
    (w.a.cid === arduinoId && w.a.pid.startsWith('d') && w.b.cid === componentId && w.b.pid === pinId) ||
    (w.b.cid === arduinoId && w.b.pid.startsWith('d') && w.a.cid === componentId && w.a.pid === pinId)
  );
  if (!wire) return null;
  const arduinoPin = wire.a.cid === arduinoId ? wire.a.pid : wire.b.pid;
  const pin = Number(arduinoPin.slice(1));
  if (!Number.isFinite(pin)) return null;
  return runtime.state.pwm[pin] ?? null;
}

/**
 * Applies firmware-derived control state to modeled peripherals in a
 * solver-only project. The editor project is never mutated.
 */
export function buildArduinoDeviceRuntimeProject(project: CircuitProject, runtime: ArduinoRunResult): CircuitProject {
  const arduino = project.components.find(c => c.type === 'arduino-uno');
  if (!arduino) return project;

  const components: CircuitComponent[] = project.components.map(c => ({
    ...c,
    params: { ...(c.params ?? {}) },
    position: c.position ?? { x: 0, y: 0 },
  }));

  for (const component of components) {
    if (component.type === 'servo') {
      const pwm = findPwmForDevice(project, component.id, 'signal', runtime, arduino.id);
      if (pwm !== null) {
        const duty = Math.max(0, Math.min(255, pwm));
        component.params.signalVoltage = duty / 255 * Number(arduino.params?.vcc ?? 5);
        // Educational PWM-to-angle mapping. Continuous-servo timing can be added later.
        component.params.angle = Math.round((duty / 255) * 180);
      }
    }
  }

  return { ...project, components };
}
