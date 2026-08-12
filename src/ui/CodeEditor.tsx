import { useMemo, useState } from 'react';
import { useCodeStore } from '../stores/code.js';
import { runArduino, type ArduinoRunResult } from '../core/arduinoRuntime.js';

const shell: React.CSSProperties = { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#e6edf3' };
const header: React.CSSProperties = { height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', background: '#161b22', borderBottom: '1px solid #30363d' };
const button: React.CSSProperties = { border: '1px solid #30363d', background: '#21262d', color: '#e6edf3', borderRadius: 5, padding: '5px 9px', cursor: 'pointer', fontSize: 12 };

export function CodeEditor() {
  const { sourceCode, dirty, setSourceCode } = useCodeStore();
  const [result, setResult] = useState<ArduinoRunResult | null>(null);
  const lines = useMemo(() => sourceCode.split('\n'), [sourceCode]);

  const run = () => setResult(runArduino(sourceCode));

  return (
    <section style={shell} aria-label="Arduino code editor">
      <div style={header}>
        <strong style={{ fontSize: 12 }}>firmware.ino</strong>
        {dirty && <span title="Unsaved code">●</span>}
        <span style={{ color: '#8b949e', fontSize: 11 }}>Arduino C++ teaching runtime</span>
        <div style={{ flex: 1 }} />
        <button style={button} onClick={() => setSourceCode(sourceCode)} title="Format is intentionally conservative">Format</button>
        <button style={{ ...button, background: '#238636', borderColor: '#2ea043' }} onClick={run}>▶ Run</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '42px 1fr', fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>
        <div aria-hidden style={{ overflow: 'hidden', paddingTop: 10, textAlign: 'right', paddingRight: 8, color: '#6e7681', background: '#0d1117', userSelect: 'none' }}>
          {lines.map((_, i) => <div key={i} style={{ height: 18, lineHeight: '18px' }}>{i + 1}</div>)}
        </div>
        <textarea
          value={sourceCode}
          onChange={e => setSourceCode(e.target.value)}
          spellCheck={false}
          aria-label="Arduino source code"
          style={{ width: '100%', height: '100%', resize: 'none', border: 0, outline: 0, padding: 10, background: '#0d1117', color: '#e6edf3', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '18px', tabSize: 2 }}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); const el = e.currentTarget; const start = el.selectionStart; const end = el.selectionEnd; setSourceCode(sourceCode.slice(0, start) + '  ' + sourceCode.slice(end)); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; }); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
          }}
        />
      </div>

      <div style={{ borderTop: '1px solid #30363d', maxHeight: 110, overflow: 'auto', padding: 8, background: '#161b22', fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>
        {!result && <span style={{ color: '#6e7681' }}>Console ready. Ctrl/Cmd+Enter runs the sketch.</span>}
        {result?.errors.map((e, i) => <div key={i} style={{ color: '#f85149' }}>✕ {e}</div>)}
        {result?.state.serial.map((s, i) => <div key={i}><span style={{ color: '#6e7681' }}>{String(i).padStart(3, '0')}</span> {s}</div>)}
        {result?.state.warnings.map((w, i) => <div key={`w${i}`} style={{ color: '#d29922' }}>⚠ {w}</div>)}
        {result && !result.errors.length && !result.state.serial.length && !result.state.warnings.length && <span style={{ color: '#3fb950' }}>✓ Program completed ({result.steps} simulated steps).</span>}
      </div>
    </section>
  );
}
