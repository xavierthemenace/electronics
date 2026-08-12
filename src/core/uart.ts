export type UartParity = 'none' | 'even' | 'odd';

export interface UartConfig {
  baud: number;
  dataBits: 5 | 6 | 7 | 8 | 9;
  stopBits: 1 | 2;
  parity: UartParity;
  inverted?: boolean;
}

export interface UartBit {
  time: number;
  value: 0 | 1;
}

export interface UartFrame {
  startTime: number;
  endTime: number;
  bits: number[];
  value: number;
  dataHex: string;
  dataAscii: string;
  parityOk: boolean;
  stopOk: boolean;
  valid: boolean;
}

export interface UartAnalysis {
  config: UartConfig;
  frames: UartFrame[];
  errors: string[];
  totalBits: number;
}

const DEFAULT_CONFIG: UartConfig = {
  baud: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
};

export function byteToBits(value: number, config: UartConfig = DEFAULT_CONFIG): number[] {
  const bits: number[] = [0];
  for (let i = 0; i < config.dataBits; i++) bits.push((value >> i) & 1);
  if (config.parity !== 'none') {
    const ones = bits.slice(1).reduce((sum, bit) => sum + bit, 0);
    const parityBit = config.parity === 'even' ? ones % 2 : (ones + 1) % 2;
    bits.push(parityBit);
  }
  for (let i = 0; i < config.stopBits; i++) bits.push(1);
  return bits;
}

export function encodeBytes(bytes: number[], config: UartConfig = DEFAULT_CONFIG, startTime = 0): UartBit[] {
  const bitTime = 1000 / config.baud;
  const result: UartBit[] = [];
  let t = startTime;
  for (const byte of bytes) {
    for (const bit of byteToBits(byte, config)) {
      result.push({ time: t, value: config.inverted ? (bit ? 0 : 1) : bit as 0 | 1 });
      t += bitTime;
    }
  }
  return result;
}

function sampleBitsAtTransitions(bits: UartBit[], config: UartConfig): { start: number; values: number[] }[] {
  if (!bits.length) return [];
  const bitTime = 1000 / config.baud;
  const normalized = bits.map(b => ({ time: b.time, value: config.inverted ? (b.value ? 0 : 1) : b.value }));
  const frames: { start: number; values: number[] }[] = [];
  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i - 1].value !== 1 || normalized[i].value !== 0) continue;
    const start = normalized[i].time;
    const values: number[] = [];
    const totalBits = 1 + config.dataBits + (config.parity === 'none' ? 0 : 1) + config.stopBits;
    for (let n = 0; n < totalBits; n++) {
      const sampleTime = start + (n + 0.5) * bitTime;
      let latest = normalized[i].value;
      for (let j = i; j < normalized.length && normalized[j].time <= sampleTime; j++) latest = normalized[j].value;
      values.push(latest);
    }
    frames.push({ start, values });
  }
  return frames;
}

export function analyzeUart(bits: UartBit[], inputConfig?: Partial<UartConfig>): UartAnalysis {
  const config: UartConfig = { ...DEFAULT_CONFIG, ...inputConfig };
  if (!Number.isFinite(config.baud) || config.baud <= 0) {
    return { config, frames: [], errors: ['Baud rate must be positive.'], totalBits: bits.length };
  }
  const frameCandidates = sampleBitsAtTransitions([...bits].sort((a, b) => a.time - b.time), config);
  const frames: UartFrame[] = [];
  const errors: string[] = [];
  const totalBits = 1 + config.dataBits + (config.parity === 'none' ? 0 : 1) + config.stopBits;

  for (const candidate of frameCandidates) {
    const values = candidate.values;
    if (values.length !== totalBits || values[0] !== 0) continue;
    let value = 0;
    for (let i = 0; i < config.dataBits; i++) value |= values[1 + i] << i;
    let parityOk = true;
    if (config.parity !== 'none') {
      const parityIndex = 1 + config.dataBits;
      const ones = values.slice(1, parityIndex).reduce((sum, bit) => sum + bit, 0);
      const expected = config.parity === 'even' ? ones % 2 : (ones + 1) % 2;
      parityOk = values[parityIndex] === expected;
    }
    const stopIndex = 1 + config.dataBits + (config.parity === 'none' ? 0 : 1);
    const stopOk = values.slice(stopIndex).every(v => v === 1);
    const endTime = candidate.start + totalBits * (1000 / config.baud);
    const byte = value & 0xff;
    const ascii = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
    frames.push({
      startTime: candidate.start,
      endTime,
      bits: values,
      value,
      dataHex: `0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
      dataAscii: ascii,
      parityOk,
      stopOk,
      valid: parityOk && stopOk,
    });
    if (!parityOk) errors.push(`UART parity error at ${candidate.start.toFixed(3)} ms.`);
    if (!stopOk) errors.push(`UART stop-bit error at ${candidate.start.toFixed(3)} ms.`);
  }

  return { config, frames, errors, totalBits };
}
