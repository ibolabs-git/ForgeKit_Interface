import { useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { useSendMessage } from '../hooks/useSendMessage'
import type { ForgeKitPhase, ForgeKitRole, Task } from '../types'
import './LeftPanel.css'

const ALL_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER', 'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

const PHASES: { id: ForgeKitPhase; label: string; short: string }[] = [
  { id: 'F1', label: 'F1 — Fundament',       short: 'F1' },
  { id: 'F2', label: 'F2 — ForgeKit Logika', short: 'F2' },
  { id: 'F3', label: 'F3 — Multi-model',     short: 'F3' },
  { id: 'F4', label: 'F4 — Nexus',           short: 'F4' }
]

const PHASE_MARKER_REGEX = /\bF([1-4])\b/gi
const PHASE_DEFINITION_REGEX = /\b(?:Faza|Phase)\s*([1-4])\s*(?:[—–-]\s*([^\n\r]+))?/gi

type DetectedPhase = { id: ForgeKitPhase; label: string; short: string }

function roleDisplayName(role: ForgeKitRole): string {
  return role
    .toLowerCase()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizePhaseLabel(id: ForgeKitPhase, rawLabel?: string): DetectedPhase {
  const fallback = PHASES.find((p) => p.id === id) ?? { id, label: id, short: id }
  const cleanLabel = rawLabel
    ?.replace(/\*\*/g, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[:.]+$/g, '')
    .trim()

  if (!cleanLabel) return fallback
  return { id, label: `${id} — ${cleanLabel}`, short: id }
}

function detectDefinedPhases(sourceText: string, tasks: Task[]): DetectedPhase[] {
  const detected = new Map<ForgeKitPhase, DetectedPhase>()

  const addPhase = (phase: ForgeKitPhase, label?: string) => {
    if (!detected.has(phase)) detected.set(phase, normalizePhaseLabel(phase, label))
  }

  for (const task of tasks) {
    if (task.phase) addPhase(task.phase)
  }

  for (const match of sourceText.matchAll(PHASE_DEFINITION_REGEX)) {
    addPhase(`F${match[1]}` as ForgeKitPhase, match[2])
  }

  for (const match of sourceText.matchAll(PHASE_MARKER_REGEX)) {
    addPhase(`F${match[1]}` as ForgeKitPhase)
  }

  return PHASES.map((p) => detected.get(p.id)).filter(Boolean) as DetectedPhase[]
}

export function LeftPanel(): JSX.Element {
  // OPT-08: messages.length selektor umjesto cijelog messages arraya.
  const messagesLength = useForgeKitStore((s) => s.messages.length)
  const phaseSourceText = useForgeKitStore((s) =>
    s.messages
      .filter((m) => !m.isStreaming)
      .map((m) => m.content)
      .join('\n')
  )
  const {
    activeRole, currentPhase,
    projectName, projectPath, tasks,
    setPhase, setShowProjectSetup
  } = useForgeKitStore()
  const { send, isStreaming } = useSendMessage()

  const visiblePhases = useMemo(
    () => detectDefinedPhases(phaseSourceText, tasks),
    [phaseSourceText, tasks]
  )
  const currentPhaseIndex = visiblePhases.findIndex((p) => p.id === currentPhase)

  const handleInvoke = (role: ForgeKitRole) => {
    if (isStreaming) return
    send(`Pozivam ${roleDisplayName(role)}.`)
  }

  const handleForgeKitInit = () => {
    if (isStreaming) return
    send('[FORGEKIT_INIT]')
  }

  return (
    <aside className="left-panel">

      {/* Agent uloge — grid */}
      <section className="lp-section">
        <div className="lp-label">Agenti</div>
        <div className="lp-role-grid">
          {ALL_ROLES.map((role, i) => {
            const isActive = activeRole === role
            const dataRole = role.toLowerCase().replace(/\s+/g, '-')
            return (
              <button
                key={role}
                className={`lp-role-tile${isActive ? ' active' : ''}`}
                data-role={dataRole}
                onClick={() => handleInvoke(role)}
                disabled={isStreaming}
                title={isActive ? `Aktivna uloga: ${role}. Klik poziva ulogu ponovo.` : `Pozovi ${role}`}
              >
                <span className="lrt-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="lrt-name">{role}</div>
                {isActive && <span className="lrt-star">★</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* ForgeKit Init */}
      <section className="lp-section lp-section-init">
        <button
          className={`lp-btn-init${isStreaming ? ' disabled' : ''}`}
          onClick={handleForgeKitInit}
          disabled={isStreaming}
          title="Ucitaj ForgeKit dokumentaciju i pokreni Orchestrator"
        >
          <span className="lp-init-icon">▶</span>
          <span className="lp-init-label">Pokreni ForgeKit</span>
        </button>
      </section>

      {/* Faza rada */}
      <section className="lp-section lp-section-grow">
        <div className="lp-label">Faza rada</div>
        <div className="lp-phase-list">
          {visiblePhases.length === 0 && (
            <div className="lp-phase-empty">
              Faze ce se pojaviti kada ih projekat definise.
            </div>
          )}
          {visiblePhases.map((p, i) => {
            const isDone   = i < currentPhaseIndex
            const isActive = currentPhase === p.id
            return (
              <div
                key={p.id}
                className={`lp-phase-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => setPhase(p.id)}
                title={`Prebaci na ${p.id}`}
              >
                <span className="lp-phase-check">
                  {isDone   && <span className="lp-check-done">✓</span>}
                  {isActive && <span className="lp-check-active">■</span>}
                  {!isDone && !isActive && <span className="lp-check-empty">□</span>}
                </span>
                <span className={`lp-phase-txt ${isActive ? 'active' : ''}`}>{p.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Projekat */}
      <section className="lp-section">
        <div className="lp-label">Projekat</div>
        <div className="lp-project-name">{projectName}</div>
        <div className="lp-project-meta">
          <span className="lp-meta-row">Poruke: <strong>{messagesLength}</strong></span>
          {projectPath && (
            <span className="lp-meta-row lp-meta-path" title={projectPath}>
              {projectPath.split(/[\\/]/).slice(-1)[0]}
            </span>
          )}
        </div>
        <button
          className="lp-btn-setup"
          onClick={() => setShowProjectSetup(true)}
        >
          {projectPath ? 'Promeni folder' : '+ Podesi folder'}
        </button>
      </section>

    </aside>
  )
}
