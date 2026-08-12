import type { CircuitProject } from './model.js';

export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LessonObjective {
  id: string;
  label: string;
}

export interface Lesson {
  id: string;
  title: string;
  stage: string;
  difficulty: LessonDifficulty;
  description: string;
  objectives: LessonObjective[];
}

export interface LessonCheckResult {
  passed: boolean;
  message: string;
}

export interface LessonEvaluation {
  lessonId: string;
  passed: boolean;
  score: number;
  checks: LessonCheckResult[];
}

export const lessons: Lesson[] = [
  {
    id: 'foundations-ohms-law',
    title: "Ohm's Law: Build and Measure",
    stage: 'Electrical foundations',
    difficulty: 'beginner',
    description: 'Build a resistor circuit, predict its current, then verify the result with the simulator.',
    objectives: [
      { id: 'resistor', label: 'Place a resistor in the circuit.' },
      { id: 'source', label: 'Provide a DC source and a ground reference.' },
      { id: 'measurement', label: 'Run the DC simulation and inspect current.' },
    ],
  },
  {
    id: 'time-domain-rc',
    title: 'RC Transients: Watch a Capacitor Charge',
    stage: 'Electrical foundations',
    difficulty: 'beginner',
    description: 'Build a 5 V / 1 kΩ / 1 µF RC circuit and observe capacitor charging on the virtual oscilloscope.',
    objectives: [
      { id: 'source', label: 'Use a 5 V DC source and ground.' },
      { id: 'resistor', label: 'Use approximately 1 kΩ of series resistance.' },
      { id: 'capacitor', label: 'Use approximately 1 µF of capacitance.' },
      { id: 'transient', label: 'Run a transient simulation with the capacitor node as the probe.' },
    ],
  },
  {
    id: 'semiconductor-led',
    title: 'LED Protection: Safe Current Limiting',
    stage: 'Semiconductors',
    difficulty: 'beginner',
    description: 'Build an LED circuit that operates inside its safe current range and explain why the resistor is necessary.',
    objectives: [
      { id: 'led', label: 'Place an LED.' },
      { id: 'resistor', label: 'Add a series current-limiting resistor.' },
      { id: 'erc', label: 'Finish with no LED overcurrent violation.' },
    ],
  },
  {
    id: 'arduino-first-sketch',
    title: 'Arduino: Your First Sketch',
    stage: 'Arduino / embedded I/O',
    difficulty: 'beginner',
    description: 'Write setup() and loop(), configure a digital output, and generate a serial message.',
    objectives: [
      { id: 'setup', label: 'Write a setup() function.' },
      { id: 'loop', label: 'Write a loop() function.' },
      { id: 'gpio', label: 'Use pinMode() and digitalWrite().' },
      { id: 'serial', label: 'Send a message with Serial.println().' },
    ],
  },
];

function hasType(project: CircuitProject, type: string): boolean {
  return project.components.some(c => c.type === type);
}

function near(a: number, b: number, relative = 0.15): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return Math.abs(a - b) <= scale * relative;
}

export function evaluateLesson(lessonId: string, project: CircuitProject, context: {
  dcOk: boolean;
  ledOvercurrent: boolean;
  transientOk: boolean;
  transientMaxVoltage: number;
  sourceCode: string;
}): LessonEvaluation {
  const checks: LessonCheckResult[] = [];

  if (lessonId === 'foundations-ohms-law') {
    const resistor = project.components.find(c => c.type === 'resistor');
    checks.push({ passed: !!resistor, message: resistor ? 'Resistor present.' : 'Place a resistor.' });
    checks.push({ passed: hasType(project, 'dc-source'), message: hasType(project, 'dc-source') ? 'DC source present.' : 'Add a DC source.' });
    checks.push({ passed: hasType(project, 'ground'), message: hasType(project, 'ground') ? 'Ground reference present.' : 'Add ground.' });
    checks.push({ passed: context.dcOk, message: context.dcOk ? 'DC operating point solved.' : 'Run the DC simulation.' });
  } else if (lessonId === 'time-domain-rc') {
    const resistor = project.components.find(c => c.type === 'resistor');
    const capacitor = project.components.find(c => c.type === 'capacitor');
    const source = project.components.find(c => c.type === 'dc-source');
    checks.push({ passed: !!source && near(Number(source.params.voltage ?? 0), 5), message: source && near(Number(source.params.voltage ?? 0), 5) ? '5 V source configured.' : 'Use a 5 V source.' });
    checks.push({ passed: !!resistor && near(Number(resistor.params.resistance ?? 0), 1000), message: resistor && near(Number(resistor.params.resistance ?? 0), 1000) ? 'Series resistance is about 1 kΩ.' : 'Use about 1 kΩ.' });
    checks.push({ passed: !!capacitor && near(Number(capacitor.params.capacitance ?? 0), 1e-6), message: capacitor && near(Number(capacitor.params.capacitance ?? 0), 1e-6) ? 'Capacitance is about 1 µF.' : 'Use about 1 µF.' });
    checks.push({ passed: hasType(project, 'ground'), message: hasType(project, 'ground') ? 'Ground reference present.' : 'Add ground.' });
    checks.push({ passed: context.transientOk && context.transientMaxVoltage > 4.5, message: context.transientOk && context.transientMaxVoltage > 4.5 ? 'Capacitor charges toward the 5 V supply.' : 'Run the transient probe on the capacitor node and observe the charge curve.' });
  } else if (lessonId === 'semiconductor-led') {
    checks.push({ passed: hasType(project, 'led'), message: hasType(project, 'led') ? 'LED present.' : 'Place an LED.' });
    checks.push({ passed: hasType(project, 'resistor'), message: hasType(project, 'resistor') ? 'Series resistor present.' : 'Add a current-limiting resistor.' });
    checks.push({ passed: !context.ledOvercurrent, message: context.ledOvercurrent ? 'LED overcurrent is still present.' : 'No LED overcurrent violation.' });
  } else if (lessonId === 'arduino-first-sketch') {
    const source = context.sourceCode;
    const hasSetup = /void\s+setup\s*\(/.test(source);
    const hasLoop = /void\s+loop\s*\(/.test(source);
    const hasPinMode = /pinMode\s*\(/.test(source);
    const hasDigitalWrite = /digitalWrite\s*\(/.test(source);
    const hasSerial = /Serial\.println\s*\(|Serial\.print\s*\(/.test(source);
    checks.push({ passed: hasSetup, message: hasSetup ? 'setup() exists.' : 'Add setup().' });
    checks.push({ passed: hasLoop, message: hasLoop ? 'loop() exists.' : 'Add loop().' });
    checks.push({ passed: hasPinMode && hasDigitalWrite, message: hasPinMode && hasDigitalWrite ? 'GPIO configuration and output control found.' : 'Use pinMode() and digitalWrite().' });
    checks.push({ passed: hasSerial, message: hasSerial ? 'Serial output found.' : 'Send a message with Serial.println().' });
  }

  const passedCount = checks.filter(c => c.passed).length;
  const score = checks.length ? Math.round((passedCount / checks.length) * 100) : 0;
  return { lessonId, passed: score === 100, score, checks };
}
