import { useState, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import './SettingsModal.css'

export function SettingsModal(): JSX.Element | null {
  const { showSettings, setShowSettings } = useForgeKitStore()

  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [githubTestStatus, setGithubTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [githubTestMsg, setGithubTestMsg] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (showSettings) {
      window.api.getSettings().then((s) => {
        setHasAnthropicKey(s.hasAnthropicKey)
        setHasOpenAIKey(s.hasOpenAIKey)
        setHasGithubToken(s.hasGithubToken)
        setGithubRepo(s.githubRepo || '')
        setAnthropicKey('')
        setOpenaiKey('')
        setGithubToken('')
        setSaved(false)
        setGithubTestStatus('idle')
      })
    }
  }, [showSettings])

  if (!showSettings) return null

  const handleSave = async () => {
    await window.api.saveSettings({
      anthropicApiKey: anthropicKey || undefined,
      openaiApiKey: openaiKey || undefined,
      githubToken: githubToken || undefined,
      githubRepo: githubRepo || undefined
    })
    setSaved(true)
    setTimeout(() => setShowSettings(false), 800)
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

        <div className="modal-body">
          <div className="settings-section-title">API Kljucevi</div>

          <div className="settings-group">
            <label className="settings-label">
              Anthropic API Key
              {hasAnthropicKey && <span className="key-set">✓ Podeseno</span>}
            </label>
            <input
              type="password"
              className="settings-input"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={hasAnthropicKey ? '••••••• (unesi za promenu)' : 'sk-ant-...'}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">
              OpenAI API Key
              {hasOpenAIKey && <span className="key-set">✓ Podeseno</span>}
            </label>
            <input
              type="password"
              className="settings-input"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={hasOpenAIKey ? '••••••• (unesi za promenu)' : 'sk-...'}
            />
          </div>

          <div className="settings-divider" />
          <div className="settings-section-title">GitHub Integracija</div>

          <div className="settings-group">
            <label className="settings-label">
              GitHub Token (Personal Access Token)
              {hasGithubToken && <span className="key-set">✓ Podeseno</span>}
            </label>
            <input
              type="password"
              className="settings-input"
              value={githubToken}
              onChange={(e) => { setGithubToken(e.target.value); setGithubTestStatus('idle') }}
              placeholder={hasGithubToken ? '••••••• (unesi za promenu)' : 'ghp_...'}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">GitHub Repozitorijum</label>
            <input
              type="text"
              className="settings-input"
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
            GitHub token se koristi za upload Memory Curator zapisa i fetch system prompta iz privatnog repozitorijuma.
            Token se cuva enkriptovano lokalno.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => setShowSettings(false)}>Otkazi</button>
          <button className={`btn-save ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '✓ Sacuvano' : 'Sacuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
