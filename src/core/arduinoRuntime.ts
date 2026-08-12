export type ArduinoPinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';

export interface ArduinoTransition { pin: number; timeMs: number; value: 0 | 1; }
export interface ArduinoSerialEvent { timeMs: number; text: string; newline: boolean; }

export interface ArduinoRunOptions {
  digitalInputs?: Record<number, 0 | 1>;
  analogInputs?: Record<number, number>;
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
  return { pinMode: {}, digital: {}, analog: {}, pwm: {}, serial: [], serialEvents: [], transitions: [], elapsedMs: 0, warnings: [] };
}

function valueOf(token: string, constants: Record<string, number>, variables: Record<string, number> = {}): number {
  const trimmed = token.trim().replace(/[;,)]$/, '');
  if (trimmed in variables) return variables[trimmed];
  if (trimmed in constants) return constants[trimmed];
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

function literalFromPin(token: string, constants: Record<string, number>, variables: Record<string, number>): number {
  const names: Record<string, number> = { HIGH: 1, LOW: 0 };
  if (token.trim() in names) return names[token.trim()];
  return valueOf(token, constants, variables);
}

/**
 * Deterministic Arduino teaching runtime. This is intentionally a safe subset,
 * but it now models both output drivers and externally supplied input pins.
 */
export function runArduino(source: string, options: ArduinoRunOptions | number = {}): ArduinoRunResult {
  const normalized: ArduinoRunOptions = typeof options === 'number' ? { maxSteps: options } : options;
  const maxSteps = normalized.maxSteps ?? 200;
  const externalDigital = { ...(normalized.digitalInputs ?? {}) };
  const externalAnalog = { ...(normalized.analogInputs ?? {}) };
  const state = initialState();
  const errors: string[] = [];
  const constants: Record<string, number> = {};
  const variables: Record<string, number> = {};

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
        const pin = valueOf(m[1], constants, variables);
        state.pinMode[pin] = m[2] as ArduinoPinMode;
        if (m[2] === 'INPUT_PULLUP') setDigital(state, pin, 1);
        else if (m[2] === 'INPUT' && externalDigital[pin] !== undefined) setDigital(state, pin, externalDigital[pin]);
        continue;
      }

      m = line.match(/^digitalWrite\s*\(\s*([^,]+),\s*(HIGH|LOW|1|0)\s*\)/);
      if (m) {
        const pin = valueOf(m[1], constants, variables);
        setDigital(state, pin, m[2] === 'HIGH' || m[2] === '1' ? 1 : 0);
        continue;
      }

      m = line.match(/^(?:const\s+)?(?:int|long|float|byte|bool)\s+(\w+)\s*=\s*digitalRead\s*\(\s*([^\)]+)\)/);
      if (m) {
        const pin = valueOf(m[2], constants, variables);
        variables[m[1]] = externalDigital[pin] ?? (state.pinMode[pin] === 'INPUT_PULLUP' ? 1 : state.digital[pin] ?? 0);
        state.digital[pin] = (variables[m[1]] ? 1 : 0);
        continue;
      }

      m = line.match(/^(?:const\s+)?(?:int|long|float|byte|bool)\s+(\w+)\s*=\s*analogRead\s*\(\s*([^\)]+)\)/);
      if (m) {
        const pinToken = m[2].trim().replace(/^A/i, '');
        const pin = Number.isFinite(Number(pinToken)) ? Number(pinToken) : valueOf(pinToken, constants, variables);
        variables[m[1]] = externalAnalog[pin] ?? state.analog[pin] ?? 0;
        state.analog[pin] = Math.max(0, Math.min(1023, variables[m[1]]));
        continue;
      }

      m = line.match(/^analogWrite\s*\(\s*([^,]+),\s*([^\)]+)\)/);
      if (m) {
        const pin = valueOf(m[1], constants, variables);
        state.pinMode[pin] = 'OUTPUT';
        state.pwm[pin] = Math.max(0, Math.min(255, valueOf(m[2], constants, variables)));
        setDigital(state, pin, state.pwm[pin] >= 128 ? 1 : 0);
        continue;
      }

      m = line.match(/^delay\s*\(\s*([^\)]+)\)/);
      if (m) { state.elapsedMs += Math.max(0, valueOf(m[1], constants, variables)); continue; }

      m = line.match(/^Serial\.(print|println)\s*\(\s*([\s\S]*?)\s*\)/);
      if (m) {
        let text = m[2].trim();
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1);
        else if (text in variables) text = String(variables[text]);
        const newline = m[1] === 'println';
        state.serial.push(text);
        state.serialEvents.push({ timeMs: state.elapsedMs, text, newline });
        continue;
      }

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
  const previous = state.digital[pin];
  state.digital[pin] = value;
  if (previous !== value) state.transitions.push({ pin, timeMs: state.elapsedMs, value });
}
