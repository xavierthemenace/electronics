import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Electronics Mastery Lab] UI runtime error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#0d1117', color: '#e6edf3', padding: 32 }}>
        <div style={{ maxWidth: 720, width: '100%', border: '1px solid #f85149', borderRadius: 10, background: '#161b22', padding: 24 }}>
          <div style={{ color: '#f85149', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Application error</div>
          <div style={{ color: '#8b949e', marginBottom: 16 }}>The editor encountered an unexpected rendering error. Your project data has not been intentionally discarded.</div>
          <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', background: '#0d1117', padding: 12, borderRadius: 6, fontSize: 12 }}>{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, border: '1px solid #30363d', background: '#238636', color: '#fff', cursor: 'pointer' }}>Reload editor</button>
        </div>
      </div>
    );
  }
}
