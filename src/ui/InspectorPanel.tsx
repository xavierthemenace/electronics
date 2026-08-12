/**
 * InspectorPanel — Component property inspector with ERC violations.
 * Defensive by design: invalid or stale selections must never crash the editor.
 *
 * @module ui/InspectorPanel
 */

import { useMemo, type CSSProperties } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { getDefinition } from '../core/registry.js';
import { resolveParams } from '../core/define.js';

const colors = {
  bg: '#0d1117',
  panel: '#161b22',
  elevated: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  faint: '#6a737d',
  accent: '#58a6ff',
  error: '#f85149',
  success: '#3fb950',
};

const styles: Record<string, CSSProperties> = {
  container: { width: 300, height: '100%', boxSizing: 'border-box', background: colors.panel, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'auto', color: colors.text, fontFamily: 'system-ui, sans-serif' },
  content: { padding: 16 },
  empty: { flex: 1, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.faint, textAlign: 'center', padding: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 14, marginBottom: 16, borderBottom: `1px solid ${colors.border}` },
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  type: { marginTop: 3, color: colors.faint, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase' },
  section: { marginBottom: 20 },
  sectionTitle: { margin: '0 0 9px', color: colors.faint, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { width: 72, flexShrink: 0, fontSize: 12, fontWeight: 500 },
  input: { flex: 1, minWidth: 0, padding: '6px 8px', boxSizing: 'border-box', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 5, color: colors.text, fontFamily: 'monospace' },
  card: { padding: 9, background: colors.bg, borderRadius: 5, marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 12 },
  error: { padding: 9, background: '#330d0d', border: `1px solid ${colors.error}`, borderRadius: 5, marginBottom: 8 },
};

function iconFor(type: string): string {
  return ({ ground: '⏚', 'dc-source': '🔋', resistor: '▱', led: '💡', diode: '▶', capacitor: '||', inductor: '⌁', 'arduino-uno': '▣' } as Record<string, string>)[type] ?? '□';
}

function pinColor(kind: string): string {
  return ({ power: '#f78166', ground: '#7ee787', digital: '#58a6ff', analog: '#d2a8ff', passive: '#a5d6ff', input: '#ffa657', output: '#7ee787', pwm: '#d2a8ff', bidirectional: '#ffd700' } as Record<string, string>)[kind] ?? colors.muted;
}

function MeasurementDisplay({ compId }: { compId: string }) {
  const { getDeviceCurrent, getDevicePower, getDeviceBrightness } = useSimulationStore();
  const current = getDeviceCurrent(compId);
  const power = getDevicePower(compId);
  const brightness = getDeviceBrightness(compId);

  if (current === null && power === null && brightness === null) {
    return <div style={styles.muted}>Run simulation to see measurements.</div>;
  }

  return (
    <div>
      {current !== null && <div style={styles.card}><strong>Current</strong><span style={{ float: 'right', fontFamily: 'monospace', color: colors.accent }}>{Math.abs(current) >= 1 ? `${current.toFixed(3)} A` : `${(current * 1000).toFixed(2)} mA`}</span></div>}
      {power !== null && <div style={styles.card}><strong>Power</strong><span style={{ float: 'right', fontFamily: 'monospace', color: colors.accent }}>{Math.abs(power) >= 1 ? `${power.toFixed(3)} W` : `${(power * 1000).toFixed(1)} mW`}</span></div>}
      {brightness !== null && <div style={styles.card}><strong>Brightness</strong><span style={{ float: 'right', fontFamily: 'monospace', color: colors.accent }}>{Math.round(brightness * 100)}%</span></div>}
    </div>
  );
}

export function InspectorPanel() {
  const selection = useCircuitStore((s) => s.selection);
  const getComponent = useCircuitStore((s) => s.getComponent);
  const updateComponentParams = useCircuitStore((s) => s.updateComponentParams);
  const removeComponent = useCircuitStore((s) => s.removeComponent);
  const clearSelection = useCircuitStore((s) => s.clearSelection);
  const dcViolations = useSimulationStore((s) => s.dcViolations);

  const selectedId = useMemo(() => {
    const ids = Array.from(selection.componentIds);
    return ids.length === 1 ? ids[0] : null;
  }, [selection.componentIds]);

  const comp = selectedId ? getComponent(selectedId) : undefined;

  // A selection can briefly become stale during deletion, project loading, or
  // hot reload. Never dereference an invalid component during render.
  if (!comp) {
    return (
      <aside style={styles.container}>
        <div style={styles.empty}>
          <div style={{ fontSize: 38, opacity: 0.35 }}>⌕</div>
          <div>Select a component to inspect</div>
        </div>
      </aside>
    );
  }

  const def = getDefinition(comp.type);
  if (!def) {
    return (
      <aside style={styles.container}>
        <div style={styles.content}>
          <div style={styles.error}>
            <strong>Unsupported component</strong>
            <div style={{ marginTop: 5, fontSize: 12 }}>Type: {comp.type}</div>
          </div>
          <button onClick={() => { removeComponent(comp.id); clearSelection(); }} style={{ ...styles.input, cursor: 'pointer' }}>Remove component</button>
        </div>
      </aside>
    );
  }

  // Legacy/corrupt component state can still exist in a hot-reloaded browser.
  // Treat a missing/invalid position as (0,0) for display and repair it through
  // the canonical store action rather than allowing a render exception.
  const position = comp.position && Number.isFinite(comp.position.x) && Number.isFinite(comp.position.y)
    ? comp.position
    : { x: 0, y: 0 };
  const rotation = Number.isFinite(comp.rotation) ? comp.rotation : 0;
  const params = resolveParams(def, comp.params ?? {});
  const violations = dcViolations.filter((v) => Array.isArray(v.componentIds) && v.componentIds.includes(comp.id));

  const setPosition = (axis: 'x' | 'y', value: number) => {
    const next = { ...position, [axis]: Number.isFinite(value) ? value : position[axis] };
    updateComponentParams(comp.id, { position: next });
    // updateComponentParams historically targets params; use the dedicated
    // position action when available so position edits affect the model.
    useCircuitStore.getState().setComponentPosition(comp.id, next);
  };

  return (
    <aside style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <div style={styles.title}>{iconFor(comp.type)} {def.name}</div>
            <div style={styles.type}>{comp.type}</div>
          </div>
          <button onClick={() => removeComponent(comp.id)} style={{ ...styles.input, flex: 'none', cursor: 'pointer', color: colors.error }} title="Delete component">Delete</button>
        </header>

        <section style={styles.section}>
          <h4 style={styles.sectionTitle}>Position</h4>
          <div style={styles.row}><label style={styles.label}>X</label><input type="number" value={position.x} onChange={(e) => setPosition('x', Number(e.target.value))} style={styles.input} /></div>
          <div style={styles.row}><label style={styles.label}>Y</label><input type="number" value={position.y} onChange={(e) => setPosition('y', Number(e.target.value))} style={styles.input} /></div>
          <div style={styles.row}>
            <label style={styles.label}>Rotation</label>
            <select value={rotation} onChange={(e) => useCircuitStore.getState().rotateComponent(comp.id, Number(e.target.value))} style={styles.input}>
              {[0, 90, 180, 270].map((r) => <option key={r} value={r}>{r}°</option>)}
            </select>
          </div>
        </section>

        {Object.keys(def.params).length > 0 && (
          <section style={styles.section}>
            <h4 style={styles.sectionTitle}>Parameters</h4>
            {Object.entries(def.params).map(([key, paramDef]) => {
              const value = params[key];
              if (typeof paramDef.default === 'boolean') {
                return <div key={key} style={styles.row}><label style={styles.label}>{key}</label><input type="checkbox" checked={Boolean(value)} onChange={(e) => updateComponentParams(comp.id, { [key]: e.target.checked })} /></div>;
              }
              return <div key={key} style={styles.row}><label style={styles.label} title={paramDef.unit}>{key}{paramDef.unit ? ` (${paramDef.unit})` : ''}</label><input type="number" value={typeof value === 'number' && Number.isFinite(value) ? value : Number(paramDef.default)} min={paramDef.min} max={paramDef.max} step="any" onChange={(e) => updateComponentParams(comp.id, { [key]: Number(e.target.value) })} style={styles.input} /></div>;
            })}
          </section>
        )}

        <section style={styles.section}>
          <h4 style={styles.sectionTitle}>Pins</h4>
          {def.pins.map((pin) => <div key={pin.id} style={styles.card}><span style={{ display: 'inline-block', width: 20, height: 20, lineHeight: '20px', textAlign: 'center', borderRadius: 4, background: pinColor(pin.kind), color: colors.bg, marginRight: 8, fontSize: 10 }}>{pin.kind[0]?.toUpperCase()}</span><strong>{pin.name}</strong><span style={{ float: 'right', color: colors.faint, fontFamily: 'monospace', fontSize: 10 }}>{pin.id}</span></div>)}
        </section>

        {violations.length > 0 && <section style={styles.section}><h4 style={{ ...styles.sectionTitle, color: colors.error }}>Electrical Issues</h4>{violations.map((v, i) => <div key={`${v.code}-${i}`} style={styles.error}><strong>{v.severity.toUpperCase()} — {v.code}</strong><div style={{ marginTop: 5, fontSize: 12 }}>{v.message}</div>{v.explanation && <div style={{ marginTop: 5, fontSize: 11, color: colors.muted }}>{v.explanation}</div>}{v.suggestedFix && <div style={{ marginTop: 5, fontSize: 11, color: colors.success }}>💡 {v.suggestedFix}</div>}</div>)}</section>}

        {def.status === 'modelled' && <section style={styles.section}><h4 style={styles.sectionTitle}>Measurements</h4><MeasurementDisplay compId={comp.id} /></section>}

        <section style={styles.section}><h4 style={styles.sectionTitle}>Documentation</h4><p style={{ margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.6 }}>{def.docs?.description ?? 'No documentation available.'}</p></section>
      </div>
    </aside>
  );
}
