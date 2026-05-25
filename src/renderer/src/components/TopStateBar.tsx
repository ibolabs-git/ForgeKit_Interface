import { useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildOperationalTruthState } from '../utils/operational-state'
import type { OperationalSignalStatus, PhaseOperationalStatus } from '../utils/operational-state'
import './TopStateBar.css'

const signalCopy: Record<OperationalSignalStatus, string> = {
  safe_to_continue: 'safe to continue / bezbedno za nastavak',
  waiting_confirmation: 'waiting confirmation / ceka potvrdu',
  pending_write: 'pending write / ceka upis',
  recovery_required: 'recovery required / potreban oporavak',
  blocked: 'blocked / blokirano',
  stale: 'stale / zastarelo',
  requires_review: 'requires review / trazi proveru',
  validated: 'validated / validirano'
}

const phaseCopy: Record<PhaseOperationalStatus, string> = {
  proposed_not_confirmed: 'proposed not confirmed / predlozeno, nije potvrdjeno',
  confirmed: 'confirmed / potvrdjeno',
  pending_write: 'pending_write / ceka upis',
  written: 'written / upisano',
  synced: 'synced / sinhronizovano',
  validated: 'validated / validirano'
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
        <span className="top-state-label">SYSTEM STATE / STANJE SISTEMA</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.systemState)}`}>
          {signalCopy[operationalState.systemState]}
        </span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">active role / aktivna uloga</span>
        <span className="top-state-value">{activeRole}</span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">active phase / aktivna faza</span>
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
        <span className="top-state-label">Control Context / Kontrolni kontekst</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.controlContext)}`}>
          {signalCopy[operationalState.controlContext]}
        </span>
      </div>

      <div className="top-state-group">
        <span className="top-state-label">WRITE AUTHORITY / OVLASCENJE UPISA</span>
        <span className={`top-state-value top-state-${signalTone(operationalState.writeAuthority)}`}>
          {signalCopy[operationalState.writeAuthority]}
        </span>
      </div>

      <div className="top-state-group top-state-next">
        <span className="top-state-label">NEXT SAFE ACTION / SLEDECI BEZBEDAN KORAK</span>
        <span className={`top-state-value top-state-${operationalState.hasBlockingFileAction ? 'danger' : 'ok'}`} title={criticalPath ?? operationalState.nextSafeAction}>
          {operationalState.nextSafeAction}
        </span>
      </div>
    </div>
  )
}
