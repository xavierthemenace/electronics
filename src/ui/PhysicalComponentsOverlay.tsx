import { useEffect, useMemo, useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import type { CircuitComponent } from '../core/model.js';

interface Size { w: number; h: number; }

const sizes: Record<string, Size> = {
  resistor: { w: 72, h: 32 },
  led: { w: 58, h: 58 },
  lcd: { w: 150, h: 82 },
  'lcd-1602': { w: 150, h: 82 },
  'arduino-uno': { w: 190, h: 112 },
  'dc-motor': { w: 68, h: 58 },
  servo: { w: 78, h: 68 },
};

function physicalSize(comp: CircuitComponent): Size {
  return sizes[comp.type] ?? { w: 60, h: 42 };
}

function surfaceStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 2,
  };
}

function hardwareCard(selected: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    boxSizing: 'border-box',
    border: selected ? '2px solid #f78166' : '1px solid rgba(12,18,24,.75)',
    boxShadow: selected ? '0 0 0 2px rgba(247,129,102,.16), 0 8px 18px rgba(0,0,0,.35)' : '0 6px 14px rgba(0,0,0,.3)',
    transformStyle: 'preserve-3d',
  };
}

function Led({ on, selected, scale }: { on: boolean; selected: boolean; scale: number }) {
  const s = 58 * scale;
  return <div style={{ ...hardwareCard(selected), width: s, height: s, borderRadius: '50%', background: 'transparent', boxShadow: on ? `0 0 ${24 * scale}px rgba(255,40,40,.78), 0 0 ${55 * scale}px rgba(255,30,30,.38)` : hardwareCard(selected).boxShadow, }}>
    <div style={{ position: 'absolute', left: s * .19, top: s * .12, width: s * .62, height: s * .7, borderRadius: '50% 50% 46% 46%', background: on ? 'radial-gradient(circle at 35% 28%, #fff6f6 0%, #ff8f8f 14%, #ff2d2d 48%, #9a1010 100%)' : 'radial-gradient(circle at 35% 28%, #f7d8d8 0%, #d66666 20%, #7d1a1a 70%, #461010 100%)', border: '1px solid rgba(70,10,10,.8)' }} />
    <div style={{ position: 'absolute', left: s * .43, top: s * .78, width: 2 * scale, height: s * .22, background: '#c4ccd2' }} />
    <div style={{ position: 'absolute', left: s * .25, top: s * .83, width: 2 * scale, height: s * .16, background: '#c4ccd2' }} />
    {on && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: Math.max(8, 10 * scale), fontWeight: 800, textShadow: '0 1px 2px #600' }}>ON</span>}
  </div>;
}

function Resistor({ value, selected, scale }: { value: number; selected: boolean; scale: number }) {
  const w = 72 * scale, h = 32 * scale;
  return <div style={{ ...hardwareCard(selected), width: w, height: h, borderRadius: 8 * scale, background: 'linear-gradient(180deg,#f5e5bf,#b69262)', }}>
    <div style={{ position: 'absolute', left: -12 * scale, top: h * .46, width: 16 * scale, height: 2 * scale, background: '#b9c4cd' }} />
    <div style={{ position: 'absolute', right: -12 * scale, top: h * .46, width: 16 * scale, height: 2 * scale, background: '#b9c4cd' }} />
    {[.27,.44,.61,.78].map((x,i)=><div key={i} style={{ position:'absolute', left:w*x-2*scale, top:0, width:4*scale, height:h, background:['#7e3d16','#171717','#7e3d16','#d6be78'][i] }} />)}
    <div style={{ position:'absolute', bottom:-14*scale, width:'100%', textAlign:'center', fontSize:Math.max(8,9*scale), color:'#d6dee6', fontFamily:'monospace' }}>{value}Ω</div>
  </div>;
}

function Arduino({ selected, d13On, scale }: { selected: boolean; d13On: boolean; scale: number }) {
  const w=190*scale,h=112*scale;
  return <div style={{ ...hardwareCard(selected), width:w,height:h,borderRadius:8*scale,background:'linear-gradient(145deg,#49a967 0%,#197040 48%,#0f4c2b 100%)',overflow:'visible' }}>
    <div style={{ position:'absolute', left:-12*scale, top:18*scale,width:24*scale,height:22*scale,borderRadius:3*scale,background:'linear-gradient(#c6ccd1,#6d767e)',border:'1px solid #4a5259' }} />
    <div style={{ position:'absolute', left:22*scale, top:26*scale, width:58*scale,height:38*scale,borderRadius:4*scale,background:'#12181d',boxShadow:'inset 0 1px 4px rgba(255,255,255,.08)' }} />
    <div style={{ position:'absolute',left:86*scale,top:34*scale,fontSize:Math.max(9,11*scale),fontWeight:800,color:'#10261a',letterSpacing:.4 }}>ARDUINO UNO</div>
    <div style={{ position:'absolute',left:88*scale,top:52*scale,fontSize:Math.max(7,8*scale),color:'#b8ddc4' }}>ATmega328P</div>
    <div style={{ position:'absolute',right:16*scale,top:18*scale,width:6*scale,height:6*scale,borderRadius:'50%',background:d13On?'#ff4a4a':'#412b2b',boxShadow:d13On?'0 0 10px #ff3434':'none' }} />
    {Array.from({length:10},(_,i)=><div key={`top-${i}`} style={{position:'absolute',left:(24+i*16)*scale,top:-9*scale,width:6*scale,height:12*scale,background:'linear-gradient(90deg,#d8dce0,#7f878e)',borderRadius:2*scale}} />)}
    {Array.from({length:8},(_,i)=><div key={`side-${i}`} style={{position:'absolute',right:-9*scale,top:(16+i*11)*scale,width:12*scale,height:6*scale,background:'linear-gradient(#d8dce0,#7f878e)',borderRadius:2*scale}} />)}
    <div style={{position:'absolute',left:16*scale,bottom:-8*scale,fontSize:Math.max(7,8*scale),color:'#d6eadc'}}>USB • POWER • DIGITAL • ANALOG</div>
  </div>;
}

function LCD({ text, contrast, selected, scale }: { text: string; contrast: number; selected: boolean; scale: number }) {
  const w=150*scale,h=82*scale;
  const row1=text.slice(0,16).padEnd(16,' '), row2=text.slice(16,32).padEnd(16,' ');
  return <div style={{ ...hardwareCard(selected),width:w,height:h,borderRadius:8*scale,background:'linear-gradient(180deg,#d9dde2,#8d97a1)',padding:10*scale }}>
    <div style={{ position:'absolute',left:10*scale,top:10*scale,right:10*scale,height:42*scale,borderRadius:3*scale,background:`linear-gradient(180deg,rgba(115,228,124,${.45+.35*contrast}),rgba(27,76,37,.95))`,boxShadow:`inset 0 0 8px rgba(0,0,0,.55), 0 0 8px rgba(75,255,110,${.12+.2*contrast})` }}>
      <div style={{fontFamily:'monospace',fontSize:Math.max(8,10*scale),lineHeight:16*scale,color:'#8cff9d',textShadow:'0 0 5px rgba(130,255,150,.65)',padding:`4px ${6*scale}px`,whiteSpace:'pre'}}>{row1}<br/>{row2}</div>
    </div>
    <div style={{position:'absolute',left:12*scale,bottom:7*scale,fontSize:Math.max(7,7*scale),fontWeight:800,color:'#3a434b'}}>16×2 CHARACTER LCD</div>
    {Array.from({length:4},(_,i)=><div key={i} style={{position:'absolute',left:(15+i*16)*scale,bottom:-10*scale,width:5*scale,height:12*scale,background:'#ca943c',boxShadow:'0 1px 1px #654'}} />)}
  </div>;
}

function Motor({ speed, selected, scale }: { speed:number; selected:boolean; scale:number }) {
  const w=68*scale,h=58*scale; const angle=performance.now()/1000*(2+speed/100*14);
  return <div style={{ ...hardwareCard(selected),width:w,height:h,borderRadius:8*scale,background:'linear-gradient(180deg,#c9ced4,#747c85)',display:'grid',placeItems:'center' }}>
    <div style={{width:34*scale,height:34*scale,borderRadius:'50%',background:'#8b949e',border:'2px solid #4c535a',position:'relative'}}><div style={{position:'absolute',left:'50%',top:'50%',width:28*scale,height:4*scale,background:'#30373d',transformOrigin:'center',transform:`translate(-50%,-50%) rotate(${angle}rad)`}}/></div>
    <div style={{position:'absolute',bottom:-13*scale,width:'100%',textAlign:'center',fontSize:Math.max(7,8*scale),color:'#d6dee6'}}>{Math.round(speed)}%</div>
  </div>;
}

function Servo({ angle, selected, scale }: { angle:number; selected:boolean; scale:number }) {
  const w=78*scale,h=68*scale; const a=(-90+Math.max(0,Math.min(180,angle)))*Math.PI/180;
  return <div style={{ ...hardwareCard(selected),width:w,height:h,borderRadius:7*scale,background:'linear-gradient(180deg,#343b43,#1e252c)',display:'grid',placeItems:'center' }}>
    <div style={{width:32*scale,height:32*scale,borderRadius:'50%',background:'#707981',border:'1px solid #aab2ba',position:'relative'}}><div style={{position:'absolute',left:'50%',top:'50%',width:25*scale,height:5*scale,background:'#e1e6eb',borderRadius:3*scale,transformOrigin:'left center',transform:`translateY(-50%) rotate(${a}rad)`}} /></div>
    {Array.from({length:3},(_,i)=><div key={i} style={{position:'absolute',left:(12+i*12)*scale,bottom:-7*scale,width:7*scale,height:9*scale,background:['#e6e6e6','#cd9b3b','#d75252'][i],borderRadius:2*scale}} />)}
  </div>;
}

function isPhysical(comp: CircuitComponent): boolean { return Boolean(sizes[comp.type]); }

export function PhysicalComponentsOverlay() {
  const components = useCircuitStore(s=>s.components);
  const selection = useCircuitStore(s=>s.selection);
  const viewport = useCircuitStore(s=>s.viewport);
  const dcResult = useSimulationStore(s=>s.dcResult);
  const arduinoResult = useSimulationStore(s=>s.arduinoResult);
  const [frame,setFrame] = useState(0);

  useEffect(()=>{
    let raf=0; const tick=()=>{ setFrame(v=>v+1); raf=requestAnimationFrame(tick); }; raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf);
  },[]);

  const physical = useMemo(()=>[...components.values()].filter(isPhysical),[components]);
  const transitionOn = (pin:number):boolean => {
    const events = arduinoResult?.state.transitions.filter(t=>t.pin===pin) ?? [];
    if(events.length===0) return Boolean(arduinoResult?.state.digital[pin]);
    const duration=Math.max(100, arduinoResult?.state.elapsedMs ?? 1000);
    const t=(frame*16)%duration;
    let value=events[0].value;
    for(const e of events){ if(e.timeMs<=t) value=e.value; else break; }
    return value===1;
  };

  return <div style={surfaceStyle()} aria-hidden="true">
    {physical.map(comp=>{
      const size=physicalSize(comp); const scale=Math.max(.45,Math.min(2.2,viewport.zoom));
      const x=(comp.position.x-viewport.x)*viewport.zoom, y=(comp.position.y-viewport.y)*viewport.zoom;
      const selected=selection.componentIds.has(comp.id);
      const style:React.CSSProperties={left:x,top:y,width:size.w*scale,height:size.h*scale,transform:'translate(-50%,-50%)',opacity:.99};
      if(comp.type==='led'){
        const current = dcResult && dcResult.ok ? (()=>{ const b=(dcResult.devBranches as any[]).find(d=>d.id===comp.id); return typeof b?.current==='number'?Math.abs(b.current):null; })() : null;
        const brightness=current===null?0:Math.max(0,Math.min(1,current/0.02));
        return <div key={comp.id} style={style}><Led on={brightness>.05 || transitionOn(13)} selected={selected} scale={scale}/></div>;
      }
      if(comp.type==='resistor') return <div key={comp.id} style={style}><Resistor value={Number(comp.params.resistance??220)} selected={selected} scale={scale}/></div>;
      if(comp.type==='lcd-1602') return <div key={comp.id} style={style}><LCD text={arduinoResult?.state.lcd.text || String(comp.params.text??'')} contrast={Number(comp.params.contrast??.5)} selected={selected} scale={scale}/></div>;
      if(comp.type==='arduino-uno') return <div key={comp.id} style={style}><Arduino selected={selected} d13On={transitionOn(13)} scale={scale}/></div>;
      if(comp.type==='dc-motor') return <div key={comp.id} style={style}><Motor speed={Number(comp.params.speed??0)} selected={selected} scale={scale}/></div>;
      if(comp.type==='servo') return <div key={comp.id} style={style}><Servo angle={Number(comp.params.angle??90)} selected={selected} scale={scale}/></div>;
      return null;
    })}
  </div>;
}
