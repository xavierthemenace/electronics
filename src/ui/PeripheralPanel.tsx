import { useMemo } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 12, marginBottom: 10 };

export function PeripheralPanel() {
  const components = useCircuitStore(s => s.components);
  const update = useCircuitStore(s => s.updateComponentParams);
  const runDC = useSimulationStore(s => s.runDC);
  const peripherals = useMemo(() => [...components.values()].filter(c => c.type === 'analog-sensor' || c.type === 'pushbutton'), [components]);

  return (
    <div style={panel}>
      <div style={{ marginBottom: 12 }}>
        <strong>Virtual Peripherals</strong>
        <div style={{ color: '#8b949e', marginTop: 4 }}>Change a simulated real-world input, then run the circuit to observe the response.</div>
      </div>
      {peripherals.length === 0 && <div style={card}>Place an Analog Sensor or Pushbutton from the Components palette.</div>}
      {peripherals.map(c => {
        if (c.type === 'analog-sensor') {
          const value = Number(c.params.outputVoltage ?? 2.5);
          return <div key={c.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Analog Sensor</strong><span style={{ color: '#8b949e' }}>{c.id.slice(0, 8)}</span></div>
            <label style={{ display: 'block', marginTop: 12 }}>
              Output voltage: <strong>{value.toFixed(2)} V</strong>
              <input type="range" min="0" max="5" step="0.01" value={value} onChange={e => update(c.id, { outputVoltage: Number(e.target.value) })} style={{ display: 'block', width: '100%', marginTop: 6 }} />
            </label>
            <label style={{ display: 'block', marginTop: 10 }}>Source resistance
              <input type="number" min="1" max="1000000" value={Number(c.params.outputResistance ?? 100)} onChange={e => update(c.id, { outputResistance: Number(e.target.value) })} style={{ display: 'block', width: '100%', marginTop: 4, background: '#161b22', color: '#e6edf3', border: '1px solid #30363d', padding: 6, borderRadius: 4 }} />
            </label>
            <button onClick={runDC} style={{ marginTop: 10, border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', padding: '6px 10px', borderRadius: 5 }}>Run simulation</button>
          </div>;
        }
        const pressed = Boolean(c.params.pressed);
        return <div key={c.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Pushbutton</strong><span style={{ color: '#8b949e' }}>{c.id.slice(0, 8)}</span></div>
          <button aria-pressed={pressed} onClick={() => update(c.id, { pressed: !pressed })} style={{ marginTop: 12, width: '100%', padding: '14px 10px', borderRadius: 7, border: `1px solid ${pressed ? '#3fb950' : '#30363d'}`, background: pressed ? '#0d2818' : '#21262d', color: '#e6edf3', cursor: 'pointer', fontWeight: 600 }}>{pressed ? 'PRESSED' : 'RELEASED'}</button>
          <div style={{ color: '#8b949e', marginTop: 8 }}>Closed resistance: {Number(c.params.closedResistance ?? 0.1)} Ω</div>
          <button onClick={runDC} style={{ marginTop: 10, border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', padding: '6px 10px', borderRadius: 5 }}>Run simulation</button>
        </div>;
      })}
    </div>
  );
}
