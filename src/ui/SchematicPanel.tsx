import { useMemo } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { getDefinition } from '../core/registry.js';

export function SchematicPanel() {
  const components = useCircuitStore(s => s.components);
  const wires = useCircuitStore(s => s.wires);
  const items = useMemo(() => [...components.values()], [components]);
  const wireList = useMemo(() => [...wires.values()], [wires]);
  const width = 900; const height = 480;
  return <div style={styles.wrap}>
    <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg} role="img" aria-label="Circuit schematic">
      <defs><pattern id="schemgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#1c2733" strokeWidth="1" /></pattern></defs>
      <rect width={width} height={height} fill="url(#schemgrid)" />
      {wireList.map((w, i) => {
        const a = components.get(w.a.cid); const b = components.get(w.b.cid); if (!a || !b) return null;
        return <line key={i} x1={a.position.x} y1={a.position.y} x2={b.position.x} y2={b.position.y} stroke="#58a6ff" strokeWidth="2" opacity=".85" />;
      })}
      {items.map(c => {
        const d = getDefinition(c.type); const label = d?.name ?? c.type;
        return <g key={c.id} transform={`translate(${c.position.x},${c.position.y})`}>
          <rect x="-48" y="-22" width="96" height="44" rx="6" fill="#161b22" stroke="#8b949e" />
          <text textAnchor="middle" y="4" fill="#e6edf3" fontSize="11" fontFamily="system-ui">{label}</text>
        </g>;
      })}
    </svg>
    <div style={styles.footer}>{items.length} components · {wireList.length} connections · schematic view uses the canonical circuit state</div>
  </div>;
}
const styles: Record<string, React.CSSProperties> = {wrap:{height:'100%',display:'flex',flexDirection:'column',background:'#0d1117'},svg:{width:'100%',height:'100%',minHeight:260},footer:{padding:'7px 10px',borderTop:'1px solid #30363d',color:'#8b949e',fontSize:11}};
