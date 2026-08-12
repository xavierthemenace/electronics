/**
 * Main App component — Layout with toolbar, palette, canvas, and inspector.
 *
 * @module ui/App
 */

import { Toolbar } from './Toolbar.js';
import { ComponentPalette } from './ComponentPalette.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InspectorPanel } from './InspectorPanel.js';

export function App() {
  return (
    <div style={styles.app}>
      <Toolbar />
      <div style={styles.main}>
        <ComponentPalette />
        <div style={styles.canvasWrapper}>
          <CanvasRenderer />
        </div>
        <InspectorPanel />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1117',
    color: '#e6edf3',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};