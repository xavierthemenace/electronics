/**
 * Toolbar — main workspace controls.
 */
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import { useProjectStore } from '../stores/project.js';
import { Button, Divider, Select, Checkbox } from './design/components.js';
import { CSSProperties } from 'react';

const t = {
  colors:{bg:{base:'#0d1117',panel:'#161b22'},border:{subtle:'#21262d',default:'#30363d'},text:{primary:'#e6edf3',secondary:'#8b949e'},accent:{primary:'#58a6ff'},status:{error:'#f85149'}},
  spacing:{sm:'4px',md:'8px',lg:'12px',toolbarHeight:'56px'},
  typography:{fontFamily:{ui:'"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif'},fontSize:{base:'13px',lg:'16px'},fontWeight:{medium:500,semibold:600}},
  radii:{md:'6px'}
};

export function Toolbar({ onOpenProjects, onOpenSettings }: { onOpenProjects?: () => void; onOpenSettings?: () => void }) {
  const { running, runDC, stopSimulation } = useSimulationStore();
  const { canUndo, canRedo, undo, redo, snapToGrid, toggleSnapToGrid, gridSize, setGridSize, resetViewport } = useCircuitStore();
  const { name, modified, newProject, saveProject, exportJSON, setName } = useProjectStore();
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => { const file=e.target.files?.[0]; if(!file)return; useProjectStore.getState().loadProjectFile(file); e.target.value=''; };
  const downloadJSON = (json:string, filename:string) => { const blob=new Blob([json],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); };
  return <div style={styles.toolbar} role="toolbar" aria-label="Main toolbar">
    <div style={styles.group}><Button onClick={onOpenProjects} variant="primary" size="sm" icon="▦" title="Project Hub">Projects</Button><Button onClick={newProject} variant="ghost" size="sm" icon="📄" title="New Project">New</Button><Button onClick={saveProject} variant="ghost" size="sm" icon="💾" title="Save" disabled={!modified}>Save</Button><Button onClick={()=>downloadJSON(exportJSON(),`${name}.circuit.json`)} variant="ghost" size="sm" icon="⬇" title="Export JSON">Export</Button><input type="file" accept=".json,.circuit.json" onChange={handleFileImport} id="file-import" style={{display:'none'}}/><label htmlFor="file-import"><Button variant="ghost" size="sm" icon="⬆" title="Import Project">Import</Button></label></div>
    <Divider orientation="vertical" />
    <div style={styles.group}><Button onClick={undo} disabled={!canUndo()} variant="ghost" size="sm" icon="↶">Undo</Button><Button onClick={redo} disabled={!canRedo()} variant="ghost" size="sm" icon="↷">Redo</Button></div>
    <Divider orientation="vertical" />
    <div style={styles.group}><Button onClick={resetViewport} variant="ghost" size="sm" icon="🎯">Reset View</Button><Checkbox checked={snapToGrid} onChange={toggleSnapToGrid} label="Snap"/><Select options={[{value:'10',label:'10px'},{value:'20',label:'20px'},{value:'40',label:'40px'},{value:'50',label:'50px'}]} value={String(gridSize)} onChange={e=>setGridSize(Number(e.target.value))} fullWidth={false} style={{minWidth:'80px'}}/></div>
    <div style={{flex:1}} />
    <div style={styles.group}><input value={name} onChange={e=>setName(e.target.value)} style={styles.nameInput} aria-label="Project name"/>{modified&&<span style={styles.modified} title="Unsaved changes">●</span>}<Button onClick={onOpenSettings} variant="ghost" size="sm" icon="⚙" title="Settings">Settings</Button></div>
    <div style={styles.group}><Button onClick={running?stopSimulation:runDC} disabled={running} variant={running?'danger':'primary'} size="md" icon={running?'⏹':'▶'} title="Run DC Analysis">{running?'Stop':'Simulate DC'}</Button></div>
  </div>;
}

const styles: Record<string,CSSProperties> = {
  toolbar:{height:t.spacing.toolbarHeight,background:t.colors.bg.panel,borderBottom:`1px solid ${t.colors.border.subtle}`,display:'flex',alignItems:'center',padding:`0 ${t.spacing.lg}`,gap:t.spacing.md,flexWrap:'wrap'},
  group:{display:'flex',alignItems:'center',gap:t.spacing.sm},
  nameInput:{padding:'6px 8px',background:t.colors.bg.base,border:`1px solid ${t.colors.border.default}`,borderRadius:t.radii.md,color:t.colors.text.primary,fontSize:t.typography.fontSize.base,width:170,outline:'none'},
  modified:{color:t.colors.status.error,fontSize:t.typography.fontSize.lg,lineHeight:1},
};
