import { useMemo, useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { useSendMessage } from '../hooks/useSendMessage'
import type { ForgeKitRole } from '../types'
import './LeftPanel.css'

const ALL_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER', 'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

function roleDisplayName(role: ForgeKitRole): string {
  return role
    .toLowerCase()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function phaseSortValue(phase: string): number {
  const match = phase.match(/\d+/)
  return match ? Number(match[0]) : 999
}

export function LeftPanel(): JSX.Element {
  const [isSavingProject, setIsSavingProject] = useState(false)
  const messagesLength = useForgeKitStore((s) => s.messages.length)
  const {
    activeRole, currentPhase,
    projectName, projectPath,
    projectPhases, phaseLockStatus,
    setPhase, setShowProjectSetup,
    saveProjectPack, addSystemMessage
  } = useForgeKitStore()
  const { send, isStreaming } = useSendMessage()

  const visiblePhases = useMemo(
    () => (phaseLockStatus === 'confirmed' || phaseLockStatus === 'synced')
      ? [...projectPhases].sort((a, b) => phaseSortValue(a.id) - phaseSortValue(b.id))
      : [],
    [projectPhases, phaseLockStatus]
  )
  const currentPhaseIndex = visiblePhases.findIndex((p) => p.id === currentPhase)

  const handleInvoke = (role: ForgeKitRole) => {
    if (isStreaming) return
    send(`Pozivam ${roleDisplayName(role)}.`)
  }

  const handleCreueMode = () => {
    if (isStreaming) return
    send('Creue Mod: uradi kratak pregled trenutnog toka iz tri ugla: proces, kvalitet i rizik. Ne menjaj fajlove. Vrati nalaz i sledecu odluku za Orchestrator.')
  }

  const handleSaveProject = async () => {
    if (!projectPath || isSavingProject || isStreaming) return
    setIsSavingProject(true)
    try {
      await saveProjectPack()
      addSystemMessage('Projekat je snimljen: session.json, project_handoff.md i project_chat_transcript.md su azurirani u projektnom folderu.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepoznata greska pri snimanju projekta.'
      addSystemMessage(`Snimanje projekta nije uspelo. ${message}`)
    } finally {
      setIsSavingProject(false)
    }
  }

  return (
    <aside className="left-panel">

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

      <section className="lp-section lp-section-init">
        <button
          className={`lp-btn-init${isStreaming ? ' disabled' : ''}`}
          onClick={handleCreueMode}
          disabled={isStreaming}
          title="Pokreni kratak Creue Mod pregled bez izmene fajlova"
        >
          <span className="lp-init-icon">▶</span>
          <span className="lp-init-label">Creue Mod</span>
        </button>
      </section>

      <section className="lp-section lp-section-grow">
        <div className="lp-label">Faza rada</div>
        <div className="lp-phase-list">
          {visiblePhases.length === 0 && (
            <div className="lp-phase-empty">
              Faze ce se pojaviti kada ih projekat potvrdi i upise.
            </div>
          )}
          {visiblePhases.map((p, i) => {
            const isDone = i < currentPhaseIndex
            const isActive = currentPhase === p.id
            return (
              <div
                key={p.id}
                className={`lp-phase-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => setPhase(p.id)}
                title={phaseLockStatus === 'synced' ? `Faza iz phases.md: ${p.id}` : `Potvrdjena faza: ${p.id}`}
              >
                <span className="lp-phase-check">
                  {isDone && <span className="lp-check-done">✓</span>}
                  {isActive && <span className="lp-check-active">■</span>}
                  {!isDone && !isActive && <span className="lp-check-empty">□</span>}
                </span>
                <span className={`lp-phase-txt ${isActive ? 'active' : ''}`}>{p.id} — {p.label}</span>
              </div>
            )
          })}
        </div>
      </section>

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
        <button
          className="lp-btn-save"
          onClick={handleSaveProject}
          disabled={!projectPath || isStreaming || isSavingProject}
          title="Snimi session, handoff i chat transcript u projektni folder"
        >
          {isSavingProject ? 'Snimam...' : 'Snimi projekat'}
        </button>
      </section>
    </aside>
  )
}
