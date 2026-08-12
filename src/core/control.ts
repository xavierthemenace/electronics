/** Small deterministic control-system primitives for interactive lessons. */

export interface PIDConfig {
  kp: number;
  ki: number;
  kd: number;
  outputMin?: number;
  outputMax?: number;
}

export interface PIDState {
  integral: number;
  previousError: number;
}

export function createPIDState(): PIDState {
  return { integral: 0, previousError: 0 };
}

export function pidStep(
  setpoint: number,
  measurement: number,
  dtSeconds: number,
  config: PIDConfig,
  state: PIDState,
): { output: number; state: PIDState } {
  const dt = Math.max(1e-9, dtSeconds);
  const error = setpoint - measurement;
  const integral = state.integral + error * dt;
  const derivative = (error - state.previousError) / dt;
  let output = config.kp * error + config.ki * integral + config.kd * derivative;
  const min = config.outputMin ?? -Infinity;
  const max = config.outputMax ?? Infinity;
  const saturated = Math.max(min, Math.min(max, output));
  const nextIntegral = saturated !== output && config.ki !== 0
    ? state.integral
    : integral;
  return { output: saturated, state: { integral: nextIntegral, previousError: error } };
}

export interface FirstOrderPlant {
  value: number;
  gain: number;
  timeConstant: number;
}

export function stepFirstOrderPlant(plant: FirstOrderPlant, input: number, dtSeconds: number): FirstOrderPlant {
  const tau = Math.max(1e-9, plant.timeConstant);
  const alpha = 1 - Math.exp(-Math.max(0, dtSeconds) / tau);
  return { ...plant, value: plant.value + (plant.gain * input - plant.value) * alpha };
}

export function runClosedLoop(
  steps: number,
  setpoint: number,
  initialPlant: FirstOrderPlant,
  config: PIDConfig,
  dtSeconds = 0.01,
): Array<{ time: number; setpoint: number; measurement: number; output: number }> {
  let plant = { ...initialPlant };
  let pid = createPIDState();
  const trace: Array<{ time: number; setpoint: number; measurement: number; output: number }> = [];
  for (let i = 0; i < Math.max(0, steps); i++) {
    const result = pidStep(setpoint, plant.value, dtSeconds, config, pid);
    pid = result.state;
    plant = stepFirstOrderPlant(plant, result.output, dtSeconds);
    trace.push({ time: i * dtSeconds, setpoint, measurement: plant.value, output: result.output });
  }
  return trace;
}
