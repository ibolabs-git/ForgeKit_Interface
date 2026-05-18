import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ForgeKit ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#181818',
        color: '#e8e8e8',
        fontFamily: 'Share Tech Mono, monospace',
        gap: '20px',
        padding: '40px'
      }}>
        <div style={{ fontSize: '32px', color: '#ff6b00' }}>⬡</div>
        <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', color: '#ff6b00' }}>
          FORGEKIT — CRASH RECOVERY
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          maxWidth: '500px',
          textAlign: 'center',
          lineHeight: '1.7',
          borderLeft: '2px solid #ff6b00',
          paddingLeft: '14px'
        }}>
          {this.state.error?.message ?? 'Neočekivana greška u renderovanju.'}
        </div>
        <div style={{ fontSize: '10px', color: '#555', maxWidth: '500px', textAlign: 'center' }}>
          Sesija i taskovi su sačuvani u projektnom folderu (session.json).
          Ponovo pokretanje će restaurirati posljednje stanje.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '8px',
            padding: '8px 24px',
            background: '#ff6b00',
            color: '#fff',
            border: 'none',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: 'pointer'
          }}
        >
          ↺ PONOVO POKRETANJE
        </button>
      </div>
    )
  }
}
