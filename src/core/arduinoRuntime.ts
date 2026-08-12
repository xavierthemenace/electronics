export type ArduinoPinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';

export interface ArduinoTransition { pin: number; timeMs: number; value: 0 | 1; }
export interface ArduinoSerialEvent { timeMs: number; text: string; newline: boolean; }
export interface ArduinoI2CTransaction { timeMs: number; address: number; read: boolean; bytes: number[]; ack: boolean[]; }
export interface ArduinoSPITransfer { timeMs: number; mosi: number[]; miso: number[]; mode: 0 | 1 | 2 | 3; clockHz: number; }
export interface ArduinoLCDState { text: string; row: number; column: number; }

export interface ArduinoRunOptions {
  digitalInputs?: Record<number, 0 | 1>;
  analogInputs?: Record<number, number>;
  i2cReads?: Record<number, number[]>;
  maxSteps?: number;
}

export interface ArduinoRuntimeState {
  pinMode: Record<number, ArduinoPinMode>;
  digital: Record<number, 0 | 1>;
  analog: Record<number, number>;
  pwm: Record<number, number>;
  serial: string[];
  serialEvents: ArduinoSerialEvent[];
  transitions: ArduinoTransition[];
  i2c: ArduinoI2CTransaction[];
  spi: ArduinoSPITransfer[];
  lcd: ArduinoLCDState;
  elapsedMs: number;
  warnings: string[];
}

export interface ArduinoRunResult {
  state: ArduinoRuntimeState;
  steps: number;
  errors: string[];
  inputs: { digital: Record<number, 0 | 1>; analog: Record<number, number> };
}

function initialState(): ArduinoRuntimeState {
  return {
    pinMode: {}, digital: {}, analog: {}, pwm: {}, serial: [], serialEvents: [], transitions: [],
    i2c: [], spi: [], lcd: { text: '', row: 0, column: 0 }, elapsedMs: 0, warnings: [],
  };
}

function valueOf(token: string, constants: Record<string, number>, variables: Record<string, number> = {}): number {
  const trimmed = token.trim().replace(/[;,)]$/, '');
  if (trimmed in variables) return variables[trimmed];
  if (trimmed in constants) return constants[trimmed];
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

function splitArgs(text: string): string[] {
  const args: string[] = [];
  let current = ''; let quote = ''; let depth = 0;
  for (const ch of text) {
    if ((ch === '"' || ch === "'") && (!quote || quote === ch)) quote = quote ? '' : ch;
    if (!quote && ch === '(') depth++;
    if (!quote && ch === ')') depth--;
    if (!quote && depth === 0 && ch === ',') { args.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function printArg(token: string, variables: Record<string, number>): string {
  const t = token.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  if (t in variables) return String(variables[t]);
  return t;
}

/** Deterministic Arduino teaching runtime with GPIO, ADC, PWM, UART, Wire, SPI and LCD APIs. */
export function runArduino(source: string, options: ArduinoRunOptions | number = {}): ArduinoRunResult {
  const normalized: ArduinoRunOptions = typeof options === 'number' ? { maxSteps: options } : options;
  const maxSteps = normalized.maxSteps ?? 300;
  const externalDigital = { ...(normalized.digitalInputs ?? {}) };
  const externalAnalog = { ...(normalized.analogInputs ?? {}) };
  const i2cReads = { ...(normalized.i2cReads ?? {}) };
  const state = initialState();
  const errors: string[] = [];
  const constants: Record<string, number> = {};
  const variables: Record<string, number> = {};
  let i2cAddress: number | null = null;
  let i2cWrite: number[] = [];
  let i2cReadAddress: number | null = null;
  let i2cReadRemaining = 0;
  let i2cBusStarted = false;
  let spiMode: 0 | 1 | 2 | 3 = 0;
  let spiClockHz = 1_000_000;

  for (const line of source.split(/\r?\n/)) {
    const m = line.match(/^\s*const\s+(?:int|long|byte|float)\s+(\w+)\s*=\s*([^;]+)/);
    if (m) constants[m[1]] = valueOf(m[2], constants);
  }

  const setupMatch = source.match(/void\s+setup\s*\(\)\s*\{([\s\S]*?)\}/);
  const loopMatch = source.match(/void\s+loop\s*\(\)\s*\{([\s\S]*?)\}/);
  if (!setupMatch) errors.push('Missing setup() function.');
  if (!loopMatch) errors.push('Missing loop() function.');
  if (errors.length) return { state, steps: 0, errors, inputs: { digital: externalDigital, analog: externalAnalog } };

  const statements = `${setupMatch![1]}\n${loopMatch![1]}`
    .split(/\r?\n|(?<=;)/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith('//'));

  let steps = 0;
  for (let pass = 0; pass < 8 && steps < maxSteps; pass++) {
    for (const raw of statements) {
      if (steps++ >= maxSteps) break;
      const line = raw.replace(/\/\/.*$/, '').trim();
      if (!line) continue;
      let m = line.match(/^pinMode\s*\(\s*([^,]+),\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)/);
      if (m) {
        const pin = valueOf(m[1], constants, variables); state.pinMode[pin] = m[2] as ArduinoPinMode;
        if (m[2] === 'INPUT_PULLUP') setDigital(state, pin, 1);
        else if (m[2] === 'INPUT' && externalDigital[pin] !== undefined) setDigital(state, pin, externalDigital[pin]);
        continue;
      }
      m = line.match(/^digitalWrite\s*\(\s*([^,]+),\s*(HIGH|LOW|1|0)\s*\)/);
      if (m) { const pin = valueOf(m[1], constants, variables); setDigital(state, pin, m[2] === 'HIGH' || m[2] === '1' ? 1 : 0); continue; }
      m = line.match(/^(?:const\s+)?(?:int|long|float|byte|bool)\s+(\w+)\s*=\s*digitalRead\s*\(\s*([^\)]+)\)/);
      if (m) { const pin = valueOf(m[2], constants, variables); variables[m[1]] = externalDigital[pin] ?? (state.pinMode[pin] === 'INPUT_PULLUP' ? 1 : state.digital[pin] ?? 0); state.digital[pin] = variables[m[1]] ? 1 : 0; continue; }
      m = line.match(/^(?:const\s+)?(?:int|long|float|byte|bool)\s+(\w+)\s*=\s*analogRead\s*\(\s*([^\)]+)\)/);
      if (m) { const pinToken = m[2].trim().replace(/^A/i, ''); const pin = Number.isFinite(Number(pinToken)) ? Number(pinToken) : valueOf(pinToken, constants, variables); variables[m[1]] = externalAnalog[pin] ?? state.analog[pin] ?? 0; state.analog[pin] = Math.max(0, Math.min(1023, variables[m[1]])); continue; }
      m = line.match(/^analogWrite\s*\(\s*([^,]+),\s*([^\)]+)\)/);
      if (m) { const pin = valueOf(m[1], constants, variables); state.pinMode[pin] = 'OUTPUT'; state.pwm[pin] = Math.max(0, Math.min(255, valueOf(m[2], constants, variables))); setDigital(state, pin, state.pwm[pin] >= 128 ? 1 : 0); continue; }
      m = line.match(/^delay\s*\(\s*([^\)]+)\)/);
      if (m) { state.elapsedMs += Math.max(0, valueOf(m[1], constants, variables)); continue; }

      // I²C/Wire API
      if (/^Wire\.begin\s*\(/.test(line)) { i2cBusStarted = true; continue; }
      m = line.match(/^Wire\.beginTransmission\s*\(\s*([^\)]+)\)/);
      if (m) { i2cAddress = valueOf(m[1], constants, variables) & 0x7f; i2cWrite = []; continue; }
      m = line.match(/^Wire\.write\s*\(\s*([^\)]+)\)/);
      if (m) { if (i2cBusStarted) i2cWrite.push(valueOf(m[1], constants, variables) & 0xff); continue; }
      if (/^Wire\.endTransmission\s*\(/.test(line)) {
        if (i2cBusStarted && i2cAddress !== null) state.i2c.push({ timeMs: state.elapsedMs, address: i2cAddress, read: false, bytes: [...i2cWrite], ack: i2cWrite.map(() => true) });
        continue;
      }
      m = line.match(/^Wire\.requestFrom\s*\(\s*([^,]+),\s*([^\)]+)\)/);
      if (m) { i2cReadAddress = valueOf(m[1], constants, variables) & 0x7f; i2cReadRemaining = Math.max(0, valueOf(m[2], constants, variables)); const data = i2cReads[i2cReadAddress] ?? []; state.i2c.push({ timeMs: state.elapsedMs, address: i2cReadAddress, read: true, bytes: data.slice(0, i2cReadRemaining), ack: data.slice(0, i2cReadRemaining).map(() => true) }); continue; }
      m = line.match(/^(?:int|byte|long)\s+(\w+)\s*=\s*Wire\.read\s*\(\s*\)/);
      if (m) { const tx = state.i2c.findLast?.(x => x.read && x.address === i2cReadAddress); const idx = tx ? tx.bytes.length - i2cReadRemaining : 0; variables[m[1]] = tx?.bytes[idx] ?? 0; i2cReadRemaining = Math.max(0, i2cReadRemaining - 1); continue; }
      if (/^Wire\.available\s*\(\s*\)/.test(line)) continue;

      // SPI API
      if (/^SPI\.begin\s*\(/.test(line)) continue;
      m = line.match(/^SPI\.beginTransaction\s*\(/);
      if (m) continue;
      m = line.match(/(?:SPI_MODE([0-3]))/); if (m) spiMode = Number(m[1]) as 0 | 1 | 2 | 3;
      m = line.match(/SPI\.setClockDivider\s*\(\s*([^\)]+)\)/); if (m) { const divider = Math.max(1, valueOf(m[1], constants, variables)); spiClockHz = 16_000_000 / divider; continue; }
      m = line.match(/^(?:int|byte|long)\s+(\w+)\s*=\s*SPI\.transfer\s*\(\s*([^\)]+)\)/);
      if (m) { const sent = valueOf(m[2], constants, variables) & 0xff; variables[m[1]] = 0; state.spi.push({ timeMs: state.elapsedMs, mosi: [sent], miso: [0], mode: spiMode, clockHz: spiClockHz }); continue; }
      if (/^SPI\.endTransaction\s*\(/.test(line)) continue;

      // Educational LCD API; state is displayed by the device bridge.
      if (/^lcd\.begin\s*\(/.test(line)) continue;
      if (/^lcd\.clear\s*\(/.test(line)) { state.lcd.text = ''; state.lcd.row = 0; state.lcd.column = 0; continue; }
      m = line.match(/^lcd\.setCursor\s*\(\s*([^,]+),\s*([^\)]+)\)/);
      if (m) { state.lcd.column = Math.max(0, Math.min(15, valueOf(m[1], constants, variables))); state.lcd.row = Math.max(0, Math.min(1, valueOf(m[2], constants, variables))); continue; }
      m = line.match(/^lcd\.print\s*\(\s*([\s\S]*?)\s*\)/);
      if (m) { const printed = printArg(m[1], variables); const before = state.lcd.text.padEnd(32, ' '); const offset = state.lcd.row * 16 + state.lcd.column; state.lcd.text = before.slice(0, offset) + printed + before.slice(offset + printed.length); state.lcd.text = state.lcd.text.slice(0, 32); state.lcd.column = Math.min(15, state.lcd.column + printed.length); continue; }

      m = line.match(/^Serial\.(print|println)\s*\(\s*([\s\S]*?)\s*\)/);
      if (m) { const text = printArg(m[2], variables); const newline = m[1] === 'println'; state.serial.push(text); state.serialEvents.push({ timeMs: state.elapsedMs, text, newline }); continue; }
      if (/^Serial\.begin\s*\(/.test(line)) continue;
      if (/^\w+\s*=/.test(line)) continue;
      if (/^(?:int|long|float|byte|bool)\s+/.test(line)) continue;
      if (/^\w+\s*\(/.test(line)) state.warnings.push(`Unsupported call: ${line}`);
    }
  }
  if (steps >= maxSteps) state.warnings.push('Execution stopped at the teaching runtime step limit.');
  return { state, steps, errors, inputs: { digital: externalDigital, analog: externalAnalog } };
}

function setDigital(state: ArduinoRuntimeState, pin: number, value: 0 | 1): void {
  const previous = state.digital[pin]; state.digital[pin] = value;
  if (previous !== value) state.transitions.push({ pin, timeMs: state.elapsedMs, value });
}
