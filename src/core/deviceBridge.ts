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

function applyDisplayCommands(source: string, components: CircuitComponent[]): void {
  const lcds = components.filter(c => c.type === 'lcd-1602');
  if (!lcds.length) return;
  let cursor = 0;
  let text = String(lcds[0].params.text ?? '');
  if (/lcd\s*\.\s*clear\s*\(\s*\)/.test(source)) text = '';
  const cursorMatch = source.match(/lcd\s*\.\s*setCursor\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (cursorMatch) cursor = Number(cursorMatch[1]) + Number(cursorMatch[2]) * 16;
  const prints = [...source.matchAll(/lcd\s*\.\s*print(?:ln)?\s*\(\s*([\s\S]*?)\s*\)/g)];
  for (const match of prints) {
    let value = match[1].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    const chars = value.slice(0, 32);
    const before = text.padEnd(32, ' ');
    text = (before.slice(0, cursor) + chars + before.slice(cursor + chars.length)).slice(0, 32);
    cursor = Math.min(32, cursor + chars.length);
  }
  for (const lcd of lcds) lcd.params.text = text.trimEnd();
}

/** Applies firmware-derived state to modeled peripherals in a solver-only project. */
export function buildArduinoDeviceRuntimeProject(project: CircuitProject, runtime: ArduinoRunResult, sourceCode = ''): CircuitProject {
  const arduino = project.components.find(c => c.type === 'arduino-uno');
  if (!arduino) return project;
  const components: CircuitComponent[] = project.components.map(c => ({ ...c, params: { ...(c.params ?? {}) }, position: c.position ?? { x: 0, y: 0 } }));

  for (const component of components) {
    if (component.type === 'servo') {
      const pwm = findPwmForDevice(project, component.id, 'signal', runtime, arduino.id);
      if (pwm !== null) {
        const duty = Math.max(0, Math.min(255, pwm));
        component.params.signalVoltage = duty / 255 * Number(arduino.params?.vcc ?? 5);
        component.params.angle = Math.round((duty / 255) * 180);
      }
    }
  }
  applyDisplayCommands(sourceCode, components);
  return { ...project, components };
}
