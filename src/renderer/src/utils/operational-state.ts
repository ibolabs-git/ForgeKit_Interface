import type {
  ForgeKitPhase,
  ForgeKitRole,
  PhaseLockStatus,
  ProjectFileAction,
  ProjectPhaseDefinition
} from '../types'

export type OperationalSignalStatus =
  | 'safe_to_continue'
  | 'waiting_confirmation'
  | 'pending_write'
  | 'recovery_required'
  | 'blocked'
  | 'stale'
  | 'requires_review'
  | 'validated'

export type PhaseOperationalStatus =
  | 'proposed_not_confirmed'
  | 'confirmed'
  | 'pending_write'
  | 'written'
  | 'synced'
  | 'validated'

export interface OperationalTruthState {
  systemState: OperationalSignalStatus
  controlContext: OperationalSignalStatus
  writeAuthority: OperationalSignalStatus
  nextSafeAction: string
  hasBlockingFileAction: boolean
  criticalRecoveryItem: ProjectFileAction | null
  phaseState?: PhaseOperationalStatus
  providerModel: string
}

interface OperationalStateInput {
  activeRole: ForgeKitRole
  currentPhase: ForgeKitPhase
  projectPhases: ProjectPhaseDefinition[]
  phaseLockStatus: PhaseLockStatus
  selectedProvider: string
  selectedModel: string
  customModelId: string
  contextStatus: 'synced' | 'needs_refresh'
  projectFileActions: ProjectFileAction[]
  isStreaming: boolean
}

const criticalStatuses: ProjectFileAction['status'][] = [
  'error',
  'blocked',
  'requires_review',
  'stale'
]

function isCriticalFileAction(action: ProjectFileAction): boolean {
  return criticalStatuses.includes(action.status)
}

function resolvePhaseState(
  phaseLockStatus: PhaseLockStatus,
  currentPhase: ForgeKitPhase,
  projectPhases: ProjectPhaseDefinition[],
  projectFileActions: ProjectFileAction[]
): OperationalTruthState['phaseState'] {
  const hasSyncedPhase = phaseLockStatus === 'synced'
  const hasConfirmedPhase = phaseLockStatus === 'confirmed'
  const phaseIsKnown = projectPhases.some((phase) => phase.id === currentPhase)
  const hasPendingPhaseWrite = projectFileActions.some((action) =>
    action.filename.replace(/\\/g, '/').toLowerCase().endsWith('phases.md') &&
    (action.status === 'pending' || action.status === 'writing')
  )

  if (hasPendingPhaseWrite) return 'pending_write'
  if (hasSyncedPhase && phaseIsKnown) return 'synced'
  if (hasConfirmedPhase && phaseIsKnown) return 'confirmed'
  return 'proposed_not_confirmed'
}

export function buildOperationalTruthState(input: OperationalStateInput): OperationalTruthState {
  const criticalRecoveryItem = input.projectFileActions.find(isCriticalFileAction) ?? null
  const hasPendingWrite = input.projectFileActions.some((action) =>
    action.status === 'pending' || action.status === 'writing'
  )
  const phaseState = resolvePhaseState(
    input.phaseLockStatus,
    input.currentPhase,
    input.projectPhases,
    input.projectFileActions
  )

  const systemState: OperationalTruthState['systemState'] = criticalRecoveryItem
    ? 'recovery_required'
    : input.contextStatus === 'needs_refresh'
      ? 'requires_review'
      : hasPendingWrite
        ? 'pending_write'
        : input.isStreaming
          ? 'waiting_confirmation'
          : 'safe_to_continue'

  const controlContext: OperationalTruthState['controlContext'] = input.contextStatus === 'needs_refresh'
    ? 'stale'
    : 'validated'

  const writeAuthority: OperationalTruthState['writeAuthority'] = criticalRecoveryItem
    ? 'blocked'
    : hasPendingWrite
      ? 'pending_write'
      : 'safe_to_continue'

  const nextSafeAction = criticalRecoveryItem
    ? `Recovery / Oporavak: review ${criticalRecoveryItem.filename}`
    : input.contextStatus === 'needs_refresh'
      ? 'Re-prime / Osvezi kontekst'
      : hasPendingWrite
        ? 'Confirm write / Potvrdi upis'
        : 'Continue / Nastavi'

  return {
    systemState,
    controlContext,
    writeAuthority,
    nextSafeAction,
    hasBlockingFileAction: Boolean(criticalRecoveryItem),
    criticalRecoveryItem,
    phaseState,
    providerModel: `${input.selectedProvider}/${input.customModelId.trim() || input.selectedModel}`
  }
}
