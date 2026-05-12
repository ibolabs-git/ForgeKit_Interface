import { useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { ForgeKitPhase } from '../types'
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
    selectedProvider, selectedModel,
    memoryRecords, projectPath, projectName,
    toggleTask, addManualTask, removeTask, clearTasks, setPhase,
    updateMemoryStatus, removeMemoryRecord,
    setShowProjectSetup
  } = useForgeKitStore()

  const [newTaskInput, setNewTaskInput] = useState('')

  const roleColor = ROLE_COLORS[activeRole] ?? '#888'
  const roleIcon = ROLE_ICONS[activeRole] ?? '●'
  const completedCount = tasks.filter((t) => t.completed).length
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase)

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

      {/* Session info */}
      <section className="panel-section panel-session">
        <div className="panel-label">SESIJA</div>
        <div className="session-info">
          <div className="session-row">
            <span className="session-key">Provider</span>
            <span className="session-val">{selectedProvider}</span>
          </div>
          <div className="session-row">
            <span className="session-key">Model</span>
            <span className="session-val">{selectedModel.split('-').slice(0, 3).join('-')}</span>
          </div>
          <div className="session-row">
            <span className="session-key">Poruke</span>
            <span className="session-val">{messages.length}</span>
          </div>
        </div>
      </section>
    </aside>
  )
}
