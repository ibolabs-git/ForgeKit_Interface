import { useState, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { ForgeKitPhase, ModelInfo } from '../types'
import './SidePanel.css'

async function uploadRecord(
  id: string,
  projectName: string,
  content: string,
  updateStatus: (id: string, status: 'pending' | 'uploading' | 'uploaded' | 'error', msg?: string) => void
) {
  updateStatus(id, 'uploading')
  const result = await window.api.githubUploadMemory({ projectName, content })
  if (result.ok) {
    updateStatus(id, 'uploaded')
  } else {
    updateStatus(id, 'error', result.message)
  }
}

const ROLE_COLORS: Record<string, string> = {
  ORCHESTRATOR: '#4a9eff',
  THINKER: '#9b59b6',
  BUILDER: '#2ecc71',
  REVIEWER: '#e67e22',
  'MEMORY CURATOR': '#1abc9c',
  OBSERVER: '#95a5a6'
}

const ROLE_ICONS: Record<string, string> = {
  ORCHESTRATOR: '🎯',
  THINKER: '🧠',
  BUILDER: '🔨',
  REVIEWER: '🔍',
  'MEMORY CURATOR': '📚',
  OBSERVER: '👁'
}

const PHASES: { id: ForgeKitPhase; label: string }[] = [
  { id: 'F1', label: 'F1 — Fundament' },
  { id: 'F2', label: 'F2 — ForgeKit Logika' },
  { id: 'F3', label: 'F3 — Multi-model' }
]

export function SidePanel(): JSX.Element {
  const {
    activeRole, currentPhase, tasks, messages,
    selectedProvider, selectedModel, customModelId, contextStatus,
    setProvider, setModel, setCustomModelId, refreshContext,
    memoryRecords, projectPath, projectName,
    toggleTask, addManualTask, removeTask, clearTasks, setPhase,
    updateMemoryStatus, removeMemoryRecord,
    setShowProjectSetup
  } = useForgeKitStore()

  const [newTaskInput, setNewTaskInput] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error'>('idle')
  const [updateMsg, setUpdateMsg] = useState('')

  // Model switcher state
  const [availableProviders, setAvailableProviders] = useState<{ id: string; name: string }[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [customInput, setCustomInput] = useState(customModelId)

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion).catch(() => {})
    window.api.getProviders().then(setAvailableProviders).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.getModels(selectedProvider).then(setAvailableModels).catch(() => {})
  }, [selectedProvider])

  // Sync local customInput with store
  useEffect(() => { setCustomInput(customModelId) }, [customModelId])

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setUpdateMsg('')
    try {
      const result = await window.api.checkForUpdate()
      if (result.hasUpdate) {
        setUpdateStatus('available')
        setUpdateMsg(`v${result.latestVersion} dostupan`)
      } else {
        setUpdateStatus('up-to-date')
        setUpdateMsg('Najnovija verzija')
      }
    } catch {
      setUpdateStatus('error')
      setUpdateMsg('Greska pri provjeri')
    }
  }

  const handleTriggerUpdate = async () => {
    await window.api.triggerUpdate()
  }

  const roleColor = ROLE_COLORS[activeRole] ?? '#888'
  const roleIcon = ROLE_ICONS[activeRole] ?? '●'
  const completedCount = tasks.filter((t) => t.completed).length
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase)

  // ── Efektivni model — isti izvor istine kao u InputBar/sendMessage ──
  const effectiveModelId = customModelId.trim() || selectedModel
  const isCustomActive = Boolean(customModelId.trim())

  // Human-readable display — strip ★ i [role tags]
  function shortName(fullName: string): string {
    return fullName.replace(/★\s*/, '').split('[')[0].trim()
  }
  const providerDisplayName = availableProviders.find((p) => p.id === selectedProvider)?.name ?? selectedProvider
  const modelDisplayName = isCustomActive
    ? 'Custom'
    : shortName(availableModels.find((m) => m.id === selectedModel)?.name ?? selectedModel)

  const handleAddTask = () => {
    const text = newTaskInput.trim()
    if (!text) return
    addManualTask(text)
    setNewTaskInput('')
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTask()
  }

  return (
    <aside className="side-panel">
      {/* Aktivna uloga */}
      <section className="panel-section">
        <div className="panel-label">AKTIVNA ULOGA</div>
        <div className="role-display" style={{ borderColor: roleColor }}>
          <span className="role-icon">{roleIcon}</span>
          <span className="role-name" style={{ color: roleColor }}>[{activeRole}]</span>
        </div>
      </section>

      {/* Faze — klikabilne */}
      <section className="panel-section">
        <div className="panel-label">FAZA</div>
        <div className="phase-track">
          {PHASES.map((p, i) => (
            <div
              key={p.id}
              className={`phase-item ${currentPhase === p.id ? 'active' : ''} ${i < currentPhaseIndex ? 'done' : ''}`}
              onClick={() => setPhase(p.id)}
              title={`Prebaci na ${p.id}`}
            >
              <span className="phase-dot" />
              <span className="phase-label">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Taskovi */}
      <section className="panel-section panel-tasks">
        <div className="panel-label">
          TASKOVI
          <div className="task-header-actions">
            {tasks.length > 0 && (
              <>
                <span className="task-count">{completedCount}/{tasks.length}</span>
                <button className="clear-tasks-btn" onClick={clearTasks} title="Ocisti sve taskove">✕</button>
              </>
            )}
          </div>
        </div>

        {/* Input za manual task */}
        <div className="task-input-row">
          <input
            className="task-input"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            onKeyDown={handleTaskKeyDown}
            placeholder="Dodaj task..."
          />
          <button
            className="task-add-btn"
            onClick={handleAddTask}
            disabled={!newTaskInput.trim()}
            title="Dodaj task (Enter)"
          >+</button>
        </div>

        {tasks.length === 0 ? (
          <div className="tasks-empty">Taskovi ce se pojaviti ovde</div>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <span className="task-cb" onClick={() => toggleTask(task.id)}>
                  {task.completed ? '☑' : '☐'}
                </span>
                <span className="task-text" onClick={() => toggleTask(task.id)}>
                  {task.content}
                </span>
                <button
                  className="task-remove-btn"
                  onClick={() => removeTask(task.id)}
                  title="Ukloni task"
                >✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Memory Curator */}
      <section className="panel-section panel-memory">
        <div className="panel-label">MEMORY CURATOR</div>

        {memoryRecords.length === 0 ? (
          <div className="memory-empty">
            Zapisi se kreiraju automatski kada AI preuzme ulogu [MEMORY CURATOR]
          </div>
        ) : (
          <ul className="memory-list">
            {memoryRecords.map((rec) => (
              <li key={rec.id} className={`memory-item memory-${rec.status}`}>
                <div className="memory-item-content">
                  {rec.content.slice(0, 80)}{rec.content.length > 80 ? '…' : ''}
                </div>
                <div className="memory-item-actions">
                  <span className={`memory-status memory-status-${rec.status}`}>
                    {rec.status === 'pending' && 'ceka'}
                    {rec.status === 'uploading' && 'upload...'}
                    {rec.status === 'uploaded' && '✓ GitHub'}
                    {rec.status === 'error' && `✗ ${rec.errorMessage ?? 'greska'}`}
                  </span>
                  {rec.status === 'error' && (
                    <button
                      className="memory-upload-btn"
                      onClick={() => uploadRecord(rec.id, projectName, rec.content, updateMemoryStatus)}
                      title="Pokusaj ponovo"
                    >↑</button>
                  )}
                  {(rec.status === 'uploaded' || rec.status === 'error') && (
                    <button
                      className="memory-remove-btn"
                      onClick={() => removeMemoryRecord(rec.id)}
                      title="Ukloni"
                    >✕</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Project */}
      <section className="panel-section panel-project">
        <div className="panel-label">PROJEKAT</div>
        {projectPath ? (
          <div className="project-path" title={projectPath}>
            {projectPath.split(/[\\/]/).slice(-2).join('/')}
          </div>
        ) : (
          <div className="project-path-empty">Nema aktivnog foldera</div>
        )}
        <button className="btn-project-setup" onClick={() => setShowProjectSetup(true)}>
          {projectPath ? 'Promeni folder' : 'Podesi folder'}
        </button>
      </section>

      {/* Model Switcher */}
      <section className="panel-section panel-session">
        <div className="panel-label">SESIJA</div>

        {/* ── Status info blok — izvor istine (isti kao sendMessage payload) ── */}
        <div className="session-status-block">
          <div className="session-row">
            <span className="session-key">Provider</span>
            <span className="session-val">{providerDisplayName}</span>
          </div>
          <div className="session-row">
            <span className="session-key">Model</span>
            <span className="session-val session-val-model" title={effectiveModelId}>
              {modelDisplayName}
            </span>
          </div>
          {isCustomActive && (
            <div className="session-row">
              <span className="session-key">ID</span>
              <span className="session-val session-val-id" title={effectiveModelId}>
                {effectiveModelId}
              </span>
            </div>
          )}
          <div className="session-row">
            <span className="session-key">Context</span>
            <span className={`session-context-val context-status-${contextStatus}`}>
              {contextStatus === 'synced' ? '✓ synced' : '⚠ needs refresh'}
            </span>
          </div>
          <div className="session-row">
            <span className="session-key">Poruke</span>
            <span className="session-val">{messages.length}</span>
          </div>
        </div>

        {/* ── Refresh dugme — prikaže se samo kad treba ── */}
        {contextStatus === 'needs_refresh' && (
          <button className="btn-refresh-context" onClick={refreshContext}>
            ↺ Refresh ForgeKit kontekst
          </button>
        )}

        {/* ── Kontrole za switch ── */}
        <div className="model-controls-separator">promijeni</div>

        {/* Provider select */}
        <div className="model-switcher-group">
          <select
            className="model-switcher-select"
            value={selectedProvider}
            onChange={(e) => {
              const newProvider = e.target.value
              const defaultModels: Record<string, string> = {
                anthropic: 'claude-sonnet-4-6',
                openai: 'gpt-5.4',
                nvidia: 'nvidia/nemotron-3-nano-30b-a3b'
              }
              setProvider(newProvider, defaultModels[newProvider] ?? '')
            }}
          >
            {availableProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Model select */}
        <div className="model-switcher-group">
          <select
            className="model-switcher-select"
            value={selectedModel}
            onChange={(e) => setModel(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Custom model ID (samo za NVIDIA) */}
        {selectedProvider === 'nvidia' && (
          <div className="model-switcher-group">
            <input
              className="model-switcher-input"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={() => { if (customInput !== customModelId) setCustomModelId(customInput) }}
              onKeyDown={(e) => { if (e.key === 'Enter') setCustomModelId(customInput) }}
              placeholder="Custom model ID (npr. org/model-name)"
            />
            {customModelId && (
              <button
                className="model-custom-clear"
                onClick={() => { setCustomInput(''); setCustomModelId('') }}
                title="Resetuj na dropdown model"
              >✕</button>
            )}
          </div>
        )}
      </section>

      {/* Verzija + Update */}
      <section className="panel-section panel-version">
        <div className="version-row">
          <span className="version-label">ForgeKit Interface</span>
          {appVersion && <span className="version-badge">v{appVersion}</span>}
        </div>
        <div className="update-row">
          <button
            className={`btn-check-update ${updateStatus}`}
            onClick={updateStatus === 'available' ? handleTriggerUpdate : handleCheckUpdate}
            disabled={updateStatus === 'checking'}
            title={updateStatus === 'available' ? 'Klikni za instalaciju' : 'Provjeri azuriranje'}
          >
            {updateStatus === 'checking' && '⟳ Provjera...'}
            {updateStatus === 'idle' && '↑ Provjeri update'}
            {updateStatus === 'up-to-date' && '✓ Azurno'}
            {updateStatus === 'available' && '↓ Instaliraj update'}
            {updateStatus === 'error' && '↑ Pokusaj ponovo'}
          </button>
          {updateMsg && (
            <span className={`update-msg update-msg-${updateStatus}`}>{updateMsg}</span>
          )}
        </div>
      </section>
    </aside>
  )
}
