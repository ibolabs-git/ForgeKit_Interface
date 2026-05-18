import { useEffect, useState } from 'react'
import './WindowControls.css'

export function WindowControls(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    // Provjeri početno stanje
    window.api.winIsMaximized().then(setMaximized).catch(() => {})
  }, [])

  const handleMinimize = () => window.api.winMinimize().catch(() => {})
  const handleMaximize = async () => {
    await window.api.winMaximize().catch(() => {})
    const isMax = await window.api.winIsMaximized().catch(() => false)
    setMaximized(isMax)
  }
  const handleClose = () => window.api.winClose().catch(() => {})

  return (
    <div className="win-controls">
      <button
        className="win-btn win-minimize"
        onClick={handleMinimize}
        title="Minimiziraj"
      >
        ─
      </button>
      <button
        className="win-btn win-maximize"
        onClick={handleMaximize}
        title={maximized ? 'Vrati' : 'Maksimiziraj'}
      >
        {maximized ? '❐' : '□'}
      </button>
      <button
        className="win-btn win-close"
        onClick={handleClose}
        title="Zatvori"
      >
        ✕
      </button>
    </div>
  )
}
