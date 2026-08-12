import { useEffect, useMemo, useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import type { CircuitComponent } from '../core/model.js';

interface Size { w: number; h: number; }
const sizes: Record<string, Size> = {
  resistor: { w: 72, h: 34 }, led: { w: 58, h: 58 }, capacitor: { w: 54, h: 44 }, inductor: { w: 68, h: 34 },
  potentiometer: { w: 70, h: 54 }, diode: { w: 56, h: 32 }, zener: { w: 56, h: 32 }, 'bjt-npn': { w: 58, h: 58 }, 'mosfet-n': { w: 62, h: 58 },
  and: { w: 82, h: 52 }, not: { w: 74, h: 48 }, 'dc-source': { w: 64, h: 46 }, ground: { w: 46, h: 42 },
  'arduino-uno': { w: 190, h: 112 }, 'analog-sensor': { w: 74, h: 62 }, pushbutton: { w: 60, h: 60 },
  'dc-motor': { w: 70, h: 60 }, servo: { w: 82, h: 70 }, 'lcd-1602': { w: 154, h: 86 },
  'i2c-temp': { w: 78, h: 58 }, 'i2c-eeprom': { w: 78, h: 58 }, 'spi-dac': { w: 84, h: 62 }, 'spi-flash': { w: 84, h: 62 },
};

function physicalSize(comp: CircuitComponent): Size { return sizes[comp.type] ?? { w: 64, h: 44 }; }
const surfaceStyle: React.CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 };
function card(selected: boolean): React.CSSProperties {
  return { position: 'absolute', boxSizing: 'border-box', border: selected ? '2px solid #f78166' : '1px solid rgba(12,18,24,.75)', boxShadow: selected ? '0 0 0 2px rgba(247,129,102,.16), 0 8px 18px rgba(0,0,0,.35)' : '0 6px 14px rgba(0,0,0,.3)', transformStyle: 'preserve-3d' };
}

function HardwareLabel({ children, scale }: { children: React.ReactNode; scale: number }) {
  return <div style={{ position: 'absolute', left: 0, right: 0, bottom: -15 * scale, textAlign: 'center', color: '#d6dee6', fontFamily: 'monospace', fontSize: Math.max(7, 9 * scale), whiteSpace: 'nowrap' }}>{children}</div>;
}

function Generic({ comp, selected, scale, state }: { comp: CircuitComponent; selected: boolean; scale: number; state?: string }) {
  const s = physicalSize(comp); const w = s.w * scale; const h = s.h * scale;
  const palette: Record<string, [string, string]> = {
    capacitor: ['#a9b2bb', '#5e6973'], inductor: ['#b36a34', '#4d2c16'], potentiometer: ['#33414c', '#121820'], diode: ['#26313a', '#141b21'],
    zener: ['#202a33', '#0d141a'], 'bjt-npn': ['#2d3238', '#0e1418'], 'mosfet-n': ['#252c33', '#0c1116'], and: ['#20262d', '#0b0f13'], not: ['#20262d', '#0b0f13'],
    'dc-source': ['#c9ced4', '#68727b'], ground: ['#4e5962', '#1d242a'], 'analog-sensor': ['#4d8bc0', '#19344f'], pushbutton: ['#d6d9dd', '#6b737b'],
    'i2c-temp': ['#202a31', '#0c1217'], 'i2c-eeprom': ['#202a31', '#0c1217'], 'spi-dac': ['#2d5f82', '#122638'], 'spi-flash': ['#252f39', '#0d141b'],
  };
  const [top, bottom] = palette[comp.type] ?? ['#343b43', '#171c22'];
  return <div style={{ ...card(selected), width: w, height: h, borderRadius: 7 * scale, background: `linear-gradient(145deg,${top},${bottom})`, display: 'grid', placeItems: 'center' }}>
    <div style={{ width: w * .62, height: h * .42, borderRadius: 5 * scale, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', color: '#e6edf3', fontWeight: 800, fontSize: Math.max(8, 10 * scale) }}>{state ?? comp.type.toUpperCase()}</div>
    <HardwareLabel scale={scale}>{comp.type}</HardwareLabel>
  </div>;
}

function Led({ brightness, selected, scale }: { brightness: number; selected: boolean; scale: number }) {
  const on = brightness > .03; const s = 58 * scale;
  return <div style={{ ...card(selected), width: s, height: s, borderRadius: '50%', background: 'transparent', boxShadow: on ? `0 0 ${24 * scale}px rgba(255,40,40,.78), 0 0 ${55 * scale}px rgba(255,30,30,.38)` : card(selected).boxShadow }}>
    <div style={{ position: 'absolute', left: s * .19, top: s * .12, width: s * .62, height: s * .7, borderRadius: '50% 50% 46% 46%', background: on ? 'radial-gradient(circle at 35% 28%, #fff6f6 0%, #ff8f8f 14%, #ff2d2d 48%, #9a1010 100%)' : 'radial-gradient(circle at 35% 28%, #f7d8d8 0%, #d66666 20%, #7d1a1a 70%, #461010 100%)', border: '1px solid rgba(70,10,10,.8)' }} />
    <div style={{ position: 'absolute', left: s * .43, top: s * .77, width: 2 * scale, height: s * .22, background: '#c4ccd2' }} />
    <div style={{ position: 'absolute', left: s * .25, top: s * .82, width: 2 * scale, height: s * .16, background: '#c4ccd2' }} />
    {on && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: Math.max(8, 10 * scale), fontWeight: 800, textShadow: '0 1px 2px #600' }}>ON</span>}
    <HardwareLabel scale={scale}>LED</HardwareLabel>
  </div>;
}

function Resistor({ value, selected, scale }: { value: number; selected: boolean; scale: number }) {
  const w = 72 * scale, h = 34 * scale;
  return <div style={{ ...card(selected), width: w, height: h, borderRadius: 8 * scale, background: 'linear-gradient(180deg,#f5e5bf,#b69262)' }}>
    <div style={{ position: 'absolute', left: -12 * scale, top: h * .46, width: 16 * scale, height: 2 * scale, background: '#b9c4cd' }} />
    <div style={{ position: 'absolute', right: -12 * scale, top: h * .46, width: 16 * scale, height: 2 * scale, background: '#b9c4cd' }} />
    {[.27,.44,.61,.78].map((x,i)=><div key={i} style={{ position:'absolute', left:w*x-2*scale, top:0, width:4*scale, height:h, background:['#7e3d16','#171717','#7e3d16','#d6be78'][i] }} />)}
    <HardwareLabel scale={scale}>{value}Ω</HardwareLabel>
  </div>;
}

function Arduino({ selected, d13On, scale }: { selected: boolean; d13On: boolean; scale: number }) {
  const w=190*scale,h=112*scale;
  return <div style={{ ...card(selected), width:w,height:h,borderRadius:8*scale,background:'linear-gradient(145deg,#49a967 0%,#197040 48%,#0f4c2b 100%)',overflow:'visible' }}>
    <div style={{ position:'absolute', left:-12*scale, top:18*scale,width:24*scale,height:22*scale,borderRadius:3*scale,background:'linear-gradient(#c6ccd1,#6d767e)',border:'1px solid #4a5259' }} />
    <div style={{ position:'absolute', left:22*scale, top:26*scale, width:58*scale,height:38*scale,borderRadius:4*scale,background:'#12181d' }} />
    <div style={{ position:'absolute',left:86*scale,top:34*scale,fontSize:Math.max(9,11*scale),fontWeight:800,color:'#10261a' }}>ARDUINO UNO</div>
    <div style={{ position:'absolute',left:88*scale,top:52*scale,fontSize:Math.max(7,8*scale),color:'#b8ddc4' }}>ATmega328P</div>
    <div style={{ position:'absolute',right:16*scale,top:18*scale,width:6*scale,height:6*scale,borderRadius:'50%',background:d13On?'#ff4a4a':'#412b2b',boxShadow:d13On?'0 0 10px #ff3434':'none' }} />
    {Array.from({length:10},(_,i)=><div key={`t-${i}`} style={{position:'absolute',left:(24+i*16)*scale,top:-9*scale,width:6*scale,height:12*scale,background:'linear-gradient(90deg,#d8dce0,#7f878e)',borderRadius:2*scale}} />)}
    {Array.from({length:8},(_,i)=><div key={`s-${i}`} style={{position:'absolute',right:-9*scale,top:(16+i*11)*scale,width:12*scale,height:6*scale,background:'linear-gradient(#d8dce0,#7f878e)',borderRadius:2*scale}} />)}
    <HardwareLabel scale={scale}>Arduino Uno</HardwareLabel>
  </div>;
}

function LCD({ text, contrast, selected, scale }: { text: string; contrast: number; selected: boolean; scale: number }) {
  const w=154*scale,h=86*scale; const row1=text.slice(0,16).padEnd(16,' '), row2=text.slice(16,32).padEnd(16,' ');
  return <div style={{ ...card(selected),width:w,height:h,borderRadius:8*scale,background:'linear-gradient(180deg,#d9dde2,#8d97a1)',padding:10*scale }}>
    <div style={{ position:'absolute',left:10*scale,top:10*scale,right:10*scale,height:44*scale,borderRadius:3*scale,background:`linear-gradient(180deg,rgba(115,228,124,${.45+.35*contrast}),rgba(27,76,37,.95))`,boxShadow:`inset 0 0 8px rgba(0,0,0,.55), 0 0 8px rgba(75,255,110,${.12+.2*contrast})` }}>
      <div style={{fontFamily:'monospace',fontSize:Math.max(8,10*scale),lineHeight:16*scale,color:'#8cff9d',textShadow:'0 0 5px rgba(130,255,150,.65)',padding:`4px ${6*scale}px`,whiteSpace:'pre'}}>{row1}<br/>{row2}</div>
    </div>
    {Array.from({length:4},(_,i)=><div key={i} style={{position:'absolute',left:(15+i*16)*scale,bottom:-10*scale,width:5*scale,height:12*scale,background:'#ca943c'}} />)}
    <HardwareLabel scale={scale}>16×2 LCD</HardwareLabel>
  </div>;
}

function Motor({ speed, selected, scale }: { speed:number; selected:boolean; scale:number }) {
  const w=70*scale,h=60*scale; const [angle,setAngle]=useState(0);
  useEffect(()=>{ let raf=0; const loop=()=>{setAngle(a=>a+0.08*(1+speed/10));raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[speed]);
  return <div style={{ ...card(selected),width:w,height:h,borderRadius:8*scale,background:'linear-gradient(180deg,#c9ced4,#747c85)',display:'grid',placeItems:'center' }}><div style={{width:34*scale,height:34*scale,borderRadius:'50%',background:'#8b949e',border:'2px solid #4c535a',position:'relative'}}><div style={{position:'absolute',left:'50%',top:'50%',width:28*scale,height:4*scale,background:'#30373d',transformOrigin:'center',transform:`translate(-50%,-50%) rotate(${angle}rad)`}}/></div><HardwareLabel scale={scale}>{Math.round(speed)}%</HardwareLabel></div>;
}

function Servo({ angle, selected, scale }: { angle:number; selected:boolean; scale:number }) {
  const w=82*scale,h=70*scale; const a=(-90+Math.max(0,Math.min(180,angle)))*Math.PI/180;
  return <div style={{ ...card(selected),width:w,height:h,borderRadius:7*scale,background:'linear-gradient(180deg,#343b43,#1e252c)',display:'grid',placeItems:'center' }}><div style={{width:32*scale,height:32*scale,borderRadius:'50%',background:'#707981',border:'1px solid #aab2ba',position:'relative'}}><div style={{position:'absolute',left:'50%',top:'50%',width:25*scale,height:5*scale,background:'#e1e6eb',borderRadius:3*scale,transformOrigin:'left center',transform:`translateY(-50%) rotate(${a}rad)`}} /></div>{Array.from({length:3},(_,i)=><div key={i} style={{position:'absolute',left:(12+i*12)*scale,bottom:-7*scale,width:7*scale,height:9*scale,background:['#e6e6e6','#cd9b3b','#d75252'][i],borderRadius:2*scale}} />)}<HardwareLabel scale={scale}>Servo</HardwareLabel></div>;
}

function isPhysical(comp: CircuitComponent): boolean { return Boolean(sizes[comp.type]); }

export function PhysicalComponentsOverlay() {
  const components = useCircuitStore(s=>s.components);
  const selection = useCircuitStore(s=>s.selection);
  const viewport = useCircuitStore(s=>s.viewport);
  const dcResult = useSimulationStore(s=>s.dcResult);
  const arduinoResult = useSimulationStore(s=>s.arduinoResult);
  const [frame,setFrame] = useState(0);
  useEffect(()=>{let raf=0;const tick=()=>{setFrame(v=>v+1);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[]);

  const physical = useMemo(()=>[...components.values()].filter(isPhysical),[components]);
  const transitionOn = (pin:number):boolean => {
    const events=arduinoResult?.state.transitions.filter(t=>t.pin===pin)??[];
    if(!events.length) return Boolean(arduinoResult?.state.digital[pin]);
    const duration=Math.max(100,arduinoResult?.state.elapsedMs??1000); const t=(frame*16)%duration; let value=events[0].value;
    for(const e of events){if(e.timeMs<=t)value=e.value;else break} return value===1;
  };
  return <div style={surfaceStyle} aria-hidden="true">
    {physical.map(comp=>{
      const size=physicalSize(comp),scale=Math.max(.45,Math.min(2.2,viewport.zoom));
      const x=(comp.position.x-viewport.x)*viewport.zoom,y=(comp.position.y-viewport.y)*viewport.zoom;
      const selected=selection.componentIds.has(comp.id); const style:React.CSSProperties={left:x,top:y,width:size.w*scale,height:size.h*scale,transform:'translate(-50%,-50%)',opacity:.99};
      if(comp.type==='led'){
        const result=dcResult?.devBranches.find(d=>d.compId===comp.id); const current=Math.abs(result?.current??0); const brightness=Math.max(0,Math.min(1,current/0.02));
        return <div key={comp.id} style={style}><Led brightness={Math.max(brightness,transitionOn(13)?1:0)} selected={selected} scale={scale}/></div>;
      }
      if(comp.type==='resistor') return <div key={comp.id} style={style}><Resistor value={Number(comp.params.resistance??220)} selected={selected} scale={scale}/></div>;
      if(comp.type==='lcd-1602') return <div key={comp.id} style={style}><LCD text={arduinoResult?.state.lcd.text||String(comp.params.text??'')} contrast={Number(comp.params.contrast??.5)} selected={selected} scale={scale}/></div>;
      if(comp.type==='arduino-uno') return <div key={comp.id} style={style}><Arduino selected={selected} d13On={transitionOn(13)} scale={scale}/></div>;
      if(comp.type==='dc-motor') return <div key={comp.id} style={style}><Motor speed={Number(comp.params.speed??0)} selected={selected} scale={scale}/></div>;
      if(comp.type==='servo') return <div key={comp.id} style={style}><Servo angle={Number(comp.params.angle??90)} selected={selected} scale={scale}/></div>;
      return <div key={comp.id} style={style}><Generic comp={comp} selected={selected} scale={scale} state={comp.type==='pushbutton'?(Boolean(comp.params.pressed)?'PRESSED':'RELEASED'):undefined}/></div>;
    })}
  </div>;
}
