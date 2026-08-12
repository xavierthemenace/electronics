export type PinKind = 'power' | 'ground' | 'digital' | 'analog' | 'passive' | 'input' | 'output' | 'pwm' | 'bidirectional';
export interface PinDef { id: string; name: string; kind: PinKind; currentLimit?: number; voltageLimits?: { min: number; max: number }; }
export interface ParamDef { default: number | string | boolean; unit?: string; min?: number; max?: number; }
export interface ComponentDef { type: string; name: string; category: string; status: 'modelled' | 'planned'; pins: PinDef[]; params: Record<string, ParamDef>; docs: { description: string }; isGround?: boolean; device?: (params: Record<string, unknown>) => DeviceModel; }
export interface DeviceModel { pins: string[]; isNonlinear: boolean; branches?: VoltageSourceBranch[]; stamp?: (ctx: StampContext) => void; current?: (ctx: DeviceContext) => number; power?: (ctx: DeviceContext) => number; brightness?: (ctx: DeviceContext) => number; id?: (vd: number) => number; }
export interface VoltageSourceBranch { p: string; n: string; V: number; }
export interface StampContext { G(i: number, j: number, g: number): void; I(i: number, a: number): void; v(nn: number): number; nodeOf(compId: string, pinId: string): number; branchCurrent(branchIndex: number): number; limit(vd: number, na: number, nk: number, lim: number): number; }
export interface DeviceContext { node(pinId: string): number; vPin(pinId: string): number; current(pinId: string): number; v(nodeIdx: number): number; }
export interface Position { x: number; y: number; }
export interface CircuitComponent { id: string; type: string; params: Record<string, unknown>; position: Position; rotation?: number; }
export interface Wire { a: TerminalRef; b: TerminalRef; }
export interface TerminalRef { cid: string; pid: string; }
export interface CircuitNet { id: string; node: number; name: string; isGround: boolean; members: TerminalRef[]; }
export interface Netlist { pinNodes: PinNode[]; nodeCount: number; nets: CircuitNet[]; }

export interface BreadboardProjectData {
  rows: number;
  columns: number;
  holes: Array<{ id: string; row: number; column: number; bank: 'left' | 'right'; side: 'top' | 'bottom'; rail?: '+' | '-' }>;
  jumpers: Array<{ id: string; a: string; b: string }>;
  placements: Array<{ componentId: string; pinId: string; holeId: string }>;
}

export interface CircuitProject {
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  sourceCode?: string;
  breadboard?: BreadboardProjectData;
  metadata?: { createdAt: number; modifiedAt: number; version: number; gridSize?: number };
}

export function project(partial: Partial<CircuitProject> = {}): CircuitProject {
  const now = Date.now();
  return {
    name: partial.name ?? 'Untitled Circuit',
    components: partial.components ?? [],
    wires: partial.wires ?? [],
    sourceCode: partial.sourceCode,
    breadboard: partial.breadboard,
    metadata: { createdAt: partial.metadata?.createdAt ?? now, modifiedAt: partial.metadata?.modifiedAt ?? now, version: partial.metadata?.version ?? 1, gridSize: partial.metadata?.gridSize ?? 20 },
  };
}

export function component(id: string, type: string, params: Record<string, unknown> = {}, position = { x: 0, y: 0 }, rotation = 0): CircuitComponent { return { id, type, params, position, rotation }; }
export function wire(aCid: string, aPid: string, bCid: string, bPid: string): Wire { return { a: { cid: aCid, pid: aPid }, b: { cid: bCid, pid: bPid } }; }
