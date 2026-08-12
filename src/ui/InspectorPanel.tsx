/**
 * InspectorPanel — Component property inspector with ERC violations.
 * Uses design system tokens.
 *
 * @module ui/InspectorPanel
 */

import { useMemo, CSSProperties } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { getDefinition } from '../core/registry.js';
import { resolveParams } from '../core/define.js';

// Token values for inline styles
const t = {
  colors: {
    bg: { base: '#0d1117', panel: '#161b22', elevated: '#21262d', hover: '#30363d' },
    border: { subtle: '#21262d', default: '#30363d', focus: '#58a6ff', error: '#f85149' },
    text: { primary: '#e6edf3', secondary: '#8b949e', tertiary: '#6a737d', inverse: '#0d1117' },
    accent: { primary: '#58a6ff', secondary: '#d2a8ff' },
    status: { success: '#3fb950', successBg: '#0d2818', warning: '#d29922', warningBg: '#332800', error: '#f85149', errorBg: '#330d0d', info: '#58a6ff', infoBg: '#0d2833' },
    circuit: { power: '#f78166', ground: '#7ee787', signal: '#a5d6ff', digital: '#58a6ff', analog: '#d2a8ff' },
  },
  spacing: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
  typography: { fontFamily: { ui: 'system-ui, -apple-system, sans-serif', mono: '"SF Mono", monospace' }, fontSize: { xs: '10px', sm: '12px', base: '13px', md: '14px', lg: '16px' }, fontWeight: { normal: 400, medium: 500, semibold: 600 }, lineHeight: { relaxed: 1.75 } },
  radii: { sm: '4px', md: '6px', lg: '8px', pill: '9999px' },
  transitions: { fast: '80ms ease', normal: '150ms ease' },
};

function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

const inspectorStyles: Record<string, CSSProperties> = {
  container: {
    width: '300px',
    height: '100%',
    background: t.colors.bg.panel,
    borderLeft: `1px solid ${t.colors.border.subtle}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: t.colors.text.tertiary,
    textAlign: 'center',
    gap: t.spacing.md,
    padding: t.spacing.xl,
  },
  emptyIcon: { fontSize: '48px', opacity: 0.3 },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: t.spacing.xl,
    paddingBottom: t.spacing.lg,
    borderBottom: `1px solid ${t.colors.border.subtle}`,
  },
  componentHeader: { display: 'flex', alignItems: 'center', gap: t.spacing.md },
  componentInfo: { display: 'flex', flexDirection: 'column', gap: t.spacing.xs },
  componentName: { margin: 0, fontSize: t.typography.fontSize.lg, fontWeight: t.typography.fontWeight.semibold, color: t.colors.text.primary, fontFamily: t.typography.fontFamily.ui },
  componentType: { fontSize: t.typography.fontSize.xs, color: t.colors.text.tertiary, fontFamily: t.typography.fontFamily.mono, textTransform: 'uppercase' },
  section: { marginBottom: t.spacing.xl },
  sectionTitle: { margin: `0 0 ${t.spacing.md} 0`, fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.5px', color: t.colors.text.tertiary, fontFamily: t.typography.fontFamily.ui },
  fieldRow: { display: 'flex', alignItems: 'center', gap: t.spacing.md, marginBottom: t.spacing.md },
  label: { width: '70px', fontSize: t.typography.fontSize.sm, color: t.colors.text.primary, fontWeight: t.typography.fontWeight.medium, fontFamily: t.typography.fontFamily.ui, flexShrink: 0 },
  pinList: { display: 'flex', flexDirection: 'column', gap: t.spacing.sm },
  pinItem: { display: 'flex', alignItems: 'center', gap: t.spacing.md, padding: `${t.spacing.sm} ${t.spacing.md}`, background: t.colors.bg.base, borderRadius: t.radii.md },
  pinKind: { width: '20px', height: '20px', borderRadius: t.radii.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.semibold, color: t.colors.text.inverse },
  pinName: { flex: 1, fontSize: t.typography.fontSize.base, color: t.colors.text.primary, fontFamily: t.typography.fontFamily.ui },
  pinId: { fontSize: t.typography.fontSize.xs, color: t.colors.text.tertiary, fontFamily: t.typography.fontFamily.mono },
  violation: { padding: t.spacing.md, background: t.colors.status.errorBg, border: `1px solid ${t.colors.status.error}`, borderRadius: t.radii.md, marginBottom: t.spacing.md },
  violationHeader: { display: 'flex', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.sm },
  violationBadge: { fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.semibold, padding: `${t.spacing.xs} ${t.spacing.sm}`, borderRadius: t.radii.sm, color: t.colors.text.inverse, textTransform: 'uppercase' },
  violationCode: { fontSize: t.typography.fontSize.xs, fontFamily: t.typography.fontFamily.mono, color: t.colors.text.tertiary },
  violationMessage: { margin: `0 0 ${t.spacing.sm} 0`, fontSize: t.typography.fontSize.sm, color: t.colors.status.error, fontWeight: t.typography.fontWeight.medium, fontFamily: t.typography.fontFamily.ui },
  violationExplanation: { margin: `0 0 ${t.spacing.sm} 0`, fontSize: t.typography.fontSize.xs, color: t.colors.circuit.signal, lineHeight: t.typography.lineHeight.relaxed, fontFamily: t.typography.fontFamily.ui },
  violationFix: { margin: `0 0 ${t.spacing.sm} 0`, fontSize: t.typography.fontSize.xs, color: t.colors.status.success, lineHeight: t.typography.lineHeight.relaxed, fontFamily: t.typography.fontFamily.ui },
  violationExpected: { margin: 0, fontSize: t.typography.fontSize.xs, color: t.colors.accent.secondary, lineHeight: t.typography.lineHeight.relaxed, fontFamily: t.typography.fontFamily.ui },
  measurements: { display: 'flex', flexDirection: 'column', gap: t.spacing.sm },
  measurement: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${t.spacing.sm} ${t.spacing.md}`, background: t.colors.bg.base, borderRadius: t.radii.md },
  measurementLabel: { fontSize: t.typography.fontSize.xs, color: t.colors.text.tertiary, fontFamily: t.typography.fontFamily.ui },
  measurementValue: { fontSize: t.typography.fontSize.base, fontWeight: t.typography.fontWeight.semibold, color: t.colors.accent.primary, fontFamily: t.typography.fontFamily.mono },
  brightnessBar: { width: '100%', height: '6px', background: t.colors.border.default, borderRadius: t.radii.pill, overflow: 'hidden' },
  brightnessFill: { height: '100%', borderRadius: t.radii.pill, transition: `width ${t.transitions.normal}, background ${t.transitions.normal}` },
  noMeasurements: { fontSize: t.typography.fontSize.sm, color: t.colors.text.tertiary, fontStyle: 'italic', fontFamily: t.typography.fontFamily.ui },
  description: { margin: 0, fontSize: t.typography.fontSize.sm, color: t.colors.circuit.signal, lineHeight: t.typography.lineHeight.relaxed, fontFamily: t.typography.fontFamily.ui },
  deleteButton: { background: 'transparent', border: `1px solid ${t.colors.border.default}`, borderRadius: t.radii.md, padding: `${t.spacing.sm} ${t.spacing.md}`, cursor: 'pointer', fontSize: t.typography.fontSize.base, color: t.colors.text.tertiary, transition: `all ${t.transitions.fast}` },
  inputStyle: { flex: 1, padding: `${t.spacing.sm} ${t.spacing.md}`, background: t.colors.bg.base, border: `1px solid ${t.colors.border.default}`, borderRadius: t.radii.md, color: t.colors.text.primary, fontSize: t.typography.fontSize.base, fontFamily: t.typography.fontFamily.mono },
  selectStyle: { flex: 1, padding: `${t.spacing.sm} ${t.spacing.md}`, background: t.colors.bg.base, border: `1px solid ${t.colors.border.default}`, borderRadius: t.radii.md, color: t.colors.text.primary, fontSize: t.typography.fontSize.base, fontFamily: t.typography.fontFamily.mono },
};

function getComponentIcon(type: string): string {
  const icons: Record<string, string> = { 'ground': '⏚', 'dc-source': '🔋', 'resistor': '🔧', 'led': '💡', 'diode': '▶', 'capacitor': '||', 'inductor': '⌐', 'arduino-uno': '🤖' };
  return icons[type] || '□';
}

function getPinColor(kind: string): string {
  const colors: Record<string, string> = { 'power': '#f78166', 'ground': '#7ee787', 'digital': '#58a6ff', 'analog': '#d2a8ff', 'passive': '#a5d6ff', 'input': '#ffa657', 'output': '#7ee787', 'pwm': '#d2a8ff', 'bidirectional': '#ffd700' };
  return colors[kind] || '#8b949e';
}

function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = { 'info': '#58a6ff', 'warning': '#d29922', 'error': '#f85149', 'critical': '#f78166' };
  return colors[severity] || '#8b949e';
}

function MeasurementDisplay({ compId }: { compId: string }) {
  const { getDeviceCurrent, getDevicePower, getDeviceBrightness } = useSimulationStore();
  const current = getDeviceCurrent(compId);
  const power = getDevicePower(compId);
  const brightness = getDeviceBrightness(compId);

  if (current === null && power === null && brightness === null) {
    return <p style={inspectorStyles.noMeasurements}>Run simulation to see measurements</p>;
  }

  return (
    <div style={inspectorStyles.measurements}>
      {current !== null && (
        <div style={inspectorStyles.measurement}>
          <span style={inspectorStyles.measurementLabel}>Current</span>
          <span style={inspectorStyles.measurementValue}>
            {Math.abs(current) >= 1 ? `${current.toFixed(3)} A` : `${(current * 1000).toFixed(2)} mA`}
          </span>
        </div>
      )}
      {power !== null && (
        <div style={inspectorStyles.measurement}>
          <span style={inspectorStyles.measurementLabel}>Power</span>
          <span style={inspectorStyles.measurementValue}>
            {Math.abs(power) >= 1 ? `${power.toFixed(3)} W` : `${(power * 1000).toFixed(1)} mW`}
          </span>
        </div>
      )}
      {brightness !== null && (
        <div style={inspectorStyles.measurement}>
          <span style={inspectorStyles.measurementLabel}>Brightness</span>
          <div style={inspectorStyles.brightnessBar}>
            <div style={mergeStyles(inspectorStyles.brightnessFill, { width: `${brightness * 100}%`, background: brightness > 0 ? t.colors.circuit.power : t.colors.border.default })} />
          </div>
        </div>
      )}
    </div>
  );
}

export function InspectorPanel() {
  const { selection, getComponent, updateComponentParams, removeComponent } = useCircuitStore();
  const { dcViolations } = useSimulationStore();

  const selectedId = useMemo(() => {
    const ids = Array.from(selection.componentIds);
    return ids.length === 1 ? ids[0] : null;
  }, [selection.componentIds]);

  const comp = selectedId ? getComponent(selectedId) : null;
  const def = comp ? getDefinition(comp.type) : null;

  if (!comp || !def) {
    return (
      <div style={inspectorStyles.container}>
        <div style={inspectorStyles.emptyState}>
          <span style={inspectorStyles.emptyIcon}>🔍</span>
          <p>Select a component to inspect</p>
        </div>
      </div>
    );
  }

  const params = resolveParams(def, comp.params);
  const violations = dcViolations.filter((v) => v.componentIds.includes(comp.id));

  return (
    <div style={inspectorStyles.container}>
      <div style={inspectorStyles.header}>
        <div style={inspectorStyles.componentHeader}>
          <span style={{ fontSize: '28px' }}>{getComponentIcon(comp.type)}</span>
          <div style={inspectorStyles.componentInfo}>
            <h3 style={inspectorStyles.componentName}>{def.name}</h3>
            <span style={inspectorStyles.componentType}>{comp.type}</span>
          </div>
        </div>
        <button onClick={() => removeComponent(comp.id)} style={inspectorStyles.deleteButton} title="Delete component (Del)">🗑</button>
      </div>

      {/* Position */}
      <div style={inspectorStyles.section}>
        <h4 style={inspectorStyles.sectionTitle}>Position</h4>
        <div style={inspectorStyles.fieldRow}>
          <label style={inspectorStyles.label}>X</label>
          <input type="number" value={comp.position.x} onChange={(e) => updateComponentParams(comp.id, { position: { ...comp.position, x: Number(e.target.value) } })} style={inspectorStyles.inputStyle} />
        </div>
        <div style={inspectorStyles.fieldRow}>
          <label style={inspectorStyles.label}>Y</label>
          <input type="number" value={comp.position.y} onChange={(e) => updateComponentParams(comp.id, { position: { ...comp.position, y: Number(e.target.value) } })} style={inspectorStyles.inputStyle} />
        </div>
        <div style={inspectorStyles.fieldRow}>
          <label style={inspectorStyles.label}>Rotation</label>
          <select value={comp.rotation || 0} onChange={(e) => updateComponentParams(comp.id, { rotation: Number(e.target.value) })} style={inspectorStyles.selectStyle}>
            <option value={0}>0°</option><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option>
          </select>
        </div>
      </div>

      {/* Parameters */}
      {Object.keys(def.params).length > 0 && (
        <div style={inspectorStyles.section}>
          <h4 style={inspectorStyles.sectionTitle}>Parameters</h4>
          {Object.entries(def.params).map(([key, paramDef]) => (
            <div key={key} style={inspectorStyles.fieldRow}>
              <label style={inspectorStyles.label} title={paramDef.unit}>{key} {paramDef.unit ? `(${paramDef.unit})` : ''}</label>
              {typeof paramDef.default === 'boolean' ? (
                <input type="checkbox" checked={params[key] as boolean} onChange={(e) => updateComponentParams(comp.id, { [key]: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: t.colors.accent.primary }} />
              ) : (
                <input type="number" value={params[key] as number} onChange={(e) => updateComponentParams(comp.id, { [key]: Number(e.target.value) })} min={paramDef.min} max={paramDef.max} step={paramDef.unit === 'Ω' || paramDef.unit === 'F' || paramDef.unit === 'H' ? 'any' : '0.01'} style={inspectorStyles.inputStyle} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pins */}
      <div style={inspectorStyles.section}>
        <h4 style={inspectorStyles.sectionTitle}>Pins</h4>
        <div style={inspectorStyles.pinList}>
          {def.pins.map((pin) => (
            <div key={pin.id} style={inspectorStyles.pinItem}>
              <span style={{ ...inspectorStyles.pinKind, background: getPinColor(pin.kind) }}>{pin.kind.slice(0, 1).toUpperCase()}</span>
              <span style={inspectorStyles.pinName}>{pin.name}</span>
              <span style={inspectorStyles.pinId}>{pin.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ERC Violations */}
      {violations.length > 0 && (
        <div style={inspectorStyles.section}>
          <h4 style={{ ...inspectorStyles.sectionTitle, color: t.colors.status.error }}>⚠ Electrical Issues</h4>
          {violations.map((v, i) => (
            <div key={i} style={inspectorStyles.violation}>
              <div style={inspectorStyles.violationHeader}>
                <span style={{ ...inspectorStyles.violationBadge, background: getSeverityColor(v.severity) }}>{v.severity.toUpperCase()}</span>
                <span style={inspectorStyles.violationCode}>{v.code}</span>
              </div>
              <p style={inspectorStyles.violationMessage}>{v.message}</p>
              <p style={inspectorStyles.violationExplanation}>{v.explanation}</p>
              {v.suggestedFix && <p style={inspectorStyles.violationFix}>💡 {v.suggestedFix}</p>}
              {v.expected && <p style={inspectorStyles.violationExpected}>✓ Expected: {v.expected}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Measurements */}
      {def.status === 'modelled' && (
        <div style={inspectorStyles.section}>
          <h4 style={inspectorStyles.sectionTitle}>Measurements</h4>
          <MeasurementDisplay compId={comp.id} />
        </div>
      )}

      {/* Documentation */}
      <div style={inspectorStyles.section}>
        <h4 style={inspectorStyles.sectionTitle}>Documentation</h4>
        <p style={inspectorStyles.description}>{def.docs.description}</p>
      </div>
    </div>
  );
}