/**
 * Deterministic I²C protocol simulation primitives.
 *
 * Models the digital/protocol layer only. The electrical open-drain behavior
 * is represented by SDA/SCL line states and can later be connected to an
 * analog pull-up model without changing the frame representation.
 */

export type I2CLine = 0 | 1;

export interface I2CByteEvent {
  timeUs: number;
  byte: number;
  read: boolean;
  ack: boolean;
  address?: number;
  repeatedStart?: boolean;
}

export interface I2CTransaction {
  address: number;
  read: boolean;
  bytes: number[];
  ack: boolean[];
  startUs: number;
  stopUs: number;
  repeatedStart?: boolean;
}

export interface I2CTrace {
  events: I2CByteEvent[];
  transactions: I2CTransaction[];
  errors: string[];
}

export function i2cStart(timeUs: number): { timeUs: number; condition: 'START' } {
  return { timeUs, condition: 'START' };
}

export function i2cStop(timeUs: number): { timeUs: number; condition: 'STOP' } {
  return { timeUs, condition: 'STOP' };
}

export function encodeI2CByte(byte: number): I2CLine[] {
  const value = byte & 0xff;
  const bits: I2CLine[] = [];
  for (let bit = 7; bit >= 0; bit--) bits.push(((value >> bit) & 1) as I2CLine);
  return bits;
}

export function decodeI2CByte(bits: I2CLine[]): number {
  if (bits.length !== 8) throw new Error(`I2C byte requires 8 bits, got ${bits.length}`);
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

/** Open-drain resolution: any device pulling low wins; released means high. */
export function resolveOpenDrain(drivers: Array<0 | 1 | 'Z'>): I2CLine {
  return drivers.includes(0) ? 0 : 1;
}

export interface I2CMasterOptions {
  address: number;
  read?: boolean;
  startUs?: number;
  byteTimeUs?: number;
  repeatedStart?: boolean;
}

/**
 * Encode a master transaction into a protocol trace. This intentionally keeps
 * timing deterministic and is suitable for lessons and analyzers.
 */
export function encodeI2CTransaction(bytes: number[], options: I2CMasterOptions): I2CTrace {
  const address = options.address & 0x7f;
  const read = Boolean(options.read);
  const startUs = options.startUs ?? 0;
  const byteTimeUs = Math.max(1, options.byteTimeUs ?? 90);
  const events: I2CByteEvent[] = [];
  const ack: boolean[] = [];
  let time = startUs + byteTimeUs;

  // Address byte includes the R/W bit.
  events.push({ timeUs: time, byte: (address << 1) | (read ? 1 : 0), read: false, ack: true, address });
  ack.push(true);
  time += byteTimeUs;

  for (const byte of bytes) {
    events.push({ timeUs: time, byte: byte & 0xff, read, ack: true, address });
    ack.push(true);
    time += byteTimeUs;
  }

  return {
    events,
    transactions: [{
      address,
      read,
      bytes: bytes.map(b => b & 0xff),
      ack,
      startUs,
      stopUs: time,
      repeatedStart: options.repeatedStart,
    }],
    errors: [],
  };
}

/** Basic validation for decoded protocol traces. */
export function validateI2CTrace(trace: I2CTrace): I2CTrace {
  const errors = [...trace.errors];
  for (const event of trace.events) {
    if (event.byte < 0 || event.byte > 0xff) errors.push(`Invalid I2C byte 0x${event.byte.toString(16)}`);
    if (event.address !== undefined && (event.address < 0 || event.address > 0x7f)) {
      errors.push(`Invalid 7-bit I2C address 0x${event.address.toString(16)}`);
    }
    if (!event.ack) errors.push(`NACK at ${event.timeUs} µs for byte 0x${event.byte.toString(16).padStart(2, '0')}`);
  }
  return { ...trace, errors };
}
