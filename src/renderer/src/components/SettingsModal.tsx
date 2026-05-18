import { useState, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { ProviderInfo, ModelInfo } from '../types'
import './SettingsModal.css'

// ── Accordion sekcija ─────────────────────────────────────────────────────────

function AccordionSection({
  title, badge, badgeOk, open, onToggle, children
}: {
  title: string
  badge?: string
  badgeOk?: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className={`api-accordion ${open ? 'open' : ''}`}>
      <button className="api-accordion-header" onClick={onToggle}>
        <span className="api-accordion-title">{title}</span>
        <div className="api-accordion-right">
          {badge && (
            <span className={`api-accordion-badge ${badgeOk ? 'ok' : 'missing'}`}>
              {badgeOk ? `✓ ${badge}` : badge}
            </span>
          )}
          <span className="api-accordion-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && <div className="api-accordion-body">{children}</div>}
    </div>
  )
}

// ── Komponenta ────────────────────────────────────────────────────────────────

export function SettingsModal(): JSX.Element | null {
  const {
    showSettings, setShowSettings, settingsTab, setSettingsTab,
    selectedProvider, selectedModel, setProvider,
    projectName, setProjectName, projectPath, setShowProjectSetup
  } = useForgeKitStore()

  // ── Global state ──
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
  const [saved, setSaved] = useState(false)

  // Accordion open state
  const [openAnthropic, setOpenAnthropic] = useState(false)
  const [openOpenAI, setOpenOpenAI] = useState(false)
  const [openNvidia, setOpenNvidia] = useState(false)
  const [openGithub, setOpenGithub] = useState(false)

  // Test statusi
  const [nvidiaTestStatus, setNvidiaTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [nvidiaTestMsg, setNvidiaTestMsg] = useState('')
  const [githubTestStatus, setGithubTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [githubTestMsg, setGithubTestMsg] = useState('')

  // ── Project state ──
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
        setNvidiaTestStatus('idle')
        setGithubTestStatus('idle')
        // Auto-otvori sekciju koja nema podešen ključ
        setOpenAnthropic(!s.hasAnthropicKey)
        setOpenOpenAI(!s.hasOpenAIKey && s.hasAnthropicKey)
        setOpenNvidia(!s.hasNvidiaKey && s.hasAnthropicKey && s.hasOpenAIKey)
        setOpenGithub(false)
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

  const handleNvidiaTest = async () => {
    setNvidiaTestStatus('testing')
    setNvidiaTestMsg('')
    // Sačuvaj promjene prije testa ako su unesene
    if (nvidiaKey || nvidiaBaseUrl) {
      await window.api.saveSettings({
        nvidiaApiKey: nvidiaKey || undefined,
        nvidiaBaseUrl: nvidiaBaseUrl || undefined
      })
    }
    const result = await window.api.nvidiaTest(nvidiaKey, nvidiaBaseUrl)
    setNvidiaTestStatus(result.ok ? 'ok' : 'fail')
    setNvidiaTestMsg(result.message)
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

        {/* Header — uvijek vidljiv */}
        <div className="modal-header">
          <h2>Podešavanja</h2>
          <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
        </div>

        {/* Tabovi — uvijek vidljivi */}
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

        {/* ── GLOBALNI TAB ── */}
        {settingsTab === 'global' && (
          <>
            <div className="modal-body">

              {/* Anthropic */}
              <AccordionSection
                title="Anthropic (Claude)"
                badge={hasAnthropicKey ? 'Podešeno' : 'Nije podešeno'}
                badgeOk={hasAnthropicKey}
                open={openAnthropic}
                onToggle={() => setOpenAnthropic((v) => !v)}
              >
                <div className="settings-group">
                  <label className="settings-label">API Key</label>
                  <input
                    type="password" className="settings-input"
                    value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder={hasAnthropicKey ? '••••••• (unesi za promenu)' : 'sk-ant-...'}
                  />
                  <div className="settings-field-hint">console.anthropic.com</div>
                </div>
              </AccordionSection>

              {/* OpenAI */}
              <AccordionSection
                title="OpenAI (GPT)"
                badge={hasOpenAIKey ? 'Podešeno' : 'Nije podešeno'}
                badgeOk={hasOpenAIKey}
                open={openOpenAI}
                onToggle={() => setOpenOpenAI((v) => !v)}
              >
                <div className="settings-group">
                  <label className="settings-label">API Key</label>
                  <input
                    type="password" className="settings-input"
                    value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={hasOpenAIKey ? '••••••• (unesi za promenu)' : 'sk-...'}
                  />
                  <div className="settings-field-hint">platform.openai.com</div>
                </div>
              </AccordionSection>

              {/* NVIDIA NIM */}
              <AccordionSection
                title="NVIDIA NIM"
                badge={hasNvidiaKey ? 'Podešeno' : 'Nije podešeno'}
                badgeOk={hasNvidiaKey}
                open={openNvidia}
                onToggle={() => setOpenNvidia((v) => !v)}
              >
                <div className="settings-group">
                  <label className="settings-label">API Key</label>
                  <input
                    type="password" className="settings-input"
                    value={nvidiaKey} onChange={(e) => { setNvidiaKey(e.target.value); setNvidiaTestStatus('idle') }}
                    placeholder={hasNvidiaKey ? '••••••• (unesi za promenu)' : 'nvapi-...'}
                  />
                  <div className="settings-field-hint">
                    Besplatan pristup 80+ modela · <span className="settings-link">build.nvidia.com</span>
                  </div>
                </div>

                <div className="settings-group">
                  <label className="settings-label">Base URL</label>
                  <div className="nvidia-preset-row">
                    <button
                      className={`nvidia-preset-btn ${nvidiaBaseUrl === 'https://integrate.api.nvidia.com/v1' ? 'active' : ''}`}
                      onClick={() => { setNvidiaBaseUrl('https://integrate.api.nvidia.com/v1'); setNvidiaTestStatus('idle') }}
                    >Hosted NVIDIA</button>
                    <button
                      className={`nvidia-preset-btn ${nvidiaBaseUrl === 'http://localhost:8000/v1' ? 'active' : ''}`}
                      onClick={() => { setNvidiaBaseUrl('http://localhost:8000/v1'); setNvidiaTestStatus('idle') }}
                    >Local NIM</button>
                  </div>
                  <input
                    type="text" className="settings-input"
                    value={nvidiaBaseUrl} onChange={(e) => { setNvidiaBaseUrl(e.target.value); setNvidiaTestStatus('idle') }}
                    placeholder="https://integrate.api.nvidia.com/v1"
                  />
                </div>

                <div className="github-test-row">
                  <button
                    className={`btn-github-test ${nvidiaTestStatus}`}
                    onClick={handleNvidiaTest}
                    disabled={nvidiaTestStatus === 'testing'}
                  >
                    {nvidiaTestStatus === 'testing' ? 'Testiranje...' : 'Testiraj vezu'}
                  </button>
                  {nvidiaTestMsg && (
                    <span className={`github-test-msg ${nvidiaTestStatus}`}>{nvidiaTestMsg}</span>
                  )}
                </div>
              </AccordionSection>

              {/* GitHub */}
              <AccordionSection
                title="GitHub Integracija"
                badge={hasGithubToken ? 'Podešeno' : 'Nije podešeno'}
                badgeOk={hasGithubToken}
                open={openGithub}
                onToggle={() => setOpenGithub((v) => !v)}
              >
                <div className="settings-group">
                  <label className="settings-label">
                    GitHub Token
                    {hasGithubToken && <span className="key-set">✓ Podešeno</span>}
                  </label>
                  <input
                    type="password" className="settings-input"
                    value={githubToken}
                    onChange={(e) => { setGithubToken(e.target.value); setGithubTestStatus('idle') }}
                    placeholder={hasGithubToken ? '••••••• (unesi za promenu)' : 'ghp_...'}
                  />
                </div>
                <div className="settings-group">
                  <label className="settings-label">Repozitorijum</label>
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
              </AccordionSection>

              <div className="settings-note">
                API ključevi se čuvaju enkriptovano lokalno (DPAPI).
              </div>
            </div>

            {/* Footer — uvijek vidljiv */}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSettings(false)}>Otkazi</button>
              <button className={`btn-save ${saved ? 'saved' : ''}`} onClick={handleSaveGlobal}>
                {saved ? '✓ Sacuvano' : 'Sacuvaj'}
              </button>
            </div>
          </>
        )}

        {/* ── PROJEKAT TAB ── */}
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
                    {projectPath ?? 'Nije podešeno'}
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
