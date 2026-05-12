import { useState, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { ProviderInfo, ModelInfo } from '../types'
import './Header.css'

export function Header(): JSX.Element {
  const { selectedProvider, selectedModel, projectName, setProvider, setModel, setShowSettings, setProjectName, newSession } =
    useForgeKitStore()

  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(projectName)

  useEffect(() => {
    window.api.getProviders().then(setProviders)
  }, [])

  useEffect(() => {
    window.api.getModels(selectedProvider).then((m) => {
      setModels(m)
      if (m.length > 0) {
        const exists = m.find((x) => x.id === selectedModel)
        setProvider(selectedProvider, exists ? exists.id : m[0].id)
      }
    })
  }, [selectedProvider])

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    window.api.getModels(e.target.value).then((m) => {
      setProvider(e.target.value, m[0]?.id ?? '')
    })
  }

  const handleNameSubmit = () => {
    setProjectName(nameInput)
    setEditingName(false)
  }

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">⬡ ForgeKit</span>
        {editingName ? (
          <input
            className="project-name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
          />
        ) : (
          <span className="project-name" onClick={() => setEditingName(true)} title="Klikni za izmenu">
            {projectName}
          </span>
        )}
      </div>

      <div className="header-right">
        <select
          className="provider-select"
          value={selectedProvider}
          onChange={handleProviderChange}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <button
          className="new-session-btn"
          onClick={() => { if (confirm('Poceti novu sesiju? Trenutni razgovor ce biti izbrisan.')) newSession() }}
          title="Nova sesija"
        >
          ＋ Nova sesija
        </button>
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Podesavanja">
          ⚙
        </button>
      </div>
    </header>
  )
}
