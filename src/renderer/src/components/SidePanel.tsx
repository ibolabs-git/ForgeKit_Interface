import { useState, useEffect, useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { useSendMessage } from '../hooks/useSendMessage'
import { buildProjectContext } from '../utils/forgekit-context'
import {
  buildPhaseLadder,
  getFileActionRecoveryAction,
  getFileActionStatusCopy,
  splitProjectFileActions
} from '../utils/operational-state'
import type { ModelInfo, ProjectFileAction } from '../types'
import './SidePanel.css'

// OPT-07 + OPT-03: ReprimePreviewContent je posebna komponenta koja se mountuje SAMO
// kad je preview otvoren. Ona sama subscribeuje na messages — SidePanel ne treba da
// subscribeuje na messages i ne re-renderuje se na svaki stream token.
function ReprimePreviewContent(): JSX.Element {
  const messages      = useForgeKitStore((s) => s.messages)
  const projectName   = useForgeKitStore((s) => s.projectName)
  const currentPhase  = useForgeKitStore((s) => s.currentPhase)
  const activeRole    = useForgeKitStore((s) => s.activeRole)
  const tasks         = useForgeKitStore((s) => s.tasks)
  const selectedModel = useForgeKitStore((s) => s.selectedModel)
  const customModelId = useForgeKitStore((s) => s.customModelId)
  const projectPhases = useForgeKitStore((s) => s.projectPhases)
  const phaseLockStatus = useForgeKitStore((s) => s.phaseLockStatus)

  const text = buildProjectContext({
    projectName,
    currentPhase,
    activeRole,
    tasks,
    messages,
    selectedModel: customModelId.trim() || selectedModel,
    previousEffectiveModel: selectedModel,
    projectPhases,
    phaseLockStatus
  })

  return <pre className="reprime-preview-text">{text}</pre>
}

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

async function confirmProjectFileAction(
  id: string,
  filename: string,
  content: string,
  updateStatus: (id: string, status: ProjectFileAction['status'], msg?: string) => void
) {
  updateStatus(id, 'writing')
  const result = await window.api.projectWriteFile(filename, content)
  if (result.ok) {
    updateStatus(id, 'written')
  } else {
    updateStatus(id, 'error', result.message ?? 'Greska pri upisu fajla')
  }
}

export function SidePanel(): JSX.Element {
  // OPT-03: messages zamenjen sa messagesLength — SidePanel ne re-renderuje na svaki
  // stream token, samo kad se promeni broj poruka (nova poruka dodata/sesija resetovana)
  const messagesLength    = useForgeKitStore((s) => s.messages.length)
  const {
    isStreaming,
    activeRole, currentPhase, tasks,
    projectPhases, phaseLockStatus,
    selectedProvider, selectedModel, customModelId, contextStatus,
    setProvider, setModel, setCustomModelId,
    memoryRecords, projectFileActions, projectName,
    toggleTask, addManualTask, removeTask, clearTasks,
    updateMemoryStatus, removeMemoryRecord,
    updateProjectFileActionStatus, removeProjectFileAction,
    setHighlightMessageId
  } = useForgeKitStore()
  const { send } = useSendMessage()

  const [newTaskInput, setNewTaskInput] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [promptSource, setPromptSource] = useState<'github' | 'bundled' | 'pending'>('pending')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error'>('idle')
  const [updateMsg, setUpdateMsg] = useState('')
  const [reprimePreviewOpen, setReprimePreviewOpen] = useState(false)

  const [availableProviders, setAvailableProviders] = useState<{ id: string; name: string }[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [customInput, setCustomInput] = useState(customModelId)

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion).catch(() => {})
    window.api.getProviders().then(setAvailableProviders).catch(() => {})
    window.api.githubPromptSource().then(setPromptSource).catch(() => {})
    // Osvezi izvor prompta nakon sto main process zavrsi prvu poruku
    const unsub = window.api.onStreamComplete(() => {
      window.api.githubPromptSource().then(setPromptSource).catch(() => {})
    })
    return unsub
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
      setUpdateMsg('Greška pri proveri')
    }
  }

  const handleTriggerUpdate = async () => {
    await window.api.triggerUpdate()
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const effectiveModelId = customModelId.trim() || selectedModel
  const isCustomActive = Boolean(customModelId.trim())

  function shortName(fullName: string): string {
    return fullName.replace(/★\s*/, '').split('[')[0].trim()
  }

  const providerDisplayName = availableProviders.find((p) => p.id === selectedProvider)?.name ?? selectedProvider
  const modelDisplayName = isCustomActive
    ? 'Custom'
    : shortName(availableModels.find((m) => m.id === selectedModel)?.name ?? selectedModel)
  const phaseLadder = useMemo(() => buildPhaseLadder({
    currentPhase,
    projectPhases,
    phaseLockStatus,
    projectFileActions
  }), [currentPhase, projectPhases, phaseLockStatus, projectFileActions])
  const fileActionGroups = useMemo(
    () => splitProjectFileActions(projectFileActions),
    [projectFileActions]
  )
  const visibleFileActions = [
    ...fileActionGroups.active,
    ...fileActionGroups.recentWritten
  ]

  const handleAddTask = () => {
    const text = newTaskInput.trim()
    if (!text) return
    addManualTask(text)
    setNewTaskInput('')
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTask()
  }

  const handleRefreshContext = async () => {
    if (isStreaming) return
    await send(
      `[APP_REFRESH_CONTEXT]
Osvezi ForgeKit kontekst za trenutni projekat. Ne donosi nove odluke i ne menjaj opseg.
Odgovori kratko kao [ORCHESTRATOR]: kontekst je osvezen i nastavljamo od trenutne tacke.`,
      { hiddenUser: true, allowTemplateFollowup: false, timeoutMs: 45_000, forceRePrime: true }
    )
  }

  const handleForwardBlockedAction = async (action: ProjectFileAction) => {
    if (isStreaming) return
    removeProjectFileAction(action.id)
    await send(
      `Pozivam Builder.\n\nBlokirani file action je pripremila uloga ${action.sourceRole ?? 'nepoznato'}, pa nije mogao biti upisan.\n\nFajl: ${action.filename}\n\nZadatak: preuzmi ovaj draft, proveri da li je u granicama odobrenog opsega i ponovi ga kao BUILDER kroz PROJECT_WRITE_FILE pending akciju. Ne menjaj opseg i ne tvrdi da je fajl upisan dok app ne potvrdi.\n\nDRAFT:\n${action.content}`,
      { allowTemplateFollowup: false }
    )
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
            <div className="m-val orange">{messagesLength}</div>
          </div>
        </div>

        {/* Context status */}
        <div className="context-status-row">
          <span className={`context-badge context-badge-${contextStatus}`}>
            {contextStatus === 'synced' ? 'Kontekst: svez' : 'Kontekst: treba Re-Prime'}
          </span>
          <span className="context-role">{activeRole}</span>
        </div>

        {contextStatus === 'needs_refresh' && (
          <button
            className="btn-refresh-context"
            onClick={handleRefreshContext}
            disabled={isStreaming}
            title={isStreaming ? 'Sacekaj da se trenutni odgovor zavrsi' : 'Osvezi kontekst za aktivni model'}
          >
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
          {reprimePreviewOpen && <ReprimePreviewContent />}
        </div>

        <div className="phase-state-ladder">
          <div className="phase-state-title">Stanje faze</div>
          <div className="phase-state-steps">
            {phaseLadder.map((step) => (
              <div key={step.id} className={`phase-state-step phase-state-${step.state}`}>
                <span className="phase-state-dot" />
                <span className="phase-state-copy">{step.label}</span>
              </div>
            ))}
          </div>
          <div className="phase-state-note">
            {projectPhases.some((phase) => phase.id === currentPhase)
              ? 'Projektna faza'
              : 'App faza'}
          </div>
        </div>
      </section>

      {/* ── Model switcher ── */}
      <section className="panel-section">
        <div className="panel-label">MODEL</div>

        <select
          className="model-switcher-select"
          value={selectedProvider}
          disabled={isStreaming}
          onChange={(e) => {
            const newProvider = e.target.value
            const defaultModels: Record<string, string> = {
              anthropic: 'claude-sonnet-4-6',
              openai: 'gpt-4o',  // COMP-09 fix: gpt-5.4 ne postoji
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
          disabled={isStreaming}
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
              disabled={isStreaming}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={() => { if (customInput !== customModelId) setCustomModelId(customInput) }}
              onKeyDown={(e) => { if (e.key === 'Enter') setCustomModelId(customInput) }}
              placeholder="Custom model ID (org/model-name)"
            />
            {customModelId && (
              <button
                className="model-custom-clear"
                disabled={isStreaming}
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
      {/* Project file actions */}
      <section className="panel-section panel-file-actions">
        <div className="panel-label">Project File Actions</div>

        {projectFileActions.length === 0 ? (
          <div className="file-actions-empty">
            Predlozi za fajlove ce se pojaviti ovde pre upisa.
          </div>
        ) : (
          <>
            <ul className="file-action-list">
              {visibleFileActions.map((action) => {
                const isPassive = action.status === 'written'
                return (
                  <li key={action.id} className={`file-action-item file-action-${action.status}`}>
                    <div className="file-action-path-wrap">
                      <span className="file-action-field">zahvacena putanja</span>
                      <div className="file-action-path" title={action.filename}>{action.filename}</div>
                    </div>
                    <div className="file-action-meta">
                      <span className={`file-action-status file-action-status-${action.status}`}>
                        {getFileActionStatusCopy(action.status)}
                      </span>
                      {action.sourceRole && <span className="file-action-role">{action.sourceRole}</span>}
                    </div>
                    {action.errorMessage && (
                      <div className="file-action-message">{action.errorMessage}</div>
                    )}
                    {!isPassive && (
                      <div className="file-action-recovery">
                        <span className="file-action-field">akcija oporavka</span>
                        <span>{getFileActionRecoveryAction(action)}</span>
                      </div>
                    )}
                    <div className="file-action-buttons">
                      {action.status === 'pending' && (
                        <button
                          className="file-action-confirm"
                          onClick={() => confirmProjectFileAction(
                            action.id,
                            action.filename,
                            action.content,
                            updateProjectFileActionStatus
                          )}
                        >Upisi</button>
                      )}
                      {action.status === 'blocked' && (
                        <button
                          className="file-action-confirm"
                          onClick={() => handleForwardBlockedAction(action)}
                          disabled={isStreaming}
                          title="Prosledi Builder-u"
                        >Prosledi</button>
                      )}
                      {(action.status === 'pending' ||
                        action.status === 'written' ||
                        action.status === 'error' ||
                        action.status === 'blocked' ||
                        action.status === 'requires_review' ||
                        action.status === 'stale') && (
                        <button
                          className="file-action-remove"
                          onClick={() => removeProjectFileAction(action.id)}
                        >Ukloni</button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {fileActionGroups.oldWritten.length > 0 && (
              <details className="file-action-history">
                <summary>Raniji upisi ({fileActionGroups.oldWritten.length})</summary>
                <ul className="file-action-list file-action-list-history">
                  {fileActionGroups.oldWritten.map((action) => (
                    <li key={action.id} className={`file-action-item file-action-${action.status}`}>
                      <div className="file-action-path-wrap">
                        <span className="file-action-field">zahvacena putanja</span>
                        <div className="file-action-path" title={action.filename}>{action.filename}</div>
                      </div>
                      <div className="file-action-meta">
                        <span className={`file-action-status file-action-status-${action.status}`}>
                          {getFileActionStatusCopy(action.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

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
        <div className="prompt-source-row">
          {promptSource === 'github'  && <span className="prompt-source prompt-source-github">■ Prompt: GitHub</span>}
          {promptSource === 'bundled' && <span className="prompt-source prompt-source-bundled">■ Prompt: Bundled</span>}
          {promptSource === 'pending' && <span className="prompt-source prompt-source-pending">■ Prompt: —</span>}
        </div>
        <div className="update-row">
          <button
            className={`btn-check-update ${updateStatus}`}
            onClick={updateStatus === 'available' ? handleTriggerUpdate : handleCheckUpdate}
            disabled={updateStatus === 'checking'}
            title={updateStatus === 'available' ? 'Klikni za instalaciju' : 'Proveri ažuriranje'}
          >
            {updateStatus === 'checking'   && '⟳ Provera...'}
            {updateStatus === 'idle'       && '↑ Proveri update'}
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
