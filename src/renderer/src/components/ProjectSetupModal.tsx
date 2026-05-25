import { useEffect, useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { useSendMessage } from '../hooks/useSendMessage'
import type { ModelInfo, ProviderInfo } from '../types'
import './ProjectSetupModal.css'

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'openai', name: 'OpenAI (GPT)' },
  { id: 'nvidia', name: 'NVIDIA NIM' }
]

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  nvidia: 'nvidia/nemotron-3-nano-30b-a3b'
}

export function ProjectSetupModal(): JSX.Element | null {
  const { showProjectSetup, setShowProjectSetup, projectName, setProjectPath, setProjectName, messages,
    selectedProvider, selectedModel, customModelId, setProvider, setModel, setCustomModelId } = useForgeKitStore()
  const { send, isStreaming } = useSendMessage()

  const [newName, setNewName] = useState(projectName)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    window.api.getProviders().then((providers) => {
      if (providers.length > 0) setAvailableProviders(providers)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.getModels(selectedProvider).then(setAvailableModels).catch(() => setAvailableModels([]))
  }, [selectedProvider])

  if (!showProjectSetup) return null

  const maybeStartForgeKit = () => {
    if (messages.length > 0 || isStreaming) return
    window.setTimeout(() => {
      send('[FORGEKIT_INIT]', { hiddenUser: true, allowTemplateFollowup: false })
    }, 120)
  }

  const handleChooseExisting = async () => {
    setError('')
    const path = await window.api.projectChooseFolder()
    if (path) {
      setProjectPath(path)
      setShowProjectSetup(false)
      maybeStartForgeKit()
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
        maybeStartForgeKit()
      } else {
        setError('Kreiranje otkazano.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleProviderSelect = (provider: string) => {
    setProvider(provider, DEFAULT_MODELS[provider] ?? '')
    setCustomModelId('')
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

          <div className="setup-option">
            <div className="setup-option-label">Model za start projekta</div>
            <div className="setup-row setup-model-row">
              <select
                className="settings-input setup-model-select"
                value={selectedProvider}
                disabled={isStreaming}
                onChange={(e) => handleProviderSelect(e.target.value)}
              >
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                className="settings-input setup-model-select"
                value={selectedModel}
                disabled={isStreaming}
                onChange={(e) => setModel(e.target.value)}
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                {selectedProvider === 'nvidia' && <option value="custom">Custom NVIDIA model</option>}
              </select>
            </div>
            {selectedProvider === 'nvidia' && selectedModel === 'custom' && (
              <input
                className="settings-input"
                value={customModelId}
                disabled={isStreaming}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="nvidia/model-id"
              />
            )}
            <div className="setup-hint">
              Model mozes promeniti i kasnije u panelu sesije.
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
          <button className="btn-cancel" onClick={handleSkip}>Preskoci</button>
        </div>
      </div>
    </div>
  )
}


