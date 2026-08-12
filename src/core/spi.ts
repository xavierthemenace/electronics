/**
 * Deterministic SPI protocol simulation primitives.
 * Supports the four clock modes and arbitrary word widths for analyzer/tests.
 */

export type SPICPOL = 0 | 1;
export type SPICPHA = 0 | 1;

export interface SPIConfig {
  mode: 0 | 1 | 2 | 3;
  clockHz: number;
  bits: number;
  lsbFirst?: boolean;
}

export interface SPIBitEvent {
  timeUs: number;
  clock: 0 | 1;
  mosi: 0 | 1;
  miso: 0 | 1;
}

export interface SPIWordEvent {
  timeUs: number;
  mosi: number;
  miso: number;
  bits: number;
}

export interface SPITrace {
  config: SPIConfig;
  words: SPIWordEvent[];
  bits: SPIBitEvent[];
  errors: string[];
}

function modeConfig(mode: SPIConfig['mode']): { cpol: SPICPOL; cpha: SPICPHA } {
  return {
    cpol: mode >= 2 ? 1 : 0,
    cpha: (mode === 1 || mode === 3) ? 1 : 0,
  };
}

function bitAt(value: number, index: number, bits: number, lsbFirst: boolean): 0 | 1 {
  const shift = lsbFirst ? index : bits - 1 - index;
  return ((value >>> shift) & 1) as 0 | 1;
}

export function encodeSPITransfer(mosiWords: number[], misoWords: number[], config: SPIConfig): SPITrace {
  const bits = Math.max(1, Math.min(32, Math.floor(config.bits)));
  const clockHz = Math.max(1, config.clockHz);
  const { cpol, cpha } = modeConfig(config.mode);
  const lsbFirst = Boolean(config.lsbFirst);
  const halfPeriodUs = 500_000 / clockHz;
  const count = Math.max(mosiWords.length, misoWords.length);
  const bitEvents: SPIBitEvent[] = [];
  const words: SPIWordEvent[] = [];

  let time = 0;
  for (let wordIndex = 0; wordIndex < count; wordIndex++) {
    const mosiWord = mosiWords[wordIndex] ?? 0;
    const misoWord = misoWords[wordIndex] ?? 0;
    for (let i = 0; i < bits; i++) {
      const mosiBit = bitAt(mosiWord, i, bits, lsbFirst);
      const misoBit = bitAt(misoWord, i, bits, lsbFirst);
      // Capture one representative sample per clock edge. The analyzer can
      // reconstruct full clock edges from the mode and sample spacing.
      const sampleClock = (cpol ^ (cpha ? 1 : 0)) as 0 | 1;
      bitEvents.push({ timeUs: time, clock: sampleClock, mosi: mosiBit, miso: misoBit });
      time += halfPeriodUs * 2;
    }
    words.push({ timeUs: time, mosi: mosiWord & ((2 ** Math.min(bits, 31)) - 1), miso: misoWord & ((2 ** Math.min(bits, 31)) - 1), bits });
  }

  return { config: { ...config, bits, clockHz, lsbFirst }, words, bits: bitEvents, errors: [] };
}

export function decodeSPIWords(trace: SPITrace): SPIWordEvent[] {
  return trace.words.map(word => ({ ...word }));
}

export function validateSPIConfig(config: SPIConfig): string[] {
  const errors: string[] = [];
  if (![0, 1, 2, 3].includes(config.mode)) errors.push(`Invalid SPI mode ${config.mode}`);
  if (!Number.isFinite(config.clockHz) || config.clockHz <= 0) errors.push('SPI clock must be positive.');
  if (!Number.isInteger(config.bits) || config.bits < 1 || config.bits > 32) errors.push('SPI word width must be 1–32 bits.');
  return errors;
}
