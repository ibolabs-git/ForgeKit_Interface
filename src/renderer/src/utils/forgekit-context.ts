/**
 * ForgeKit Context Utilities
 *
 * Gradi Re-Prime context / Re-Prime kontekst i Handoff document / handoff dokument.
 * Aplikacija je nosilac kontinuiteta: modeli se mogu menjati, ali project state /
 * stanje projekta i phase state / stanje faze ostaju isti.
 */

import type {
  ForgeKitPhase,
  ForgeKitRole,
  Task,
  ChatMessage,
  ProjectPhaseDefinition,
  PhaseLockStatus
} from '../types'

function phaseSortValue(phase: string): number {
  const match = phase.match(/\d+/)
  return match ? Number(match[0]) : 999
}

function formatPhaseLabel(
  phase: ForgeKitPhase,
  projectPhases: ProjectPhaseDefinition[] = [],
  phaseLockStatus: PhaseLockStatus = 'none'
): string {
  const locked = phaseLockStatus === 'confirmed' || phaseLockStatus === 'synced'
  const found = locked ? projectPhases.find((p) => p.id === phase) : undefined
  return found ? `${found.id} - ${found.label}` : phaseLabel(phase)
}

function formatPhaseList(projectPhases: ProjectPhaseDefinition[], phaseLockStatus: PhaseLockStatus): string {
  if (!(phaseLockStatus === 'confirmed' || phaseLockStatus === 'synced') || projectPhases.length === 0) {
    return 'projectPhases / projektne faze jos nisu confirmed / potvrdjene ili synced / sinhronizovane. Ne zakljucuj fazu iz slobodnog teksta.'
  }

  return projectPhases
    .slice()
    .sort((a, b) => phaseSortValue(a.id) - phaseSortValue(b.id))
    .map((p) => `- ${p.id}: ${p.label}`)
    .join('\n')
}

/** Gradi Handoff document / handoff dokument (koristi ga HandoffModal i Header). */
export function buildHandoffDoc(
  projectName: string,
  phase: ForgeKitPhase,
  tasks: Task[],
  messages: ChatMessage[],
  provider: string,
  model: string,
  opts: { includeTasks: boolean; includeMessages: boolean } = { includeTasks: true, includeMessages: true },
  projectPhases: ProjectPhaseDefinition[] = [],
  phaseLockStatus: PhaseLockStatus = 'none'
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })

  const completed = tasks.filter((t) => t.completed)
  const pending = tasks.filter((t) => !t.completed)
  const phaseText = formatPhaseLabel(phase, projectPhases, phaseLockStatus)

  let doc = `# Handoff document / handoff dokument - ${projectName}

**Datum:** ${dateStr} u ${timeStr}
**Phase / Faza:** ${phaseText}
**Phase lock status / Status zakljucavanja faze:** ${phaseLockStatus}
**Model:** ${provider} / ${model}

---
`

  doc += `
## Project phases / Projektne faze

${formatPhaseList(projectPhases, phaseLockStatus)}

---
`

  if (opts.includeTasks) {
    const taskList = tasks.length > 0
      ? tasks.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.content}`).join('\n')
      : '_Nema evidentiranih zadataka_'

    doc += `
## Status zadataka

| Kategorija | Broj |
|---|---|
| Zavrseni | ${completed.length} |
| Na cekanju | ${pending.length} |
| Ukupno | ${tasks.length} |

### Lista zadataka

${taskList}

---
`
  }

  if (opts.includeMessages) {
    const lastMsgs = messages.slice(-6)
    const msgPreview = lastMsgs.length > 0
      ? lastMsgs.map((m) => {
          const roleLabel = m.role === 'user' ? 'Korisnik' : `ForgeKit [${m.forgeRole}]`
          const preview = m.content.length > 300 ? m.content.slice(0, 300) + '...' : m.content
          return `**${roleLabel}:**\n${preview}`
        }).join('\n\n---\n\n')
      : '_Nema poruka u sesiji_'

    doc += `
## Izvod sesije

Ukupno poruka u sesiji: **${messages.length}**

### Poslednje poruke

${msgPreview}

---
`
  }

  doc += `\n*Handoff document / handoff dokument generisan automatski - ForgeKit Interface*\n*Nova sesija je pokrenuta nakon ovog zapisa.*\n`
  return doc
}

interface ProjectState {
  projectName: string
  currentPhase: ForgeKitPhase
  projectPhases?: ProjectPhaseDefinition[]
  phaseLockStatus?: PhaseLockStatus
  activeRole: ForgeKitRole
  tasks: Task[]
  messages: ChatMessage[]
  selectedModel: string
  previousEffectiveModel: string
}

/** Kratki phase label / labela faze. */
function phaseLabel(phase: ForgeKitPhase): string {
  switch (phase) {
    case 'F1': return 'F1 - Fundament (definisanje projekta)'
    case 'F2': return 'F2 - ForgeKit Logika (struktura, pravila, tokovi)'
    case 'F3': return 'F3 - Multi-model (izvrsenje, review, isporuka)'
    case 'F4': return 'F4 - Nexus implementacija (runtime, dokumenti, sigurnost)'
  }
}

function isInternalAssistantMessage(content: string): boolean {
  return content === '[SESSION_DIVIDER]' ||
    content.startsWith('[MODEL_SWITCH:') ||
    content.startsWith('[TEMPLATE_INJECT]')
}

function stripLeadingRoleTag(content: string): string {
  return content.replace(/^\[(ORCHESTRATOR|THINKER|BUILDER|REVIEWER|MEMORY CURATOR|OBSERVER|SYSTEM)\]\s*\n?/i, '').trim()
}

/** Izvlaci sazetak zadnjih N relevantnih assistant poruka (max ~600 chars). */
function extractRecentSummary(messages: ChatMessage[], maxChars = 600): string {
  const assistantMsgs = messages
    .filter((m) => m.role === 'assistant' && !isInternalAssistantMessage(m.content))
    .slice(-3)

  if (assistantMsgs.length === 0) return '(nema prethodnog outputa)'

  const combined = assistantMsgs
    .map((m) => stripLeadingRoleTag(m.content).slice(0, 300))
    .filter(Boolean)
    .join('\n---\n')

  return combined.length > maxChars ? combined.slice(0, maxChars) + '...' : combined
}

/** Gradi ForgeKit project context / projektni kontekst string (max ~800 tokena). */
export function buildProjectContext(state: ProjectState): string {
  const completedTasks = state.tasks.filter((t) => t.completed)
  const pendingTasks = state.tasks.filter((t) => !t.completed)
  const phaseLockStatus = state.phaseLockStatus ?? 'none'
  const projectPhases = state.projectPhases ?? []

  const taskSummary = [
    pendingTasks.length > 0
      ? `Aktivni taskovi:\n${pendingTasks.slice(0, 5).map((t) => `- [ ] ${t.content}`).join('\n')}`
      : null,
    completedTasks.length > 0
      ? `Zavrseni taskovi: ${completedTasks.length}`
      : null
  ]
    .filter(Boolean)
    .join('\n')

  const recentOutput = extractRecentSummary(state.messages)

  return `PROJEKAT: ${state.projectName}
ACTIVE PHASE / AKTIVNA FAZA: ${formatPhaseLabel(state.currentPhase, projectPhases, phaseLockStatus)}
PHASE LOCK STATUS / STATUS ZAKLJUCAVANJA FAZE: ${phaseLockStatus}
ACTIVE ROLE / AKTIVNA ULOGA: ${state.activeRole}

PROJECT PHASES / PROJEKTNE FAZE:
${formatPhaseList(projectPhases, phaseLockStatus)}

${taskSummary || 'Nema definisanih taskova.'}

RECENT RELEVANT OUTPUT / POSLEDNJI RELEVANTAN OUTPUT:
${recentOutput}`
}

/** Poruka o promeni modela (interna assistant poruka u Re-Prime nizu). */
export function buildModelSwitchNotice(from: string, to: string): string {
  return `Model je promenjen tokom aktivnog ForgeKit projekta.
Prethodni model: ${from}
Novi model: ${to}

Nastavi postojeci tok na osnovu datog project state / stanja projekta.
Ne resetuj projekat. Ne ponavljaj onboarding.
Ne zakljucuj faze iz slobodnog teksta; phase state / stanje faze vazi tek kada je confirmed / potvrdjeno ili synced / sinhronizovano iz phases.md.
Ako ti nedostaje kontekst, postavi jedno ciljano pitanje.`
}

/** ForgeKit system message koji se salje kao "system" uloga uz svaki Re-Prime request. */
export const FORGEKIT_SYSTEM_PREAMBLE = `Radis u ForgeKit rezimu.

ForgeKit je strukturiran radni protokol koji definise:
- Jasne uloge: ORCHESTRATOR (vodi tok), THINKER (analiza), BUILDER (implementacija), REVIEWER (provera), MEMORY CURATOR (pamcenje), OBSERVER (pracenje)
- Faze projekta: F1 Fundament -> F2 ForgeKit Logika -> F3 Multi-model -> F4 Nexus implementacija
- Pravilo potvrde: svaki korak zahteva potvrdu pre nastavka
- Format odgovora: pocni sa [ULOGA] tagom

Ti si AI motor koji u svakom requestu dobija dovoljno konteksta da nastavi ForgeKit tok.
Aplikacija je nosilac kontinuiteta - model se moze menjati, ForgeKit pravila ostaju ista.`

/**
 * Gradi poruke za Re-Prime request / Re-Prime zahtev.
 * Vraca messages array koji zamenjuje punu historiju.
 */
export function buildRePrimeMessages(
  state: ProjectState,
  userMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const projectCtx = buildProjectContext(state)
  const switchNotice = buildModelSwitchNotice(state.previousEffectiveModel, state.selectedModel)

  return [
    {
      role: 'user',
      content: `${FORGEKIT_SYSTEM_PREAMBLE}

---
CONTEXT RE-PRIME / RE-PRIME KONTEKST
${switchNotice}

---
PROJECT STATE / STANJE PROJEKTA
${projectCtx}

---
NASTAVAK - sledeca poruka korisnika:`
    },
    {
      role: 'assistant',
      content: '[ORCHESTRATOR] Razumem. Nastavljam ForgeKit tok za projekat "' +
        state.projectName + '" u fazi ' + formatPhaseLabel(state.currentPhase, state.projectPhases, state.phaseLockStatus) +
        '. Primam sledecu poruku.'
    },
    {
      role: 'user',
      content: userMessage
    }
  ]
}
