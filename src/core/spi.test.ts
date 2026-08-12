import { describe, expect, it } from 'vitest';
import { decodeSPIWords, encodeSPITransfer, validateSPIConfig } from './spi.js';

describe('SPI protocol primitives', () => {
  it('encodes an SPI transfer with the requested mode and width', () => {
    const trace = encodeSPITransfer([0x9A], [0x55], { mode: 0, clockHz: 1_000_000, bits: 8 });
    expect(trace.config.mode).toBe(0);
    expect(trace.bits).toHaveLength(8);
    expect(trace.words[0]).toMatchObject({ mosi: 0x9A, miso: 0x55, bits: 8 });
  });

  it('supports LSB-first transfers', () => {
    const msb = encodeSPITransfer([0x01], [0x80], { mode: 0, clockHz: 100_000, bits: 8, lsbFirst: false });
    const lsb = encodeSPITransfer([0x01], [0x80], { mode: 0, clockHz: 100_000, bits: 8, lsbFirst: true });
    expect(msb.bits[0].mosi).toBe(0);
    expect(lsb.bits[0].mosi).toBe(1);
  });

  it('decodes word events without mutating the trace', () => {
    const trace = encodeSPITransfer([0x12, 0x34], [0xA5, 0x5A], { mode: 3, clockHz: 2_000_000, bits: 8 });
    expect(decodeSPIWords(trace).map(w => w.miso)).toEqual([0xA5, 0x5A]);
  });

  it('validates invalid configurations', () => {
    expect(validateSPIConfig({ mode: 9 as 0, clockHz: 0, bits: 33 })).toHaveLength(3);
  });
});
