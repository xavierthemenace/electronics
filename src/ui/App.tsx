import { useEffect, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { ComponentPalette } from './ComponentPalette.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InspectorPanel } from './InspectorPanel.js';
import { CodeEditor } from './CodeEditor.js';
import { InstrumentPanel } from './InstrumentPanel.js';
import { LessonPanel } from './LessonPanel.js';
import { CommunicationPanel } from './CommunicationPanel.js';
import { BreadboardPanel } from './BreadboardPanel.js';
import { PeripheralPanel } from './PeripheralPanel.js';
import { DevicePanel } from './DevicePanel.js';
import { SystemLabPanel } from './SystemLabPanel.js';
import { SchematicPanel } from './SchematicPanel.js';
import { ProjectHub } from './ProjectHub.js';
import { SettingsPanel } from './SettingsPanel.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { useProjectStore } from '../stores/project.js';
import { useCircuitStore } from '../stores/circuit.js';
import { useCodeStore } from '../stores/code.js';
import { useBreadboardStore } from '../stores/breadboard.js';

type BottomTab = 'lesson' | 'code' | 'instruments' | 'communication' | 'breadboard' | 'peripherals' | 'devices' | 'systems';
type ViewMode = 'circuit' | 'schematic';
const RECOVERY_KEY = 'electronics-mastery-recovery';

export function App() {
  const [bottomTab, setBottomTab] = useState<BottomTab>('lesson');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('circuit');
  const [projectHubOpen, setProjectHubOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  useEffect(() => {
    const handler = (e: Event) => setShowHud((e as CustomEvent<{ showHud?: boolean }>).detail?.showHud !== false);
    window.addEventListener('electronics-settings', handler);
    return () => window.removeEventListener('electronics-settings', handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void useProjectStore.getState().saveProject(); }
      else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); useCircuitStore.getState().undo(); }
      else if (mod && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) { e.preventDefault(); useCircuitStore.getState().redo(); }
      else if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); void useProjectStore.getState().newProject(); }
      else if (e.key === 'F5') { e.preventDefault(); useSimulationRun(); }
      else if (e.key === 'Home') { useCircuitStore.getState().resetViewport(); }
    };
    const useSimulationRun = () => useSimulationStoreShim();
    const useSimulationStoreShim = () => { const store = (globalThis as typeof globalThis & { __electronicsRunDC?: () => void }).__electronicsRunDC; if (store) store(); else window.dispatchEvent(new Event('electronics-run-dc')); };
    window.addEventListener('keydown', handler);
    const runListener = () => { const run = (window as Window & { __electronicsRunDCImpl?: () => void }).__electronicsRunDCImpl; run?.(); };
    window.addEventListener('electronics-run-dc', runListener);
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('electronics-run-dc', runListener); };
  }, []);
  useEffect(() => {
    let timer: number | undefined;
    const write = () => {
      try {
        const project = useProjectStore.getState().getCircuitProject();
        localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: Date.now(), project }));
      } catch { /* recovery is best-effort */ }
    };
    const schedule = () => { if (timer) window.clearTimeout(timer); timer = window.setTimeout(write, 800); };
    const unsubCircuit = useCircuitStore.subscribe(schedule);
    const unsubCode = useCodeStore.subscribe(schedule);
    const unsubBreadboard = useBreadboardStore.subscribe(schedule);
    schedule();
    return () => { if (timer) window.clearTimeout(timer); unsubCircuit(); unsubCode(); unsubBreadboard(); };
  }, []);
  const tabs: Array<[BottomTab, string]> = [
    ['lesson', '▣ Learn'], ['code', '⌘ Code'], ['instruments', '◉ Instruments'], ['communication', '⇄ Communication'],
    ['breadboard', '▦ Breadboard'], ['peripherals', '◌ I/O'], ['devices', '⚙ Devices'], ['systems', '▤ Systems'],
  ];
  return (
    <ErrorBoundary>
      <div style={styles.app}>
        <Toolbar onOpenProjects={() => setProjectHubOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        <div style={styles.main}>
          <ComponentPalette />
          <div style={styles.center}>
            <div style={styles.viewBar} role="tablist" aria-label="Workspace view">
              <button onClick={() => setViewMode('circuit')} style={{ ...styles.viewTab, ...(viewMode === 'circuit' ? styles.activeView : {}) }}>Circuit</button>
              <button onClick={() => setViewMode('schematic')} style={{ ...styles.viewTab, ...(viewMode === 'schematic' ? styles.activeView : {}) }}>Schematic</button>
            </div>
            <div style={styles.canvasWrapper}>
              {viewMode === 'circuit' ? <CanvasRenderer /> : <SchematicPanel />}
              {showHud && viewMode === 'circuit' && <div style={styles.canvasHud}><span>Scroll: zoom</span><span>Space + drag: pan</span><span>Drag pin: wire</span><span>Shift: multi-select</span></div>}
            </div>
            <div style={{ ...styles.bottomDock, height: bottomOpen ? 320 : 38 }}>
              <div style={styles.dockTabs}>
                {tabs.map(([id, label]) => <button key={id} style={{ ...styles.tab, ...(bottomTab === id ? styles.activeTab : {}) }} onClick={() => { setBottomTab(id); setBottomOpen(true); }}>{label}</button>)}
                <div style={{ flex: 1 }} />
                <button style={styles.dockButton} onClick={() => setBottomOpen(v => !v)}>{bottomOpen ? '⌄' : '⌃'}</button>
              </div>
              {bottomOpen && <div style={{ flex: 1, minHeight: 0 }}>
                {bottomTab === 'lesson' && <LessonPanel />}
                {bottomTab === 'code' && <CodeEditor />}
                {bottomTab === 'instruments' && <InstrumentPanel />}
                {bottomTab === 'communication' && <CommunicationPanel />}
                {bottomTab === 'breadboard' && <BreadboardPanel />}
                {bottomTab === 'peripherals' && <PeripheralPanel />}
                {bottomTab === 'devices' && <DevicePanel />}
                {bottomTab === 'systems' && <SystemLabPanel />}
              </div>}
            </div>
          </div>
          <InspectorPanel />
        </div>
        {projectHubOpen && <ProjectHub onClose={() => setProjectHubOpen(false)} />}
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#e6edf3', overflow: 'hidden' },
  main: { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' },
  center: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' },
  viewBar: { height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderBottom: '1px solid #21262d', background: '#0f141b' },
  viewTab: { border: 0, background: 'transparent', color: '#8b949e', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  activeView: { background: '#21262d', color: '#e6edf3', fontWeight: 600 },
  canvasWrapper: { flex: 1, minHeight: 180, position: 'relative', overflow: 'hidden' },
  canvasHud: { position: 'absolute', left: 10, bottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'none', opacity: .75 },
  bottomDock: { flexShrink: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #30363d', background: '#161b22', transition: 'height 120ms ease' },
  dockTabs: { height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderBottom: '1px solid #21262d', overflowX: 'auto' },
  tab: { height: 30, padding: '0 12px', border: 0, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  activeTab: { background: '#21262d', color: '#e6edf3', borderBottom: '2px solid #58a6ff' },
  dockButton: { border: 0, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 16 },
};
