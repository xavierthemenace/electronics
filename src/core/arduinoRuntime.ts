export type ArduinoPinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';

export interface ArduinoTransition {
  pin: number;
  timeMs: number;
  value: 0 | 1;
}

export interface ArduinoSerialEvent {
  timeMs: number;
  text: string;
  newline: boolean;
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
}

function initialState(): ArduinoRuntimeState {
  return { pinMode: {}, digital: {}, analog: {}, pwm: {}, serial: [], serialEvents: [], transitions: [], elapsedMs: 0, warnings: [] };
}

function valueOf(token: string, constants: Record<string, number>): number {
  const trimmed = token.trim().replace(/[;,)]$/, '');
  if (trimmed in constants) return constants[trimmed];
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Small, deterministic Arduino teaching runtime. It intentionally implements a
 * safe subset rather than pretending to be a native AVR emulator. It is enough
 * to connect common lessons to the simulated board and can later be replaced
 * by a WASM MCU backend without changing the editor API.
 */
export function runArduino(source: string, maxSteps = 200): ArduinoRunResult {
  const state = initialState();
  const errors: string[] = [];
  const constants: Record<string, number> = {};

  for (const line of source.split(/\r?\n/)) {
    const m = line.match(/^\s*const\s+(?:int|long|byte|float)\s+(\w+)\s*=\s*([^;]+)/);
    if (m) constants[m[1]] = valueOf(m[2], constants);
  }

  const setupMatch = source.match(/void\s+setup\s*\(\)\s*\{([\s\S]*?)\}/);
  const loopMatch = source.match(/void\s+loop\s*\(\)\s*\{([\s\S]*?)\}/);
  if (!setupMatch) errors.push('Missing setup() function.');
  if (!loopMatch) errors.push('Missing loop() function.');
  if (errors.length) return { state, steps: 0, errors };

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
        const pin = valueOf(m[1], constants);
        state.pinMode[pin] = m[2] as ArduinoPinMode;
        if (m[2] === 'INPUT_PULLUP') setDigital(state, pin, 1);
        continue;
      }

      m = line.match(/^digitalWrite\s*\(\s*([^,]+),\s*(HIGH|LOW|1|0)\s*\)/);
      if (m) {
        const pin = valueOf(m[1], constants);
        setDigital(state, pin, m[2] === 'HIGH' || m[2] === '1' ? 1 : 0);
        continue;
      }

      m = line.match(/^analogWrite\s*\(\s*([^,]+),\s*([^\)]+)\)/);
      if (m) {
        const pin = valueOf(m[1], constants);
        state.pinMode[pin] = 'OUTPUT';
        state.pwm[pin] = Math.max(0, Math.min(255, valueOf(m[2], constants)));
        setDigital(state, pin, state.pwm[pin] >= 128 ? 1 : 0);
        continue;
      }

      m = line.match(/^analogRead\s*\(\s*([^\)]+)\)/);
      if (m) continue;

      m = line.match(/^delay\s*\(\s*([^\)]+)\)/);
      if (m) { state.elapsedMs += Math.max(0, valueOf(m[1], constants)); continue; }

      m = line.match(/^Serial\.(print|println)\s*\(\s*([\s\S]*?)\s*\)/);
      if (m) {
        let text = m[2].trim();
        if ((text.startsWith('\"') && text.endsWith('\"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1);
        const newline = m[1] === 'println';
        state.serial.push(text);
        state.serialEvents.push({ timeMs: state.elapsedMs, text, newline });
        continue;
      }

      if (/^Serial\.begin\s*\(/.test(line)) continue;
      if (/^(?:int|long|float|byte|bool)\s+/.test(line)) continue;
      if (/^\w+\s*=/.test(line)) continue;
      if (/^\w+\s*\(/.test(line)) state.warnings.push(`Unsupported call: ${line}`);
    }
  }

  if (steps >= maxSteps) state.warnings.push('Execution stopped at the teaching runtime step limit.');
  return { state, steps, errors };
}

function setDigital(state: ArduinoRuntimeState, pin: number, value: 0 | 1): void {
  const previous = state.digital[pin];
  state.digital[pin] = value;
  if (previous !== value) {
    state.transitions.push({ pin, timeMs: state.elapsedMs, value });
  }
}
