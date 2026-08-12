import { useMemo, useState } from 'react';
import { encodeI2CTransaction, validateI2CTrace } from '../core/i2c.js';
import { decodeSPIWords, encodeSPITransfer, validateSPIConfig } from '../core/spi.js';

const panel: React.CSSProperties = { height: '100%', minHeight: 0, overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 12, marginBottom: 10 };
const input: React.CSSProperties = { width: '100%', marginTop: 4, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: 6 };

function parseBytes(text: string): number[] {
  return text.split(/[\s,]+/).filter(Boolean).map(token => Number.parseInt(token.replace(/^0x/i, ''), 16)).filter(v => Number.isInteger(v) && v >= 0 && v <= 255);
}

export function CommunicationPanel() {
  const [address, setAddress] = useState(0x48);
  const [i2cPayload, setI2cPayload] = useState('01 2A 7F');
  const [i2cRead, setI2cRead] = useState(false);
  const [i2cTrace, setI2cTrace] = useState(() => validateI2CTrace(encodeI2CTransaction([1, 0x2A, 0x7F], { address: 0x48 })));
  const [spiMosi, setSpiMosi] = useState('9A 01');
  const [spiMiso, setSpiMiso] = useState('55 A5');
  const [spiMode, setSpiMode] = useState<0 | 1 | 2 | 3>(0);
  const [spiClock, setSpiClock] = useState(1_000_000);
  const [spiTrace, setSpiTrace] = useState(() => encodeSPITransfer([0x9A, 1], [0x55, 0xA5], { mode: 0, clockHz: 1_000_000, bits: 8 }));

  const spiErrors = useMemo(() => validateSPIConfig(spiTrace.config), [spiTrace.config]);

  const runI2C = () => setI2cTrace(validateI2CTrace(encodeI2CTransaction(parseBytes(i2cPayload), { address, read: i2cRead })));
  const runSPI = () => {
    const config = { mode: spiMode, clockHz: spiClock, bits: 8 } as const;
    setSpiTrace(encodeSPITransfer(parseBytes(spiMosi), parseBytes(spiMiso), config));
  };

  return (
    <div style={panel}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Communication Lab</div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>I²C analyzer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px auto', gap: 8, alignItems: 'end' }}>
          <label>7-bit address
            <input style={input} value={`0x${address.toString(16).padStart(2, '0').toUpperCase()}`} onChange={e => {
              const parsed = Number.parseInt(e.target.value.replace(/^0x/i, ''), 16);
              if (Number.isFinite(parsed)) setAddress(Math.max(0, Math.min(0x7f, parsed)));
            }} />
          </label>
          <label>Payload bytes
            <input style={input} value={i2cPayload} onChange={e => setI2cPayload(e.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={i2cRead} onChange={e => setI2cRead(e.target.checked)} /> Read</label>
          <button onClick={runI2C} style={{ border: '1px solid #30363d', background: '#238636', color: '#fff', borderRadius: 5, padding: '7px 10px', cursor: 'pointer' }}>Decode</button>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 5, fontFamily: 'var(--font-family-mono)' }}>
          {i2cTrace.events.map((event, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 90px 70px 1fr' }}>
            <span>{event.timeUs.toFixed(1)} µs</span>
            <span>0x{event.byte.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span>{event.read ? 'READ' : 'WRITE'}</span>
            <span style={{ color: event.ack ? '#3fb950' : '#f85149' }}>{event.ack ? 'ACK' : 'NACK'}</span>
          </div>)}
        </div>
        {i2cTrace.errors.length > 0 && <div style={{ color: '#f85149', marginTop: 8 }}>{i2cTrace.errors.join(' ')}</div>}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>SPI analyzer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 140px auto', gap: 8, alignItems: 'end' }}>
          <label>MOSI bytes
            <input style={input} value={spiMosi} onChange={e => setSpiMosi(e.target.value)} />
          </label>
          <label>MISO bytes
            <input style={input} value={spiMiso} onChange={e => setSpiMiso(e.target.value)} />
          </label>
          <label>Mode
            <select style={input} value={spiMode} onChange={e => setSpiMode(Number(e.target.value) as 0 | 1 | 2 | 3)}>
              <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
          </label>
          <label>Clock (Hz)
            <input style={input} type="number" min={1} value={spiClock} onChange={e => setSpiClock(Number(e.target.value))} />
          </label>
          <button onClick={runSPI} style={{ border: '1px solid #30363d', background: '#238636', color: '#fff', borderRadius: 5, padding: '7px 10px', cursor: 'pointer' }}>Decode</button>
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-family-mono)' }}>
          {decodeSPIWords(spiTrace).map((word, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 100px 100px 80px' }}>
            <span>{word.timeUs.toFixed(1)} µs</span>
            <span>MOSI 0x{word.mosi.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span>MISO 0x{word.miso.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span>{word.bits} bits</span>
          </div>)}
        </div>
        {spiErrors.length > 0 && <div style={{ color: '#f85149', marginTop: 8 }}>{spiErrors.join(' ')}</div>}
      </div>

      <div style={{ ...card, borderColor: '#30363d' }}>
        <div style={{ color: '#8b949e', lineHeight: 1.5 }}>
          These analyzers model protocol framing and timing. The next communication stage will connect them to simulated MCU peripherals and shared physical buses, including pull-ups, chip-select behavior, addressing, and bus faults.
        </div>
      </div>
    </div>
  );
}
