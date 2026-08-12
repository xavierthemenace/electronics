import { useState } from 'react';
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
import { ErrorBoundary } from './ErrorBoundary.js';

type BottomTab = 'lesson' | 'code' | 'instruments' | 'communication' | 'breadboard' | 'peripherals' | 'devices';

export function App() {
  const [bottomTab, setBottomTab] = useState<BottomTab>('lesson');
  const [bottomOpen, setBottomOpen] = useState(true);
  const tabs: Array<[BottomTab, string]> = [
    ['lesson', '▣ Learn'], ['code', '⌘ Code'], ['instruments', '◉ Instruments'],
    ['communication', '⇄ Communication'], ['breadboard', '▦ Breadboard'], ['peripherals', '◌ I/O'], ['devices', '⚙ Devices'],
  ];
  return (
    <ErrorBoundary>
      <div style={styles.app}>
        <Toolbar />
        <div style={styles.main}>
          <ComponentPalette />
          <div style={styles.center}>
            <div style={styles.canvasWrapper}>
              <CanvasRenderer />
              <div style={styles.canvasHud}><span>Scroll: zoom</span><span>Space + drag: pan</span><span>Drag pin: wire</span><span>Shift: multi-select</span></div>
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
              </div>}
            </div>
          </div>
          <InspectorPanel />
        </div>
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#e6edf3', overflow: 'hidden' },
  main: { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' },
  center: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' },
  canvasWrapper: { flex: 1, minHeight: 180, position: 'relative', overflow: 'hidden' },
  canvasHud: { position: 'absolute', left: 10, bottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'none', opacity: .75 },
  bottomDock: { flexShrink: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #30363d', background: '#161b22', transition: 'height 120ms ease' },
  dockTabs: { height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderBottom: '1px solid #21262d', overflowX: 'auto' },
  tab: { height: 30, padding: '0 12px', border: 0, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  activeTab: { background: '#21262d', color: '#e6edf3', borderBottom: '2px solid #58a6ff' },
  dockButton: { border: 0, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 16 },
};
