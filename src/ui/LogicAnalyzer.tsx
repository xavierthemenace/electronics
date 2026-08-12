import { useMemo } from 'react';
import type { ArduinoTransition } from '../core/arduinoRuntime.js';

const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };

export function LogicAnalyzer({ transitions }: { transitions: ArduinoTransition[] }) {
  const pins = useMemo(() => [...new Set(transitions.map(t => t.pin))].sort((a, b) => a - b), [transitions]);
  const endMs = Math.max(1, ...transitions.map(t => t.timeMs));
  const width = 900;
  const rowHeight = 42;

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Logic Analyzer</strong>
        <span style={{ color: '#6e7681', fontFamily: 'var(--font-family-mono)' }}>
          {transitions.length} transitions • {endMs} ms
        </span>
      </div>
      {!pins.length ? (
        <div style={{ color: '#6e7681', padding: 14 }}>Run firmware containing digitalWrite() or analogWrite() to capture GPIO transitions.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg width={width} height={pins.length * rowHeight + 28} viewBox={`0 0 ${width} ${pins.length * rowHeight + 28}`} role="img" aria-label="Digital logic analyzer">
            <rect width={width} height={pins.length * rowHeight + 28} fill="#0a0f14" />
            {Array.from({ length: 11 }).map((_, i) => {
              const x = (i / 10) * width;
              return <line key={`grid-${i}`} x1={x} x2={x} y1={0} y2={pins.length * rowHeight} stroke="#1b2630" />;
            })}
            {pins.map((pin, row) => {
              const yTop = row * rowHeight + 8;
              const transitionsForPin = transitions.filter(t => t.pin === pin);
              let value: 0 | 1 = 0;
              const points: string[] = [];
              for (let i = 0; i <= 200; i++) {
                const time = (i / 200) * endMs;
                while (transitionsForPin.length && transitionsForPin[0].timeMs <= time) {
                  value = transitionsForPin.shift()!.value;
                }
                const x = (time / endMs) * width;
                const y = yTop + (value ? 6 : 26);
                points.push(`${x.toFixed(2)},${y}`);
              }
              return (
                <g key={pin}>
                  <text x={8} y={yTop + 18} fill="#8b949e" fontSize="11" fontFamily="monospace">D{pin}</text>
                  <polyline points={points.join(' ')} fill="none" stroke="#58a6ff" strokeWidth="2" />
                  {transitions.filter(t => t.pin === pin).map((t, i) => {
                    const x = (t.timeMs / endMs) * width;
                    return <line key={i} x1={x} x2={x} y1={yTop + 4} y2={yTop + 30} stroke="#3fb950" strokeWidth="1" opacity="0.7" />;
                  })}
                </g>
              );
            })}
            {Array.from({ length: 11 }).map((_, i) => {
              const x = (i / 10) * width;
              const label = ((i / 10) * endMs).toFixed(endMs < 10 ? 2 : 0);
              return <text key={`time-${i}`} x={x + 2} y={pins.length * rowHeight + 20} fill="#6e7681" fontSize="9" fontFamily="monospace">{label}ms</text>;
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
