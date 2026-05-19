import { useForgeKitStore } from '../store/forgekit.store'
import type { ForgeKitPhase } from '../types'
import './LeftPanel.css'

const ROLE_ICONS: Record<string, string> = {
  ORCHESTRATOR: '🎯',
  THINKER: '🧠',
  BUILDER: '🔨',
  REVIEWER: '🔍',
  'MEMORY CURATOR': '📚',
  OBSERVER: '👁'
}

const PHASES: { id: ForgeKitPhase; label: string; short: string }[] = [
  { id: 'F1', label: 'F1 — Fundament',       short: 'F1' },
  { id: 'F2', label: 'F2 — ForgeKit Logika', short: 'F2' },
  { id: 'F3', label: 'F3 — Multi-model',     short: 'F3' }
]

export function LeftPanel(): JSX.Element {
  // OPT-08: messages.length selektor umjesto cijelog messages arraya.
  // LeftPanel koristi samo count — ovako ne re-renderuje na svaki stream token,
  // samo kad se broj poruka promijeni (nova poruka ili reset sesije).
  const messagesLength = useForgeKitStore((s) => s.messages.length)
  const {
    activeRole, currentPhase,
    projectName, projectPath,
    setPhase, setShowProjectSetup
  } = useForgeKitStore()

  const roleIcon = ROLE_ICONS[activeRole] ?? '●'
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase)

  return (
    <aside className="left-panel">

      {/* Aktivna uloga */}
      <section className="lp-section">
        <div className="lp-label">Aktivna uloga</div>
        <div className="lp-role-chip">
          <span className="lp-role-icon">{roleIcon}</span>
          <span className="lp-role-name">{activeRole}</span>
          <span className="lp-live-dot" />
        </div>
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
