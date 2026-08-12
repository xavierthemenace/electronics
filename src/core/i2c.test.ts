import { describe, expect, it } from 'vitest';
import { decodeI2CByte, encodeI2CByte, encodeI2CTransaction, resolveOpenDrain, validateI2CTrace } from './i2c.js';

describe('I2C protocol primitives', () => {
  it('encodes and decodes an I2C byte', () => {
    const bits = encodeI2CByte(0xA5);
    expect(bits).toHaveLength(8);
    expect(decodeI2CByte(bits)).toBe(0xA5);
  });

  it('models open-drain resolution', () => {
    expect(resolveOpenDrain(['Z', 'Z'])).toBe(1);
    expect(resolveOpenDrain(['Z', 0])).toBe(0);
    expect(resolveOpenDrain([1, 0])).toBe(0);
  });

  it('creates a transaction with address and payload bytes', () => {
    const trace = encodeI2CTransaction([0x12, 0x34], { address: 0x48, startUs: 100 });
    expect(trace.transactions[0]).toMatchObject({ address: 0x48, read: false, bytes: [0x12, 0x34] });
    expect(trace.events[0].byte).toBe(0x90);
    expect(trace.errors).toEqual([]);
  });

  it('reports NACKs', () => {
    const trace = validateI2CTrace({
      events: [{ timeUs: 10, byte: 0x48, read: false, ack: false }],
      transactions: [],
      errors: [],
    });
    expect(trace.errors.some(e => e.includes('NACK'))).toBe(true);
  });
});
