import { useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { TabBar } from './TabBar'
import { WindowControls } from './WindowControls'
import './Header.css'

export function Header(): JSX.Element {
  const {
    projectName, setProjectName, setShowSettings,
    setShowHandoffModal, projectPath, saveProjectPack, addSystemMessage
  } = useForgeKitStore()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(projectName)
  const [isSavingProject, setIsSavingProject] = useState(false)

  const handleNameSubmit = () => {
    setProjectName(nameInput.trim() || projectName)
    setEditingName(false)
  }

  // C2: otvori HandoffModal umjesto window.confirm
  const handleNewSession = () => setShowHandoffModal(true)

  const handleSaveProject = async () => {
    if (!projectPath || isSavingProject) return
    setIsSavingProject(true)
    try {
      await saveProjectPack()
      addSystemMessage('Projekat je snimljen: session.json, project_handoff.md i project_chat_transcript.md su azurirani u projektnom folderu.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepoznata greska pri snimanju projekta.'
      addSystemMessage(`Snimanje projekta nije uspelo. ${message}`)
    } finally {
      setIsSavingProject(false)
    }
  }

  return (
    <header className="header">
      {/* Logo zone — left, fixed width to align with left panel */}
      <div className="header-left">
        <div className="header-logo">
          <div className="header-logo-mark">FK</div>
          <div className="header-logo-text">
            <span className="header-logo-name">FORGEKIT</span>
            <span className="header-logo-sub">INTERFACE</span>
          </div>
        </div>
      </div>

      {/* Tabs — inline in header, fill remaining space */}
      <TabBar />

      {/* Right controls */}
      <div className="header-right">
        <button
          className="header-save"
          onClick={handleSaveProject}
          disabled={!projectPath || isSavingProject}
          title="Snimi session, handoff i chat transcript u projektni folder"
        >
          {isSavingProject ? 'SNIMAM...' : 'SNIMI PROJEKAT'}
        </button>
        <button
          className="header-icon-btn"
          onClick={handleNewSession}
          title="Sacuvaj handoff dokument i oznaci novi radni period (razgovor ostaje)"
        >📋</button>
        <button
          className="header-icon-btn"
          onClick={() => setShowSettings(true)}
          title="Podesavanja"
        >⚙</button>
        <button
          className="header-cta"
          onClick={handleNewSession}
          title="Handoff projekta"
        >HANDOFF &nbsp;›</button>
      </div>

      {/* D5 — custom window controls */}
      <WindowControls />
    </header>
  )
}
