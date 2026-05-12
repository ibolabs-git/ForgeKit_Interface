import { useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import './ProjectSetupModal.css'

export function ProjectSetupModal(): JSX.Element | null {
  const { showProjectSetup, setShowProjectSetup, projectName, setProjectPath, setProjectName } =
    useForgeKitStore()

  const [newName, setNewName] = useState(projectName)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!showProjectSetup) return null

  const handleChooseExisting = async () => {
    setError('')
    const path = await window.api.projectChooseFolder()
    if (path) {
      setProjectPath(path)
      setShowProjectSetup(false)
    }
  }

  const handleCreateNew = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError('')
    try {
      const path = await window.api.projectCreateFolder(name)
      if (path) {
        setProjectPath(path)
        setProjectName(name)
        setShowProjectSetup(false)
      } else {
        setError('Kreiranje otkazano.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleSkip = () => setShowProjectSetup(false)

  return (
    <div className="modal-overlay">
      <div className="modal-box project-setup-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Projektni folder</h2>
        </div>

        <div className="modal-body">
          <p className="setup-desc">
            ForgeKit cuva projektnu dokumentaciju lokalno. Odaberi postojeci folder
            ili kreiraj novi za ovaj projekat.
          </p>

          <div className="setup-option">
            <div className="setup-option-label">Kreiraj novi projektni folder</div>
            <div className="setup-row">
              <input
                className="settings-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                placeholder="Naziv projekta"
              />
              <button
                className="btn-setup-action"
                onClick={handleCreateNew}
                disabled={creating || !newName.trim()}
              >
                {creating ? 'Kreiranje...' : 'Kreiraj'}
              </button>
            </div>
            <div className="setup-hint">
              App ce predloziti lokaciju u Documents/ForgeKit/Projects/
            </div>
          </div>

          <div className="setup-divider">ili</div>

          <div className="setup-option">
            <div className="setup-option-label">Odaberi postojeci folder</div>
            <button className="btn-setup-choose" onClick={handleChooseExisting}>
              Pregledaj...
            </button>
          </div>

          {error && <div className="setup-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleSkip}>Preskoči</button>
        </div>
      </div>
    </div>
  )
}
