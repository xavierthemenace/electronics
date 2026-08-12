/**
 * Design Token System — Centralized visual language for Electronics Mastery Lab.
 *
 * All colors, spacing, typography, shadows, and radii are defined here.
 * Components should import from this module rather than using raw values.
 *
 * @module ui/design/tokens
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

// Base palette — semantic names, not component-specific
export const colors = {
  // Backgrounds
  bg: {
    base: '#0d1117',           // Main app background
    canvas: '#0d1117',         // Circuit workspace
    panel: '#161b22',          // Sidebar, inspector, toolbar
    elevated: '#21262d',       // Cards, modals, dropdowns
    hover: '#30363d',          // Hover state on panel elements
    active: '#2d333b',         // Active/pressed state
  },

  // Borders
  border: {
    subtle: '#21262d',         // Hairline borders
    default: '#30363d',        // Standard borders
    emphasis: '#484f58',       // Stronger borders
    focus: '#58a6ff',          // Focus ring
    error: '#f85149',          // Error state borders
  },

  // Text
  text: {
    primary: '#e6edf3',        // Primary text
    secondary: '#8b949e',      // Secondary/muted text
    tertiary: '#6a737d',       // Placeholder, disabled text
    inverse: '#0d1117',        // On dark accents
    link: '#58a6ff',           // Links
  },

  // Semantic accent colors
  accent: {
    primary: '#58a6ff',        // Primary actions, selection, focus
    primaryHover: '#79b8ff',
    secondary: '#d2a8ff',      // Secondary actions
  },

  // Status colors (paired with icons/labels, never color-only)
  status: {
    success: '#3fb950',
    successBg: '#0d2818',
    warning: '#d29922',
    warningBg: '#332800',
    error: '#f85149',
    errorBg: '#330d0d',
    info: '#58a6ff',
    infoBg: '#0d2833',
  },

  // Circuit-specific semantic colors
  circuit: {
    power: '#f78166',          // VCC, positive supply
    ground: '#7ee787',         // GND, 0V reference
    signal: '#a5d6ff',         // Signal nets
    digital: '#58a6ff',        // Digital logic
    analog: '#d2a8ff',         // Analog signals
    wire: '#58a6ff',           // Default wire
    wireSelected: '#f78166',   // Selected wire
    wireHover: '#d2a8ff',      // Hovered wire
    junction: '#58a6ff',       // Wire junctions
    pin: '#58a6ff',            // Component pins
    pinHover: '#f78166',       // Hovered pin
    componentBg: '#21262d',    // Component body background
    componentBorder: '#30363d', // Component border
    componentBorderSelected: '#f78166',
    gridMinor: '#161b22',      // Minor grid lines
    gridMajor: '#21262d',      // Major grid lines
    selection: '#58a6ff',      // Marquee selection
    selectionBg: 'rgba(88, 166, 255, 0.1)',
    simulationActive: '#3fb950', // Running simulation indicator
  },

  // Legacy aliases for gradual migration
  legacy: {
    GRID_COLOR_MINOR: '#161b22',
    GRID_COLOR_MAJOR: '#21262d',
    WIRE_COLOR: '#58a6ff',
    WIRE_COLOR_SELECTED: '#f78166',
    WIRE_COLOR_HOVER: '#f78166',
    COMPONENT_BG: '#21262d',
    COMPONENT_BORDER: '#30363d',
    COMPONENT_BORDER_SELECTED: '#f78166',
    PIN_COLOR: '#58a6ff',
    PIN_COLOR_HOVER: '#f78166',
    TEXT_COLOR: '#e6edf3',
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  // Base unit: 4px
  xs: 2,      // 2px
  sm: 4,      // 4px
  md: 8,      // 8px
  lg: 12,     // 12px
  xl: 16,     // 16px
  xxl: 24,    // 24px
  xxxl: 32,   // 32px

  // Component-specific
  toolbarHeight: 56,
  sidebarWidth: 280,
  inspectorWidth: 300,
  panelPadding: 16,
  controlGap: 8,
  groupGap: 16,
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  fontFamily: {
    ui: '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "SF Mono", "Fira Code", monospace',
    // Fallback if IBM Plex not loaded
    uiFallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    monoFallback: '"SF Mono", "Fira Code", "Monaco", monospace',
  },

  fontSize: {
    xs: 10,
    sm: 12,
    base: 13,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Pre-composed text styles
  styles: {
    appTitle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui' },
    pageTitle: { fontSize: 18, fontWeight: 600, fontFamily: 'ui' },
    sectionTitle: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'ui' },
    panelTitle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui' },
    body: { fontSize: 13, fontWeight: 400, fontFamily: 'ui', lineHeight: 1.5 },
    secondary: { fontSize: 12, fontWeight: 400, fontFamily: 'ui', lineHeight: 1.5 },
    technical: { fontSize: 12, fontWeight: 400, fontFamily: 'mono', lineHeight: 1.4 },
    measurement: { fontSize: 13, fontWeight: 600, fontFamily: 'mono' },
    micro: { fontSize: 10, fontWeight: 400, fontFamily: 'ui' },
    button: { fontSize: 13, fontWeight: 500, fontFamily: 'ui' },
    label: { fontSize: 12, fontWeight: 500, fontFamily: 'ui' },
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 9999,
  circle: '50%',
} as const;

// ============================================================================
// SHADOWS / ELEVATION
// ============================================================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 2px 6px rgba(0, 0, 0, 0.35)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.45)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.5)',
  // Focus ring
  focus: '0 0 0 2px #58a6ff',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: '80ms ease',
  normal: '150ms ease',
  slow: '250ms ease',
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  tooltip: 200,
  modal: 300,
  toast: 400,
  contextMenu: 500,
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: 640,
  md: 1024,
  lg: 1440,
  xl: 1920,
} as const;

// ============================================================================
// GRID SYSTEM
// ============================================================================

export const grid = {
  baseSize: 20,
  minorColor: colors.circuit.gridMinor,
  majorColor: colors.circuit.gridMajor,
  majorInterval: 5, // every 5 minor lines = 1 major
} as const;

// ============================================================================
// COMPONENT VISUAL CONSTANTS
// ============================================================================

export const componentVisuals = {
  pinRadius: 6,
  pinStrokeWidth: 2,
  wireWidth: 2,
  wireSelectedWidth: 3,
  wireHoverWidth: 2,
  junctionRadius: 4,
  componentBorderWidth: 1,
  componentBorderSelectedWidth: 2,
  labelOffset: 16,
} as const;

// ============================================================================
// THEME OBJECT (for easy consumption)
// ============================================================================

export const theme = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  grid,
  componentVisuals,
} as const;

export type Theme = typeof theme;

// CSS-in-JS helper for creating style objects
export function cssStrings(template: TemplateStringsArray, ...values: unknown[]): string {
  return template.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
}

// Helper to get color with fallback
export function getColor(path: string): string {
  const keys = path.split('.');
  let obj: any = colors;
  for (const key of keys) {
    obj = obj?.[key];
    if (obj === undefined) return '#ff00ff'; // Magenta = missing token
  }
  return typeof obj === 'string' ? obj : '#ff00ff';
}