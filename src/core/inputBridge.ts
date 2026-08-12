import type { CircuitComponent, CircuitProject } from './model.js';

export interface PeripheralInputs {
  digital: Record<number, 0 | 1>;
  analog: Record<number, number>;
}

function connectedPins(project: CircuitProject, componentId: string, pinId: string): Array<{ cid: string; pid: string }> {
  const result: Array<{ cid: string; pid: string }> = [];
  for (const wire of project.wires ?? []) {
    if (wire.a.cid === componentId && wire.a.pid === pinId) result.push(wire.b);
    else if (wire.b.cid === componentId && wire.b.pid === pinId) result.push(wire.a);
  }
  return result;
}

function pinNumber(pinId: string): number | null {
  const match = pinId.match(/^d(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function analogNumber(pinId: string): number | null {
  const match = pinId.match(/^a(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export function deriveArduinoInputs(project: CircuitProject, manual: PeripheralInputs): PeripheralInputs {
  const digital = { ...manual.digital };
  const analog = { ...manual.analog };
  const arduino = project.components.find(c => c.type === 'arduino-uno');
  if (!arduino) return { digital, analog };

  const byId = new Map(project.components.map(c => [c.id, c]));
  const visit = (startPin: string): CircuitComponent | null => {
    const queue = [{ cid: arduino.id, pid: startPin }];
    const seen = new Set(queue.map(x => `${x.cid}:${x.pid}`));
    while (queue.length) {
      const current = queue.shift()!;
      for (const next of connectedPins(project, current.cid, current.pid)) {
        const key = `${next.cid}:${next.pid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const comp = byId.get(next.cid);
        if (!comp) continue;
        if (comp.type === 'analog-sensor' || comp.type === 'pushbutton') return comp;
        queue.push(next);
      }
    }
    return null;
  };

  for (let pin = 2; pin <= 13; pin++) {
    const peripheral = visit(`d${pin}`);
    if (peripheral?.type === 'pushbutton') digital[pin] = peripheral.params.pressed ? 1 : 0;
  }

  for (let channel = 0; channel <= 5; channel++) {
    const peripheral = visit(`a${channel}`);
    if (peripheral?.type === 'analog-sensor') {
      const voltage = Math.max(0, Math.min(5, Number(peripheral.params.outputVoltage ?? 0)));
      analog[channel] = Math.round((voltage / 5) * 1023);
    }
  }

  return { digital, analog };
}
