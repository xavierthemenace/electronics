# Electronics Mastery Lab — Architecture

*Technical specification. Complements IMPLEMENTATION_PLAN.md.*

---

## 1. Design Principles

1. **Canonical circuit model** — the netlist is the source of truth; editors, simulation, and instruments all consume it. No visual-only state that can't be simulated.
2. **UI independent of solver** — the simulation engine is pure TypeScript, testable in Node without a browser.
3. **Causality over imitation** — the LED lights because the GPIO drives a net whose resistance-limited current exceeds the LED's threshold, never because code matched a string.
4. **Extensible registry** — components are declared data (pins, parameters, models, visuals). Adding one never rewrites the solver or canvas.
5. **Data-driven curriculum** — lessons are schema-validated objects, not branches in a UI switch.
6. **Local-first, cloud-sync** — simulation and edit run entirely in the browser; the server holds identity, persistence, progress, and analytics.

---

## 2. Module Map

```
src/
├── core/
│   ├── model/                 # Canonical circuit types + zod schemas
│   │   ├── project.ts
│   │   ├── component.ts
│   │   ├── net.ts
│   │   └── firmware.ts
│   ├── components/            # Registry: definitions + electrical models + visuals
│   │   ├── registry.ts
│   │   ├── define.ts          # helper to author a ComponentDefinition
│   │   └── models/            # one file per family (resistor, led, mcu, diode, ...)
│   └── simulation/            # Pure TS engines (no DOM)
│       ├── netlist.ts         # build netlist from project
│       ├── matrix.ts          # sparse LU
│       ├── solver.ts          # MNA DC + transient
│       ├── devices.ts         # component stamps (R,C,L,Diode,LED,...)
│       ├── digital.ts         # event-driven logic simulation
│       └── engine.ts          # public SimulationEngine facade
├── mcu/
│   ├── runtime.ts             # TS Arduino interpreter
│   ├── periph/                # GPIO, ADC, PWM, Timer, UART, I2C, SPI models
│   └── bridge.ts              # peripheral <-> circuit coupling
├── state/
│   └── store.ts               # Zustand store (circuit, sim results, project, ui)
├── editor/
│   ├── CanvasRenderer.ts      # draw circuit via ctx, transform matrix
│   ├── interactions.ts        # pan/zoom/select/move/wire gesture handling
│   ├── commands.ts            # history (undo/redo) command records
│   └── layout.ts              # snap grid, component placement
├── instruments/
│   ├── multimeter.tsx
│   ├── oscilloscope.tsx
│   ├── logicAnalyzer.tsx
│   └── serialMonitor.tsx
├── lessons/
│   ├── schema.ts              # Lesson / challenge types + validation
│   ├── loader.ts
│   ├── validator.ts           # grading pipeline
│   └── stages/                # per-stage lesson definitions
├── persistence/
│   ├── schema.ts              # versioned project JSON
│   ├── localStorage.ts
│   └── exporter.ts            # .emdj project file, SPICE netlist export
└── app/                       # React UI shell
    ├── App.tsx
    ├── Toolbar.tsx
    ├── Sidebar.tsx
    ├── CodeEditor.tsx         # Monaco wrapper
    ├── Inspector.tsx
    └── Console.tsx
```

---

## 3. Canonical Circuit Model

```ts
interface CircuitProject {
  schemaVersion: number;               // persistence versioning
  id: string;
  name: string;
  components: CircuitComponent[];      // placed instances
  wires: Wire[];                       // explicit pin-to-pin wires (provenance kept)
  nets: Net[];                         // resolved conductive nets (from wires/components)
  view?: ViewState;                    // non-electrical: camera, selection
  firmware?: FirmwareProject;          // source + runtime config
  simSettings?: SimulationSettings;
  metadata: ProjectMetadata;           // created/updated, lesson link, etc.
}

interface CircuitComponent {
  id: string;                          // stable instance id
  type: string;                        // registry key, e.g. "led-red-5mm"
  params: Record<string, number | string | boolean>;  // e.g. { resistance: 220 }
  pos: { x: number; y: number };       // canvas px (snapped)
  rotation: 0 | 90 | 180 | 270;
  label?: string;
  netAssignments?: Record<string, string>; // pinId -> explicit net name
}
```

### Nets vs Wires
- **Wires** are user-authored connectors (a `Wire` = `{a:[compId,pinId], b:[compId,pinId]}`). They preserve user intent for the editor.
- **Nets** are derived during *netlist build*: a union–find over all wires plus intra-component pin bridges (e.g. the two pins of a resistor are *different* nets; the many pins of a breadboard rail are *the same* net).
- The **netlist is always recomputed** from `components + wires` on any edit. It is never stored as user-editable mutable state, avoiding divergent editor/sim copies.

---

## 4. The Simulation Engine

### 4.1 Solver pipeline
```
CircuitProject
   → NetlistBuilder.build()        // resolves conductive nets, assigns node indices
   → ModelInstantiator             // each component registers a device + node terminals
   → MatrixAssembler               // stamps G, C, source vector (MNA)
   → Solver
       ├── DC: Newton-Raphson (nonlinear) → operating point
       └── Transient: trapezoidal companion + adaptive dt + NR iterations
   → Results                       // per-node voltages, per-device branch currents
```

### 4.2 Public facade (UI-facing)
```ts
interface SimulationEngine {
  loadCircuit(project: CircuitProject): void;
  solveDC(): SimulationResult;
  step(dt: number): SimulationResult;
  run(opts: SimulationOptions): SimulationRun;   // async, cancellable
  stop(): void;
  getNodeVoltage(nodeId: string): number;
  getBranchCurrent(deviceId: string): number;
  getViolations(): ElectricalViolation[];        // ERC results
}
```
`step()` is deterministic given identical inputs → testable and reproducible.

### 4.3 Device stamps (MNA)
Each device contributes entries to the matrix. Examples:
- **Resistor**: conductance `G = 1/R` between its nodes.
- **Voltage source**: adds an unknown branch current; a row `v(n+)-v(n-) = V`.
- **Capacitor** (trapezoidal): companion conductance `Geq = 2C/dt` plus history current source.
- **Diode/LED**: nonlinear current `Id = Is(exp(qv/nkT)-1)` solved by NR; LED adds light output derived from forward current.
- **MCU/push-pull GPIO**: acts as an ideal voltage source in series with `Rds` between node and `Vcc`/`GND`, switched by firmware state.

### 4.4 Digital subsystem
Event-driven queue keyed by simulation time. Supports `0 / 1 / Z / X`.
Digital nets interact with analog by:
- **Output to analog**: drives node toward a voltage through output impedance.
- **Analog to input**: compare node voltage to `VIH/VIL` thresholds to produce a digital level (for `digitalRead`).

---

## 5. ERC (Electrical Rule Checking)

A rule registry inspects the netlist + solved operating point and emits `ElectricalViolation[]`:

| code | severity | triggers on |
|------|----------|-------------|
| `SHORT` | critical | ideal sources joined with no impedance (V + flip upside down, etc.) |
| `NO_GROUND` | error | no node marked ground / network has no reference |
| `FLOATING` | warning | logic input pin on a net with unknown state |
| `LED_OVERCURRENT` | error | LED current > maxForwardCurrent |
| `R_POWER` | warning | P=I²R exceeds resistor power rating |
| `REVERSED_*` | error | polarized comp reverse-biased beyond rating |
| `GATE_OVERVOLTAGE` | error | |Vgs| beyond abs max |
| `PIN_OVERCURRENT` | warning | GPIO output exceeds abs max per-pin source/sink |
| `MISSING_PULLUP` | info | open-drain net floating high |
| `PANIC_VUNKNOWN` | info | net voltage unresolved |

Every violation carries a human teaching payload:
```ts
{
  severity, code, componentIds,
  message: "LED current ≈ 48 mA",
  explanation: "Exceeds the 20 mA recommended operating current.",
  suggestedFix: "Add a 220 Ω series resistor, or increase its resistance.",
  expected: "≈ 10–15 mA for a 2 V forward drop."
}
```

---

## 6. MCU Execution

### Decision: Phase 5 = TS interpreter; Phase 10 = WASM (Rust→wasm32) when C++/full toolchain is needed.

The **peripheral model** owns state; the interpreter calls it; the peripheral drives the circuit bridge:

```
source.ino
  → parser/lexer (TS) → AST
  → ArduinoRuntime (interpreter loop, instruction budget + wall-clock cap)
  → PeripheralModels (GPIO/ADC/PWM/Timer/UART/I2C/SPI)
  → CircuitBridge
       GPIO output  →   set netlist node to H/L (or PWM pwm value)
       ADC          ←   sample nodeVoltage(analog channel) → 0..1023
       UART TX      →   feed SerialMonitor instrument
       UART RX      ←   bytes queued by user script / peer MCU
```

- **Sandbox**: instruction cap (e.g. 5M ops/run), memory model for user globals, no raw JS `eval` of arbitrary code — the interpreter only evaluates ASTs it can fully control.
- **`delay()`** is cooperative: the runtime advances `millis()` in sync with simulation time and yields so the circuit/UI can progress.

---

## 7. Instruments

Instruments subscribe to *simulation result streams* (buffered nodeVoltage history), never to fake state.

| Instrument | data source |
|------------|-------------|
| Multimeter | direct probe on node → `getNodeVoltage` / branch current |
| Oscilloscope | ring buffer of (t, v) per channel from transient run |
| Logic Analyzer | digital transitions (t, pin, level) event log + protocol decoder |
| Serial Monitor | UART TX/RX byte stream from MCU bridge |

Rendering of high-frequency waveform data uses its own `requestAnimationFrame` loop decoupled from React re-renders (store exposure via subscription, not global state).

---

## 8. State Management

Zustand slices kept separate to respect the performance rule **no React re-render per timestep**:

| slice | example fields | update cadence |
|-------|----------------|----------------|
| `circuit` | components, wires, selection | on user edit |
| `project` | name, metadata, firmware source | on save/load |
| `ui` | active tool, panel, zoom/pan | on interaction |
| `sim` | running, results, waveform buffer | throttled / via refs |

Simulation data flows to instrument canvases through refs/`requestAnimationFrame`, bypassing React reconciliation.

---

## 9. Persistence

Versioned JSON (`schemaVersion` set at root). Local persistence = IndexedDB (autosave) + localStorage (quick draft). Export/import = `.emdj` (JSON) and SPICE-style plain text netlist for interop. Cloud sync (Phase 9) mirrors the same document shape.

---

## 10. Security

- Untrusted learner code runs **only** in the browser, inside a controlled interpreter (no `eval`/`Function` of raw source; AST-based evaluation). Phase 10 WASM adds hard memory/cycle isolation.
- Server never executes user code.
- Circuit and project data are plain JSON; validated with zod before load (rejects malformed objects).

---

## 11. Performance Targets

- Circuit edit ops: < 50 ms.
- Netlist build (≤ 200 comps): < 10 ms.
- DC solve (≤ 100 nodes): < 5 ms.
- Transient step: < 10 ms @ 1 µs default, adaptive.
- Sim→LED visual latency: < 100 ms.

---

## 12. Testing Strategy

- **Unit (Vitest)**: solver (voltage divider, RC charge, diode IV, MOSFET switch), ERC rules, netlist builder, UART framing, ADC/PWM mapping, persistence round-trip.
- **Integration**: place→wire→netlist→solve→measure pipeline.
- **E2E (Playwright)**: the 8-step LED challenge (build, run, measure, break, detect, repair, pass).
- **Golden circuits**: a fixture set whose solved values are asserted.

---

## 13. Documentation Index

| doc | covers |
|-----|--------|
| `ARCHITECTURE.md` | this file |
| `IMPLEMENTATION_PLAN.md` | phases, tasks, risks |
| `SIMULATION.md` | numerics, device models, convergence |
| `COMPONENTS.md` | registry authoring guide |
| `LESSON_ENGINE.md` | schema, validation pipeline |
| `CODE_EXECUTION.md` | interpreter, peripherals, sandboxing |
| `TESTING.md` | strategies, fixtures |
| `CONTRIBUTING.md` | process, style |