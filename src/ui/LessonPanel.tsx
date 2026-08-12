import { useMemo, useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { useCodeStore } from '../stores/code.js';
import { evaluateLesson, lessons } from '../core/lessons.js';

const shell: React.CSSProperties = { height: '100%', minHeight: 0, overflow: 'auto', padding: 14, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 7, background: '#0d1117', padding: 12, marginBottom: 10 };

export function LessonPanel() {
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const project = useCircuitStore(s => s.getProject());
  const dcResult = useSimulationStore(s => s.dcResult);
  const violations = useSimulationStore(s => s.dcViolations);
  const transientResult = useSimulationStore(s => s.transientResult);
  const sourceCode = useCodeStore(s => s.sourceCode);
  const lesson = lessons.find(l => l.id === lessonId) ?? lessons[0];

  const evaluation = useMemo(() => evaluateLesson(lesson.id, project, {
    dcOk: !!dcResult?.ok,
    ledOvercurrent: violations.some(v => v.code === 'LED_OVERCURRENT'),
    transientOk: !!transientResult?.ok,
    transientMaxVoltage: transientResult?.maxVoltage ?? 0,
    sourceCode,
  }), [lesson.id, project, dcResult, violations, transientResult, sourceCode]);

  return (
    <section style={shell} aria-label="Interactive lesson">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>Learning Lab</strong>
        <select value={lessonId} onChange={e => setLessonId(e.target.value)} style={{ marginLeft: 'auto', background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: 6 }}>
          {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      <div style={card}>
        <div style={{ color: '#6e7681', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{lesson.stage} • {lesson.difficulty}</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{lesson.title}</h3>
        <p style={{ margin: 0, color: '#8b949e', lineHeight: 1.55 }}>{lesson.description}</p>
      </div>

      <div style={{ ...card, borderColor: evaluation.passed ? '#238636' : '#30363d' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <strong>Challenge progress</strong>
          <span style={{ fontFamily: 'var(--font-family-mono)', color: evaluation.passed ? '#3fb950' : '#58a6ff' }}>{evaluation.score}%</span>
        </div>
        {evaluation.checks.map((check, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 0', borderTop: i ? '1px solid #21262d' : undefined }}>
            <span style={{ color: check.passed ? '#3fb950' : '#d29922', fontSize: 14 }}>{check.passed ? '✓' : '○'}</span>
            <span style={{ color: check.passed ? '#e6edf3' : '#8b949e' }}>{check.message}</span>
          </div>
        ))}
      </div>

      <div style={card}>
        <strong style={{ display: 'block', marginBottom: 8 }}>Objectives</strong>
        {lesson.objectives.map(objective => <div key={objective.id} style={{ color: '#8b949e', marginBottom: 6 }}>• {objective.label}</div>)}
      </div>

      <div style={{ ...card, borderColor: evaluation.passed ? '#3fb950' : '#30363d' }}>
        <strong style={{ color: evaluation.passed ? '#3fb950' : '#e6edf3' }}>
          {evaluation.passed ? '✓ Mastery checkpoint passed' : 'Keep experimenting'}
        </strong>
        <div style={{ marginTop: 6, color: '#6e7681' }}>
          The platform evaluates the circuit, measurements, safety state, and code together where the lesson requires them.
        </div>
      </div>
    </section>
  );
}
