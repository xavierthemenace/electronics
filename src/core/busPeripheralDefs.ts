import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

function highZBusDevice(pins: string[]) {
  return {
    pins,
    isNonlinear: false,
    stamp(ctx: any) {
      for (const pin of pins.filter(p => !['vcc', 'gnd'].includes(p))) ctx.G(ctx.node(pin), ctx.node('gnd'), 1e-9);
    },
  };
}

export const i2cTemperatureSensorDef: ComponentDef = defineComponent({
  type: 'i2c-temp', name: 'I²C Temperature Sensor', category: 'sensor', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sda', name: 'SDA', kind: 'bidirectional' }, { id: 'scl', name: 'SCL', kind: 'input' },
  ],
  params: { address: { default: 0x48, unit: '' }, temperatureC: { default: 24.5, unit: '°C' } },
  docs: { description: 'I²C temperature sensor. Reads return a deterministic signed educational temperature encoding.' },
  device: () => highZBusDevice(['vcc', 'gnd', 'sda', 'scl']),
});

export const i2cEepromDef: ComponentDef = defineComponent({
  type: 'i2c-eeprom', name: 'I²C EEPROM', category: 'memory', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sda', name: 'SDA', kind: 'bidirectional' }, { id: 'scl', name: 'SCL', kind: 'input' },
  ],
  params: { address: { default: 0x50, unit: '' }, size: { default: 256, unit: 'bytes' } },
  docs: { description: 'I²C byte-addressable memory with deterministic teaching behavior.' },
  device: () => highZBusDevice(['vcc', 'gnd', 'sda', 'scl']),
});

export const spiDacDef: ComponentDef = defineComponent({
  type: 'spi-dac', name: 'SPI DAC', category: 'actuator', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sck', name: 'SCK', kind: 'input' }, { id: 'mosi', name: 'MOSI', kind: 'input' },
    { id: 'cs', name: 'CS', kind: 'input' }, { id: 'out', name: 'OUT', kind: 'analog' },
  ],
  params: { bits: { default: 12, unit: 'bits' }, code: { default: 0, unit: '' }, referenceVoltage: { default: 5, unit: 'V' }, outputResistance: { default: 50, unit: 'Ω' } },
  docs: { description: 'SPI-controlled DAC. The code parameter drives a solver-visible analog output.' },
  device(params: Record<string, unknown>) {
    const bits = Math.max(1, Math.min(24, Number(params.bits ?? 12)));
    const maxCode = Math.pow(2, bits) - 1;
    const code = Math.max(0, Math.min(maxCode, Number(params.code ?? 0)));
    const vref = Math.max(0.1, Number(params.referenceVoltage ?? 5));
    const r = Math.max(0.1, Number(params.outputResistance ?? 50));
    const output = code / maxCode * vref;
    return { pins: ['vcc','gnd','sck','mosi','cs','out'], isNonlinear: false,
      branches: [{ p: 'out', n: 'gnd', V: output }],
      current(ctx: any) { return (output - ctx.vPin('out')) / r; },
      power(ctx: any) { return Math.abs(output * ((output - ctx.vPin('out')) / r)); },
    };
  },
});

export const spiFlashDef: ComponentDef = defineComponent({
  type: 'spi-flash', name: 'SPI Flash', category: 'memory', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sck', name: 'SCK', kind: 'input' }, { id: 'mosi', name: 'MOSI', kind: 'input' },
    { id: 'miso', name: 'MISO', kind: 'output' }, { id: 'cs', name: 'CS', kind: 'input' },
  ],
  params: { size: { default: 1048576, unit: 'bytes' }, manufacturerId: { default: 0xEF, unit: '' }, deviceId: { default: 0x17, unit: '' } },
  docs: { description: 'Deterministic SPI flash device with protocol responses and high-impedance bus pins.' },
  device: () => highZBusDevice(['vcc', 'gnd', 'sck', 'mosi', 'miso', 'cs']),
});

export const busPeripheralDefs: ComponentDef[] = [i2cTemperatureSensorDef, i2cEepromDef, spiDacDef, spiFlashDef];
