import { useState, useEffect, useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildProjectContext } from '../utils/forgekit-context'
import type { ModelInfo } from '../types'
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

export function SidePanel(): JSX.Element {
  const {
    activeRole, currentPhase, tasks, messages,
    selectedProvider, selectedModel, customModelId, contextStatus,
    setProvider, setModel, setCustomModelId, refreshContext,
    memoryRecords, projectName,
    toggleTask, addManualTask, removeTask, clearTasks,
    updateMemoryStatus, removeMemoryRecord,
    setHighlightMessageId
  } = useForgeKitStore()

  const [newTaskInput, setNewTaskInput] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error'>('idle')
  const [updateMsg, setUpdateMsg] = useState('')
  const [reprimePreviewOpen, setReprimePreviewOpen] = useState(false)

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

  const completedCount = tasks.filter((t) => t.completed).length

  // C1 — Re-Prime preview tekst
  const reprimePreviewText = useMemo(() =>
    buildProjectContext({
      projectName,
      currentPhase,
      activeRole,
      tasks,
      messages,
      selectedModel: customModelId.trim() || selectedModel,
      previousEffectiveModel: selectedModel
    }),
    [projectName, currentPhase, activeRole, tasks, messages, selectedModel, customModelId]
  )
  const effectiveModelId = customModelId.trim() || selectedModel
  const isCustomActive = Boolean(customModelId.trim())

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

      {/* ── Sesija — metric tiles grid ── */}
      <section className="panel-section">
        <div className="panel-label">SESIJA</div>

        <div className="metric-grid">
          {/* Tile 01 — Provider */}
          <div className="metric-tile">
            <span className="m-num">01</span>
            <div className="m-label">PROVIDER</div>
            <div className="m-val">{providerDisplayName}</div>
          </div>
          {/* Tile 02 — Model */}
          <div className="metric-tile">
            <span className="m-num">02</span>
            <div className="m-label">MODEL</div>
            <div className="m-val" title={effectiveModelId}>{modelDisplayName}</div>
          </div>
          {/* Tile 03 — Faza */}
          <div className="metric-tile">
            <span className="m-num">03</span>
            <div className="m-label">FAZA</div>
            <div className={`m-val ${currentPhase === 'F1' ? '' : currentPhase === 'F2' ? 'orange' : 'blue'}`}>{currentPhase}</div>
          </div>
          {/* Tile 04 — Poruke */}
          <div className="metric-tile">
            <span className="m-num">04</span>
            <div className="m-label">PORUKE</div>
            <div className="m-val orange">{messages.length}</div>
          </div>
        </div>

        {/* Context status */}
        <div className="context-status-row">
          <span className={`context-badge context-badge-${contextStatus}`}>
            {contextStatus === 'synced' ? '✓ synced' : '⚠ needs refresh'}
          </span>
          <span className="context-role">{activeRole}</span>
        </div>

        {contextStatus === 'needs_refresh' && (
          <button className="btn-refresh-context" onClick={refreshContext}>
            ↺ Refresh ForgeKit kontekst
          </button>
        )}

        {/* C1 — Re-Prime preview */}
        <div className="reprime-preview-wrap">
          <button
            className="reprime-preview-toggle"
            onClick={() => setReprimePreviewOpen((v) => !v)}
          >
            {reprimePreviewOpen ? '▾' : '▸'} RE-PRIME KONTEKST
          </button>
          {reprimePreviewOpen && (
            <pre className="reprime-preview-text">{reprimePreviewText}</pre>
          )}
        </div>
      </section>

      {/* ── Model switcher ── */}
      <section className="panel-section">
        <div className="panel-label">MODEL</div>

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

        <select
          className="model-switcher-select"
          value={selectedModel}
          onChange={(e) => setModel(e.target.value)}
          style={{ marginBottom: selectedProvider === 'nvidia' ? '5px' : '0' }}
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {selectedProvider === 'nvidia' && (
          <div className="model-custom-row">
            <input
              className="model-switcher-input"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={() => { if (customInput !== customModelId) setCustomModelId(customInput) }}
              onKeyDown={(e) => { if (e.key === 'Enter') setCustomModelId(customInput) }}
              placeholder="Custom model ID (org/model-name)"
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

      {/* ── Taskovi ── */}
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
                {task.sourceMessageId && (
                  <button
                    className="task-jump-btn"
                    onClick={(e) => { e.stopPropagation(); setHighlightMessageId(task.sourceMessageId!) }}
                    title="Skoci do poruke u chatu"
                  >↗</button>
                )}
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

      {/* ── Memory Curator ── */}
      <section className="panel-section panel-memory">
        <div className="panel-label">MEMORY CURATOR</div>

        {memoryRecords.length === 0 ? (
          <div className="memory-empty">
            Automatski kreira zapis kada AI preuzme ulogu [MEMORY CURATOR]
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
                    {rec.status === 'pending'   && 'ceka'}
                    {rec.status === 'uploading' && 'upload...'}
                    {rec.status === 'uploaded'  && '✓ GitHub'}
                    {rec.status === 'error'     && `✗ ${rec.errorMessage ?? 'greska'}`}
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

      {/* ── Verzija + Update ── */}
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
            {updateStatus === 'checking'   && '⟳ Provjera...'}
            {updateStatus === 'idle'       && '↑ Provjeri update'}
            {updateStatus === 'up-to-date' && '✓ Azurno'}
            {updateStatus === 'available'  && '↓ Instaliraj update'}
            {updateStatus === 'error'      && '↑ Pokusaj ponovo'}
          </button>
          {updateMsg && (
            <span className={`update-msg update-msg-${updateStatus}`}>{updateMsg}</span>
          )}
        </div>
      </section>

    </aside>
  )
}
