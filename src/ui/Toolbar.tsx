/**
 * Toolbar — Main toolbar with simulation controls, view options, and project actions.
 * Uses design system components and tokens.
 *
 * @module ui/Toolbar
 */

import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { useProjectStore } from '../stores/project.js';
import { Button, Divider, Select, Checkbox } from './design/components.js';
import { CSSProperties } from 'react';

// Token values for inline styles
const t = {
  colors: {
    bg: { base: '#0d1117', panel: '#161b22', elevated: '#21262d', hover: '#30363d' },
    border: { subtle: '#21262d', default: '#30363d', focus: '#58a6ff', error: '#f85149' },
    text: { primary: '#e6edf3', secondary: '#8b949e', tertiary: '#6a737d', inverse: '#0d1117' },
    accent: { primary: '#58a6ff', primaryHover: '#79b8ff', secondary: '#d2a8ff' },
    status: { success: '#3fb950', successBg: '#0d2818', warning: '#d29922', warningBg: '#332800', error: '#f85149', errorBg: '#330d0d', info: '#58a6ff', infoBg: '#0d2833' },
  },
  spacing: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px', toolbarHeight: '56px' },
  typography: { fontFamily: { ui: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif', mono: '"IBM Plex Mono", "SF Mono", monospace' }, fontSize: { xs: '10px', sm: '12px', base: '13px', md: '14px', lg: '16px' }, fontWeight: { normal: 400, medium: 500, semibold: 600 } },
  radii: { sm: '4px', md: '6px', lg: '8px' },
  transitions: { fast: '80ms ease' },
};

const toolbarStyles: Record<string, CSSProperties> = {
  toolbar: {
    height: t.spacing.toolbarHeight,
    background: t.colors.bg.panel,
    borderBottom: `1px solid ${t.colors.border.subtle}`,
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${t.spacing.lg}`,
    gap: t.spacing.md,
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  spacer: { flex: 1 },
  projectName: {
    display: 'flex',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  nameInput: {
    padding: `${t.spacing.sm} ${t.spacing.md}`,
    background: t.colors.bg.base,
    border: `1px solid ${t.colors.border.default}`,
    borderRadius: t.radii.md,
    color: t.colors.text.primary,
    fontSize: t.typography.fontSize.base,
    fontWeight: t.typography.fontWeight.medium,
    fontFamily: t.typography.fontFamily.ui,
    width: '200px',
    outline: 'none',
    transition: `border-color ${t.transitions.fast}`,
  },
  modifiedBadge: {
    color: t.colors.status.error,
    fontSize: t.typography.fontSize.lg,
    lineHeight: 1,
    animation: 'pulse 1s infinite',
  },
};

export function Toolbar() {
  const { running, runDC, stopSimulation } = useSimulationStore();
  const { canUndo, canRedo, undo, redo, snapToGrid, toggleSnapToGrid, gridSize, setGridSize, resetViewport } = useCircuitStore();
  const { name, modified, newProject, saveProject, exportJSON, setName } = useProjectStore();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { loadProjectFile } = useProjectStore.getState();
    loadProjectFile(file);
    e.target.value = '';
  };

  const downloadJSON = (json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={toolbarStyles.toolbar} role="toolbar" aria-label="Main toolbar">
      {/* Project actions */}
      <div style={toolbarStyles.group} role="group" aria-label="Project actions">
        <Button onClick={newProject} variant="ghost" size="sm" icon="📄" title="New Project (Ctrl+N)">
          New
        </Button>
        <Button onClick={saveProject} variant="ghost" size="sm" icon="💾" title="Save (Ctrl+S)" disabled={!modified}>
          Save
        </Button>
        <Button onClick={() => downloadJSON(exportJSON(), `${name}.circuit.json`)} variant="ghost" size="sm" icon="⬇" title="Export JSON">
          Export
        </Button>
        <input
          type="file"
          accept=".json,.circuit.json"
          onChange={handleFileImport}
          id="file-import"
          style={{ display: 'none' }}
        />
        <label htmlFor="file-import">
          <Button variant="ghost" size="sm" icon="⬆" title="Import Project">
            Import
          </Button>
        </label>
      </div>

      <Divider orientation="vertical" />

      {/* Edit actions */}
      <div style={toolbarStyles.group} role="group" aria-label="Edit actions">
        <Button onClick={undo} disabled={!canUndo()} variant="ghost" size="sm" icon="↶" title="Undo (Ctrl+Z)">
          Undo
        </Button>
        <Button onClick={redo} disabled={!canRedo()} variant="ghost" size="sm" icon="↷" title="Redo (Ctrl+Shift+Z)">
          Redo
        </Button>
      </div>

      <Divider orientation="vertical" />

      {/* View options */}
      <div style={toolbarStyles.group} role="group" aria-label="View options">
        <Button onClick={resetViewport} variant="ghost" size="sm" icon="🎯" title="Reset View (Home)">
          Reset View
        </Button>

        <Checkbox
          checked={snapToGrid}
          onChange={toggleSnapToGrid}
          label="Snap to Grid"
        />

        <Select
          options={[
            { value: '10', label: '10px' },
            { value: '20', label: '20px' },
            { value: '40', label: '40px' },
            { value: '50', label: '50px' },
          ]}
          value={String(gridSize)}
          onChange={(e) => setGridSize(Number(e.target.value))}
          fullWidth={false}
          style={{ minWidth: '100px' }}
        />
      </div>

      <div style={toolbarStyles.spacer} />

      {/* Project name */}
      <div style={toolbarStyles.projectName}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={toolbarStyles.nameInput}
          placeholder="Project name"
          aria-label="Project name"
        />
        {modified && <span style={toolbarStyles.modifiedBadge} title="Unsaved changes" aria-label="Unsaved changes">●</span>}
      </div>

      <div style={toolbarStyles.spacer} />

      {/* Simulation controls */}
      <div style={toolbarStyles.group} role="group" aria-label="Simulation">
        <Button
          onClick={running ? stopSimulation : runDC}
          disabled={running}
          variant={running ? 'danger' : 'primary'}
          size="md"
          icon={running ? '⏹' : '▶'}
          title={running ? 'Stop Simulation' : 'Run DC Analysis (F5)'}
        >
          {running ? 'Stop' : 'Simulate DC'}
        </Button>
      </div>
    </div>
  );
}