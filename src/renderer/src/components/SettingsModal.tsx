import { useState, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { ProviderInfo, ModelInfo } from '../types'
import './SettingsModal.css'

export function SettingsModal(): JSX.Element | null {
  const {
    showSettings, setShowSettings, settingsTab, setSettingsTab,
    selectedProvider, selectedModel, setProvider, setModel,
    projectName, setProjectName, projectPath, setShowProjectSetup
  } = useForgeKitStore()

  // Global tab state
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [nvidiaKey, setNvidiaKey] = useState('')
  const [nvidiaBaseUrl, setNvidiaBaseUrl] = useState('https://integrate.api.nvidia.com/v1')
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [hasNvidiaKey, setHasNvidiaKey] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [githubTestStatus, setGithubTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [githubTestMsg, setGithubTestMsg] = useState('')
  const [saved, setSaved] = useState(false)

  // Project tab state
  const [editName, setEditName] = useState(projectName)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [localProvider, setLocalProvider] = useState(selectedProvider)
  const [localModel, setLocalModel] = useState(selectedModel)
  const [projectSaved, setProjectSaved] = useState(false)

  useEffect(() => {
    if (showSettings) {
      window.api.getSettings().then((s) => {
        setHasAnthropicKey(s.hasAnthropicKey)
        setHasOpenAIKey(s.hasOpenAIKey)
        setHasNvidiaKey(s.hasNvidiaKey)
        setNvidiaBaseUrl(s.nvidiaBaseUrl || 'https://integrate.api.nvidia.com/v1')
        setHasGithubToken(s.hasGithubToken)
        setGithubRepo(s.githubRepo || '')
        setAnthropicKey('')
        setOpenaiKey('')
        setNvidiaKey('')
        setGithubToken('')
        setSaved(false)
        setGithubTestStatus('idle')
      })
      window.api.getProviders().then(setProviders)
      window.api.getModels(selectedProvider).then(setModels)
      setEditName(projectName)
      setLocalProvider(selectedProvider)
      setLocalModel(selectedModel)
      setProjectSaved(false)
    }
  }, [showSettings])

  useEffect(() => {
    if (localProvider) {
      window.api.getModels(localProvider).then((m) => {
        setModels(m)
        if (m.length > 0 && !m.find((x) => x.id === localModel)) {
          setLocalModel(m[0].id)
        }
      })
    }
  }, [localProvider])

  if (!showSettings) return null

  const handleSaveGlobal = async () => {
    await window.api.saveSettings({
      anthropicApiKey: anthropicKey || undefined,
      openaiApiKey: openaiKey || undefined,
      nvidiaApiKey: nvidiaKey || undefined,
      nvidiaBaseUrl: nvidiaBaseUrl || undefined,
      githubToken: githubToken || undefined,
      githubRepo: githubRepo || undefined
    })
    setSaved(true)
    setTimeout(() => setShowSettings(false), 800)
  }

  const handleSaveProject = () => {
    setProjectName(editName.trim() || projectName)
    setProvider(localProvider, localModel)
    setProjectSaved(true)
    setTimeout(() => setShowSettings(false), 600)
  }

  const handleGithubTest = async () => {
    setGithubTestStatus('testing')
    setGithubTestMsg('')
    if (githubToken || githubRepo) {
      await window.api.saveSettings({
        githubToken: githubToken || undefined,
        githubRepo: githubRepo || undefined
      })
    }
    const result = await window.api.githubTest()
    setGithubTestStatus(result.ok ? 'ok' : 'fail')
    setGithubTestMsg(result.message)
  }

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Podesavanja</h2>
          <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
        </div>

        {/* Tabovi */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${settingsTab === 'global' ? 'active' : ''}`}
            onClick={() => setSettingsTab('global')}
          >Globalno</button>
          <button
            className={`settings-tab ${settingsTab === 'project' ? 'active' : ''}`}
            onClick={() => setSettingsTab('project')}
          >Projekat</button>
        </div>

        {/* Globalni tab */}
        {settingsTab === 'global' && (
          <>
            <div className="modal-body">
              <div className="settings-section-title">API Ključevi</div>

              <div className="settings-group">
                <label className="settings-label">
                  Anthropic API Key
                  {hasAnthropicKey && <span className="key-set">✓ Podeseno</span>}
                </label>
                <input
                  type="password" className="settings-input"
                  value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={hasAnthropicKey ? '••••••• (unesi za promenu)' : 'sk-ant-...'}
                />
              </div>

              <div className="settings-group">
                <label className="settings-label">
                  OpenAI API Key
                  {hasOpenAIKey && <span className="key-set">✓ Podeseno</span>}
                </label>
                <input
                  type="password" className="settings-input"
                  value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={hasOpenAIKey ? '••••••• (unesi za promenu)' : 'sk-...'}
                />
              </div>

              <div className="settings-group">
                <label className="settings-label">
                  NVIDIA NIM API Key
                  {hasNvidiaKey && <span className="key-set">✓ Podeseno</span>}
                </label>
                <input
                  type="password" className="settings-input"
                  value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)}
                  placeholder={hasNvidiaKey ? '••••••• (unesi za promenu)' : 'nvapi-...'}
                />
                <div className="settings-field-hint">
                  Besplatan pristup 80+ modela · Registracija:{' '}
                  <span className="settings-link">build.nvidia.com</span>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">NVIDIA NIM Base URL</label>
                <div className="nvidia-preset-row">
                  <button
                    className={`nvidia-preset-btn ${nvidiaBaseUrl === 'https://integrate.api.nvidia.com/v1' ? 'active' : ''}`}
                    onClick={() => setNvidiaBaseUrl('https://integrate.api.nvidia.com/v1')}
                  >Hosted NVIDIA</button>
                  <button
                    className={`nvidia-preset-btn ${nvidiaBaseUrl === 'http://localhost:8000/v1' ? 'active' : ''}`}
                    onClick={() => setNvidiaBaseUrl('http://localhost:8000/v1')}
                  >Local NIM</button>
                </div>
                <input
                  type="text" className="settings-input"
                  value={nvidiaBaseUrl} onChange={(e) => setNvidiaBaseUrl(e.target.value)}
                  placeholder="https://integrate.api.nvidia.com/v1"
                />
                <div className="settings-field-hint">
                  Za self-hosted NIM promijeni na http://localhost:8000/v1
                </div>
              </div>

              <div className="settings-divider" />
              <div className="settings-section-title">GitHub Integracija</div>

              <div className="settings-group">
                <label className="settings-label">
                  GitHub Token
                  {hasGithubToken && <span className="key-set">✓ Podeseno</span>}
                </label>
                <input
                  type="password" className="settings-input"
                  value={githubToken}
                  onChange={(e) => { setGithubToken(e.target.value); setGithubTestStatus('idle') }}
                  placeholder={hasGithubToken ? '••••••• (unesi za promenu)' : 'ghp_...'}
                />
              </div>

              <div className="settings-group">
                <label className="settings-label">GitHub Repozitorijum</label>
                <input
                  type="text" className="settings-input"
                  value={githubRepo}
                  onChange={(e) => { setGithubRepo(e.target.value); setGithubTestStatus('idle') }}
                  placeholder="korisnik/naziv-repoa"
                />
              </div>

              <div className="github-test-row">
                <button
                  className={`btn-github-test ${githubTestStatus}`}
                  onClick={handleGithubTest}
                  disabled={githubTestStatus === 'testing'}
                >
                  {githubTestStatus === 'testing' ? 'Testiranje...' : 'Testiraj vezu'}
                </button>
                {githubTestMsg && (
                  <span className={`github-test-msg ${githubTestStatus}`}>{githubTestMsg}</span>
                )}
              </div>

              <div className="settings-note">
                API ključevi i GitHub token se čuvaju enkriptovano lokalno.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSettings(false)}>Otkazi</button>
              <button className={`btn-save ${saved ? 'saved' : ''}`} onClick={handleSaveGlobal}>
                {saved ? '✓ Sacuvano' : 'Sacuvaj'}
              </button>
            </div>
          </>
        )}

        {/* Projekat tab */}
        {settingsTab === 'project' && (
          <>
            <div className="modal-body">
              <div className="settings-section-title">Informacije o projektu</div>

              <div className="settings-group">
                <label className="settings-label">Naziv projekta</label>
                <input
                  type="text" className="settings-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Naziv projekta"
                />
              </div>

              <div className="settings-group">
                <label className="settings-label">Projektni folder</label>
                <div className="project-folder-row">
                  <div className="project-folder-path" title={projectPath ?? ''}>
                    {projectPath ?? 'Nije podesen'}
                  </div>
                  <button
                    className="btn-change-folder"
                    onClick={() => { setShowSettings(false); setShowProjectSetup(true) }}
                  >Promeni</button>
                </div>
              </div>

              <div className="settings-divider" />
              <div className="settings-section-title">AI Model</div>

              <div className="settings-group">
                <label className="settings-label">Provider</label>
                <select
                  className="settings-select"
                  value={localProvider}
                  onChange={(e) => setLocalProvider(e.target.value)}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="settings-group">
                <label className="settings-label">Model</label>
                <select
                  className="settings-select"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="settings-note">
                Provider i model su vezani za ovaj projekat i snimaju se u session.json.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSettings(false)}>Otkazi</button>
              <button className={`btn-save ${projectSaved ? 'saved' : ''}`} onClick={handleSaveProject}>
                {projectSaved ? '✓ Primenjeno' : 'Primeni'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
