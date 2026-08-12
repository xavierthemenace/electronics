/**
 * Educational multi-device bus peripherals.
 * These models are protocol-facing devices: they provide deterministic data
 * for lessons without pretending to be full silicon-level models.
 */

export type I2CDeviceResponse = {
  address: number;
  bytes: number[];
  description: string;
};

export interface I2CPeripheralModel {
  address: number;
  name: string;
  read(count: number, registers: number[]): I2CDeviceResponse;
  write(bytes: number[]): void;
}

export function createTemperatureSensor(address = 0x48, temperatureC = 24.5): I2CPeripheralModel {
  let value = temperatureC;
  return {
    address,
    name: 'I²C Temperature Sensor',
    read(count) {
      const raw = Math.round((value + 40) * 256) & 0xffff;
      const bytes = [raw >> 8, raw & 0xff].slice(0, count);
      return { address, bytes, description: `${value.toFixed(1)} °C` };
    },
    write(bytes) {
      if (bytes.length >= 2) {
        const raw = ((bytes[0] << 8) | bytes[1]) & 0xffff;
        value = raw / 256 - 40;
      }
    },
  };
}

export function createEEPROM(address = 0x50, size = 256): I2CPeripheralModel {
  const memory = new Uint8Array(size);
  let pointer = 0;
  return {
    address,
    name: 'I²C EEPROM',
    read(count) {
      const bytes: number[] = [];
      for (let i = 0; i < count; i++) bytes.push(memory[(pointer + i) % memory.length]);
      pointer = (pointer + count) % memory.length;
      return { address, bytes, description: `EEPROM read @ 0x${pointer.toString(16).padStart(2, '0')}` };
    },
    write(bytes) {
      if (bytes.length === 0) return;
      pointer = bytes[0] % memory.length;
      for (let i = 1; i < bytes.length; i++) memory[(pointer + i - 1) % memory.length] = bytes[i] & 0xff;
      pointer = (pointer + Math.max(0, bytes.length - 1)) % memory.length;
    },
  };
}

export type SPIDeviceResponse = {
  selected: boolean;
  bytes: number[];
  description: string;
};

export function simulateSPIDac(input: number[], bits = 12): SPIDeviceResponse {
  const max = 2 ** Math.min(bits, 16) - 1;
  const value = ((input[0] ?? 0) << 8 | (input[1] ?? 0)) & max;
  return {
    selected: true,
    bytes: input.map(v => v & 0xff),
    description: `DAC code ${value}/${max}`,
  };
}

export function simulateSPIFlashRead(address: number, count: number): SPIDeviceResponse {
  const bytes = Array.from({ length: Math.max(0, count) }, (_, i) => (address + i) & 0xff);
  return {
    selected: true,
    bytes,
    description: `Flash read @ 0x${address.toString(16).padStart(6, '0')}`,
  };
}
