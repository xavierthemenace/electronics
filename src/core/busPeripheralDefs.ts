import { defineComponent } from './define.js';
import type { ComponentDef } from './model.js';

export const i2cTemperatureSensorDef: ComponentDef = defineComponent({
  type: 'i2c-temp', name: 'I²C Temperature Sensor', category: 'sensor', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sda', name: 'SDA', kind: 'bidirectional' }, { id: 'scl', name: 'SCL', kind: 'input' },
  ],
  params: { address: { default: 0x48, unit: '' }, temperatureC: { default: 24.5, unit: '°C' } },
  docs: { description: 'I²C temperature sensor. Read returns a signed educational temperature encoding.' },
});

export const i2cEepromDef: ComponentDef = defineComponent({
  type: 'i2c-eeprom', name: 'I²C EEPROM', category: 'memory', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sda', name: 'SDA', kind: 'bidirectional' }, { id: 'scl', name: 'SCL', kind: 'input' },
  ],
  params: { address: { default: 0x50, unit: '' }, size: { default: 256, unit: 'bytes' } },
  docs: { description: 'I²C byte-addressable memory with deterministic teaching behavior.' },
});

export const spiDacDef: ComponentDef = defineComponent({
  type: 'spi-dac', name: 'SPI DAC', category: 'actuator', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sck', name: 'SCK', kind: 'input' }, { id: 'mosi', name: 'MOSI', kind: 'input' },
    { id: 'cs', name: 'CS', kind: 'input' }, { id: 'out', name: 'OUT', kind: 'analog' },
  ],
  params: { bits: { default: 12, unit: 'bits' }, code: { default: 0, unit: '' } },
  docs: { description: 'SPI-controlled DAC. Output code is exposed as an educational analog state.' },
});

export const spiFlashDef: ComponentDef = defineComponent({
  type: 'spi-flash', name: 'SPI Flash', category: 'memory', status: 'modelled',
  pins: [
    { id: 'vcc', name: 'VCC', kind: 'power' }, { id: 'gnd', name: 'GND', kind: 'ground' },
    { id: 'sck', name: 'SCK', kind: 'input' }, { id: 'mosi', name: 'MOSI', kind: 'input' },
    { id: 'miso', name: 'MISO', kind: 'output' }, { id: 'cs', name: 'CS', kind: 'input' },
  ],
  params: { size: { default: 1048576, unit: 'bytes' } },
  docs: { description: 'Deterministic SPI flash device for protocol and embedded-memory lessons.' },
});

export const busPeripheralDefs: ComponentDef[] = [i2cTemperatureSensorDef, i2cEepromDef, spiDacDef, spiFlashDef];
