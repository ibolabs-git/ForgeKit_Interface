import { useForgeKitStore } from '../store/forgekit.store'
import { useSendMessage } from '../hooks/useSendMessage'
import type { ForgeKitPhase, ForgeKitRole } from '../types'
import './LeftPanel.css'

const ALL_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER', 'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

const PHASES: { id: ForgeKitPhase; label: string; short: string }[] = [
  { id: 'F1', label: 'F1 — Fundament',       short: 'F1' },
  { id: 'F2', label: 'F2 — ForgeKit Logika', short: 'F2' },
  { id: 'F3', label: 'F3 — Multi-model',     short: 'F3' }
]

export function LeftPanel(): JSX.Element {
  // OPT-08: messages.length selektor umjesto cijelog messages arraya.
  const messagesLength = useForgeKitStore((s) => s.messages.length)
  const {
    activeRole, currentPhase,
    projectName, projectPath,
    setPhase, setShowProjectSetup
  } = useForgeKitStore()
  const { send, isStreaming } = useSendMessage()

  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase)

  const handleInvoke = (role: ForgeKitRole) => {
    if (isStreaming) return
    send(`[INVOKE:${role}]`)
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
                title={isActive ? `Aktivna uloga: ${role}` : `Pozovi ${role}`}
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
          {PHASES.map((p, i) => {
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
