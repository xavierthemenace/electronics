import { useMemo } from 'react';
import { listComponents } from '../core/registry.js';

const CATEGORIES = [
  { id: 'infrastructure', name: 'Infrastructure', icon: '⏚' }, { id: 'power', name: 'Power', icon: '⚡' },
  { id: 'passive', name: 'Passive', icon: '🔧' }, { id: 'semiconductor', name: 'Semiconductors', icon: '📱' },
  { id: 'sensor', name: 'Sensors', icon: '◌' }, { id: 'input', name: 'Inputs', icon: '☝' },
  { id: 'actuator', name: 'Actuators', icon: '⚙' }, { id: 'display', name: 'Displays', icon: '▣' },
  { id: 'memory', name: 'Memory', icon: '▤' }, { id: 'digital', name: 'Digital', icon: '🔢' }, { id: 'embedded', name: 'Embedded', icon: '🤖' },
];

function CategorySection({ category, components, onDragStart }: { category: typeof CATEGORIES[0]; components: ReturnType<typeof listComponents>; onDragStart: (e: React.DragEvent, compType: string) => void; }) {
  const filtered = components.filter(c => c.category === category.id);
  if (!filtered.length) return null;
  return <div style={styles.categorySection}><div style={styles.categoryHeader}><span style={styles.categoryIcon}>{category.icon}</span><span style={styles.categoryTitle}>{category.name}</span></div><div style={styles.componentList}>{filtered.map(comp => <ComponentItem key={comp.type} comp={comp} onDragStart={onDragStart} />)}</div></div>;
}

function ComponentItem({ comp, onDragStart }: { comp: ReturnType<typeof listComponents>[0]; onDragStart: (e: React.DragEvent, compType: string) => void; }) {
  return <div draggable onDragStart={e => onDragStart(e, comp.type)} style={styles.componentItem} title={comp.docs.description}>
    <span style={styles.componentIcon}>{getComponentIcon(comp.type)}</span><span style={styles.componentName}>{comp.name}</span><span style={styles.readyBadge}>Ready</span>
  </div>;
}

function getComponentIcon(type: string): string {
  const icons: Record<string, string> = { ground: '⏚', 'dc-source': '🔋', resistor: '▱', led: '💡', diode: '▶', capacitor: '||', inductor: '⌐', potentiometer: '⟲', zener: '⊥', 'bjt-npn': '◢', 'mosfet-n': 'Ⓜ', and: '&', not: '¬', 'arduino-uno': '🤖', 'analog-sensor': '◉', pushbutton: '●', 'dc-motor': '⚙', servo: '↻', 'lcd-1602': '▣', 'i2c-temp': '🌡', 'i2c-eeprom': '▤', 'spi-dac': '◈', 'spi-flash': '▥' };
  return icons[type] || '□';
}

export function ComponentPalette() {
  const components = useMemo(() => listComponents(), []);
  const handleDragStart = (e: React.DragEvent, compType: string) => { e.dataTransfer.setData('application/x-component-type', compType); e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 12, 12); } catch { /* browser fallback */ } };
  return <div style={styles.palette}><div style={styles.paletteHeader}><h2 style={styles.paletteTitle}>Components</h2><div style={styles.paletteHint}>Drag real hardware onto the canvas</div></div><div style={styles.paletteContent}>{CATEGORIES.map(cat => <CategorySection key={cat.id} category={cat} components={components} onDragStart={handleDragStart} />)}</div></div>;
}

const styles: Record<string, React.CSSProperties> = {
  palette: { width: 280, height: '100%', background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }, paletteHeader: { padding: '12px 16px', borderBottom: '1px solid #30363d' }, paletteTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: '#e6edf3' }, paletteHint: { fontSize: 11, color: '#8b949e', marginTop: 4 }, paletteContent: { flex: 1, overflowY: 'auto', padding: 8 }, categorySection: { marginBottom: 16 }, categoryHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8, background: '#21262d', borderRadius: 6 }, categoryIcon: { fontSize: 16 }, categoryTitle: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8b949e' }, componentList: { display: 'flex', flexDirection: 'column', gap: 4 }, componentItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#21262d', borderRadius: 6, cursor: 'grab', transition: 'background .15s', userSelect: 'none' }, componentIcon: { fontSize: 18, width: 24, textAlign: 'center' }, componentName: { flex: 1, fontSize: 13, color: '#e6edf3' }, readyBadge: { fontSize: 10, padding: '2px 6px', background: '#0d2818', color: '#3fb950', borderRadius: 3, textTransform: 'uppercase' },
};
