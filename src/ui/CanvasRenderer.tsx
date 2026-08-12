/**
 * CanvasRenderer — High-performance HTML5 Canvas 2D circuit renderer.
 * Handles grid, zoom/pan, component rendering, wire routing, selection.
 *
 * @module ui/CanvasRenderer
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useCircuitStore } from '../stores/circuit.js';
import { useSimulationStore } from '../stores/simulation.js';
import type { CircuitComponent, Wire } from '../core/model.js';
import { component as createComponent } from '../core/model.js';
import { getDefinition } from '../core/registry.js';

const GRID_COLOR_MAJOR = '#21262d';
const GRID_COLOR_MINOR = '#161b22';
const WIRE_COLOR = '#58a6ff';
const WIRE_COLOR_SELECTED = '#f78166';
const WIRE_COLOR_HOVER = '#f78166';
const COMPONENT_BG = '#21262d';
const COMPONENT_BORDER = '#30363d';
const COMPONENT_BORDER_SELECTED = '#f78166';
const PIN_COLOR = '#58a6ff';
const PIN_COLOR_HOVER = '#f78166';
const PIN_RADIUS = 6;
const TEXT_COLOR = '#e6edf3';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PinPosition {
  pinId: string;
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

interface ComponentRenderInfo {
  body: Rect;
  pins: PinPosition[];
  label: string;
  labelPos: Point;
}

// Component visual definitions
const COMPONENT_VISUALS: Record<string, {
  width: number;
  height: number;
  pins: { id: string; side: 'left' | 'right' | 'top' | 'bottom'; offset?: number }[];
  drawBody: (ctx: CanvasRenderingContext2D, rect: Rect, selected: boolean) => void;
  getLabel: (comp: CircuitComponent) => string;
}> = {
  'ground': {
    width: 40,
    height: 40,
    pins: [{ id: 'gnd', side: 'bottom' }],
    drawBody: (ctx, rect, selected) => {
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = 2;
      // Ground symbol
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
      // Horizontal bars
      for (let i = 0; i < 3; i++) {
        const y = cy + 8 + i * 4;
        const w = 20 - i * 6;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, y);
        ctx.lineTo(cx + w / 2, y);
        ctx.stroke();
      }
    },
    getLabel: () => 'GND',
  },
  'dc-source': {
    width: 60,
    height: 40,
    pins: [
      { id: 'plus', side: 'left', offset: -10 },
      { id: 'minus', side: 'left', offset: 10 },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.fillStyle = COMPONENT_BG;
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4);
      ctx.fill();
      ctx.stroke();
      // Battery symbol
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.strokeStyle = TEXT_COLOR;
      ctx.lineWidth = 2;
      // Long line (positive)
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 8);
      ctx.lineTo(cx - 15, cy + 8);
      ctx.stroke();
      // Short line (negative)
      ctx.beginPath();
      ctx.moveTo(cx + 15, cy - 4);
      ctx.lineTo(cx + 15, cy + 4);
      ctx.stroke();
      // + and - labels
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+', cx - 15, cy - 12);
      ctx.fillText('−', cx + 15, cy + 14);
    },
    getLabel: (comp) => `${(comp.params.voltage as number) ?? 5}V`,
  },
  'resistor': {
    width: 60,
    height: 30,
    pins: [
      { id: '1', side: 'left' },
      { id: '2', side: 'right' },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = 2;
      // Zigzag
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const w = 40;
      const h = 8;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy);
      for (let i = 0; i < 5; i++) {
        const x = cx - w / 2 + (i + 0.5) * (w / 5);
        const y = cy + (i % 2 === 0 ? -h : h);
        ctx.lineTo(x, y);
        ctx.lineTo(x + w / 10, cy);
      }
      ctx.lineTo(cx + w / 2, cy);
      ctx.stroke();
    },
    getLabel: (comp) => `${(comp.params.resistance as number) ?? 220}Ω`,
  },
  'led': {
    width: 50,
    height: 50,
    pins: [
      { id: 'a', side: 'left' },
      { id: 'k', side: 'right' },
    ],
    drawBody: (ctx, rect, selected) => {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const r = 18;

      // Body circle
      ctx.fillStyle = COMPONENT_BG;
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // LED triangle
      ctx.fillStyle = TEXT_COLOR;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 5, cy - 8);
      ctx.lineTo(cx + 5, cy + 8);
      ctx.closePath();
      ctx.fill();

      // LED line (cathode side)
      ctx.strokeStyle = TEXT_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy - 8);
      ctx.lineTo(cx + 5, cy + 8);
      ctx.stroke();

      // Arrows (light emission)
      ctx.strokeStyle = TEXT_COLOR;
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const angle = Math.PI / 6 + i * Math.PI / 3;
        const x = cx + 15 + Math.cos(angle) * 8;
        const y = cy + Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.moveTo(cx + 15, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    },
    getLabel: () => 'LED',
  },
  'diode': {
    width: 50,
    height: 30,
    pins: [
      { id: 'a', side: 'left' },
      { id: 'k', side: 'right' },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = 2;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      // Triangle
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 10);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx - 12, cy + 10);
      ctx.closePath();
      ctx.stroke();
      // Cathode line
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 10);
      ctx.lineTo(cx + 8, cy + 10);
      ctx.stroke();
    },
    getLabel: () => 'Diode',
  },
  'capacitor': {
    width: 50,
    height: 40,
    pins: [
      { id: '1', side: 'left' },
      { id: '2', side: 'right' },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = 2;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      // Two parallel plates
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 15);
      ctx.lineTo(cx - 15, cy + 15);
      ctx.moveTo(cx + 15, cy - 15);
      ctx.lineTo(cx + 15, cy + 15);
      ctx.stroke();
    },
    getLabel: (comp) => `${(comp.params.capacitance as number) ?? 1e-6}F`,
  },
  'inductor': {
    width: 60,
    height: 30,
    pins: [
      { id: '1', side: 'left' },
      { id: '2', side: 'right' },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = 2;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      for (let i = 0; i < 4; i++) {
        const x = cx - 24 + (i + 0.5) * 12;
        ctx.arc(x, cy, r, Math.PI, 0);
      }
      ctx.lineTo(cx + 24, cy);
      ctx.stroke();
    },
    getLabel: (comp) => `${(comp.params.inductance as number) ?? 1e-3}H`,
  },
  'arduino-uno': {
    width: 180,
    height: 100,
    pins: [
      { id: '5v', side: 'top', offset: -60 },
      { id: 'gnd', side: 'top', offset: -30 },
      { id: 'd13', side: 'top', offset: 0 },
      { id: 'd9', side: 'top', offset: 30 },
      { id: 'a0', side: 'top', offset: 60 },
    ],
    drawBody: (ctx, rect, selected) => {
      ctx.fillStyle = '#1a4a2e';
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : '#2d5a3e';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
      ctx.fill();
      ctx.stroke();
      // Label
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ARDUINO UNO', rect.x + rect.w / 2, rect.y + rect.h / 2 - 5);
      ctx.font = '10px sans-serif';
      ctx.fillText('ATmega328P', rect.x + rect.w / 2, rect.y + rect.h / 2 + 12);
    },
    getLabel: () => 'Arduino Uno',
  },
  // Default fallback
  'default': {
    width: 60,
    height: 40,
    pins: [{ id: '1', side: 'left' }, { id: '2', side: 'right' }],
    drawBody: (ctx, rect, selected) => {
      ctx.fillStyle = COMPONENT_BG;
      ctx.strokeStyle = selected ? COMPONENT_BORDER_SELECTED : COMPONENT_BORDER;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4);
      ctx.fill();
      ctx.stroke();
    },
    getLabel: (comp) => comp.type,
  },
};

function getVisualDef(type: string) {
  return COMPONENT_VISUALS[type] || COMPONENT_VISUALS.default;
}

function computeComponentRenderInfo(comp: CircuitComponent): ComponentRenderInfo {
  const def = getDefinition(comp.type) ?? { pins: [] };
  const visual = getVisualDef(comp.type);
  const rotation = comp.rotation || 0;

  // Base rect (unrotated)
  const baseRect: Rect = {
    x: comp.position.x - visual.width / 2,
    y: comp.position.y - visual.height / 2,
    w: visual.width,
    h: visual.height,
  };

  // Pin positions (unrotated)
  const pinOffsets: Record<string, Point> = {};
  for (const pinDef of def.pins) {
    const visualPin = visual.pins.find((p) => p.id === pinDef.id);
    if (!visualPin) continue;

    let px = baseRect.x + baseRect.w / 2;
    let py = baseRect.y + baseRect.h / 2;
    const offset = visualPin.offset ?? 0;

    switch (visualPin.side) {
      case 'left': px = baseRect.x; py = baseRect.y + baseRect.h / 2 + offset; break;
      case 'right': px = baseRect.x + baseRect.w; py = baseRect.y + baseRect.h / 2 + offset; break;
      case 'top': px = baseRect.x + baseRect.w / 2 + offset; py = baseRect.y; break;
      case 'bottom': px = baseRect.x + baseRect.w / 2 + offset; py = baseRect.y + baseRect.h; break;
    }
    pinOffsets[pinDef.id] = { x: px, y: py };
  }

  // Apply rotation
  const cos = Math.cos((rotation * Math.PI) / 180);
  const sin = Math.sin((rotation * Math.PI) / 180);
  const cx = comp.position.x;
  const cy = comp.position.y;

  const rotatePoint = (p: Point): Point => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };

  const rotatedPins: PinPosition[] = Object.entries(pinOffsets).map(([pinId, pos]) => {
    const rotated = rotatePoint(pos);
    // Determine side after rotation (approximate)
    const dx = rotated.x - cx;
    const dy = rotated.y - cy;
    let side: PinPosition['side'] = 'right';
    if (Math.abs(dx) > Math.abs(dy)) {
      side = dx > 0 ? 'right' : 'left';
    } else {
      side = dy > 0 ? 'bottom' : 'top';
    }
    return { pinId, x: rotated.x, y: rotated.y, side };
  });

  // Rotate body rect corners for hit testing
  const corners = [
    { x: baseRect.x, y: baseRect.y },
    { x: baseRect.x + baseRect.w, y: baseRect.y },
    { x: baseRect.x + baseRect.w, y: baseRect.y + baseRect.h },
    { x: baseRect.x, y: baseRect.y + baseRect.h },
  ].map(rotatePoint);

  const minX = Math.min(...corners.map((c) => c.x));
  const maxX = Math.max(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const maxY = Math.max(...corners.map((c) => c.y));

  return {
    body: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    pins: rotatedPins,
    label: visual.getLabel(comp),
    labelPos: { x: cx, y: maxY + 16 },
  };
}

// Wire path with Manhattan routing
function getWirePath(wire: Wire, circuitStore: ReturnType<typeof useCircuitStore.getState>): Point[] | null {
  const compA = circuitStore.getComponent(wire.a.cid);
  const compB = circuitStore.getComponent(wire.b.cid);
  if (!compA || !compB) return null;

  const infoA = computeComponentRenderInfo(compA);
  const infoB = computeComponentRenderInfo(compB);

  const pinA = infoA.pins.find((p) => p.pinId === wire.a.pid);
  const pinB = infoB.pins.find((p) => p.pinId === wire.b.pid);
  if (!pinA || !pinB) return null;

  // Simple L-shaped Manhattan routing
  const midX = (pinA.x + pinB.x) / 2;
  return [
    { x: pinA.x, y: pinA.y },
    { x: midX, y: pinA.y },
    { x: midX, y: pinB.y },
    { x: pinB.x, y: pinB.y },
  ];
}

function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function pointNearPin(p: Point, pin: PinPosition, threshold = 12): boolean {
  const dx = p.x - pin.x;
  const dy = p.y - pin.y;
  return dx * dx + dy * dy <= threshold * threshold;
}

export function CanvasRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    components,
    wires,
    selection,
    viewport,
    gridSize,
    snapToGrid,
    addComponent,
  } = useCircuitStore();

  const { dcViolations } = useSimulationStore();

  const [hoveredPin, setHoveredPin] = useState<{ compId: string; pinId: string } | null>(null);
  const [hoveredWire, setHoveredWire] = useState<number | null>(null);
  const [draggingWire, setDraggingWire] = useState<{ start: Point; end: Point; fromComp: string; fromPin: string } | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point | null>(null);
  const [draggingSelection, setDraggingSelection] = useState<{ start: Point; componentIds: string[] } | null>(null);
  const [clipboard, setClipboard] = useState<{ components: CircuitComponent[]; wires: Wire[] } | null>(null);
  const [draggingWireEndpoint, setDraggingWireEndpoint] = useState<{ wireIdx: number; endpoint: 'a' | 'b'; startPin: { compId: string; pinId: string }; end: Point } | null>(null);
  const [panning, setPanning] = useState<{ start: Point; origin: { x: number; y: number } } | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const spaceDownRef = useRef(false);

  // Transform utilities
  const screenToWorld = useCallback((pt: Point): Point => ({
    x: pt.x / viewport.zoom + viewport.x,
    y: pt.y / viewport.zoom + viewport.y,
  }), [viewport]);

  // === Canvas sizing: size the drawing buffer to its container at full DPR ===
  // Without this the canvas defaults to 300×150 and is stretched via CSS,
  // which breaks all coordinate mapping and rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      setCanvasSize({ w, h });
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvasSize.w;
      const height = canvasSize.h;
      if (width === 0 || height === 0) return; // canvas not sized yet

      // Base transform: scale so we draw in CSS pixels on a HiDPI buffer
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Apply viewport transform (in CSS pixel space; DPR handled by base transform)
      ctx.translate(-viewport.x * viewport.zoom, -viewport.y * viewport.zoom);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Draw grid
      drawGrid(ctx, width, height);

      // Draw wires
      drawWires(ctx);

      // Draw components
      drawComponents(ctx);

      // Draw selection box
      drawSelectionBox(ctx);

      // Draw dragging wire
      if (draggingWire) {
        drawDraggingWire(ctx);
      }

      // Draw dragging wire endpoint
      if (draggingWireEndpoint) {
        drawDraggingWireEndpoint(ctx);
      }
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const majorGrid = gridSize * 5;
      const startX = Math.floor(viewport.x / gridSize) * gridSize;
      const startY = Math.floor(viewport.y / gridSize) * gridSize;
      const endX = viewport.x + w / viewport.zoom;
      const endY = viewport.y + h / viewport.zoom;

      ctx.strokeStyle = GRID_COLOR_MINOR;
      ctx.lineWidth = 1 / viewport.zoom;

      // Minor grid
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, viewport.y);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(viewport.x, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Major grid
      ctx.strokeStyle = GRID_COLOR_MAJOR;
      ctx.lineWidth = 1.5 / viewport.zoom;
      for (let x = Math.floor(viewport.x / majorGrid) * majorGrid; x <= endX; x += majorGrid) {
        ctx.beginPath();
        ctx.moveTo(x, viewport.y);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = Math.floor(viewport.y / majorGrid) * majorGrid; y <= endY; y += majorGrid) {
        ctx.beginPath();
        ctx.moveTo(viewport.x, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    };

    const drawWires = (ctx: CanvasRenderingContext2D) => {
      const circuitStore = useCircuitStore.getState();
      wires.forEach((wire, idx) => {
        if (!wire) return;
        const path = getWirePath(wire, circuitStore);
        if (!path) return;

        const selected = selection.wireIds.has(idx) || hoveredWire === idx;
        ctx.strokeStyle = selected ? WIRE_COLOR_SELECTED : WIRE_COLOR;
        ctx.lineWidth = selected ? 3 / viewport.zoom : 2 / viewport.zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      });
    };

    const drawComponents = (ctx: CanvasRenderingContext2D) => {
      components.forEach((comp) => {
        const info = computeComponentRenderInfo(comp);
        const selected = selection.componentIds.has(comp.id);

        // Check for ERC violations on this component
        const hasError = dcViolations.some((v) =>
          v.severity === 'error' || v.severity === 'critical'
        ) && dcViolations.some((v) => v.componentIds.includes(comp.id));

        // Draw body
        const visual = getVisualDef(comp.type);
        visual.drawBody(ctx, info.body, selected || hasError);

        // Draw pins
        info.pins.forEach((pin) => {
          const isHovered = hoveredPin?.compId === comp.id && hoveredPin?.pinId === pin.pinId;
          ctx.fillStyle = isHovered ? PIN_COLOR_HOVER : PIN_COLOR;
          ctx.strokeStyle = COMPONENT_BG;
          ctx.lineWidth = 2 / viewport.zoom;
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, PIN_RADIUS / viewport.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Draw label
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(info.label, info.labelPos.x, info.labelPos.y);
      });
    };

    const drawSelectionBox = (ctx: CanvasRenderingContext2D) => {
      if (marqueeStart && marqueeEnd) {
        const x = Math.min(marqueeStart.x, marqueeEnd.x);
        const y = Math.min(marqueeStart.y, marqueeEnd.y);
        const w = Math.abs(marqueeEnd.x - marqueeStart.x);
        const h = Math.abs(marqueeEnd.y - marqueeStart.y);
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(88, 166, 255, 0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    };

    const drawDraggingWire = (ctx: CanvasRenderingContext2D) => {
      if (!draggingWire) return;
      ctx.strokeStyle = WIRE_COLOR_HOVER;
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.lineCap = 'round';
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      ctx.beginPath();
      ctx.moveTo(draggingWire.start.x, draggingWire.start.y);
      ctx.lineTo(draggingWire.end.x, draggingWire.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawDraggingWireEndpoint = (ctx: CanvasRenderingContext2D) => {
      if (!draggingWireEndpoint) return;
      const circuitStore = useCircuitStore.getState();
      const wire = wires[draggingWireEndpoint.wireIdx];
      if (!wire) return;
      const path = getWirePath(wire, circuitStore);
      if (!path) return;

      const endIdx = draggingWireEndpoint.endpoint === 'a' ? 0 : path.length - 1;
      const startPt = path[endIdx];

      ctx.strokeStyle = WIRE_COLOR_HOVER;
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.lineCap = 'round';
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(draggingWireEndpoint.end.x, draggingWireEndpoint.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    render();
  }, [
    components, wires, selection, viewport, gridSize, dcViolations,
    hoveredPin, hoveredWire, draggingWire, marqueeStart, marqueeEnd, draggingSelection,
    draggingWireEndpoint, snapToGrid, canvasSize
  ]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt);

    // Middle mouse button or space+drag = pan
    if (e.button === 1 || spaceDownRef.current) {
      e.preventDefault();
      setPanning({ start: screenPt, origin: { x: viewport.x, y: viewport.y } });
      return;
    }
    // Only left mouse button proceeds to selection/wiring
    if (e.button !== 0) return;

    // Check pin hover first - start wire or drag wire endpoint
    for (const comp of components.values()) {
      const info = computeComponentRenderInfo(comp);
      for (const pin of info.pins) {
        if (pointNearPin(worldPt, pin)) {
          // If shift+drag on already connected wire endpoint, start dragging endpoint
          // For now, start new wire
          setDraggingWire({
            start: { x: pin.x, y: pin.y },
            end: { x: pin.x, y: pin.y },
            fromComp: comp.id,
            fromPin: pin.pinId
          });
          return;
        }
      }
    }

    // Check if clicking on a wire endpoint to drag it (check before component hit-test
    // so endpoint drag wins when a wire end overlaps another component's body)
    const circuitStore = useCircuitStore.getState();
    for (let idx = 0; idx < wires.length; idx++) {
      const wire = wires[idx];
      if (!wire) continue;
      const path = getWirePath(wire, circuitStore);
      if (!path) continue;

      // Check near start point (endpoint a)
      if (pointNearPin(worldPt, { pinId: wire.a.pid, x: path[0].x, y: path[0].y, side: 'left' }, 15)) {
        setDraggingWireEndpoint({ wireIdx: idx, endpoint: 'a', startPin: { compId: wire.a.cid, pinId: wire.a.pid }, end: worldPt });
        return;
      }
      // Check near end point (endpoint b)
      if (pointNearPin(worldPt, { pinId: wire.b.pid, x: path[path.length - 1].x, y: path[path.length - 1].y, side: 'right' }, 15)) {
        setDraggingWireEndpoint({ wireIdx: idx, endpoint: 'b', startPin: { compId: wire.b.cid, pinId: wire.b.pid }, end: worldPt });
        return;
      }
    }

    // Check component selection
    let hitComponent = false;
    for (const comp of components.values()) {
      const info = computeComponentRenderInfo(comp);
      if (pointInRect(worldPt, info.body)) {
        hitComponent = true;
        if (e.shiftKey) {
          useCircuitStore.getState().selectComponent(comp.id, true);
        } else if (!selection.componentIds.has(comp.id)) {
          // Clicking a fresh component: select only it
          useCircuitStore.getState().selectComponent(comp.id, false);
        }
        // Start dragging selection (whether just selected or already selected)
        setDraggingSelection({ start: worldPt, componentIds: Array.from(useCircuitStore.getState().selection.componentIds) });
        return;
      }
    }

    // Check wire selection
    let hitWire = false;
    wires.forEach((wire, idx) => {
      if (!wire) return;
      const path = getWirePath(wire, circuitStore);
      if (path && pointNearWire(worldPt, path)) {
        hitWire = true;
        if (e.shiftKey) {
          useCircuitStore.getState().selectWire(idx, true);
        } else {
          useCircuitStore.getState().selectWire(idx, false);
        }
      }
    });

    // Start marquee selection only on empty space
    if (!hitComponent && !hitWire && !e.shiftKey) {
      useCircuitStore.getState().clearSelection();
      setMarqueeStart(worldPt);
      setMarqueeEnd(worldPt);
    }
  }, [components, wires, selection, screenToWorld, viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt);

    // Panning: translate viewport so the world point under the cursor stays fixed
    if (panning) {
      const dx = (screenPt.x - panning.start.x) / viewport.zoom;
      const dy = (screenPt.y - panning.start.y) / viewport.zoom;
      useCircuitStore.getState().setViewport({ x: panning.origin.x - dx, y: panning.origin.y - dy });
      return;
    }

    if (draggingWire) {
      setDraggingWire({ ...draggingWire, end: worldPt });
      return;
    }

    if (draggingWireEndpoint) {
      // Update end position for visual feedback
      setDraggingWireEndpoint({ ...draggingWireEndpoint, end: worldPt });
      return;
    }

    if (marqueeStart) {
      setMarqueeEnd(worldPt);
      // Update selection based on marquee
      const x1 = Math.min(marqueeStart.x, worldPt.x);
      const y1 = Math.min(marqueeStart.y, worldPt.y);
      const x2 = Math.max(marqueeStart.x, worldPt.x);
      const y2 = Math.max(marqueeStart.y, worldPt.y);

      components.forEach((comp) => {
        const info = computeComponentRenderInfo(comp);
        const centerX = info.body.x + info.body.w / 2;
        const centerY = info.body.y + info.body.h / 2;
        if (centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2) {
          useCircuitStore.getState().selectComponent(comp.id, true);
        }
      });
      return;
    }

    if (draggingSelection) {
      const dx = worldPt.x - draggingSelection.start.x;
      const dy = worldPt.y - draggingSelection.start.y;
      draggingSelection.componentIds.forEach((id) => {
        const comp = components.get(id);
        if (comp) {
          useCircuitStore.getState().moveComponent(id, {
            x: comp.position.x + dx,
            y: comp.position.y + dy,
          });
        }
      });
      setDraggingSelection({ ...draggingSelection, start: worldPt });
      return;
    }

    // Update pin hover
    let foundPin = false;
    for (const comp of components.values()) {
      const info = computeComponentRenderInfo(comp);
      for (const pin of info.pins) {
        if (pointNearPin(worldPt, pin)) {
          setHoveredPin({ compId: comp.id, pinId: pin.pinId });
          foundPin = true;
          return;
        }
      }
    }
    if (!foundPin) setHoveredPin(null);

    // Update wire hover
    const circuitStore = useCircuitStore.getState();
    let foundWire = false;
    wires.forEach((wire, idx) => {
      if (!wire) return;
      const path = getWirePath(wire, circuitStore);
      if (path && pointNearWire(worldPt, path)) {
        setHoveredWire(idx);
        foundWire = true;
      }
    });
    if (!foundWire) setHoveredWire(null);
  }, [draggingWire, draggingWireEndpoint, marqueeStart, draggingSelection, panning, viewport, components, wires, screenToWorld]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt);

    // Handle wire endpoint dragging
    if (draggingWireEndpoint) {
      // Check if we ended on a pin
      for (const comp of components.values()) {
        const info = computeComponentRenderInfo(comp);
        for (const pin of info.pins) {
          if (pointNearPin(worldPt, pin)) {
            // Don't connect to same pin
            if (comp.id === draggingWireEndpoint.startPin.compId && pin.pinId === draggingWireEndpoint.startPin.pinId) {
              setDraggingWireEndpoint(null);
              return;
            }
            // Update wire connection
            const wireIdx = draggingWireEndpoint.wireIdx;
            const wire = wires[wireIdx];
            if (wire) {
              useCircuitStore.getState().removeWire(wireIdx);
              const newWire = {
                a: draggingWireEndpoint.endpoint === 'a'
                  ? { cid: comp.id, pid: pin.pinId }
                  : wire.a,
                b: draggingWireEndpoint.endpoint === 'b'
                  ? { cid: comp.id, pid: pin.pinId }
                  : wire.b,
              };
              useCircuitStore.getState().addWire(newWire);
            }
            setDraggingWireEndpoint(null);
            return;
          }
        }
      }
      setDraggingWireEndpoint(null);
      return;
    }

    // Handle new wire creation
    if (draggingWire) {
      // Check if we ended on a pin
      for (const comp of components.values()) {
        const info = computeComponentRenderInfo(comp);
        for (const pin of info.pins) {
          if (pointNearPin(worldPt, pin)) {
            // Don't connect to same pin
            if (comp.id === draggingWire.fromComp && pin.pinId === draggingWire.fromPin) {
              setDraggingWire(null);
              return;
            }
            // Create wire
            useCircuitStore.getState().addWire({
              a: { cid: draggingWire.fromComp, pid: draggingWire.fromPin },
              b: { cid: comp.id, pid: pin.pinId },
            });
            setDraggingWire(null);
            return;
          }
        }
      }

      setDraggingWire(null);
      return;
    }

    // End marquee selection
    if (marqueeStart) {
      setMarqueeStart(null);
      setMarqueeEnd(null);
      return;
    }

    // End selection dragging
    if (draggingSelection) {
      setDraggingSelection(null);
      return;
    }

    // End panning
    if (panning) {
      setPanning(null);
      return;
    }
  }, [draggingWire, draggingWireEndpoint, marqueeStart, draggingSelection, panning, components, wires, screenToWorld]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt);

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(4, viewport.zoom * zoomFactor));

    // Zoom towards mouse position
    const newViewportX = worldPt.x - (worldPt.x - viewport.x) * (newZoom / viewport.zoom);
    const newViewportY = worldPt.y - (worldPt.y - viewport.y) * (newZoom / viewport.zoom);

    useCircuitStore.getState().setViewport({ x: newViewportX, y: newViewportY, zoom: newZoom });
  }, [viewport, screenToWorld]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space = pan modifier (hold); don't scroll the page
      if (e.code === 'Space') {
        spaceDownRef.current = true;
        e.preventDefault();
        return;
      }

      const { canUndo, canRedo, undo, redo, clearSelection, selectAll, removeComponent, addComponent } = useCircuitStore.getState();

      switch (e.key.toLowerCase()) {
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) redo(); else if (canUndo()) undo();
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (canRedo()) redo();
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectAll();
          }
          break;
        case 'escape':
          clearSelection();
          break;
        case 'delete':
        case 'backspace':
          // Delete selected
          useCircuitStore.getState().selection.componentIds.forEach((id) => removeComponent(id));
          useCircuitStore.getState().selection.wireIds.forEach((id) => useCircuitStore.getState().removeWire(id));
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Copy selected components and their connecting wires
            const selectedCompIds = Array.from(useCircuitStore.getState().selection.componentIds);
            if (selectedCompIds.length > 0) {
              const compsToCopy = selectedCompIds.map(id => useCircuitStore.getState().getComponent(id)!).filter(Boolean);
              const wireSet = new Set<string>();
              selectedCompIds.forEach(id => {
                const connectedWires = useCircuitStore.getState().getConnectedWires(id, '');
                connectedWires.forEach(({ wire, id: _wireIndex }) => { // using wireIndex to avoid unused var
                  if (wire) wireSet.add(`${wire.a.cid}:${wire.a.pid}-${wire.b.cid}:${wire.b.pid}`);
                });
              });
              const wiresToCopy = Array.from(wireSet).map(s => {
                const [a, b] = s.split('-');
                const [aCid, aPid] = a.split(':');
                const [bCid, bPid] = b.split(':');
                return { a: { cid: aCid, pid: aPid }, b: { cid: bCid, pid: bPid } };
              });
              setClipboard({ components: compsToCopy, wires: wiresToCopy });
            }
          }
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Paste with offset
            if (clipboard && clipboard.components.length > 0) {
              const offset = 30;
              const idMap = new Map<string, string>();
              clipboard.components.forEach(comp => {
                const newId = `${comp.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                idMap.set(comp.id, newId);
                addComponent({
                  ...comp,
                  id: newId,
                  position: { x: comp.position.x + offset, y: comp.position.y + offset },
                });
              });
              // Paste wires with remapped IDs
              clipboard.wires.forEach(wire => {
                const newA = idMap.get(wire.a.cid);
                const newB = idMap.get(wire.b.cid);
                if (newA && newB) {
                  useCircuitStore.getState().addWire({
                    a: { cid: newA, pid: wire.a.pid },
                    b: { cid: newB, pid: wire.b.pid },
                  });
                }
              });
              // Clear selection and select new components
              clearSelection();
              idMap.forEach((newId) => useCircuitStore.getState().selectComponent(newId, true));
            }
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Duplicate (copy + paste in place with small offset)
            const selectedCompIds = Array.from(useCircuitStore.getState().selection.componentIds);
            if (selectedCompIds.length > 0) {
              const compsToCopy = selectedCompIds.map(id => useCircuitStore.getState().getComponent(id)!).filter(Boolean);
              const wireSet = new Set<string>();
              selectedCompIds.forEach(id => {
                const connectedWires = useCircuitStore.getState().getConnectedWires(id, '');
                connectedWires.forEach(({ wire, id: _wireIndex }) => {
                  if (wire) wireSet.add(`${wire.a.cid}:${wire.a.pid}-${wire.b.cid}:${wire.b.pid}`);
                });
              });
              const wiresToCopy = Array.from(wireSet).map(s => {
                const [a, b] = s.split('-');
                const [aCid, aPid] = a.split(':');
                const [bCid, bPid] = b.split(':');
                return { a: { cid: aCid, pid: aPid }, b: { cid: bCid, pid: bPid } };
              });
              const idMap = new Map<string, string>();
              compsToCopy.forEach(comp => {
                const newId = `${comp.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                idMap.set(comp.id, newId);
                addComponent({
                  ...comp,
                  id: newId,
                  position: { x: comp.position.x + 20, y: comp.position.y + 20 },
                });
              });
              wiresToCopy.forEach(wire => {
                const newA = idMap.get(wire.a.cid);
                const newB = idMap.get(wire.b.cid);
                if (newA && newB) {
                  useCircuitStore.getState().addWire({
                    a: { cid: newA, pid: wire.a.pid },
                    b: { cid: newB, pid: wire.b.pid },
                  });
                }
              });
              clearSelection();
              idMap.forEach((newId) => useCircuitStore.getState().selectComponent(newId, true));
            }
          }
          break;
        case 'r':
          // Rotate selected component
          const selectedComp = Array.from(useCircuitStore.getState().selection.componentIds)[0];
          if (selectedComp) {
            const comp = useCircuitStore.getState().getComponent(selectedComp);
            if (comp) {
              useCircuitStore.getState().rotateComponent(selectedComp, (comp.rotation || 0) + 90);
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [clipboard]);

  // === Drag-and-drop from palette ===
  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const compType = e.dataTransfer.getData('application/x-component-type');
    if (!compType) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let worldPt = screenToWorld(screenPt);
    const { snapPosition } = useCircuitStore.getState();
    worldPt = snapPosition(worldPt);

    const id = `${compType}-${Date.now()}`;
    addComponent(createComponent(id, compType, {}, worldPt));
    // Select the newly dropped component
    useCircuitStore.getState().selectComponent(id, false);
  }, [screenToWorld, addComponent]);

  // Cursor reflects current interaction
  const cursor = panning || spaceDownRef.current ? 'grab' :
    draggingSelection ? 'move' :
    draggingWire || draggingWireEndpoint ? 'crosshair' :
    hoveredPin ? 'pointer' :
    'default';

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDraggingWire(null); setDraggingWireEndpoint(null); setPanning(null); }}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%', cursor, touchAction: 'none', display: 'block' }}
    />
  );
}

// Helper for wire hit testing
function pointNearWire(pt: Point, path: Point[], threshold = 8): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dist = distanceToSegment(pt, p1, p2);
    if (dist <= threshold) return true;
  }
  return false;
}

function distanceToSegment(pt: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
  let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}