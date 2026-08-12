import { useMemo, useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { addJumper, connectivityGroups, createBreadboard, placePin, type BreadboardTopology } from '../core/breadboard.js';

const panel: React.CSSProperties = { height: '100%', overflow: 'auto', padding: 12, background: '#161b22', color: '#e6edf3', fontSize: 12 };
const card: React.CSSProperties = { border: '1px solid #30363d', borderRadius: 6, background: '#0d1117', padding: 10, marginBottom: 10 };
const holeStyle: React.CSSProperties = { width: 13, height: 13, borderRadius: '50%', border: '1px solid #6e7681', background: '#0b0f14', cursor: 'crosshair', padding: 0 };

export function BreadboardPanel() {
  const components = useCircuitStore(s => s.components);
  const [board, setBoard] = useState<BreadboardTopology>(() => createBreadboard());
  const [firstHole, setFirstHole] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedPin, setSelectedPin] = useState('');
  const [status, setStatus] = useState('Click two holes to create a jumper.');

  const groups = useMemo(() => connectivityGroups(board), [board]);
  const placementsByHole = useMemo(() => new Map(board.placements.map(p => [p.holeId, `${p.componentId}:${p.pinId}`])), [board]);
  const componentList = [...components.values()];

  const pinsForType = (type: string): string[] => {
    const pins: Record<string, string[]> = {
      resistor: ['1', '2'], led: ['a', 'k'], capacitor: ['1', '2'], diode: ['a', 'k'],
      'dc-source': ['plus', 'minus'], ground: ['gnd'], 'arduino-uno': ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', '5v', 'gnd'],
    };
    return pins[type] ?? [];
  };

  const selectComponent = (id: string) => {
    setSelectedComponent(id);
    const comp = components.get(id);
    setSelectedPin(comp ? pinsForType(comp.type)[0] ?? '' : '');
  };

  const clickHole = (holeId: string) => {
    if (selectedComponent && selectedPin) {
      setBoard(prev => {
        const next = structuredClone(prev);
        placePin(next, selectedComponent, selectedPin, holeId);
        return next;
      });
      setStatus(`Placed ${selectedComponent}:${selectedPin} at ${holeId}.`);
      return;
    }
    if (!firstHole) {
      setFirstHole(holeId);
      setStatus(`Selected ${holeId}. Click another hole to jumper it.`);
      return;
    }
    if (firstHole === holeId) return;
    try {
      setBoard(prev => {
        const next = structuredClone(prev);
        addJumper(next, firstHole, holeId);
        return next;
      });
      setStatus(`Jumper connected ${firstHole} → ${holeId}.`);
    } catch (err) {
      setStatus(String(err));
    }
    setFirstHole(null);
  };

  const holesForSide = (side: 'top' | 'bottom') => board.holes.filter(h => h.side === side && h.bank === 'left');
  const renderBank = (side: 'top' | 'bottom', bank: 'left' | 'right') => (
    <div style={{ display: 'grid', gridTemplateRows: `repeat(${board.rows}, 18px)`, gap: 2 }}>
      {Array.from({ length: board.rows }).map((_, row) => (
        <div key={`${side}-${bank}-${row}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${board.columns}, 18px)`, gap: 2 }}>
          {board.holes.filter(h => h.side === side && h.bank === bank && h.row === row).map(h => {
            const groupIndex = groups.findIndex(g => g.includes(h.id));
            const placed = placementsByHole.get(h.id);
            const active = firstHole === h.id;
            return <button key={h.id} title={`${h.id}${placed ? ` • ${placed}` : ''}`} onClick={() => clickHole(h.id)} aria-label={h.id} style={{ ...holeStyle, background: active ? '#58a6ff' : placed ? '#3fb950' : groupIndex % 2 === 0 ? '#111820' : '#0d1117', borderColor: active ? '#58a6ff' : placed ? '#3fb950' : '#30363d' }} />;
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div><strong>Breadboard Lab</strong><div style={{ color: '#8b949e', marginTop: 3 }}>30-row solderless topology • physical five-hole strips</div></div>
        <button onClick={() => { setBoard(createBreadboard()); setFirstHole(null); setStatus('Board reset.'); }} style={{ border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', padding: '6px 9px', borderRadius: 5 }}>Reset board</button>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>Component
            <select value={selectedComponent} onChange={e => selectComponent(e.target.value)} style={{ display: 'block', marginTop: 4, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: 6 }}>
              <option value="">Jumper mode</option>
              {componentList.map(c => <option key={c.id} value={c.id}>{c.type} • {c.id.slice(0, 8)}</option>)}
            </select>
          </label>
          <label>Pin
            <select value={selectedPin} onChange={e => setSelectedPin(e.target.value)} disabled={!selectedComponent} style={{ display: 'block', marginTop: 4, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: 6 }}>
              {selectedComponent ? pinsForType(components.get(selectedComponent)?.type ?? '').map(pin => <option key={pin} value={pin}>{pin}</option>) : <option value="">—</option>}
            </select>
          </label>
          <button onClick={() => { setSelectedComponent(''); setSelectedPin(''); setFirstHole(null); setStatus('Jumper mode enabled.'); }} style={{ border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', padding: '6px 9px', borderRadius: 5 }}>Jumper mode</button>
          <div style={{ color: '#8b949e' }}>{status}</div>
        </div>
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <div style={{ minWidth: 520, display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 14 }}>
          <div style={{ color: '#6e7681', fontFamily: 'var(--font-family-mono)' }}>{Array.from({ length: board.rows }).map((_, i) => <div key={i} style={{ height: 20 }}>{String(i + 1).padStart(2, ' ')}</div>)}</div>
          <div>
            <div style={{ textAlign: 'center', color: '#8b949e', marginBottom: 6 }}>BANK A</div>
            {renderBank('top', 'left')}
            <div style={{ height: 20 }} />
            {renderBank('bottom', 'left')}
          </div>
          <div>
            <div style={{ textAlign: 'center', color: '#8b949e', marginBottom: 6 }}>BANK B</div>
            {renderBank('top', 'right')}
            <div style={{ height: 20 }} />
            {renderBank('bottom', 'right')}
          </div>
        </div>
      </div>

      <div style={card}>
        <strong>Connectivity</strong>
        <div style={{ color: '#8b949e', marginTop: 6 }}>Physical strips are electrically connected before jumpers are applied.</div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font-family-mono)', maxHeight: 120, overflow: 'auto' }}>
          {groups.slice(0, 12).map((group, i) => <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid #21262d' }}>NET {i + 1}: {group.length} holes</div>)}
          {groups.length > 12 && <div style={{ color: '#6e7681', marginTop: 4 }}>+ {groups.length - 12} more nets</div>}
        </div>
      </div>
    </div>
  );
}
