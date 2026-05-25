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

export type FileActionRecoveryGroup = 'active' | 'recentWritten' | 'oldWritten'
export type PhaseLadderStepState = 'done' | 'active' | 'inactive'

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

export interface PhaseLadderInput {
  currentPhase: ForgeKitPhase
  projectPhases: ProjectPhaseDefinition[]
  phaseLockStatus: PhaseLockStatus
  projectFileActions: ProjectFileAction[]
}

export interface PhaseLadderStep {
  id: PhaseOperationalStatus
  label: string
  state: PhaseLadderStepState
}

const criticalStatuses: ProjectFileAction['status'][] = [
  'error',
  'blocked',
  'requires_review',
  'stale'
]

const fileActionRank: Record<ProjectFileAction['status'], number> = {
  error: 1,
  blocked: 2,
  requires_review: 3,
  stale: 4,
  pending: 5,
  writing: 6,
  written: 7
}

function isCriticalFileAction(action: ProjectFileAction): boolean {
  return criticalStatuses.includes(action.status)
}

function isPhasesFile(filename: string): boolean {
  const normalized = filename.replace(/\\/g, '/').toLowerCase()
  return normalized.endsWith('/phases.md') || normalized === 'phases.md'
}

export function sortProjectFileActions(actions: ProjectFileAction[]): ProjectFileAction[] {
  return [...actions].sort((a, b) => {
    const rank = fileActionRank[a.status] - fileActionRank[b.status]
    if (rank !== 0) return rank
    return b.createdAt - a.createdAt
  })
}

export function splitProjectFileActions(
  actions: ProjectFileAction[],
  recentWrittenLimit = 2
): Record<FileActionRecoveryGroup, ProjectFileAction[]> {
  const sorted = sortProjectFileActions(actions)
  const written = sorted.filter((action) => action.status === 'written')

  return {
    active: sorted.filter((action) => action.status !== 'written'),
    recentWritten: written.slice(0, recentWrittenLimit),
    oldWritten: written.slice(recentWrittenLimit)
  }
}

export function getFileActionStatusCopy(status: ProjectFileAction['status']): string {
  const copy: Record<ProjectFileAction['status'], string> = {
    error: 'greska',
    blocked: 'blokirano',
    requires_review: 'trazi proveru',
    stale: 'zastarelo',
    pending: 'ceka upis',
    writing: 'upis u toku',
    written: 'upisano'
  }

  return copy[status]
}

export function getFileActionRecoveryAction(action: ProjectFileAction): string {
  const recovery: Record<ProjectFileAction['status'], string> = {
    error: 'Ponovi ili ukloni',
    blocked: 'Prosledi Builder-u',
    requires_review: 'Proveri pre upisa',
    stale: 'Osvezi draft',
    pending: 'Potvrdi upis',
    writing: 'Sacekaj upis',
    written: 'Oporavak nije potreban'
  }

  return recovery[action.status]
}

export function buildPhaseLadder(input: PhaseLadderInput): PhaseLadderStep[] {
  const phaseIsKnown = input.projectPhases.some((phase) => phase.id === input.currentPhase)
  const confirmed = phaseIsKnown && (input.phaseLockStatus === 'confirmed' || input.phaseLockStatus === 'synced')
  const pendingWrite = input.projectFileActions.some((action) =>
    isPhasesFile(action.filename) && (action.status === 'pending' || action.status === 'writing')
  )
  const written = input.projectFileActions.some((action) =>
    isPhasesFile(action.filename) && action.status === 'written'
  )
  const synced = phaseIsKnown && input.phaseLockStatus === 'synced'

  const truth: Record<PhaseOperationalStatus, boolean> = {
    proposed_not_confirmed: false,
    confirmed,
    pending_write: pendingWrite,
    written,
    synced,
    validated: false
  }
  const order: PhaseOperationalStatus[] = ['confirmed', 'pending_write', 'written', 'synced', 'validated']
  const activeIndex = order.reduce((found, step, index) => truth[step] ? index : found, -1)

  return order.map((step, index) => ({
    id: step,
    label: {
      confirmed: 'potvrdjeno',
      pending_write: 'ceka upis',
      written: 'upisano',
      synced: 'sinhronizovano',
      validated: 'validirano'
    }[step],
    state: truth[step] ? (index === activeIndex ? 'active' : 'done') : 'inactive'
  }))
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
    ? `Oporavak: proveri ${criticalRecoveryItem.filename}`
    : input.contextStatus === 'needs_refresh'
      ? 'Osvezi Re-Prime kontekst'
      : hasPendingWrite
        ? 'Potvrdi upis'
        : 'Nastavi'

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
