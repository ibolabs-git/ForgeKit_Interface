/**
 * ForgeKit Context Utilities
 *
 * Gradi Re-Prime kontekst koji se šalje AI modelu pri promeni modela ili
 * eksplicitnom refresh-u. Aplikacija je nosilac ForgeKit kontinuiteta.
 */

import type { ForgeKitPhase, ForgeKitRole, Task, ChatMessage } from '../types'

/** Gradi handoff dokument (koristi ga HandoffModal i Header) */
export function buildHandoffDoc(
  projectName: string,
  phase: ForgeKitPhase,
  tasks: Task[],
  messages: ChatMessage[],
  provider: string,
  model: string,
  opts: { includeTasks: boolean; includeMessages: boolean } = { includeTasks: true, includeMessages: true }
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })

  const completed = tasks.filter((t) => t.completed)
  const pending   = tasks.filter((t) => !t.completed)

  const phaseNames: Record<ForgeKitPhase, string> = {
    F1: 'F1 — Fundament',
    F2: 'F2 — ForgeKit Logika',
    F3: 'F3 — Multi-model',
    F4: 'F4 — Nexus implementacija'
  }

  let doc = `# Handoff dokument — ${projectName}

**Datum:** ${dateStr} u ${timeStr}
**Faza:** ${phaseNames[phase]}
**Model:** ${provider} / ${model}

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
| Završeni | ${completed.length} |
| Na čekanju | ${pending.length} |
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

  doc += `\n*Handoff dokument generisan automatski — ForgeKit Interface*\n*Nova sesija je pokrenuta nakon ovog zapisa.*\n`
  return doc
}

interface ProjectState {
  projectName: string
  currentPhase: ForgeKitPhase
  activeRole: ForgeKitRole
  tasks: Task[]
  messages: ChatMessage[]
  selectedModel: string
  previousEffectiveModel: string
}

/** Kratki opis faze */
function phaseLabel(phase: ForgeKitPhase): string {
  switch (phase) {
    case 'F1': return 'F1 — Fundament (definisanje projekta)'
    case 'F2': return 'F2 — ForgeKit Logika (struktura, pravila, tokovi)'
    case 'F3': return 'F3 — Multi-model (izvršenje, review, isporuka)'
    case 'F4': return 'F4 — Nexus implementacija (runtime, dokumenti, sigurnost)'
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

/** Izvlaci sazetak zadnjih N relevantnih assistant poruka (max ~600 chars) */
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

/** Gradi ForgeKit project context string (max ~800 tokena) */
export function buildProjectContext(state: ProjectState): string {
  const completedTasks = state.tasks.filter((t) => t.completed)
  const pendingTasks = state.tasks.filter((t) => !t.completed)

  const taskSummary = [
    pendingTasks.length > 0
      ? `Aktivni taskovi:\n${pendingTasks.slice(0, 5).map((t) => `- [ ] ${t.content}`).join('\n')}`
      : null,
    completedTasks.length > 0
      ? `Završeni taskovi: ${completedTasks.length}`
      : null
  ]
    .filter(Boolean)
    .join('\n')

  const recentOutput = extractRecentSummary(state.messages)

  return `PROJEKAT: ${state.projectName}
AKTIVNA FAZA: ${phaseLabel(state.currentPhase)}
AKTIVNA ULOGA: ${state.activeRole}

${taskSummary || 'Nema definisanih taskova.'}

POSLEDNJI RELEVANTAN OUTPUT:
${recentOutput}`
}

/** Poruka o promeni modela (interna assistant poruka u Re-Prime nizu) */
export function buildModelSwitchNotice(from: string, to: string): string {
  return `Model je promenjen tokom aktivnog ForgeKit projekta.
Prethodni model: ${from}
Novi model: ${to}

Nastavi postojeći tok na osnovu datog project state-a.
Ne resetuj projekat. Ne ponavljaj onboarding.
Poštuj ForgeKit tok, ne preskači potvrde, ne menjaj prethodne odluke bez razloga.
Ako ti nedostaje kontekst, postavi jedno ciljano pitanje.`
}

/** ForgeKit system message koji se šalje kao "system" uloga uz svaki re-prime request */
export const FORGEKIT_SYSTEM_PREAMBLE = `Radiš u ForgeKit režimu.

ForgeKit je strukturiran radni protokol koji definiše:
- Jasne uloge: ORCHESTRATOR (vodi tok), THINKER (analiza), BUILDER (implementacija), REVIEWER (provera), MEMORY CURATOR (pamćenje), OBSERVER (praćenje)
- Faze projekta: F1 Fundament → F2 ForgeKit Logika → F3 Multi-model → F4 Nexus implementacija
- Pravilo potvrde: svaki korak zahteva potvrdu pre nastavka
- Format odgovora: počni sa [ULOGA] tagom

Ti si AI motor koji u svakom requestu dobija dovoljno konteksta da nastavi ForgeKit tok.
Aplikacija je nosilac kontinuiteta — model se može menjati, ForgeKit pravila ostaju ista.`

/**
 * Gradi poruke za Re-Prime request (promjena modela ili ručni refresh).
 * Vraća messages array koji zamjenjuje punu historiju.
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
CONTEXT RE-PRIME
${switchNotice}

---
PROJECT STATE
${projectCtx}

---
NASTAVAK — sledeća poruka korisnika:`
    },
    {
      role: 'assistant',
      content: '[ORCHESTRATOR] Razumijem. Nastavljam ForgeKit tok za projekat "' +
        state.projectName + '" u fazi ' + state.currentPhase + '. Primam sledeću poruku.'
    },
    {
      role: 'user',
      content: userMessage
    }
  ]
}
