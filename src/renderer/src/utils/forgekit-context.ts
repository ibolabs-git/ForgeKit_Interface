/**
 * ForgeKit Context Utilities
 *
 * Gradi Re-Prime kontekst koji se šalje AI modelu pri promjeni modela ili
 * eksplicitnom refresh-u. Aplikacija je nosilac ForgeKit kontinuiteta.
 */

import type { ForgeKitPhase, ForgeKitRole, Task, ChatMessage } from '../types'

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
  }
}

/** Izvlači sažetak zadnjih N relevantnih assistant poruka (max ~600 chars) */
function extractRecentSummary(messages: ChatMessage[], maxChars = 600): string {
  const assistantMsgs = messages
    .filter((m) => m.role === 'assistant' && !m.content.startsWith('['))
    .slice(-3)

  if (assistantMsgs.length === 0) return '(nema prethodnog outputa)'

  const combined = assistantMsgs
    .map((m) => m.content.slice(0, 300))
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

POSLJEDNJI RELEVANTAN OUTPUT:
${recentOutput}`
}

/** Poruka o promjeni modela (interna assistant poruka u Re-Prime nizu) */
export function buildModelSwitchNotice(from: string, to: string): string {
  return `Model je promijenjen tokom aktivnog ForgeKit projekta.
Prethodni model: ${from}
Novi model: ${to}

Nastavi postojeći tok na osnovu datog project state-a.
Ne resetuj projekat. Ne ponavljaj onboarding.
Poštuj ForgeKit tok, ne preskači potvrde, ne mijenjaj prethodne odluke bez razloga.
Ako ti nedostaje kontekst, postavi jedno ciljano pitanje.`
}

/** ForgeKit system message koji se šalje kao "system" uloga uz svaki re-prime request */
export const FORGEKIT_SYSTEM_PREAMBLE = `Radiš u ForgeKit režimu.

ForgeKit je strukturiran radni protokol koji definiše:
- Jasne uloge: ORCHESTRATOR (vodi tok), THINKER (analiza), BUILDER (implementacija), REVIEWER (provjera), MEMORY CURATOR (pamćenje), OBSERVER (praćenje)
- Faze projekta: F1 Fundament → F2 ForgeKit Logika → F3 Multi-model
- Pravilo potvrde: svaki korak zahtijeva potvrdu prije nastavka
- Format odgovora: počni sa [ULOGA] tagom

Ti si AI motor koji u svakom requestu dobija dovoljno konteksta da nastavi ForgeKit tok.
Aplikacija je nosilac kontinuiteta — model se može mijenjati, ForgeKit pravila ostaju ista.`

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
NASTAVAK — sljedeća poruka korisnika:`
    },
    {
      role: 'assistant',
      content: '[ORCHESTRATOR] Razumijem. Nastavljam ForgeKit tok za projekat "' +
        state.projectName + '" u fazi ' + state.currentPhase + '. Primam sljedeću poruku.'
    },
    {
      role: 'user',
      content: userMessage
    }
  ]
}
