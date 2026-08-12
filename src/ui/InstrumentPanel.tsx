import { useMemo } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { LogicAnalyzer } from './LogicAnalyzer.js';
import { SerialAnalyzer } from './SerialAnalyzer.js';

const panel: React.CSSProperties = { height: '100%', minHeight: 0, overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };

function fmt(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (unit === 'A' && abs < 1e-6) return `${(value * 1e9).toFixed(2)} nA`;
  if (unit === 'A' && abs < 1e-3) return `${(value * 1e6).toFixed(2)} µA`;
  if (unit === 'A') return `${(value * 1e3).toFixed(2)} mA`;
  if (unit === 'W' && abs < 1e-6) return `${(value * 1e9).toFixed(2)} nW`;
  if (unit === 'W' && abs < 1e-3) return `${(value * 1e6).toFixed(2)} µW`;
  if (unit === 'W') return `${(value * 1e3).toFixed(2)} mW`;
  return `${value.toFixed(3)} ${unit}`;
}

function Scope({ time, voltage }: { time: Float64Array; voltage: Float64Array }) {
  const width = 900;
  const height = 240;
  const path = useMemo(() => {
    if (!time.length || !voltage.length) return '';
    let min = Infinity;
    let max = -Infinity;
    for (const v of voltage) { min = Math.min(min, v); max = Math.max(max, v); }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
    if (Math.abs(max - min) < 1e-9) { max += 1; min -= 1; }
    const points = Math.min(time.length, 1200);
    let d = '';
    for (let i = 0; i < points; i++) {
      const idx = Math.floor((i / Math.max(1, points - 1)) * (time.length - 1));
      const x = (i / Math.max(1, points - 1)) * width;
      const y = height - ((voltage[idx] - min) / (max - min)) * height;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
    }
    return d;
  }, [time, voltage]);

  if (!path) return <div style={{ color: '#6e7681', padding: 20 }}>Run an RC transient with a probe to display a waveform.</div>;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" role="img" aria-label="Oscilloscope waveform">
      <rect width={width} height={height} fill="#0a0f14" />
      {Array.from({ length: 10 }).map((_, i) => <line key={`v${i}`} x1={(i / 10) * width} y1={0} x2={(i / 10) * width} y2={height} stroke="#1b2630" strokeWidth="1" />)}
      {Array.from({ length: 8 }).map((_, i) => <line key={`h${i}`} x1={0} y1={(i / 8) * height} x2={width} y2={(i / 8) * height} stroke="#1b2630" strokeWidth="1" />)}
      <path d={path} fill="none" stroke="#58a6ff" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function InstrumentPanel() {
  const components = useCircuitStore(s => s.components);
  const dcResult = useSimulationStore(s => s.dcResult);
  const violations = useSimulationStore(s => s.dcViolations);
  const arduinoResult = useSimulationStore(s => s.arduinoResult);
  const runFirmware = useSimulationStore(s => s.runFirmware);
  const getCurrent = useSimulationStore(s => s.getDeviceCurrent);
  const getPower = useSimulationStore(s => s.getDevicePower);
  const runTransient = useSimulationStore(s => s.runTransient);
  const transientResult = useSimulationStore(s => s.transientResult);
  const transientTime = useSimulationStore(s => s.transientTime);
  const transientVoltage = useSimulationStore(s => s.transientVoltage);
  const transientStep = useSimulationStore(s => s.transientStep);
  const transientDuration = useSimulationStore(s => s.transientDuration);
  const setTransientStep = useSimulationStore(s => s.setTransientStep);
  const setTransientDuration = useSimulationStore(s => s.setTransientDuration);
  const setTransientProbe = useSimulationStore(s => s.setTransientProbe);
  const transientRunning = useSimulationStore(s => s.transientRunning);

  const devices = [...components.values()].filter(c => ['resistor', 'led', 'diode', 'capacitor', 'inductor'].includes(c.type));
  const probeCandidates = [...components.values()].flatMap(c => c.type === 'capacitor' ? [{ label: `${c.type} ${c.id.slice(0, 6)} • pin 1`, compId: c.id, pinId: '1' }] : []);

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Virtual Instruments</div>
        <span style={{ color: '#6e7681', fontFamily: 'var(--font-family-mono)' }}>DC + RC + Arduino GPIO</span>
      </div>

      <div style={card}>
        <div style={{ color: '#8b949e', marginBottom: 6 }}>Arduino firmware runtime</div>
        <button
          onClick={() => runFirmware()}
          style={{ border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', borderRadius: 5, padding: '6px 9px', cursor: 'pointer', marginBottom: 10 }}
        >
          Run firmware
        </button>
        {arduinoResult ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontFamily: 'var(--font-family-mono)' }}>
              <div><div style={{ color: '#6e7681' }}>Steps</div><div>{arduinoResult.steps}</div></div>
              <div><div style={{ color: '#6e7681' }}>Elapsed</div><div>{arduinoResult.state.elapsedMs} ms</div></div>
              <div><div style={{ color: '#6e7681' }}>Serial</div><div>{arduinoResult.state.serial.length}</div></div>
              <div><div style={{ color: '#6e7681' }}>Edges</div><div>{arduinoResult.state.transitions.length}</div></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ color: '#6e7681', marginBottom: 4 }}>Driven GPIO</div>
              <div style={{ fontFamily: 'var(--font-family-mono)', color: '#58a6ff' }}>
                {Object.entries(arduinoResult.state.pinMode)
                  .filter(([, mode]) => mode === 'OUTPUT')
                  .map(([pin]) => {
                    const p = Number(pin);
                    return `D${p}=${arduinoResult.state.pwm[p] !== undefined ? `PWM ${arduinoResult.state.pwm[p]}` : arduinoResult.state.digital[p] ? 'HIGH' : 'LOW'}`;
                  })
                  .join('  ') || 'none'}
              </div>
            </div>
            {arduinoResult.state.serial.length > 0 && (
              <div style={{ marginTop: 8, color: '#8b949e' }}>{arduinoResult.state.serial.slice(-4).map((line, i) => <div key={i}>{line}</div>)}</div>
            )}
            {arduinoResult.errors.length > 0 && <div style={{ marginTop: 8, color: '#f85149' }}>{arduinoResult.errors.join(' ')}</div>}
            {arduinoResult.state.warnings.length > 0 && <div style={{ marginTop: 8, color: '#d29922' }}>{arduinoResult.state.warnings.join(' ')}</div>}
            <div style={{ marginTop: 10 }}>
              <LogicAnalyzer transitions={arduinoResult.state.transitions} />
            </div>
            <SerialAnalyzer events={arduinoResult.state.serialEvents} />
          </>
        ) : <div style={{ color: '#6e7681' }}>Run the firmware, then simulate DC to drive connected Arduino outputs.</div>}
      </div>

      <div style={card}>
        <div style={{ color: '#8b949e', marginBottom: 6 }}>Multimeter — DC operating point</div>
        <div style={{ color: dcResult?.ok ? '#3fb950' : dcResult ? '#f85149' : '#8b949e', marginBottom: 8 }}>
          {dcResult?.ok ? '● SOLVED' : dcResult ? '● ERROR' : '○ NO MEASUREMENT'}
        </div>
        {dcResult && !dcResult.ok && <div style={{ marginTop: 6, color: '#f85149' }}>{dcResult.error}</div>}
      </div>

      {devices.map(comp => (
        <div style={card} key={comp.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{comp.type}</strong><span style={{ color: '#6e7681' }}>{comp.id.slice(0, 8)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><div style={{ color: '#6e7681' }}>Current</div><div style={{ fontFamily: 'var(--font-family-mono)' }}>{fmt(getCurrent(comp.id), 'A')}</div></div>
            <div><div style={{ color: '#6e7681' }}>Power</div><div style={{ fontFamily: 'var(--font-family-mono)' }}>{fmt(getPower(comp.id), 'W')}</div></div>
          </div>
        </div>
      ))}

      <div style={card}>
        <div style={{ color: '#8b949e', marginBottom: 8 }}>Oscilloscope — CH1</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 10 }}>
          <label>Probe
            <select
              value={useSimulationStore.getState().transientProbe?.compId ?? ''}
              onChange={e => {
                const value = e.target.value;
                const candidate = probeCandidates.find(p => p.compId === value);
                setTransientProbe(candidate ? { compId: candidate.compId, pinId: candidate.pinId } : null);
              }}
              style={{ width: '100%', marginTop: 4, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: 6 }}
            >
              <option value="">Select capacitor node…</option>
              {probeCandidates.map(p => <option key={p.compId} value={p.compId}>{p.label}</option>)}
            </select>
          </label>
          <label>Duration (s)
            <input type="number" min="0.001" max="10" step="0.01" value={transientDuration} onChange={e => setTransientDuration(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label>Step (s)
            <input type="number" min="0.000001" max="1" step="0.001" value={transientStep} onChange={e => setTransientStep(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
          </label>
          <button onClick={() => runTransient()} disabled={transientRunning} style={{ alignSelf: 'end', border: '1px solid #30363d', background: '#238636', color: '#fff', borderRadius: 5, padding: '7px 10px', cursor: 'pointer' }}>
            {transientRunning ? 'Running…' : 'Run'}
          </button>
        </div>
        <Scope time={transientTime} voltage={transientVoltage} />
        {transientResult && !transientResult.ok && <div style={{ color: '#f85149', marginTop: 8 }}>{transientResult.error}</div>}
        {transientResult?.ok && <div style={{ display: 'flex', gap: 18, marginTop: 8, color: '#8b949e', fontFamily: 'var(--font-family-mono)' }}>
          <span>min {transientResult.minVoltage.toFixed(3)} V</span>
          <span>max {transientResult.maxVoltage.toFixed(3)} V</span>
          <span>samples {transientTime.length}</span>
        </div>}
      </div>

      {violations.length > 0 && <div style={{ ...card, borderColor: '#f85149' }}>
        <div style={{ color: '#f85149', fontWeight: 700, marginBottom: 6 }}>ERC / safety</div>
        {violations.map((v, i) => <div key={i} style={{ marginBottom: 10 }}><strong>{v.code}</strong><div style={{ color: '#8b949e' }}>{v.message}</div><div style={{ marginTop: 3, color: '#6e7681' }}>{v.explanation}</div></div>)}
      </div>}
    </div>
  );
}
