import { useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { runClosedLoop } from '../core/control.js';
import { closedLoopMotorTemplate, i2cSensorDisplayTemplate, ledArduinoTemplate, multiDeviceSystemTemplate } from '../core/templates.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 12, marginBottom: 10 };
const button: React.CSSProperties = { border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', padding: '7px 10px', borderRadius: 5, cursor: 'pointer', marginRight: 6, marginBottom: 6 };

export function SystemLabPanel() {
  const loadProject = useCircuitStore(s => s.loadProject);
  const [setpoint, setSetpoint] = useState(70);
  const [kp, setKp] = useState(1.2);
  const [ki, setKi] = useState(0.3);
  const [kd, setKd] = useState(0.05);
  const [trace, setTrace] = useState<Array<{ time: number; setpoint: number; measurement: number; output: number }>>([]);

  const runControl = () => setTrace(runClosedLoop(150, setpoint / 100, { value: 0, gain: 1, timeConstant: 0.35 }, { kp, ki, kd, outputMin: 0, outputMax: 1 }));

  return <div style={panel}>
    <div style={{ fontWeight: 700, marginBottom: 4 }}>Systems Lab</div>
    <div style={{ color: '#8b949e', marginBottom: 12 }}>Load integrated projects or experiment with a closed-loop control system without leaving the workbench.</div>

    <div style={card}>
      <strong>Integrated project starters</strong>
      <div style={{ marginTop: 10 }}>
        <button style={button} onClick={() => loadProject(ledArduinoTemplate())}>Arduino LED</button>
        <button style={button} onClick={() => loadProject(i2cSensorDisplayTemplate())}>I²C Sensor + LCD</button>
        <button style={button} onClick={() => loadProject(closedLoopMotorTemplate())}>Closed-Loop Motor</button>
        <button style={button} onClick={() => loadProject(multiDeviceSystemTemplate())}>Multi-Device System</button>
      </div>
    </div>

    <div style={card}>
      <strong>PID control sandbox</strong>
      <div style={{ color: '#8b949e', margin: '5px 0 10px' }}>Tune proportional, integral and derivative gains against a first-order plant.</div>
      {[['Setpoint', setpoint, setSetpoint, 0, 100, 1], ['Kp', kp, setKp, 0, 5, 0.05], ['Ki', ki, setKi, 0, 5, 0.05], ['Kd', kd, setKd, 0, 2, 0.01]].map(([label, value, setter, min, max, step]) => (
        <label key={String(label)} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 70px', gap: 8, alignItems: 'center', marginBottom: 7 }}>
          <span>{String(label)}</span><input type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={Number(value)} onChange={e => (setter as (n: number) => void)(Number(e.target.value))} /><span>{Number(value).toFixed(2)}</span>
        </label>
      ))}
      <button style={{ ...button, background: '#238636' }} onClick={runControl}>Run 1.5 s simulation</button>
      {trace.length > 0 && <div style={{ marginTop: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <Metric title="Final output" value={(trace.at(-1)?.output ?? 0).toFixed(3)} />
          <Metric title="Final measurement" value={`${((trace.at(-1)?.measurement ?? 0) * 100).toFixed(1)}%`} />
          <Metric title="Peak measurement" value={`${(Math.max(...trace.map(x => x.measurement)) * 100).toFixed(1)}%`} />
        </div>
        <div style={{ height: 110, marginTop: 10, border: '1px solid #30363d', background: '#090d12', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 600 110" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <polyline fill="none" stroke="#58a6ff" strokeWidth="2" points={trace.map((p, i) => `${i / Math.max(1, trace.length - 1) * 600},${105 - p.measurement * 100}`).join(' ')} />
            <polyline fill="none" stroke="#3fb950" strokeWidth="1" points={trace.map((p, i) => `${i / Math.max(1, trace.length - 1) * 600},${105 - p.setpoint * 100}`).join(' ')} />
          </svg>
        </div>
      </div>}
    </div>
  </div>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div style={{ border: '1px solid #30363d', borderRadius: 5, padding: 8 }}><div style={{ color: '#8b949e', fontSize: 10 }}>{title}</div><strong>{value}</strong></div>;
}
