import type { CircuitComponent } from '../core/model.js';

interface Rect { x: number; y: number; w: number; h: number; }

interface PhysicalRenderState {
  ledBrightness?: number | null;
  ledOn?: boolean;
  lcdText?: string;
  lcdContrast?: number;
  motorSpeed?: number;
  servoAngle?: number;
}

function roundedRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number): void {
  const rr = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, rr);
}

function shadow(ctx: CanvasRenderingContext2D, blur = 8, alpha = 0.35): void {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = 3;
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function bodyStroke(selected: boolean): string {
  return selected ? '#f78166' : '#26313c';
}

function drawResistor(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, value: number): void {
  const body = { x: r.x + 14, y: r.y + 5, w: r.w - 28, h: r.h - 10 };
  shadow(ctx, 6, 0.25);
  const gradient = ctx.createLinearGradient(0, body.y, 0, body.y + body.h);
  gradient.addColorStop(0, '#f5e2b6');
  gradient.addColorStop(0.45, '#d6bd8a');
  gradient.addColorStop(1, '#9b7d4f');
  roundedRect(ctx, body, 7);
  ctx.fillStyle = gradient;
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = bodyStroke(selected);
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();

  // Approximate educational banding; the actual value remains in the model.
  const bands = ['#7d3f00', '#111111', '#7d3f00', '#d9c07a'];
  const bx = [body.x + body.w * 0.25, body.x + body.w * 0.43, body.x + body.w * 0.61, body.x + body.w * 0.79];
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(bx[i] - 3, body.y, 6, body.h); });
  ctx.strokeStyle = '#a8b3bf'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(body.x, r.y + r.h / 2); ctx.moveTo(body.x + body.w, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); ctx.stroke();
  ctx.fillStyle = '#9aa7b4'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(`${value}Ω`, r.x + r.w / 2, r.y + r.h + 11);
}

function drawLED(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, state: PhysicalRenderState): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const brightness = Math.max(0, Math.min(1, state.ledBrightness ?? (state.ledOn ? 1 : 0)));
  if (brightness > 0.02) {
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 38);
    glow.addColorStop(0, `rgba(255,70,70,${0.55 * brightness})`);
    glow.addColorStop(0.45, `rgba(255,30,30,${0.22 * brightness})`);
    glow.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#9ba7b2'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r.x, cy); ctx.lineTo(cx - 12, cy); ctx.moveTo(cx + 12, cy); ctx.lineTo(r.x + r.w, cy); ctx.stroke();
  shadow(ctx, 5, 0.3);
  const glass = ctx.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18);
  glass.addColorStop(0, brightness > 0.05 ? '#ffeded' : '#f1b0b0');
  glass.addColorStop(0.35, brightness > 0.05 ? '#ff3e3e' : '#d95050');
  glass.addColorStop(1, '#7b1e1e');
  ctx.fillStyle = glass; ctx.strokeStyle = bodyStroke(selected); ctx.lineWidth = selected ? 2 : 1;
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); clearShadow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(cx - 5, cy - 6, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b9c3cc'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('LED', cx, r.y + r.h + 11);
}

function drawLCD(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, state: PhysicalRenderState): void {
  shadow(ctx, 10, 0.35);
  const shell = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  shell.addColorStop(0, '#d8dce2'); shell.addColorStop(0.5, '#a8afb8'); shell.addColorStop(1, '#727b86');
  roundedRect(ctx, r, 8); ctx.fillStyle = shell; ctx.fill(); ctx.strokeStyle = bodyStroke(selected); ctx.lineWidth = selected ? 2 : 1; ctx.stroke(); clearShadow(ctx);
  const screen = { x: r.x + 12, y: r.y + 12, w: r.w - 24, h: r.h * 0.54 };
  ctx.fillStyle = '#254c2e'; ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
  ctx.fillStyle = `rgba(126,255,150,${0.25 + 0.45 * (state.lcdContrast ?? 0.5)})`; ctx.fillRect(screen.x + 2, screen.y + 2, screen.w - 4, screen.h - 4);
  ctx.fillStyle = '#7cff91'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  const text = state.lcdText ?? '';
  const row1 = text.slice(0, 16).padEnd(16, ' '), row2 = text.slice(16, 32).padEnd(16, ' ');
  ctx.fillText(row1, screen.x + 6, screen.y + 14); ctx.fillText(row2, screen.x + 6, screen.y + 28);
  // Header / pin labels for physical feel.
  ctx.fillStyle = '#38424d'; ctx.font = '8px sans-serif'; ctx.fillText('1602 CHARACTER DISPLAY', r.x + 12, r.y + r.h - 10);
  for (let i = 0; i < 4; i++) { const px = r.x + 18 + i * 18; ctx.fillStyle = '#c8902f'; ctx.fillRect(px, r.y + r.h, 6, 10); }
}

function drawArduino(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, state: PhysicalRenderState): void {
  shadow(ctx, 10, 0.35);
  const board = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  board.addColorStop(0, '#3c9a5d'); board.addColorStop(1, '#17653a');
  roundedRect(ctx, r, 7); ctx.fillStyle = board; ctx.fill(); ctx.strokeStyle = bodyStroke(selected); ctx.lineWidth = selected ? 2 : 1; ctx.stroke(); clearShadow(ctx);
  // USB connector.
  ctx.fillStyle = '#b7c0c8'; roundedRect(ctx, { x: r.x - 11, y: r.y + 15, w: 22, h: 18 }, 2); ctx.fill();
  ctx.fillStyle = '#e0a33b'; ctx.beginPath(); ctx.arc(r.x + 20, r.y + 26, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17251c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Arduino', r.x + r.w / 2, r.y + r.h / 2 - 3); ctx.font = '8px sans-serif'; ctx.fillText('UNO • ATmega328P', r.x + r.w / 2, r.y + r.h / 2 + 12);
  // Header pins.
  for (let i = 0; i < 5; i++) { const px = r.x + 35 + i * 28; ctx.fillStyle = '#c7cdd2'; ctx.fillRect(px, r.y - 8, 7, 11); }
  // Built-in LED D13.
  const d13On = state.ledOn ?? false; ctx.fillStyle = d13On ? '#ff5c5c' : '#4b2929'; ctx.beginPath(); ctx.arc(r.x + r.w - 18, r.y + 18, 4, 0, Math.PI * 2); ctx.fill();
}

function drawMotor(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, speed: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  shadow(ctx, 7, 0.3);
  ctx.fillStyle = '#b8bec5'; ctx.strokeStyle = bodyStroke(selected); ctx.lineWidth = selected ? 2 : 1; ctx.beginPath(); ctx.ellipse(cx, cy, 20, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); clearShadow(ctx);
  ctx.fillStyle = '#7a828b'; ctx.fillRect(cx - 5, r.y - 7, 10, 9);
  const angle = (performance.now() / 1000) * (2 + 10 * Math.max(0, Math.min(1, speed)));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.fillStyle = '#3a424a'; ctx.fillRect(-2, -16, 4, 32); ctx.fillRect(-16, -2, 32, 4); ctx.restore();
  ctx.strokeStyle = '#c9943a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x, cy); ctx.lineTo(r.x + 8, cy); ctx.moveTo(r.x + r.w - 8, cy); ctx.lineTo(r.x + r.w, cy); ctx.stroke();
}

function drawServo(ctx: CanvasRenderingContext2D, r: Rect, selected: boolean, angle: number): void {
  shadow(ctx, 8, 0.3); roundedRect(ctx, r, 6); ctx.fillStyle = '#262d35'; ctx.fill(); ctx.strokeStyle = bodyStroke(selected); ctx.lineWidth = selected ? 2 : 1; ctx.stroke(); clearShadow(ctx);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2; ctx.fillStyle = '#6f7780'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); const a = (-90 + Math.max(0, Math.min(180, angle))) * Math.PI / 180; ctx.lineTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); ctx.stroke();
  ctx.fillStyle = '#c9943a'; for (let i = 0; i < 3; i++) ctx.fillRect(r.x + 10 + i * 10, r.y + r.h - 6, 6, 9);
}

export function drawPhysicalComponent(
  ctx: CanvasRenderingContext2D,
  comp: CircuitComponent,
  rect: Rect,
  selected: boolean,
  state: PhysicalRenderState = {},
): void {
  switch (comp.type) {
    case 'resistor': drawResistor(ctx, rect, selected, Number(comp.params.resistance ?? 220)); break;
    case 'led': drawLED(ctx, rect, selected, state); break;
    case 'lcd-1602': drawLCD(ctx, rect, selected, state); break;
    case 'arduino-uno': drawArduino(ctx, rect, selected, state); break;
    case 'dc-motor': drawMotor(ctx, rect, selected, Number(state.motorSpeed ?? comp.params.speed ?? 0) / 100); break;
    case 'servo': drawServo(ctx, rect, selected, Number(state.servoAngle ?? comp.params.angle ?? 90)); break;
    default: break;
  }
}
