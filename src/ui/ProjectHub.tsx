import { useState } from 'react';
import { useProjectStore } from '../stores/project.js';
import { useCircuitStore } from '../stores/circuit.js';
import { useBreadboardStore } from '../stores/breadboard.js';
import { useCodeStore, DEFAULT_ARDUINO_CODE } from '../stores/code.js';
import { ledArduinoTemplate, i2cSensorDisplayTemplate, closedLoopMotorTemplate, multiDeviceSystemTemplate } from '../core/templates.js';

const templates = [
  ['Arduino LED', 'GPIO → resistor → LED', ledArduinoTemplate],
  ['I²C Sensor + Display', 'Sensor + MCU + LCD', i2cSensorDisplayTemplate],
  ['Closed-Loop Motor', 'PWM + sensor + feedback', closedLoopMotorTemplate],
  ['Multi-Device System', 'I²C + SPI peripherals', multiDeviceSystemTemplate],
];

export function ProjectHub({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { setName } = useProjectStore();
  const create = (factory: () => ReturnType<typeof ledArduinoTemplate>) => {
    const proj = factory();
    useCircuitStore.getState().loadProject(proj);
    useBreadboardStore.getState().reset();
    useCodeStore.getState().loadSourceCode(proj.sourceCode || DEFAULT_ARDUINO_CODE);
    setName(proj.name);
    onClose();
  };
  const filtered = templates.filter(([name, desc]) => `${name} ${desc}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-label="Project hub">
      <div style={styles.modal}>
        <div style={styles.header}><div><h2 style={styles.title}>Project Hub</h2><div style={styles.sub}>Start a system, or continue with the current workspace.</div></div><button style={styles.close} onClick={onClose}>×</button></div>
        <input autoFocus placeholder="Search templates..." value={query} onChange={e => setQuery(e.target.value)} style={styles.search} />
        <div style={styles.grid}>
          {filtered.map(([name, desc, factory]) => <button key={name as string} style={styles.card} onClick={() => create(factory as () => ReturnType<typeof ledArduinoTemplate>)}><div style={styles.cardTitle}>{name as string}</div><div style={styles.cardDesc}>{desc as string}</div><span style={styles.launch}>Open template →</span></button>)}
          <button style={styles.card} onClick={() => { useProjectStore.getState().newProject(); onClose(); }}><div style={styles.cardTitle}>Blank Lab</div><div style={styles.cardDesc}>Start from an empty workbench.</div><span style={styles.launch}>New project →</span></button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop:{position:'fixed',inset:0,zIndex:20,display:'grid',placeItems:'center',background:'#000b'},
  modal:{width:'min(860px,92vw)',maxHeight:'86vh',overflow:'auto',background:'#161b22',border:'1px solid #30363d',borderRadius:12,boxShadow:'0 24px 80px #0009',padding:20,color:'#e6edf3'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}, title:{margin:0,fontSize:22}, sub:{color:'#8b949e',marginTop:5}, close:{border:0,background:'transparent',color:'#8b949e',fontSize:26,cursor:'pointer'}, search:{width:'100%',boxSizing:'border-box',padding:'10px 12px',background:'#0d1117',color:'#e6edf3',border:'1px solid #30363d',borderRadius:7,marginBottom:16}, grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}, card:{textAlign:'left',background:'#0d1117',border:'1px solid #30363d',borderRadius:9,padding:14,color:'#e6edf3',cursor:'pointer',minHeight:120}, cardTitle:{fontWeight:700,fontSize:15,marginBottom:8}, cardDesc:{color:'#8b949e',lineHeight:1.45}, launch:{display:'block',marginTop:16,color:'#58a6ff',fontSize:12,fontWeight:600}
};
