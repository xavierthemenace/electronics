/**
 * Reusable UI Components — Built on the design token system.
 *
 * @module ui/design/components
 */

import { FC, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, CSSProperties, useState, useRef } from 'react';

// ============================================================================
// DESIGN TOKEN VALUES (inline for style objects)
// ============================================================================

const tokens = {
  colors: {
    bg: {
      base: '#0d1117',
      canvas: '#0d1117',
      panel: '#161b22',
      elevated: '#21262d',
      hover: '#30363d',
      active: '#2d333b',
    },
    border: {
      subtle: '#21262d',
      default: '#30363d',
      emphasis: '#484f58',
      focus: '#58a6ff',
      error: '#f85149',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
      tertiary: '#6a737d',
      inverse: '#0d1117',
      link: '#58a6ff',
    },
    accent: {
      primary: '#58a6ff',
      primaryHover: '#79b8ff',
      secondary: '#d2a8ff',
    },
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
    circuit: {
      power: '#f78166',
      ground: '#7ee787',
      signal: '#a5d6ff',
      digital: '#58a6ff',
      analog: '#d2a8ff',
      wire: '#58a6ff',
      wireSelected: '#f78166',
      wireHover: '#d2a8ff',
      junction: '#58a6ff',
      pin: '#58a6ff',
      pinHover: '#f78166',
      componentBg: '#21262d',
      componentBorder: '#30363d',
      componentBorderSelected: '#f78166',
      gridMinor: '#161b22',
      gridMajor: '#21262d',
      selection: '#58a6ff',
      selectionBg: 'rgba(88, 166, 255, 0.1)',
      simulationActive: '#3fb950',
    },
  },
  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    xxxl: '32px',
    toolbarHeight: '56px',
    sidebarWidth: '280px',
    inspectorWidth: '300px',
    panelPadding: '16px',
    controlGap: '8px',
    groupGap: '16px',
  },
  typography: {
    fontFamily: {
      ui: '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"IBM Plex Mono", "SF Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      xxl: '20px',
      xxxl: '24px',
      display: '32px',
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
  },
  radii: {
    none: '0',
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    pill: '9999px',
    circle: '50%',
  },
  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 6px rgba(0, 0, 0, 0.35)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.45)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.5)',
    focus: '0 0 0 2px #58a6ff',
  },
  transitions: {
    fast: '80ms ease',
    normal: '150ms ease',
    slow: '250ms ease',
  },
  zIndex: {
    base: 0,
    dropdown: 100,
    tooltip: 200,
    modal: 300,
    toast: 400,
    contextMenu: 500,
  },
};

// ============================================================================
// STYLE HELPERS
// ============================================================================

function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

// ============================================================================
// BUTTON
// ============================================================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const buttonBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.spacing.sm,
  fontFamily: tokens.typography.fontFamily.ui,
  fontWeight: tokens.typography.fontWeight.medium,
  borderRadius: tokens.radii.md,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: `all ${tokens.transitions.fast}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  boxSizing: 'border-box',
};

const buttonSizes: Record<string, CSSProperties> = {
  sm: { padding: `${tokens.spacing.xs} ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.sm, height: '28px' },
  md: { padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, fontSize: tokens.typography.fontSize.base, height: '36px' },
  lg: { padding: `${tokens.spacing.md} ${tokens.spacing.xl}`, fontSize: tokens.typography.fontSize.md, height: '44px' },
};

const buttonVariants: Record<string, CSSProperties> = {
  primary: {
    background: tokens.colors.accent.primary,
    color: tokens.colors.text.inverse,
    borderColor: tokens.colors.accent.primary,
  },
  secondary: {
    background: tokens.colors.bg.elevated,
    color: tokens.colors.text.primary,
    borderColor: tokens.colors.border.default,
  },
  ghost: {
    background: 'transparent',
    color: tokens.colors.text.primary,
    borderColor: 'transparent',
  },
  danger: {
    background: tokens.colors.status.error,
    color: tokens.colors.text.inverse,
    borderColor: tokens.colors.status.error,
  },
};

const buttonDisabled: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };
const buttonFullWidth: CSSProperties = { width: '100%' };
const buttonLoading: CSSProperties = { position: 'relative', color: 'transparent' };

export const Button: FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  style = {},
  ...props
}) => {
  const combinedStyle = mergeStyles(
    buttonBase,
    buttonSizes[size],
    buttonVariants[variant],
    fullWidth ? buttonFullWidth : {},
    disabled ? buttonDisabled : {},
    loading ? buttonLoading : {},
    style
  );

  return (
    <button
      className={className}
      style={combinedStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{
          position: 'absolute',
          width: 16,
          height: 16,
          border: '2px solid currentColor',
          borderRightColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      )}
      {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
      <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};

// ============================================================================
// ICON BUTTON
// ============================================================================

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  title?: string;
  variant?: 'ghost' | 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: FC<IconButtonProps> = ({
  icon,
  title,
  variant = 'ghost',
  size = 'md',
  className = '',
  style = {},
  ...props
}) => {
  const combinedStyle = mergeStyles(
    buttonBase,
    buttonSizes[size],
    buttonVariants[variant],
    {
      padding: 0,
      width: size === 'sm' ? 28 : size === 'md' ? 36 : 44,
      height: size === 'sm' ? 28 : size === 'md' ? 36 : 44,
    },
    style
  );

  return (
    <button
      className={className}
      style={combinedStyle}
      title={title}
      aria-label={title}
      {...props}
    >
      {icon}
    </button>
  );
};

// ============================================================================
// INPUT
// ============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const inputWrapper: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.xs,
  width: '100%',
};

const inputLabel: CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.text.primary,
  fontFamily: tokens.typography.fontFamily.ui,
};

const inputInput: CSSProperties = {
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  background: tokens.colors.bg.base,
  border: `1px solid ${tokens.colors.border.default}`,
  borderRadius: tokens.radii.md,
  color: tokens.colors.text.primary,
  fontSize: tokens.typography.fontSize.base,
  fontFamily: tokens.typography.fontFamily.mono,
  transition: `border-color ${tokens.transitions.fast}, box-shadow ${tokens.transitions.fast}`,
  width: '100%',
  boxSizing: 'border-box',
};

const inputHelper: CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  color: tokens.colors.text.secondary,
  fontFamily: tokens.typography.fontFamily.ui,
};

const inputHelperError: CSSProperties = {
  ...inputHelper,
  color: tokens.colors.status.error,
};

export const Input: FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  style = {},
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div style={fullWidth ? inputWrapper : { ...inputWrapper, width: 'auto' }} className={className}>
      {label && <label htmlFor={inputId} style={inputLabel}>{label}</label>}
      <input
        id={inputId}
        style={mergeStyles(inputInput, error ? { borderColor: tokens.colors.border.error } : {}, style)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && <span id={errorId} style={inputHelperError} role="alert">{error}</span>}
      {helperText && !error && <span id={helperId} style={inputHelper}>{helperText}</span>}
    </div>
  );
};

// ============================================================================
// SELECT
// ============================================================================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: { value: string; label: string }[];
}

export const Select: FC<SelectProps> = ({
  label,
  error,
  helperText,
  fullWidth = true,
  options,
  className = '',
  style = {},
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  return (
    <div style={fullWidth ? inputWrapper : { ...inputWrapper, width: 'auto' }} className={className}>
      {label && <label htmlFor={selectId} style={inputLabel}>{label}</label>}
      <select
        id={selectId}
        style={mergeStyles(inputInput, error ? { borderColor: tokens.colors.border.error } : {}, style)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <span id={errorId} style={inputHelperError} role="alert">{error}</span>}
      {helperText && !error && <span id={helperId} style={inputHelper}>{helperText}</span>}
    </div>
  );
};

// ============================================================================
// CHECKBOX / TOGGLE
// ============================================================================

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

const checkboxWrapper: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: tokens.spacing.sm,
  cursor: 'pointer',
};

const checkboxInput: CSSProperties = {
  width: '16px',
  height: '16px',
  marginTop: '2px',
  accentColor: tokens.colors.accent.primary,
  flexShrink: 0,
};

const checkboxLabel: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.xs,
  fontSize: tokens.typography.fontSize.base,
  color: tokens.colors.text.primary,
  fontFamily: tokens.typography.fontFamily.ui,
  userSelect: 'none',
};

const checkboxDescription: CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  color: tokens.colors.text.secondary,
};

export const Checkbox: FC<CheckboxProps> = ({
  label,
  description,
  className = '',
  style = {},
  id,
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <label style={mergeStyles(checkboxWrapper, style)} className={className}>
      <input
        type="checkbox"
        id={checkboxId}
        style={checkboxInput}
        {...props}
      />
      <span style={checkboxLabel}>
        {label}
        {description && <span style={checkboxDescription}>{description}</span>}
      </span>
    </label>
  );
};

// ============================================================================
// PANEL
// ============================================================================

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  headerAction?: ReactNode;
}

const panelWrapper: CSSProperties = {
  background: tokens.colors.bg.panel,
  border: `1px solid ${tokens.colors.border.subtle}`,
  borderRadius: tokens.radii.lg,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const panelHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  borderBottom: `1px solid ${tokens.colors.border.subtle}`,
  background: tokens.colors.bg.elevated,
};

const panelTitle: CSSProperties = {
  margin: 0,
  fontSize: tokens.typography.fontSize.md,
  fontWeight: tokens.typography.fontWeight.semibold,
  fontFamily: tokens.typography.fontFamily.ui,
  color: tokens.colors.text.primary,
};

const panelContent: CSSProperties = {
  flex: 1,
  padding: tokens.spacing.lg,
  overflow: 'auto',
};

export const Panel: FC<PanelProps> = ({
  title,
  children,
  className = '',
  style = {},
  headerAction,
}) => {
  return (
    <div style={mergeStyles(panelWrapper, style)} className={className}>
      {title && (
        <div style={panelHeader}>
          <h3 style={panelTitle}>{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={panelContent}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const tooltipWrapper: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const tooltipTooltip: CSSProperties = {
  position: 'absolute',
  bottom: `calc(100% + ${tokens.spacing.sm})`,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  background: tokens.colors.text.tertiary,
  color: tokens.colors.text.inverse,
  fontSize: tokens.typography.fontSize.xs,
  fontFamily: tokens.typography.fontFamily.ui,
  borderRadius: tokens.radii.sm,
  whiteSpace: 'nowrap',
  opacity: 0,
  visibility: 'hidden',
  transition: `opacity ${tokens.transitions.fast}, visibility ${tokens.transitions.fast}`,
  zIndex: tokens.zIndex.tooltip,
  pointerEvents: 'none',
};

const tooltipVisible: CSSProperties = {
  opacity: 1,
  visibility: 'visible',
};

const tooltipArrow: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 0,
  height: 0,
  borderLeft: '5px solid transparent',
  borderRight: '5px solid transparent',
  borderTop: `5px solid ${tokens.colors.text.tertiary}`,
};

export const Tooltip: FC<TooltipProps> = ({
  content,
  children,
  delay = 300,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      style={tooltipWrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <div
        style={mergeStyles(tooltipTooltip, visible ? tooltipVisible : {})}
        role="tooltip"
      >
        {content}
        <div style={tooltipArrow} />
      </div>
    </span>
  );
};

// ============================================================================
// TABS
// ============================================================================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  style?: CSSProperties;
  variant?: 'line' | 'enclosed';
}

const tabsContainerBase: CSSProperties = {
  display: 'flex',
  borderBottom: `1px solid ${tokens.colors.border.subtle}`,
};

const tabsContainerEnclosed: CSSProperties = {
  ...tabsContainerBase,
  background: tokens.colors.bg.elevated,
  border: `1px solid ${tokens.colors.border.subtle}`,
  borderBottom: 'none',
  borderRadius: tokens.radii.md,
  padding: tokens.spacing.xs,
};

const tabsTabBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.spacing.sm,
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  fontFamily: tokens.typography.fontFamily.ui,
  color: tokens.colors.text.secondary,
  background: 'transparent',
  border: 'none',
  borderRadius: tokens.radii.sm,
  cursor: 'pointer',
  transition: `all ${tokens.transitions.fast}`,
  whiteSpace: 'nowrap',
};

const tabsTabActiveLine: CSSProperties = {
  color: tokens.colors.accent.primary,
  borderBottom: `2px solid ${tokens.colors.accent.primary}`,
  marginBottom: '-1px',
};

const tabsTabActiveEnclosed: CSSProperties = {
  color: tokens.colors.text.primary,
  background: tokens.colors.bg.panel,
  boxShadow: tokens.shadows.xs,
};

const tabsTabDisabled: CSSProperties = {
  opacity: 0.4,
  cursor: 'not-allowed',
};

export const Tabs: FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  style = {},
  variant = 'line',
}) => {
  return (
    <div
      style={mergeStyles(
        variant === 'line' ? tabsContainerBase : tabsContainerEnclosed,
        style
      )}
      className={className}
      role="tablist"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={tab.id}
          id={`tab-${tab.id}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          style={mergeStyles(
            tabsTabBase,
            activeTab === tab.id
              ? (variant === 'line' ? tabsTabActiveLine : tabsTabActiveEnclosed)
              : {},
            tab.disabled ? tabsTabDisabled : {}
          )}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// BADGE / STATUS BADGE
// ============================================================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const badgeBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.spacing.xs,
  fontFamily: tokens.typography.fontFamily.ui,
  fontWeight: tokens.typography.fontWeight.semibold,
  borderRadius: tokens.radii.pill,
  whiteSpace: 'nowrap',
};

const badgeSizes: Record<string, CSSProperties> = {
  sm: { padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`, fontSize: tokens.typography.fontSize.xs },
  md: { padding: `${tokens.spacing.xs} ${tokens.spacing.md}`, fontSize: tokens.typography.fontSize.sm },
};

const badgeVariants: Record<string, CSSProperties> = {
  default: {
    background: tokens.colors.bg.elevated,
    color: tokens.colors.text.secondary,
    border: `1px solid ${tokens.colors.border.default}`,
  },
  success: {
    background: tokens.colors.status.successBg,
    color: tokens.colors.status.success,
  },
  warning: {
    background: tokens.colors.status.warningBg,
    color: tokens.colors.status.warning,
  },
  error: {
    background: tokens.colors.status.errorBg,
    color: tokens.colors.status.error,
  },
  info: {
    background: tokens.colors.status.infoBg,
    color: tokens.colors.status.info,
  },
};

const badgeDot: CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  flexShrink: 0,
};

const badgeDotColors: Record<string, CSSProperties> = {
  success: { background: tokens.colors.status.success },
  warning: { background: tokens.colors.status.warning },
  error: { background: tokens.colors.status.error },
  info: { background: tokens.colors.status.info },
  default: { background: tokens.colors.text.secondary },
};

export const Badge: FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
}) => {
  return (
    <span style={mergeStyles(badgeBase, badgeSizes[size], badgeVariants[variant])}>
      {dot && <span style={mergeStyles(badgeDot, badgeDotColors[variant])} />}
      {children}
    </span>
  );
};

// ============================================================================
// DIVIDER
// ============================================================================

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: CSSProperties;
}

const dividerHorizontal: CSSProperties = {
  width: '100%',
  height: '1px',
  background: tokens.colors.border.subtle,
  margin: `${tokens.spacing.md} 0`,
};

const dividerVertical: CSSProperties = {
  width: '1px',
  height: '100%',
  background: tokens.colors.border.subtle,
  margin: `0 ${tokens.spacing.md}`,
};

export const Divider: FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
  style = {},
}) => {
  return (
    <div
      style={mergeStyles(
        orientation === 'horizontal' ? dividerHorizontal : dividerVertical,
        style
      )}
      className={className}
      role="separator"
    />
  );
};

// ============================================================================
// SPINNER
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const spinnerSizes = { sm: 16, md: 24, lg: 32 };

export const Spinner: FC<SpinnerProps> = ({ size = 'md', color = tokens.colors.accent.primary }) => {
  const diameter = spinnerSizes[size];
  return (
    <svg
      width={diameter}
      height={diameter}
      viewBox="0 0 24 24"
      style={{
        animation: 'spin 1s linear infinite',
        color,
      }}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
        style={{
          animation: 'dash 1.5s ease-in-out infinite',
        }}
      />
    </svg>
  );
};

// ============================================================================
// KEYFRAMES (injected once)
// ============================================================================

if (typeof document !== 'undefined' && !document.getElementById('design-system-keyframes')) {
  const style = document.createElement('style');
  style.id = 'design-system-keyframes';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes dash {
      0% { stroke-dashoffset: 0; }
      50% { stroke-dashoffset: 62.8; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-4px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}