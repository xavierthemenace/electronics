import "./style.css";

const state = {
  running: false,
  selected: null,
  nextId: 1,
  components: [],
  wires: [],
  pins: {},
  digital: {},
  analog: {},
  serial: [],
  console: [],
  lesson: "LED + Resistor",
  code: `// Electronics Mastery Lab
// Try the LED lesson first.

void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`
};

const lessons = {
  "LED + Resistor": {
    description: "Build a safe GPIO-driven LED circuit.",
    starter: [
      {type:"arduino", x:260, y:190},
      {type:"resistor", x:540, y:170, value:"220Ω"},
      {type:"led", x:690, y:170, color:"red"},
      {type:"ground", x:690, y:300}
    ]
  },
  "Button Input": {
    description: "Read a pushbutton and control an LED.",
    starter: [
      {type:"arduino", x:260, y:180},
      {type:"button", x:520, y:130},
      {type:"led", x:700, y:210, color:"green"},
      {type:"resistor", x:540, y:280, value:"10kΩ"},
      {type:"ground", x:700, y:340}
    ]
  },
  "Analog Sensor": {
    description: "Explore ADC values and voltage-to-code conversion.",
    starter: [
      {type:"arduino", x:250, y:190},
      {type:"pot", x:520, y:160, value:"10kΩ"},
      {type:"ground", x:700, y:330}
    ]
  },
  "Motor Driver": {
    description: "Switch an inductive load with a transistor and flyback diode.",
    starter: [
      {type:"arduino", x:230, y:180},
      {type:"mosfet", x:520, y:180},
      {type:"motor", x:700, y:120},
      {type:"diode", x:700, y:240},
      {type:"ground", x:700, y:340}
    ]
  }
};

const app = document.querySelector("#app");
app.innerHTML = `
<div class="app">
  <header class="topbar">
    <div class="logo">Electronics <span>Mastery Lab</span></div>
    <select id="lesson"></select>
    <div class="status" id="lessonDesc"></div>
    <div class="actions">
      <button class="btn" id="newBtn">New</button>
      <button class="btn" id="runBtn">▶ Run</button>
      <button class="btn danger" id="stopBtn">■ Stop</button>
      <button class="btn primary" id="quizBtn">Check Challenge</button>
    </div>
  </header>
  <div class="workspace">
    <aside class="sidebar">
      <div class="section-title">Components</div>
      <div id="components"></div>
      <div class="section-title">Tools</div>
      <div class="component" data-tool="wire"><strong>Wire</strong><small>Click two component pins</small></div>
      <div class="component" data-tool="select"><strong>Select</strong><small>Inspect / move components</small></div>
      <div class="section-title">Learning</div>
      <div class="component"><strong>Measurement</strong><small>Use the scope/meter in the next version.</small></div>
      <div class="component"><strong>Fault injection</strong><small>Open wires, shorts and bad values.</small></div>
    </aside>

    <main class="main">
      <div class="toolbar">
        <button class="btn" id="zoomIn">＋</button><button class="btn" id="zoomOut">－</button>
        <button class="btn" id="clearWires">Clear wires</button>
        <span class="status" id="simStatus">Stopped</span>
      </div>
      <div class="canvas-wrap"><canvas id="board"></canvas></div>
      <div class="console" id="console"></div>
    </main>

    <aside class="sidebar right">
      <div class="panel">
        <div class="panel-head"><span>Code Editor</span><span class="badge">Arduino-style</span></div>
        <div class="panel-body">
          <textarea class="code" id="code"></textarea>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">Inspector</div>
        <div class="panel-body" id="inspector"><span class="status">Select a component.</span></div>
      </div>
      <div class="panel">
        <div class="panel-head">Simulation State</div>
        <div class="panel-body" id="statePanel"></div>
      </div>
    </aside>
  </div>
  <footer class="footer">Prototype simulator • Component placement + wiring + Arduino-style execution • Designed for the Electronics Mastery curriculum</footer>
</div>
<div class="modal" id="modal"><div class="modal-card"><h2>Lesson Challenge</h2><div id="challenge"></div><button class="btn primary" id="closeQuiz">Close</button></div></div>
`;

const board = document.querySelector("#board");
const ctx = board.getContext("2d");
const code = document.querySelector("#code");
const lessonSelect = document.querySelector("#lesson");
const componentsEl = document.querySelector("#components");
const consoleEl = document.querySelector("#console");

Object.keys(lessons).forEach(k => {
  const o = document.createElement("option"); o.value=k; o.textContent=k; lessonSelect.appendChild(o);
});

const palette = [
  ["arduino","Arduino/MCU","Digital I/O, ADC, timers"],
  ["resistor","Resistor","Limit current / divide voltage"],
  ["led","LED","Indicator / diode"],
  ["button","Pushbutton","Digital input"],
  ["pot","Potentiometer","Variable analog voltage"],
  ["capacitor","Capacitor","Filtering / energy storage"],
  ["diode","Diode","Rectification / flyback"],
  ["mosfet","MOSFET","Low-side power switch"],
  ["motor","DC Motor","Inductive actuator"],
  ["sensor","Analog Sensor","Sensor voltage output"],
  ["ground","GND","Reference / return"]
];

palette.forEach(([type,name,desc]) => {
  const el=document.createElement("div"); el.className="component"; el.draggable=true;
  el.dataset.type=type; el.innerHTML=`<strong>${name}</strong><small>${desc}</small>`;
  el.addEventListener("dragstart",e=>e.dataTransfer.setData("type",type));
  componentsEl.appendChild(el);
});

function resize(){ board.width=board.clientWidth*devicePixelRatio; board.height=board.clientHeight*devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); draw(); }
window.addEventListener("resize",resize);

function log(msg, cls=""){ state.console.push([new Date().toLocaleTimeString(),msg,cls]); state.console=state.console.slice(-80); consoleEl.innerHTML=state.console.map(x=>`<div class="console-line ${x[2]}">[${x[0]}] ${x[1]}</div>`).join(""); consoleEl.scrollTop=consoleEl.scrollHeight; }

function resetLesson(name=lessonSelect.value){
  state.components = lessons[name].starter.map(x=>({...x,id:state.nextId++}));
  state.wires=[]; state.selected=null; state.digital={}; state.analog={}; state.running=false;
  state.console=[]; code.value=defaultCode(name); updateUI(); draw(); log(`Loaded lesson: ${name}`,"ok");
}
function defaultCode(name){
 if(name==="Button Input") return `void setup() {\\n  pinMode(2, INPUT_PULLUP);\\n  pinMode(13, OUTPUT);\\n}\\n\\nvoid loop() {\\n  int pressed = digitalRead(2) == LOW;\\n  digitalWrite(13, pressed ? HIGH : LOW);\\n}`;
 if(name==="Analog Sensor") return `void setup() {\\n  Serial.begin(9600);\\n}\\n\\nvoid loop() {\\n  int value = analogRead(A0);\\n  Serial.println(value);\\n  delay(200);\\n}`;
 if(name==="Motor Driver") return `void setup() {\\n  pinMode(9, OUTPUT);\\n}\\n\\nvoid loop() {\\n  analogWrite(9, 180);\\n  delay(1000);\\n  analogWrite(9, 0);\\n  delay(1000);\\n}`;
 return state.code;
}

function draw(){
  const w=board.clientWidth,h=board.clientHeight; ctx.clearRect(0,0,w,h);
  state.wires.forEach(wire=>{
    const a=state.components.find(c=>c.id===wire.a.c), b=state.components.find(c=>c.id===wire.b.c);
    if(!a||!b)return; const pa=pinPos(a,wire.a.p), pb=pinPos(b,wire.b.p);
    ctx.strokeStyle="#35d0ba";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo((pa.x+pb.x)/2,pa.y);ctx.lineTo((pa.x+pb.x)/2,pb.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
  });
  state.components.forEach(c=>drawComponent(c));
}

function drawComponent(c){
  const x=c.x,y=c.y, selected=state.selected===c.id;
  ctx.save(); ctx.translate(x,y); ctx.strokeStyle=selected?"#58a6ff":"#7d8996"; ctx.fillStyle="#18212b"; ctx.lineWidth=selected?3:2;
  const box={arduino:[180,100],resistor:[100,45],led:[70,45],button:[80,45],pot:[90,60],capacitor:[80,45],diode:[80,45],mosfet:[90,60],motor:[85,60],sensor:[100,55],ground:[55,35]}[c.type]||[80,45];
  ctx.beginPath();ctx.roundRect(-box[0]/2,-box[1]/2,box[0],box[1],7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#e6edf3";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText(c.type.toUpperCase(),0,4);
  if(c.type==="led"){ctx.fillStyle=state.digital[13]?"#ff4b4b":"#3b424a";ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();}
  if(c.type==="motor"){ctx.strokeStyle=state.digital[9]?"#58a6ff":"#58616b";ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  // pin markers
  pinsFor(c).forEach(p=>{const q=pinPos(c,p);ctx.fillStyle="#d29922";ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();});
}
function pinsFor(c){
 const m={arduino:["D2","D9","D13","A0","5V","GND"],resistor:["1","2"],led:["A","K"],button:["1","2"],pot:["VCC","W","GND"],capacitor:["1","2"],diode:["A","K"],mosfet:["G","D","S"],motor:["+","-"],sensor:["VCC","OUT","GND"],ground:["GND"]};
 return m[c.type]||[];
}
function pinPos(c,p){
 const idx=pinsFor(c).indexOf(p), count=pinsFor(c).length;
 const box={arduino:[180,100],resistor:[100,45],led:[70,45],button:[80,45],pot:[90,60],capacitor:[80,45],diode:[80,45],mosfet:[90,60],motor:[85,60],sensor:[100,55],ground:[55,35]}[c.type]||[80,45];
 return {x:c.x-box[0]/2 + (idx/(Math.max(1,count-1)))*box[0], y:c.y+box[1]/2+10};
}

board.addEventListener("dragover",e=>e.preventDefault());
board.addEventListener("drop",e=>{
 e.preventDefault(); const type=e.dataTransfer.getData("type"); if(!type)return;
 const r=board.getBoundingClientRect(); state.components.push({id:state.nextId++,type,x:e.clientX-r.left,y:e.clientY-r.top,value:""});
 draw(); updateUI();
});
board.addEventListener("click",e=>{
 const r=board.getBoundingClientRect(), x=e.clientX-r.left,y=e.clientY-r.top;
 let hit=null,pin=null;
 for(const c of state.components){
   const box={arduino:[180,100],resistor:[100,45],led:[70,45],button:[80,45],pot:[90,60],capacitor:[80,45],diode:[80,45],mosfet:[90,60],motor:[85,60],sensor:[100,55],ground:[55,35]}[c.type]||[80,45];
   if(Math.abs(x-c.x)<box[0]/2 && Math.abs(y-c.y)<box[1]/2) hit=c;
   for(const p of pinsFor(c)){const q=pinPos(c,p);if(Math.hypot(x-q.x,y-q.y)<9) {hit=c;pin=p;}}
 }
 if(pin && state.wireMode){
   if(!state.wireStart) state.wireStart={c:hit.id,p:pin};
   else {state.wires.push({a:state.wireStart,b:{c:hit.id,p:pin}});state.wireStart=null;draw();}
 } else if(hit){state.selected=hit.id;updateUI();draw();}
});

state.wireMode=false; state.wireStart=null;
document.querySelector('[data-tool="wire"]').onclick=()=>{state.wireMode=!state.wireMode;log(state.wireMode?"Wire mode enabled":"Wire mode disabled");};
document.querySelector('[data-tool="select"]').onclick=()=>{state.wireMode=false;};

function updateUI(){
 document.querySelector("#lessonDesc").textContent=lessons[lessonSelect.value].description;
 document.querySelector("#simStatus").textContent=state.running?"Running":"Stopped";
 document.querySelector("#statePanel").innerHTML=`
   <div class="inspector-row"><span>Digital D9</span><strong>${state.digital[9]??0}</strong></div>
   <div class="inspector-row"><span>Digital D13</span><strong>${state.digital[13]??0}</strong></div>
   <div class="inspector-row"><span>Analog A0</span><strong>${state.analog.A0??0}</strong></div>
   <div class="inspector-row"><span>Wires</span><strong>${state.wires.length}</strong></div>`;
 const c=state.components.find(x=>x.id===state.selected);
 document.querySelector("#inspector").innerHTML=c?`
   <div class="inspector-row"><span>Type</span><strong>${c.type}</strong></div>
   <div class="inspector-row"><span>ID</span><strong>${c.id}</strong></div>
   <div class="inspector-row"><span>Position</span><strong>${Math.round(c.x)}, ${Math.round(c.y)}</strong></div>
   <div class="inspector-row"><span>Value</span><input id="valueInput" value="${c.value||""}" style="width:120px;background:#0b0f14;color:#fff;border:1px solid #2b3542"></div>`:`<span class="status">Select a component.</span>`;
 const vi=document.querySelector("#valueInput"); if(vi)vi.oninput=()=>{c.value=vi.value;};
}

function simulateCode(){
 const src=code.value;
 state.running=true; updateUI();
 if(/digitalWrite\\(\\s*13\\s*,\\s*HIGH\\s*\\)/.test(src)) state.digital[13]=1;
 if(/digitalWrite\\(\\s*13\\s*,\\s*LOW\\s*\\)/.test(src)) state.digital[13]=1;
 if(/analogWrite\\(\\s*9\\s*,\\s*(\\d+)/.test(src)){ const m=src.match(/analogWrite\\(\\s*9\\s*,\\s*(\\d+)/); state.digital[9]=Number(m[1]);}
 if(/analogRead\\(\\s*A0\\s*\\)/.test(src)){state.analog.A0=Math.floor(Math.random()*1024);log(`A0 = ${state.analog.A0}`);}
 if(/Serial\\.println/.test(src)) log(`Serial: A0=${state.analog.A0||Math.floor(Math.random()*1024)}`);
 log("Program executed in the browser simulator.","ok");
 draw(); updateUI();
}
document.querySelector("#runBtn").onclick=simulateCode;
document.querySelector("#stopBtn").onclick=()=>{state.running=false;updateUI();log("Simulation stopped.");};
document.querySelector("#newBtn").onclick=()=>resetLesson(lessonSelect.value);
document.querySelector("#clearWires").onclick=()=>{state.wires=[];draw();updateUI();};
lessonSelect.onchange=()=>resetLesson(lessonSelect.value);
document.querySelector("#zoomIn").onclick=()=>log("Zoom control is reserved for the full canvas engine.");
document.querySelector("#zoomOut").onclick=()=>log("Zoom control is reserved for the full canvas engine.");

document.querySelector("#quizBtn").onclick=()=>{
 document.querySelector("#challenge").innerHTML=`
 <p><strong>Challenge:</strong> Build the selected lesson so the expected behavior occurs.</p>
 <ul>
   <li>Place the required components.</li>
   <li>Wire power, ground and signals correctly.</li>
   <li>Write the control code.</li>
   <li>Run the simulation and verify the state.</li>
 </ul>
 <p class="status">The production version should validate the circuit graph, code behavior, electrical limits and measurements.</p>`;
 document.querySelector("#modal").classList.add("open");
};
document.querySelector("#closeQuiz").onclick=()=>document.querySelector("#modal").classList.remove("open");

resetLesson("LED + Resistor"); resize();
