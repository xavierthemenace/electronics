import { useMemo, useState } from 'react';
import type { ArduinoSerialEvent } from '../core/arduinoRuntime.js';
import { analyzeUart, encodeBytes } from '../core/uart.js';

interface SerialAnalyzerProps {
  events: ArduinoSerialEvent[];
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-family-mono)' };

function eventsToBytes(events: ArduinoSerialEvent[]): number[] {
  return events.flatMap(event => Array.from(new TextEncoder().encode(event.text + (event.newline ? '\n' : ''))));
}

export function SerialAnalyzer({ events }: SerialAnalyzerProps) {
  const [baud, setBaud] = useState(9600);
  const [dataBits, setDataBits] = useState<7 | 8>(8);
  const [parity, setParity] = useState<'none' | 'even' | 'odd'>('none');
  const [stopBits, setStopBits] = useState<1 | 2>(1);

  const analysis = useMemo(() => {
    const bytes = eventsToBytes(events);
    const config = { baud, dataBits, parity, stopBits } as const;
    const waveform = encodeBytes(bytes, config, events[0]?.timeMs ?? 0);
    return analyzeUart(waveform, config);
  }, [events, baud, dataBits, parity, stopBits]);

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #21262d', paddingTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>UART Analyzer</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7, marginBottom: 10 }}>
        <label>Baud
          <select value={baud} onChange={e => setBaud(Number(e.target.value))} style={{ width: '100%', marginTop: 3 }}>
            {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label>Data bits
          <select value={dataBits} onChange={e => setDataBits(Number(e.target.value) as 7 | 8)} style={{ width: '100%', marginTop: 3 }}>
            <option value={7}>7</option><option value={8}>8</option>
          </select>
        </label>
        <label>Parity
          <select value={parity} onChange={e => setParity(e.target.value as typeof parity)} style={{ width: '100%', marginTop: 3 }}>
            <option value="none">None</option><option value="even">Even</option><option value="odd">Odd</option>
          </select>
        </label>
        <label>Stop bits
          <select value={stopBits} onChange={e => setStopBits(Number(e.target.value) as 1 | 2)} style={{ width: '100%', marginTop: 3 }}>
            <option value={1}>1</option><option value={2}>2</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 14, color: '#8b949e', marginBottom: 8, ...mono }}>
        <span>{analysis.frames.length} frames</span>
        <span>{analysis.errors.length} framing errors</span>
        <span>{analysis.totalBits} bits</span>
      </div>

      {analysis.frames.length > 0 ? (
        <div style={{ maxHeight: 190, overflow: 'auto', border: '1px solid #21262d', borderRadius: 5 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...mono }}>
            <thead><tr style={{ color: '#8b949e', textAlign: 'left' }}>
              <th style={{ padding: 6 }}>Time</th><th style={{ padding: 6 }}>Hex</th><th style={{ padding: 6 }}>ASCII</th><th style={{ padding: 6 }}>Parity</th><th style={{ padding: 6 }}>Stop</th>
            </tr></thead>
            <tbody>
              {analysis.frames.map((frame, index) => (
                <tr key={`${frame.startTime}-${index}`} style={{ borderTop: '1px solid #21262d' }}>
                  <td style={{ padding: 6 }}>{frame.startTime.toFixed(3)} ms</td>
                  <td style={{ padding: 6, color: '#58a6ff' }}>{frame.dataHex}</td>
                  <td style={{ padding: 6 }}>{JSON.stringify(frame.dataAscii)}</td>
                  <td style={{ padding: 6, color: frame.parityOk ? '#3fb950' : '#f85149' }}>{frame.parityOk ? 'OK' : 'ERR'}</td>
                  <td style={{ padding: 6, color: frame.stopOk ? '#3fb950' : '#f85149' }}>{frame.stopOk ? 'OK' : 'ERR'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: '#6e7681' }}>Run firmware that uses Serial.print/println to capture UART frames.</div>
      )}

      {analysis.errors.length > 0 && (
        <div style={{ marginTop: 8, color: '#f85149' }}>{analysis.errors.slice(0, 3).join(' ')}</div>
      )}
    </div>
  );
}
