import { useEffect, useState } from 'react';

interface Settings { showHud: boolean; compactPanels: boolean; confirmDestructive: boolean; autoSave: boolean; simulationPrecision: 'standard'|'high'; }
const defaults: Settings = { showHud: true, compactPanels: false, confirmDestructive: true, autoSave: true, simulationPrecision: 'standard' };
const key = 'electronics-mastery-settings';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return defaults; } });
  const update = <K extends keyof Settings>(name: K, value: Settings[K]) => setSettings(s => ({ ...s, [name]: value }));
  useEffect(() => { localStorage.setItem(key, JSON.stringify(settings)); window.dispatchEvent(new CustomEvent('electronics-settings', { detail: settings })); }, [settings]);
  return <div style={styles.backdrop} role="dialog" aria-modal="true" aria-label="Settings">
    <div style={styles.modal}><div style={styles.head}><div><h2 style={styles.title}>Settings</h2><div style={styles.sub}>Workbench preferences are stored locally in this browser.</div></div><button onClick={onClose} style={styles.close}>×</button></div>
      <section style={styles.section}><h3>Workbench</h3>
        <label style={styles.row}><span>Show canvas help HUD</span><input type="checkbox" checked={settings.showHud} onChange={e=>update('showHud',e.target.checked)} /></label>
        <label style={styles.row}><span>Compact panels</span><input type="checkbox" checked={settings.compactPanels} onChange={e=>update('compactPanels',e.target.checked)} /></label>
        <label style={styles.row}><span>Confirm destructive actions</span><input type="checkbox" checked={settings.confirmDestructive} onChange={e=>update('confirmDestructive',e.target.checked)} /></label>
      </section>
      <section style={styles.section}><h3>Persistence</h3>
        <label style={styles.row}><span>Autosave browser backup</span><input type="checkbox" checked={settings.autoSave} onChange={e=>update('autoSave',e.target.checked)} /></label>
      </section>
      <section style={styles.section}><h3>Simulation</h3>
        <label style={styles.row}><span>Numerical precision</span>
          <select aria-label="Numerical precision" value={settings.simulationPrecision} onChange={e=>update('simulationPrecision',e.target.value as Settings['simulationPrecision'])} style={styles.select}>
            <option value="standard">Standard</option>
            <option value="high">High</option>
          </select>
        </label>
      </section>
      <button onClick={()=>{localStorage.removeItem(key);setSettings(defaults)}} style={styles.reset}>Reset defaults</button>
    </div>
  </div>;
}
const styles: Record<string, React.CSSProperties> = {backdrop:{position:'fixed',inset:0,zIndex:21,display:'grid',placeItems:'center',background:'#000b'},modal:{width:'min(620px,92vw)',background:'#161b22',border:'1px solid #30363d',borderRadius:12,padding:20,color:'#e6edf3',boxShadow:'0 24px 80px #0009'},head:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'},title:{margin:0},sub:{color:'#8b949e',marginTop:5,fontSize:12},close:{background:'transparent',border:0,color:'#8b949e',fontSize:26,cursor:'pointer'},section:{borderTop:'1px solid #30363d',marginTop:18,paddingTop:14},row:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',color:'#c9d1d9'},select:{marginLeft:12,background:'#0d1117',color:'#e6edf3',border:'1px solid #30363d',padding:'6px',borderRadius:5},reset:{marginTop:18,border:'1px solid #6e2626',background:'#2d1111',color:'#ffb4ae',padding:'8px 12px',borderRadius:6,cursor:'pointer'}};
