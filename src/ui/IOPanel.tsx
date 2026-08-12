import { useSimulationStore } from '../stores/simulation.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };
const inputStyle: React.CSSProperties = { background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: '6px 8px' };

export function IOPanel() {
  const digital = useSimulationStore(s => s.arduinoDigitalInputs);
  const analog = useSimulationStore(s => s.arduinoAnalogInputs);
  const setDigital = useSimulationStore(s => s.setArduinoDigitalInput);
  const setAnalog = useSimulationStore(s => s.setArduinoAnalogInput);
  const runFirmware = useSimulationStore(s => s.runFirmware);
  const result = useSimulationStore(s => s.arduinoResult);

  const digitalPins = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const analogPins = [0, 1, 2, 3, 4, 5];

  return (
    <div style={panel}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Arduino I/O Lab</div>
      <div style={{ color: '#8b949e', marginBottom: 12 }}>
        Inject external digital and analog signals into the teaching runtime, then run the firmware to observe input-driven behavior.
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Digital inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))', gap: 6 }}>
          {digitalPins.map(pin => {
            const value = digital[pin] ?? 0;
            return (
              <button key={pin} onClick={() => setDigital(pin, value ? 0 : 1)} style={{ ...inputStyle, cursor: 'pointer', borderColor: value ? '#3fb950' : '#30363d', background: value ? '#0d2818' : '#0d1117' }}>
                D{pin}: <strong>{value ? 'HIGH' : 'LOW'}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Analog inputs</div>
        {analogPins.map(pin => (
          <label key={pin} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px', gap: 8, alignItems: 'center', marginBottom: 7 }}>
            <span>A{pin}</span>
            <input type="range" min="0" max="1023" value={analog[pin] ?? 0} onChange={e => setAnalog(pin, Number(e.target.value))} />
            <input style={inputStyle} type="number" min="0" max="1023" value={analog[pin] ?? 0} onChange={e => setAnalog(pin, Number(e.target.value))} />
          </label>
        ))}
      </div>

      <div style={card}>
        <button onClick={() => runFirmware()} style={{ border: '1px solid #30363d', background: '#238636', color: '#fff', borderRadius: 5, padding: '7px 11px', cursor: 'pointer' }}>
          Run firmware with current inputs
        </button>
        {result && (
          <div style={{ marginTop: 10, fontFamily: 'var(--font-family-mono)', color: '#8b949e' }}>
            <div>steps: {result.steps}</div>
            <div>elapsed: {result.state.elapsedMs} ms</div>
            <div>digital reads available: {Object.keys(result.inputs.digital).length}</div>
            <div>analog reads available: {Object.keys(result.inputs.analog).length}</div>
            {result.errors.length > 0 && <div style={{ color: '#f85149', marginTop: 6 }}>{result.errors.join(' ')}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
