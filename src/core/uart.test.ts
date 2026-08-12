import { describe, expect, it } from 'vitest';
import { analyzeUart, byteToBits, encodeBytes } from './uart.js';

describe('UART protocol primitives', () => {
  it('builds an 8N1 frame with start and stop bits', () => {
    const bits = byteToBits(0x55, { baud: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
    expect(bits).toEqual([0,1,0,1,0,1,0,1,0,1]);
  });

  it('round-trips encoded bytes through the analyzer', () => {
    const config = { baud: 9600, dataBits: 8 as const, stopBits: 1 as const, parity: 'none' as const };
    const waveform = encodeBytes([0x41, 0x42], config);
    const analysis = analyzeUart(waveform, config);
    expect(analysis.errors).toEqual([]);
    expect(analysis.frames.map(f => f.value)).toEqual([0x41, 0x42]);
    expect(analysis.frames.map(f => f.dataAscii)).toEqual(['A', 'B']);
  });

  it('detects a bad stop bit', () => {
    const config = { baud: 9600, dataBits: 8 as const, stopBits: 1 as const, parity: 'none' as const };
    const waveform = encodeBytes([0x41], config);
    waveform[waveform.length - 1].value = 0;
    const analysis = analyzeUart(waveform, config);
    expect(analysis.frames[0].stopOk).toBe(false);
    expect(analysis.errors[0]).toContain('stop-bit error');
  });
});
