import { useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { ComponentPalette } from './ComponentPalette.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InspectorPanel } from './InspectorPanel.js';
import { CodeEditor } from './CodeEditor.js';
import { InstrumentPanel } from './InstrumentPanel.js';
import { ErrorBoundary } from './ErrorBoundary.js';

export function App() {
  const [bottomTab, setBottomTab] = useState<'code' | 'instruments'>('code');
  const [bottomOpen, setBottomOpen] = useState(true);

  return (
    <ErrorBoundary>
      <div style={styles.app}>
        <Toolbar />
        <div style={styles.main}>
          <ComponentPalette />
          <div style={styles.center}>
            <div style={styles.canvasWrapper}>
              <CanvasRenderer />
              <div style={styles.canvasHud}>
                <span>Scroll: zoom</span><span>Space + drag: pan</span><span>Drag pin: wire</span><span>Shift: multi-select</span>
              </div>
            </div>
            <div style={{ ...styles.bottomDock, height: bottomOpen ? 300 : 38 }}>
              <div style={styles.dockTabs}>
                <button style={styles.tab(bottomTab === 'code')} onClick={() => { setBottomTab('code'); setBottomOpen(true); }}>⌘ Code</button>
                <button style={styles.tab(bottomTab === 'instruments')} onClick={() => { setBottomTab('instruments'); setBottomOpen(true); }}>◉ Instruments</button>
                <div style={{ flex: 1 }} />
                <button style={styles.dockButton} onClick={() => setBottomOpen(v => !v)}>{bottomOpen ? '⌄' : '⌃'}</button>
              </div>
              {bottomOpen && <div style={{ flex: 1, minHeight: 0 }}>{bottomTab === 'code' ? <CodeEditor /> : <InstrumentPanel />}</div>}
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
  dockTabs: { height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderBottom: '1px solid #21262d' },
  tab: (active: boolean): React.CSSProperties => ({ height: 30, padding: '0 12px', border: 0, borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent', background: active ? '#21262d' : 'transparent', color: active ? '#e6edf3' : '#8b949e', cursor: 'pointer', fontSize: 12 }),
  dockButton: { border: 0, background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 16 },
};
