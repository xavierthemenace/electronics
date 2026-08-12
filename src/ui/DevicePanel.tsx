import { useMemo } from 'react';
import { useCircuitStore } from '../stores/circuit.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };
const input: React.CSSProperties = { background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: '6px 8px' };

export function DevicePanel() {
  const components = useCircuitStore(s => s.components);
  const update = useCircuitStore(s => s.updateComponentParams);
  const devices = useMemo(() => [...components.values()].filter(c => ['dc-motor', 'servo', 'lcd-1602', 'analog-sensor', 'pushbutton'].includes(c.type)), [components]);

  const setParam = (id: string, key: string, value: unknown) => update(id, { [key]: value });

  return (
    <div style={panel}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Devices & Actuators</div>
      <div style={{ color: '#8b949e', marginBottom: 12 }}>Interact with simulated physical devices. Parameter changes are part of the circuit state and persist with the project.</div>
      {devices.length === 0 && <div style={card}>Place a motor, servo, display, sensor, or pushbutton to control it here.</div>}
      {devices.map(device => {
        if (device.type === 'dc-motor') return (
          <div key={device.id} style={card}>
            <strong>DC Motor</strong><div style={{ color: '#8b949e', margin: '4px 0 8px' }}>{device.id}</div>
            <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center', marginBottom: 7 }}>
              <span>Speed</span><input type="range" min="0" max="100" value={Number(device.params.speed ?? 0)} onChange={e => setParam(device.id, 'speed', Number(e.target.value))} /><span>{Number(device.params.speed ?? 0)}%</span>
            </label>
            <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center' }}>
              <span>Back EMF</span><input style={input} type="number" min="0" max="24" step="0.1" value={Number(device.params.backEmf ?? 0)} onChange={e => setParam(device.id, 'backEmf', Number(e.target.value))} /><span>V</span>
            </label>
          </div>
        );
        if (device.type === 'servo') return (
          <div key={device.id} style={card}>
            <strong>Servo Motor</strong><div style={{ color: '#8b949e', margin: '4px 0 8px' }}>{device.id}</div>
            <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center', marginBottom: 7 }}>
              <span>Angle</span><input type="range" min="0" max="180" value={Number(device.params.angle ?? 90)} onChange={e => setParam(device.id, 'angle', Number(e.target.value))} /><span>{Number(device.params.angle ?? 90)}°</span>
            </label>
            <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center' }}>
              <span>Signal level</span><input type="range" min="0" max="5" step="0.1" value={Number(device.params.signalVoltage ?? 0)} onChange={e => setParam(device.id, 'signalVoltage', Number(e.target.value))} /><span>{Number(device.params.signalVoltage ?? 0).toFixed(1)} V</span>
            </label>
          </div>
        );
        if (device.type === 'lcd-1602') return (
          <div key={device.id} style={card}>
            <strong>16×2 LCD</strong><div style={{ color: '#8b949e', margin: '4px 0 8px' }}>{device.id}</div>
            <label style={{ display: 'block', marginBottom: 7 }}>Display text<input style={{ ...input, width: '100%', marginTop: 4 }} maxLength={32} value={String(device.params.text ?? '')} onChange={e => setParam(device.id, 'text', e.target.value)} /></label>
            <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center' }}><span>Contrast</span><input type="range" min="0" max="1" step="0.01" value={Number(device.params.contrast ?? 0.5)} onChange={e => setParam(device.id, 'contrast', Number(e.target.value))} /><span>{Math.round(Number(device.params.contrast ?? 0.5) * 100)}%</span></label>
            <div style={{ marginTop: 10, padding: 10, border: '1px solid #30363d', background: '#08110a', color: '#76ff8a', fontFamily: 'var(--font-family-mono)', minHeight: 44 }}>{String(device.params.text ?? '').slice(0, 16)}<br />{String(device.params.text ?? '').slice(16, 32)}</div>
          </div>
        );
        if (device.type === 'analog-sensor') return (
          <div key={device.id} style={card}><strong>Analog Sensor</strong><div style={{ color: '#8b949e', margin: '4px 0 8px' }}>{device.id}</div><label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 8, alignItems: 'center' }}><span>Output</span><input type="range" min="0" max="5" step="0.01" value={Number(device.params.outputVoltage ?? 2.5)} onChange={e => setParam(device.id, 'outputVoltage', Number(e.target.value))} /><span>{Number(device.params.outputVoltage ?? 2.5).toFixed(2)} V</span></label></div>
        );
        return (
          <div key={device.id} style={card}><strong>Pushbutton</strong><div style={{ color: '#8b949e', margin: '4px 0 8px' }}>{device.id}</div><button onClick={() => setParam(device.id, 'pressed', !Boolean(device.params.pressed))} style={{ border: '1px solid #30363d', background: device.params.pressed ? '#0d2818' : '#21262d', color: '#e6edf3', padding: '8px 14px', borderRadius: 5 }}>{device.params.pressed ? 'PRESSED' : 'RELEASED'}</button></div>
        );
      })}
    </div>
  );
}
