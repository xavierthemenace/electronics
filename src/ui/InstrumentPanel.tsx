import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };

function fmt(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (unit === 'A' && abs < 1e-3) return `${(value * 1e6).toFixed(2)} µA`;
  if (unit === 'A') return `${(value * 1e3).toFixed(2)} mA`;
  if (unit === 'W' && abs < 1e-3) return `${(value * 1e6).toFixed(2)} µW`;
  if (unit === 'W') return `${(value * 1e3).toFixed(2)} mW`;
  return `${value.toFixed(3)} ${unit}`;
}

export function InstrumentPanel() {
  const components = useCircuitStore(s => s.components);
  const dcResult = useSimulationStore(s => s.dcResult);
  const violations = useSimulationStore(s => s.dcViolations);
  const getCurrent = useSimulationStore(s => s.getDeviceCurrent);
  const getPower = useSimulationStore(s => s.getDevicePower);

  const devices = [...components.values()].filter(c => ['resistor', 'led', 'diode', 'capacitor', 'inductor'].includes(c.type));

  return (
    <div style={panel}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Instruments</div>
      <div style={card}>
        <div style={{ color: '#8b949e', marginBottom: 6 }}>DC solver</div>
        <div style={{ color: dcResult?.ok ? '#3fb950' : dcResult ? '#f85149' : '#8b949e' }}>
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

      {violations.length > 0 && <div style={{ ...card, borderColor: '#f85149' }}>
        <div style={{ color: '#f85149', fontWeight: 700, marginBottom: 6 }}>ERC / safety</div>
        {violations.map((v, i) => <div key={i} style={{ marginBottom: 7 }}><strong>{v.code}</strong><div style={{ color: '#8b949e' }}>{v.message}</div></div>)}
      </div>}
    </div>
  );
}
