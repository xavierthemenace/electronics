# Electronics Mastery Lab — Implementation Plan

*Generated from codebase analysis: 2025-08-11*

---

## 1. Current State Analysis

### 1.1 Project Structure
```
electronics/
├── index.html              # Minimal HTML entry point
├── package.json            # Vite + vanilla JS (no framework)
├── src/
│   ├── main.js             # ~285 lines - entire prototype application
│   └── style.css           # ~500 lines - dark theme CSS
├── CURRICULUM.md           # Lesson progression outline
├── electronics_mastery_final_exam.md  # 100-question assessment
├── getting-started-expanded.ts        # 12 lessons (Stage 1)
├── sensors-actuators-expanded.ts      # 10 lessons (Stage 2)
├── communication-expanded.ts          # 7 lessons (Stage 3)
├── advanced-expanded.ts               # 13 lessons (Stage 4)
```

### 1.2 Current Implementation (Prototype)
- **Framework**: Vanilla JS + Vite (no React, no TypeScript)
- **UI**: Single-file HTML5 Canvas circuit editor
- **Components**: 11 types (arduino, resistor, led, button, pot, capacitor, diode, mosfet, motor, sensor, ground)
- **Wiring**: Pin-to-pin click wiring (Manhattan routing)
- **Simulation**: String-matching on code (`digitalWrite(13,HIGH)` → `state.digital[13]=1`)
- **Code Editor**: Plain `<textarea>` (no syntax highlighting, no autocomplete)
- **Lessons**: 4 hardcoded starter circuits (LED+Resistor, Button, Analog Sensor, Motor Driver)
- **State**: Single global `state` object with components, wires, digital/analog values, serial log

### 1.3 What Works (Prototype Level)
- Drag-and-drop component placement
- Component selection/inspection
- Wire mode (click two pins)
- Lesson switching with starter circuits
- Arduino-style code editor (plain text)
- Run/Stop simulation (fake execution)
- Serial console output
- Challenge modal (static text)
- Responsive dark-themed UI

### 1.4 Critical Limitations (Prototype Hacks)
| Area | Current | Required |
|------|---------|----------|
| **Circuit Model** | Flat arrays + wire list | Canonical netlist/graph |
| **Simulation** | Regex on code strings | SPICE-style solver + digital event sim |
| **MCU Execution** | String matching | Actual interpreter/WASM runtime |
| **Netlist** | None (wires only) | Full graph with nodes/pins |
| **Components** | Hardcoded render + pins | Extensible registry with models |
| **Editor** | `<textarea>` | Monaco Editor |
| **Instruments** | None | Multimeter, Scope, Logic Analyzer |
| **Validation** | None | ERC + behavioral grading |
| **Persistence** | None | Project save/load/export |
| **Testing** | None | Unit + integration + e2e |

---

## 2. Proposed Architecture

### 2.1 Technology Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend Framework** | React 18 + TypeScript | Industry standard, component model matches circuit components |
| **Build** | Vite | Already present, fast HMR |
| **Canvas** | HTML5 Canvas 2D (custom) | Full control over rendering, performant for circuit diagrams |
| **Code Editor** | Monaco Editor | VS Code kernel, excellent TS/C++ support, browser-native |
| **State** | Zustand + Immer | Lightweight, mutable-feel immutable updates |
| **Simulation Core** | Pure TS (no UI deps) | Testable in Node, portable to WASM |
| **MCU Runtime** | WebAssembly (Rust → wasm32) | Real compilation, sandboxed, performant |
| **Testing** | Vitest (unit) + Playwright (e2e) | Modern, fast, TypeScript-native |

### 2.2 Architectural Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                        │
├──────────────┬──────────────────────────────────────┬────────────┤
│  Components  │           Circuit Workspace          │ Code Editor│
│   Palette    │  ┌──────────────────────────────┐   │  (Monaco)  │
│              │  │   Canvas Renderer (React)    │   │            │
│  - Resistor  │  │   - Grid + snap              │   │  - TS/JS   │
│  - LED       │  │   - Component render         │   │  - C++     │
│  - MCU       │  │   - Wire routing             │   │  - Diagnose│
│  ...         │  │   - Selection/Multi-select   │   │  - Run/Stop│
│              │  └──────────────┬────────────────┘   └─────┬──────┘
├──────────────┼─────────────────┼──────────────────────────┼────────┤
│              │  Instruments Panel                      │        │
│              │  ┌─────────┐ ┌────────┐ ┌───────────┐    │        │
│              │  │Multimeter│ │ Scope  │ │Logic An.  │    │        │
│              │  └─────────┘ └────────┘ └───────────┘    │        │
├──────────────┴──────────────────────────────────────────┴────────┤
│                        State Layer (Zustand)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐            │
│  │ Circuit     │  │ Simulation   │  │ Project     │            │
│  │ Store       │  │ Store        │  │ Store       │            │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘            │
│         │                │                 │                     │
│   Canonical Netlist    Results           Persistence            │
└─────────┼────────────────┼─────────────────┼────────────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Simulation Engine (Pure TS)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Netlist      │  │ DC Solver    │  │ Digital Event Sim    │  │
│  │ Builder      │  │ (MNA)        │  │ (Event-driven)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Component Model Registry (Electrical + Visual + Params)   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCU Runtime (WASM)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Firmware     │  │ Peripheral   │  │ Circuit Bridge       │  │
│  │ Compiler/    │  │ Models       │  │ (GPIO↔Netlist,       │  │
│  │ Interpreter  │  │ (GPIO,ADC,   │  │  ADC↔Analog,         │  │
│  │ (wasm3/      │  │  PWM,UART,   │  │  UART↔Serial,        │  │
│  │  wasmtime)   │  │  I2C,SPI)    │  │  I2C/SPI↔Bus)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Simulation Strategy

### 3.1 Hybrid Architecture
```
Analog Subsystem          Digital Subsystem
─────────────             ─────────────────
MNA DC Solver             Event-driven Logic Sim
Modified Nodal Analysis   4-value logic (0,1,Z,X)
Sparse Matrix (LU)        Propagation delay queue
Time-step transient       Edge-triggered flip-flops
                          Bus arbitration (I2C/SPI)
```

### 3.2 Coupling Strategy
- **Digital → Analog**: GPIO outputs become voltage sources (ideal + series R)
- **Analog → Digital**: ADC samples node voltages; digital inputs compare to VIH/VIL
- **Synchronization**: Fixed time-step (default 1µs), digital events scheduled within step

### 3.3 Component Models (Phase 3 Priority)
| Component | DC Model | Transient Model | Digital Model |
|-----------|----------|-----------------|---------------|
| Voltage Source | Ideal V | Ideal V | — |
| Resistor | Conductance (G=1/R) | Same | — |
| Capacitor | Open (DC) | Companion model (trapezoidal) | — |
| Inductor | Short (DC) | Companion model | — |
| Diode | Shockley (simplified) | Same + Cjo | — |
| LED | Diode + Vf + light output | Same | — |
| BJT | Ebers-Moll (switching) | Charge control | — |
| MOSFET | Square-law (switching) | Same + Cgs/Cgd | — |
| MCU GPIO | Voltage source (push-pull) | Same | Output driver |
| MCU ADC | — | Sample & hold | Input comparator |

### 3.4 Solver Implementation
- **Matrix**: Sparse LU (SuiteSparse-style) or custom for small circuits
- **Time-step**: Adaptive (100ns – 1ms) based on circuit dynamics
- **Convergence**: Newton-Raphson with damping, max 20 iterations
- **Performance Target**: <10ms/step for 50-node circuits

---

## 4. Code Execution Strategy

### 4.1 Recommended Approach: WebAssembly Firmware Runtime
```
Arduino Sketch (.ino)
        │
        ▼
┌───────────────────┐
│ Arduino CLI /     │  (Pre-compiled toolchain in WASM)
│ Emscripten GCC    │
└─────────┬─────────┘
          │
          ▼
    Firmware (.wasm)
          │
          ▼
┌─────────────────────────────────────┐
│ wasm3 Interpreter (2KB, fast)       │
│   - CPU emulation (AVR/ARM)         │
│   - Peripheral callbacks → Circuit  │
│   - Memory protection               │
│   - Cycle/Instruction limits        │
└─────────────────────────────────────┘
```

### 4.2 Alternative: TypeScript Interpreter (Faster Iteration)
For Phase 5 MVP, a TS-based Arduino API interpreter:
```typescript
class ArduinoRuntime {
  memory: Uint8Array;
  registers: Map<string, number>;
  
  pinMode(pin: number, mode: PinMode): void
  digitalWrite(pin: number, val: 0|1): void
  digitalRead(pin: number): 0|1
  analogRead(pin: number): number
  analogWrite(pin: number, duty: number): void
  delay(ms: number): Promise<void>
  millis(): number
  Serial: SerialPeripheral
}
```
*Advantage*: No WASM toolchain complexity, direct TS ↔ Circuit bridge

### 4.3 Decision: Phase 5 uses TS Interpreter; Phase 10 migrates to WASM
- **Rationale**: Faster iteration for core loop validation; WASM added when C++ compilation is needed

---

## 5. Implementation Phases

### Phase 1 — Production Circuit Editor (Weeks 1-3)
**Goal**: Professional canvas editor with full editing capabilities

| Task | Details |
|------|---------|
| 1.1 | Migrate to React + TS + Vite |
| 1.2 | Canvas renderer component with grid, zoom/pan (transform matrix) |
| 1.3 | Component registry system (extensible, data-driven) |
| 1.4 | Drag-drop from palette → canvas |
| 1.5 | Component selection, move, rotate (R key), delete (Del key) |
| 1.6 | Multi-select (Shift+click, marquee) |
| 1.7 | Pin-to-pin wiring with Manhattan routing + junctions |
| 1.8 | Wire selection, move, delete |
| 1.9 | Undo/Redo (command pattern, 100 history) |
| 1.10 | Copy/Paste (component + connected subgraph) |
| 1.11 | Snap-to-grid (configurable: 5, 10, 20px) |
| 1.12 | Keyboard shortcuts (R, Del, Esc, Ctrl+Z/Y, Ctrl+C/V, Space+pan) |
| 1.13 | Component inspector panel (properties, pin voltages) |
| 1.14 | Project save/load (JSON with schema version) |

**Acceptance**: Build LED+Resistor circuit from scratch, wire it, save, reload.

---

### Phase 2 — Canonical Netlist Engine (Weeks 3-4)
**Goal**: Transform visual circuit → simulation-ready netlist

| Task | Details |
|------|---------|
| 2.1 | Netlist data model (nodes, branches, components, pins) |
| 2.2 | Graph builder: components + wires → conductive nets |
| 2.3 | Net naming (auto: N001, user: VCC, GND) |
| 2.4 | Ground reference detection (mandatory for simulation) |
| 2.5 | Component pin mapping → netlist terminals |
| 2.6 | Subcircuit support (MCU as multi-pin component) |
| 2.7 | Netlist validation (floating nodes, short circuits) |
| 2.8 | Export: SPICE netlist, JSON netlist |

**Acceptance**: LED+Resistor circuit produces valid netlist with 3 nodes (5V, LED_anode, GND).

---

### Phase 3 — Basic Electrical Simulation (Weeks 4-7)
**Goal**: DC + transient simulation for core passive/semiconductor components

| Task | Details |
|------|---------|
| 3.1 | MNA (Modified Nodal Analysis) matrix builder |
| 3.2 | Sparse LU solver (DC operating point) |
| 3.3 | Transient: Trapezoidal integration + companion models |
| 3.4 | Component stamps: V-source, R, C, L, Diode, LED |
| 3.5 | Nonlinear solve: Newton-Raphson with line search |
| 3.6 | Convergence handling (damping, iteration limits) |
| 3.7 | Time-step control (adaptive based on truncation error) |
| 3.8 | Simulation runner: `step(dt)`, `run(options)`, `stop()` |
| 3.9 | Probe API: `getNodeVoltage(nodeId)`, `getBranchCurrent(branchId)` |
| 3.10 | Unit tests: voltage divider, RC charge/discharge, diode IV curve |

**Acceptance**: 5V→220Ω→LED→GND simulates correctly (LED ~2V, 14mA).

---

### Phase 4 — Measurement Instruments (Weeks 7-9)
**Goal**: Virtual instruments driven by actual simulation data

| Instrument | Features |
|------------|----------|
| **Multimeter** | Voltage (2-probe), Current (series), Resistance (offline), Continuity (beep) |
| **Oscilloscope** | 2ch, Time/div (1µs-10s), Volts/div (10mV-10V), Trigger (edge/level), Pause, CSV export |
| **Logic Analyzer** | 8ch digital, timing diagram, UART/I2C/SPI decode |
| **Serial Monitor** | TX/RX, baud rate, timestamps, hex/ASCII |
| **Signal Generator** | Sine/Square/Triangle/DC, Freq/Amplitude/Offset (Phase 10) |

**Architecture**: Instruments subscribe to simulation results via observable streams; render off-main-thread (Web Workers or OffscreenCanvas).

---

### Phase 5 — MCU + Code Execution (Weeks 9-12)
**Goal**: Arduino code runs and controls simulated circuit

| Task | Details |
|------|---------|
| 5.1 | Monaco Editor integration (C++ highlighting, autocomplete, diagnostics) |
| 5.2 | Arduino API TypeScript interpreter (pinMode, digitalWrite, etc.) |
| 5.3 | Peripheral models: GPIO, ADC, PWM, Timers, Serial, I2C, SPI |
| 5.4 | Circuit bridge: GPIO ↔ Netlist nodes, ADC ↔ Analog solver |
| 5.5 | Execution sandbox: instruction limits, memory limits, timeout |
| 5.6 | Run/Stop/Reset controls with simulation sync |
| 5.7 | Serial output → Serial Monitor instrument |
| 5.8 | Debug: breakpoints, step, variable watch (Phase 10) |

**Acceptance**: `digitalWrite(13,HIGH)` on pin 13 → LED on breadboard illuminates (via netlist voltage).

---

### Phase 6 — Lesson Engine (Weeks 12-14)
**Goal**: Data-driven lessons with automated validation

| Task | Details |
|------|---------|
| 6.1 | Lesson schema (TypeScript interfaces + Zod validation) |
| 6.2 | Lesson loader (JSON/TS modules from curriculum) |
| 6.3 | Starter circuit loading |
| 6.4 | Allowed/required component enforcement |
| 6.5 | Connection requirement checker |
| 6.6 | Code requirement validator (AST-based) |
| 6.7 | Measurement requirement checker |
| 6.8 | Fault injection engine (broken wire, wrong value, reversed) |
| 6.9 | Hint system (contextual, progressive) |
| 6.10 | Assessment/grading pipeline |

**Lessons to Implement**: All 42 lessons from curriculum files (getting-started, sensors-actuators, communication, advanced)

---

### Phase 7 — Fault Injection & Debugging (Weeks 14-15)
**Goal**: Signature debugging challenges

| Fault Types | Implementation |
|-------------|----------------|
| Broken wire | Netlist: remove connection |
| Wrong resistor | Component: modify value parameter |
| Missing component | Starter: omit required component |
| Reversed LED/diode | Component: flip pin assignment |
| Missing ground | Netlist: disconnect GND net |
| Floating input | Netlist: leave pin unconnected |
| Incorrect pull-up | Component: modify pull-up state |
| Wrong baud rate | Code: mismatch Serial.begin() |
| I2C address conflict | Component: duplicate address |

**Debug Workflow**: Observe → Measure → Hypothesize → Fix → Explain

---

### Phase 8 — Mastery & Assessment (Weeks 15-16)
**Goal**: Track mastery by topic, integrate final exam

| Feature | Implementation |
|---------|----------------|
| Mastery tracking | Per-topic scores (knowledge, calc, build, measure, debug, design, explain) |
| Progress dashboard | Visual topic grid with % mastery |
| Final exam | 100-question assessment (multiple choice + practical challenges) |
| Capstone framework | Project-based assessment with rubric grading |
| Certificates | PDF generation with mastery breakdown |

---

### Phase 9 — Persistence & Backend (Weeks 16-18)
**Goal**: User accounts, project cloud sync

| Component | Stack |
|-----------|-------|
| Auth | Supabase Auth / Firebase Auth |
| Database | PostgreSQL (Supabase) / Firestore |
| Realtime | Supabase Realtime / Firebase |
| File Storage | Supabase Storage / Firebase Storage |
| API | Hono + Cloudflare Workers / Next.js API routes |

**Client**: Local-first (IndexedDB) with background sync.

---

### Phase 10 — Advanced Simulation & Polish (Weeks 18-24)
**Goal**: Professional-grade completeness

| Area | Enhancements |
|------|--------------|
| **Simulation** | BJT/MOSFET charge control, temperature, noise analysis, AC sweep |
| **MCU** | WASM firmware runtime (Rust→wasm32), interrupts, FreeRTOS tasks |
| **Instruments** | Signal generator, Bode plot, FFT, cursor measurements |
| **Editor** | Schematic mode, breadboard mode, 3D PCB preview |
| **Schematic** | Auto-layout, net labeling, hierarchical sheets |
| **Breadboard** | Physical hole mapping, DIP package straddling, rail connectivity |
| **Performance** | Web Workers for simulation, OffscreenCanvas, WASM solver |
| **UX** | Dark/light theme, localization, accessibility audit |

---

## 6. Curriculum Integration Plan

### 6.1 Lesson Mapping (42 lessons → Interactive Challenges)
| Stage | Lessons | Challenge Types |
|-------|---------|-----------------|
| **Stage 1** (12) | Getting Started | Build, Calculate, Measure |
| **Stage 2** (10) | Sensors/Actuators | Build, Code, Calibrate, Filter |
| **Stage 3** (7) | Communication | Wire, Code, Decode, Debug |
| **Stage 4** (13) | Advanced | Architecture, PCB, Fault Inject, Capstone |

### 6.2 Curriculum Data Structure
```typescript
// src/curriculum/lessons/index.ts
export const curriculum: Curriculum = {
  stages: [
    { id: 'foundations', title: 'Electrical Foundations', lessons: [...] },
    { id: 'circuit-analysis', title: 'Circuit Analysis', lessons: [...] },
    // ...
  ]
};
```

Each lesson file exports:
```typescript
export const lesson: Lesson = {
  id: 'ohms-law',
  stage: 'foundations',
  difficulty: 'beginner',
  objectives: [...],
  theory: [...],  // Rich text blocks from curriculum files
  starterCircuit: {...},
  allowedComponents: ['resistor', 'led', 'voltage-source', 'ground'],
  requiredComponents: [{ type: 'resistor', minCount: 1 }],
  requiredConnections: [{ from: 'voltage-source:+', to: 'resistor:1' }],
  codeRequirements: [],
  measurements: [{ type: 'voltage', node: 'led_anode', expected: { min: 1.8, max: 2.2 } }],
  faults: [...],
  hints: [...],
  assessment: { passingScore: 70 }
};
```

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SPICE solver complexity | High | High | Start with DC only; use proven TS math libs (numeric.ts) |
| WASMC firmware runtime | Medium | High | Phase 5 uses TS interpreter; WASM is Phase 10 |
| Performance (large circuits) | Medium | Medium | Web Workers + adaptive time-step from Phase 3 |
| Browser WASM compatibility | Low | Medium | wasm3 interpreter (no WASM threads needed) |
| Curriculum scope creep | High | Medium | Strict lesson schema; 1 lesson = 1 vertical slice |
| TypeScript migration effort | Medium | Low | Incremental: new files TS, migrate old as touched |

---

## 8. Success Metrics (Per Phase)

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Component place/move/wire time | <2 sec each |
| 1 | Undo/redo latency | <50ms |
| 2 | Netlist generation (50 comps) | <10ms |
| 3 | DC solve (50 nodes) | <5ms |
| 3 | Transient step | <10ms |
| 5 | Code → GPIO → LED latency | <100ms |
| 6 | Lesson load time | <200ms |
| 6 | Challenge validation | <500ms |

---

## 9. Next Immediate Actions

1. **Initialize React + TS + Vite project** (replace vanilla JS)
2. **Create component registry** with 11 prototype components + pin definitions
3. **Build CanvasRenderer** with grid, pan/zoom, component rendering
4. **Implement drag-drop + wire mode** with pin snapping
5. **Add Zustand stores** for circuit, simulation, project state
6. **Write first netlist builder** and validate with LED+Resistor circuit

---

## 10. Documentation to Create

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | This document + detailed module specs |
| `SIMULATION.md` | Solver algorithms, component models, convergence |
| `COMPONENTS.md` | Registry format, adding new components |
| `LESSON_ENGINE.md` | Schema, validation pipeline, authoring guide |
| `CODE_EXECUTION.md` | Interpreter architecture, peripheral bridge |
| `TESTING.md` | Test strategies, golden master circuits |
| `CONTRIBUTING.md` | Code style, PR process, architecture decisions |

---
*End of Implementation Plan*