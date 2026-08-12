import type { ArduinoRunResult } from './arduinoRuntime.js';
import { createEEPROM, createTemperatureSensor } from './busDevices.js';
import type { CircuitProject, CircuitComponent } from './model.js';

export interface BusRuntimeResult {
  project: CircuitProject;
  i2cReads: Record<number, number[]>;
  messages: string[];
}

function applyI2CTransactions(project: CircuitProject, runtime: ArduinoRunResult): BusRuntimeResult {
  const components: CircuitComponent[] = project.components.map(c => ({ ...c, params: { ...(c.params ?? {}) }, position: c.position ?? { x: 0, y: 0 } }));
  const reads: Record<number, number[]> = {};
  const messages: string[] = [];

  for (const component of components) {
    if (component.type !== 'i2c-temp' && component.type !== 'i2c-eeprom') continue;
    const address = Number(component.params.address ?? (component.type === 'i2c-temp' ? 0x48 : 0x50)) & 0x7f;
    const model = component.type === 'i2c-temp'
      ? createTemperatureSensor(address, Number(component.params.temperatureC ?? 24.5))
      : createEEPROM(address, Math.max(8, Number(component.params.size ?? 256)));
    const transactions = runtime.state.i2c.filter(t => t.address === address);
    for (const transaction of transactions) {
      if (transaction.read) {
        const response = model.read(transaction.bytes.length || 2, []);
        reads[address] = response.bytes;
        messages.push(`${model.name} @ 0x${address.toString(16)} → ${response.bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      } else {
        model.write(transaction.bytes);
        messages.push(`${model.name} @ 0x${address.toString(16)} ← ${transaction.bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      }
    }
  }
  return { project: { ...project, components }, i2cReads: reads, messages };
}

export function applyBusRuntime(project: CircuitProject, runtime: ArduinoRunResult): BusRuntimeResult {
  return applyI2CTransactions(project, runtime);
}
