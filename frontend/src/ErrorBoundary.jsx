import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff4757', background: '#050d1a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Application Crash</h2>
          <p style={{ fontSize: 18, marginBottom: 10 }}><strong>{this.state.error && this.state.error.toString()}</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#8ba4c0', background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 8 }}>
            {this.state.info && this.state.info.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
