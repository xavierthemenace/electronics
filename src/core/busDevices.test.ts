import { describe, expect, it } from 'vitest';
import { createEEPROM, createTemperatureSensor, simulateSPIDac, simulateSPIFlashRead } from './busDevices.js';

describe('bus device models', () => {
  it('encodes deterministic temperature reads', () => {
    const sensor = createTemperatureSensor(0x48, 24.5);
    const response = sensor.read(2, []);
    expect(response.address).toBe(0x48);
    expect(response.bytes.length).toBe(2);
  });

  it('stores and reads EEPROM bytes', () => {
    const eeprom = createEEPROM(0x50, 32);
    eeprom.write([3, 0xaa, 0x55]);
    const response = eeprom.read(2, []);
    expect(response.bytes).toEqual([0xaa, 0x55]);
  });

  it('reports SPI DAC codes and flash reads', () => {
    expect(simulateSPIDac([0x0a, 0xbc], 12).description).toContain('DAC code');
    expect(simulateSPIFlashRead(0x1234, 3).bytes).toEqual([0x34, 0x35, 0x36]);
  });
});
