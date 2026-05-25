import { useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildOperationalTruthState } from '../utils/operational-state'
import type { OperationalSignalStatus, PhaseOperationalStatus } from '../utils/operational-state'
import './TopStateBar.css'

const signalCopy: Record<OperationalSignalStatus, string> = {
  safe_to_continue: 'bezbedno za nastavak',
  waiting_confirmation: 'ceka potvrdu',
  pending_write: 'ceka upis',
  recovery_required: 'potreban oporavak',
  blocked: 'blokirano',
  stale: 'zastarelo',
  requires_review: 'trazi proveru',
  validated: 'validirano'
}

const phaseCopy: Record<PhaseOperationalStatus, string> = {
  proposed_not_confirmed: 'predlozeno, nije potvrdjeno',
  confirmed: 'potvrdjeno',
  pending_write: 'ceka upis',
  written: 'upisano',
  synced: 'sinhronizovano',
  validated: 'validirano'
}

function signalTone(status: OperationalSignalStatus): string {
  if (status === 'safe_to_continue' || status === 'validated') return 'ok'
  if (status === 'pending_write' || status === 'waiting_confirmation' || status === 'requires_review' || status === 'stale') return 'warn'
  return 'danger'
}

export function TopStateBar(): JSX.Element {
  const {
    activeRole,
    currentPhase,
    projectPhases,
    phaseLockStatus,
    selectedProvider,
    selectedModel,
    customModelId,
    contextStatus,
    projectFileActions,
    isStreaming
  } = useForgeKitStore()

  const operationalState = useMemo(() => buildOperationalTruthState({
    activeRole,
    currentPhase,
    projectPhases,
    phaseLockStatus,
    selectedProvider,
    selectedModel,
    customModelId,
    contextStatus,
    projectFileActions,
    isStreaming
  }), [
    activeRole,
    currentPhase,
    projectPhases,
    phaseLockStatus,
    selectedProvider,
    selectedModel,
    customModelId,
    contextStatus,
    projectFileActions,
    isStreaming
  ])

  const activePhaseLabel = projectPhases.find((phase) => phase.id === currentPhase)?.label
  const criticalPath = operationalState.criticalRecoveryItem?.filename

  return (
    <div className="top-state-bar">
      <div className="top-state-group top-state-primary">
        <span className="top-state-label">Stanje sistema</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.systemState)}`}>
          {signalCopy[operationalState.systemState]}
        </span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">Aktivna uloga</span>
        <span className="top-state-value">{activeRole}</span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">Aktivna faza</span>
        <span className="top-state-value" title={activePhaseLabel ?? currentPhase}>
          {currentPhase}
          {operationalState.phaseState && (
            <span className="top-state-subvalue">
              {phaseCopy[operationalState.phaseState]}
            </span>
          )}
        </span>
      </div>

      <div className="top-state-group top-state-model">
        <span className="top-state-label">provider/model</span>
        <span className="top-state-value" title={operationalState.providerModel}>
          {operationalState.providerModel}
        </span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">Kontrolni kontekst</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.controlContext)}`}>
          {signalCopy[operationalState.controlContext]}
        </span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">Ovlascenje upisa</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.writeAuthority)}`}>
          {signalCopy[operationalState.writeAuthority]}
        </span>
      </div>

      <div className="top-state-group top-state-next">
        <span className="top-state-label">Sledeci bezbedan korak</span>
        <span className={`top-state-value top-state-${operationalState.hasBlockingFileAction ? 'danger' : 'ok'}`} title={criticalPath ?? operationalState.nextSafeAction}>
          {operationalState.nextSafeAction}
        </span>
      </div>
    </div>
  )
}
