/**
 * useSendMessage - zajednicki hook za slanje poruka ka AI-u.
 * Koristi ga i InputBar (normalne poruke) i LeftPanel (invoke komande).
 */
import { useRef, useCallback, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildRePrimeMessages } from '../utils/forgekit-context'
import type { ForgeKitRole, ProjectFileAction } from '../types'

const READ_TEMPLATE_REGEX = /\[READ_TEMPLATE:\s*([^\]]+)\]/g
const READ_TEMPLATE_ONLY_REGEX = /^\s*(?:\[[A-Z][A-Z\s]+\]\s*)?(?:\[READ_TEMPLATE:\s*[^\]]+\]\s*)+\s*$/
const PROJECT_WRITE_REGEX = /\[PROJECT_WRITE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/PROJECT_WRITE_FILE\]/g
const ROLE_SEGMENT_REGEX = /^\[(ORCHESTRATOR|THINKER|BUILDER|REVIEWER|MEMORY CURATOR|OBSERVER|RESEARCH|PREMORTEM)\]\s*$/gim
const FILE_ACTION_CONFIRM_REGEX = /^\s*(?:da[\s,;:-]*)?(?:potvrdjujem|potvrđujem|potvrda|confirm|odobreno|upisi|upiši)\s*\.?\s*$/i
const FORGEKIT_INIT_TEXT_REGEX = /\b(pokreni|startuj|aktiviraj|koristi|ukljuci|uklju\u010di)\b[\s\S]{0,40}\b(forge\s*kit|forgekit|forgkit|forgetkit)\b(?:[\s\S]{0,40}\b(rezim|re\u017eim|mode)\b)?/i
const INVOKE_REGEX = /^\[INVOKE:(ORCHESTRATOR|THINKER|BUILDER|REVIEWER|MEMORY CURATOR|OBSERVER|RESEARCH|PREMORTEM)\]$/i
const NATURAL_INVOKE_TRIGGER_REGEX = /\b(pozivam|pozovi|zovi|aktiviraj|prebaci|prebacujem|handoff|invoke)\b/i
const ROLE_ALIASES: Array<{ role: ForgeKitRole; patterns: RegExp[] }> = [
  { role: 'ORCHESTRATOR', patterns: [/\borchestrator\b/i, /\borkestrator\b/i] },
  { role: 'THINKER', patterns: [/\bthinker\b/i, /\banaliticar\b/i, /\banaliti[cč]ar\b/i] },
  { role: 'BUILDER', patterns: [/\bbuilder\b/i, /\bizvrsilac\b/i, /\bizvr[sš]ilac\b/i] },
  { role: 'REVIEWER', patterns: [/\breviewer\b/i, /\breview\b/i, /\brevizor\b/i] },
  { role: 'RESEARCH', patterns: [/\bresearch\b/i, /\bresearcher\b/i, /\bistrazivac\b/i, /\bistrazivanje\b/i] },
  { role: 'PREMORTEM', patterns: [/\bpremortem\b/i, /\bpre-mortem\b/i, /\bpre\s*mortem\b/i, /\brizik\b/i, /\brizici\b/i] },
  { role: 'MEMORY CURATOR', patterns: [/\bmemory\s+curator\b/i, /\bmemorijski\s+kustos\b/i, /\bkustos\s+memorije\b/i] },
  { role: 'OBSERVER', patterns: [/\bobserver\b/i, /\bopserver\b/i, /\bposmatrac\b/i, /\bposmatra[cč]\b/i] }
]
const INIT_TEMPLATE_PATHS = [
  'README.md',
  'BRANCH_MANIFEST.md',
  '00_SYSTEM/orchestrator_prompt.md',
  '00_SYSTEM/rules.md',
  '00_SYSTEM/workflow.md',
  '00_SYSTEM/agents.md',
  '00_SYSTEM/security_policy.md',
  '00_SYSTEM/document_activation_guide.md'
]
const TOKEN_ESTIMATE_DIVISOR = 4
const TOKEN_WATCH_THRESHOLD = 20_000
const TOKEN_HIGH_THRESHOLD = 28_000

interface SendOptions {
  hiddenUser?: boolean
  allowTemplateFollowup?: boolean
  timeoutMs?: number
  forceRePrime?: boolean
}

function normalizeOutboundText(text: string): string {
  const trimmed = text.trim()
  if (trimmed === '[FORGEKIT_INIT]') return trimmed
  if (FORGEKIT_INIT_TEXT_REGEX.test(trimmed)) return '[FORGEKIT_INIT]'
  const naturalRole = extractNaturalInvokedRole(trimmed)
  if (naturalRole) return `[INVOKE:${naturalRole}]`
  return text
}

function isInternalTemplateMessage(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith('[TEMPLATE_INJECT]') || READ_TEMPLATE_ONLY_REGEX.test(trimmed)
}

function extractInvokedRole(content: string): ForgeKitRole | null {
  const match = content.trim().match(INVOKE_REGEX)
  return match ? (match[1].toUpperCase() as ForgeKitRole) : null
}

function buildRoleInvokePrompt(role: ForgeKitRole): string {
  return `Pozvana je uloga [${role}].

Odgovori kao [${role}].
Ne odgovaraj kao [ORCHESTRATOR] u ovoj poruci.
Radi samo zadatak te uloge, bez izmene fajlova osim ako je uloga BUILDER i korisnik eksplicitno odobri file action.
Na kraju vrati nalaz i sledecu odluku za Orchestrator.`
}

function extractNaturalInvokedRole(content: string): ForgeKitRole | null {
  if (!NATURAL_INVOKE_TRIGGER_REGEX.test(content)) return null
  for (const entry of ROLE_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(content))) return entry.role
  }
  return null
}

function resolveSegmentRole(content: string, index: number): ForgeKitRole | null {
  let currentRole: ForgeKitRole | null = null
  for (const match of content.matchAll(ROLE_SEGMENT_REGEX)) {
    if ((match.index ?? 0) > index) break
    currentRole = match[1].toUpperCase() as ForgeKitRole
  }
  return currentRole
}

function getUnresolvedFileActions(actions: ProjectFileAction[]): ProjectFileAction[] {
  return actions.filter((a) =>
    a.status === 'pending' ||
    a.status === 'writing' ||
    a.status === 'blocked' ||
    a.status === 'error' ||
    a.status === 'stale' ||
    a.status === 'requires_review'
  )
}

function estimateTextTokens(content: string): number {
  if (!content.trim()) return 0
  return Math.ceil(content.length / TOKEN_ESTIMATE_DIVISOR)
}

function estimateMessageTokens(messages: Array<{ role: 'user' | 'assistant'; content: string }>): number {
  return messages.reduce((total, message) => total + estimateTextTokens(message.content) + 4, 0)
}

function getTokenRisk(promptEstimate: number): 'ok' | 'watch' | 'high' {
  if (promptEstimate >= TOKEN_HIGH_THRESHOLD) return 'high'
  if (promptEstimate >= TOKEN_WATCH_THRESHOLD) return 'watch'
  return 'ok'
}

function parseRequestedTokens(error: string): number | null {
  const match = error.match(/Requested\s+(\d+)/i)
  return match ? Number(match[1]) : null
}

function buildUsageNote(risk: 'ok' | 'watch' | 'high', requestedTokens?: number | null): string {
  if (requestedTokens) {
    return `Provider je prijavio zahtev od ${requestedTokens.toLocaleString('en-US')} tokena. Smanji kontekst, uradi Re-Prime ili otvori kraci tok.`
  }
  if (risk === 'high') return 'Kontekst je verovatno prevelik za stabilno slanje. Smanji istoriju ili osvezi Re-Prime pre nastavka.'
  if (risk === 'watch') return 'Kontekst je visok. Nastavak je moguc, ali rizik od token limita raste.'
  return 'Procena je informativna; nije billing usage.'
}

function buildTokenUsageSnapshot(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  provider: string,
  model: string,
  responseContent = '',
  requestedTokens?: number | null
) {
  const promptEstimate = requestedTokens ?? estimateMessageTokens(history)
  const responseEstimate = estimateTextTokens(responseContent)
  const totalEstimate = promptEstimate + responseEstimate
  const risk = getTokenRisk(promptEstimate)

  return {
    promptEstimate,
    responseEstimate,
    totalEstimate,
    risk,
    provider,
    model,
    updatedAt: Date.now(),
    note: buildUsageNote(risk, requestedTokens)
  }
}

function buildFileActionGuardMessage(actions: ProjectFileAction[]): string {
  const blocked = actions.filter((a) => a.status === 'blocked').length
  const pending = actions.filter((a) => a.status === 'pending').length
  const writing = actions.filter((a) => a.status === 'writing').length
  const errored = actions.filter((a) => a.status === 'error').length
  const stale = actions.filter((a) => a.status === 'stale').length
  const requiresReview = actions.filter((a) => a.status === 'requires_review').length

  return `[SYSTEM]
Upis nije izvrsen. Postoje nerazresene Project File Actions stavke: ${blocked} blocked, ${pending} pending, ${writing} writing, ${errored} error, ${stale} stale, ${requiresReview} requires_review.

Tekstualna potvrda u chatu ne sme da zameni stvarni upis fajla. Prvo razresi pending, writing, blocked, error, stale ili requires_review stavke u Project File Actions panelu. Nakon stvarnog upisa nastavi tok.`
}

function buildTemplateContinuation(fetched: { path: string; content: string }[]): string {
  const templateBody = fetched.length > 0
    ? '[TEMPLATE_INJECT]\n' +
      fetched.map((f) => `=== ${f.path} ===\n\n${f.content}`).join('\n\n---\n\n')
    : '[TEMPLATE_INJECT]\n'

  return `${templateBody}

[APP_RUNTIME]
Dokumentacija je ucitana interno. Ne prikazuj korisniku READ_TEMPLATE, TEMPLATE_INJECT, listu fajlova niti detalje ucitavanja.
Nastavi vidljivi tok kao [ORCHESTRATOR].
Ako je ovo pocetak ForgeKit rezima, javi se kratko i prijatno, objasni da pre izvrsenja ide pocetni razgovorni ulaz, pa postavi samo jedno pitanje za Intake Handshake.
Ako ovo nije pocetak rezima, nastavi prethodni korisnicki tok kratko i operativno.`
}

function buildForgeKitInitContext(fetched: { path: string; content: string }[]): string {
  return `[FORGEKIT_INIT_CONTEXT]
${fetched.map((f) => `=== ${f.path} ===\n\n${f.content}`).join('\n\n---\n\n')}

[APP_RUNTIME]
Ovo je interni ForgeKit init kontekst. Korisniku ne prikazuj listu dokumenata, template tagove niti detalje ucitavanja.
Nemoj ponovo traziti READ_TEMPLATE dokumente za ovaj init.
Sada se javi korisniku kao [ORCHESTRATOR].
Kratko i prijatno potvrdi da si tu, objasni da pre izvrsenja sledi pocetni razgovorni ulaz, i postavi samo jedno pitanje za Intake Handshake: koji projekat ili ideju pokrecemo?`
}

export function useSendMessage() {
  const activeListenersRef = useRef<Array<() => void>>([])
  const activeMessageIdRef = useRef<string | null>(null)
  const contentRef = useRef('')
  const templateCacheRef = useRef<Map<string, string>>(new Map())

  const {
    messages, isStreaming,
    selectedProvider, selectedModel, customModelId,
    modelJustChanged, contextStatus,
    currentPhase, activeRole, tasks,
    projectName, previousEffectiveModel,
    projectPhases, phaseLockStatus,
    projectFileActions,
    addUserMessage, startAssistantMessage,
    appendStreamToken, finalizeMessage,
    addErrorMessage, cancelStreaming, markContextSynced,
    addProjectFileAction, addSystemMessage, setTokenUsage
  } = useForgeKitStore()

  const sendRef = useRef<(text: string, options?: SendOptions) => Promise<void>>(
    () => Promise.resolve()
  )

  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((fn) => fn())
      activeListenersRef.current = []
    }
  }, [])

  const loadTemplates = useCallback(async (paths: string[]) => {
    const fetched: { path: string; content: string }[] = []

    for (const filePath of paths) {
      const cachedContent = templateCacheRef.current.get(filePath)
      if (cachedContent) {
        fetched.push({ path: filePath, content: cachedContent })
        continue
      }
      try {
        const result = await window.api.githubFetchTemplate(filePath)
        if (result.ok && result.content) {
          fetched.push({ path: filePath, content: result.content })
          templateCacheRef.current.set(filePath, result.content)
        }
      } catch {
        // Template ucitavanje je interni tok; greska se ne prikazuje kao chat buka.
      }
    }

    return fetched
  }, [])

  const send = useCallback(async (text: string, options: SendOptions = {}) => {
    if (!text.trim() || isStreaming) return

    const outboundText = normalizeOutboundText(text)
    const unresolvedFileActions = getUnresolvedFileActions(projectFileActions)
    if (!options.hiddenUser && FILE_ACTION_CONFIRM_REGEX.test(text.trim()) && unresolvedFileActions.length > 0) {
      addUserMessage(text)
      addSystemMessage(buildFileActionGuardMessage(unresolvedFileActions))
      return
    }

    const isForgeKitInit = outboundText === '[FORGEKIT_INIT]'
    const invokedRole = extractInvokedRole(outboundText)
    const modelInput = isForgeKitInit
      ? buildForgeKitInitContext(await loadTemplates(INIT_TEMPLATE_PATHS))
      : invokedRole
        ? buildRoleInvokePrompt(invokedRole)
        : outboundText

    contentRef.current = ''
    if (!options.hiddenUser) addUserMessage(text)

    const effectiveModel = customModelId.trim() || selectedModel
    const needsRePrime = Boolean(options.forceRePrime) || modelJustChanged || contextStatus === 'needs_refresh'

    let history: Array<{ role: 'user' | 'assistant'; content: string }>

    if (needsRePrime) {
      history = buildRePrimeMessages(
        {
          projectName, currentPhase, activeRole, tasks,
          projectPhases, phaseLockStatus,
          messages, selectedModel: effectiveModel, previousEffectiveModel
        },
        modelInput
      )
      markContextSynced()
    } else {
      history = messages
        .filter((m) => !m.isStreaming
          && !m.content.startsWith('[SESSION_DIVIDER]')
          && !m.content.startsWith('[MODEL_SWITCH:')
          && !isInternalTemplateMessage(m.content))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      history.push({ role: 'user', content: modelInput })
    }

    const requestUsage = buildTokenUsageSnapshot(history, selectedProvider, effectiveModel)
    setTokenUsage(requestUsage)
    if (requestUsage.risk === 'high') {
      addSystemMessage(`[CONTEXT_GUARD]
Kontekst nije poslat modelu.

Procena je oko ${requestUsage.promptEstimate.toLocaleString('en-US')} tokena, pa bi zahtev verovatno pao na token limitu. Ovo nije greska modela i nije billing usage.

Sledeci korak: otvori kraci scoped tok, smanji istoriju ili uradi Re-Prime sa manjim paketom.`)
      return
    }

    const messageId = `ai-${Date.now()}`
    activeMessageIdRef.current = messageId
    startAssistantMessage(messageId, invokedRole ?? undefined, Boolean(invokedRole))

    const timeoutId = window.setTimeout(() => {
      window.api.cancelMessage(messageId)
      addErrorMessage('Model nije odgovorio u zadatom vremenu. Zahtev je prekinut; probaj brzi model ili ponovi poruku.', messageId)
      removeToken(); removeComplete(); removeError()
      activeListenersRef.current = []
      activeMessageIdRef.current = null
    }, options.timeoutMs ?? 90_000)

    const removeToken = window.api.onStreamToken((token, id) => {
      if (id === messageId) {
        window.clearTimeout(timeoutId)
        appendStreamToken(token, messageId)
        contentRef.current += token
      }
    })

    const removeComplete = window.api.onStreamComplete(async (id) => {
      if (id !== messageId) return

      const fullContent = contentRef.current
      contentRef.current = ''
      setTokenUsage(buildTokenUsageSnapshot(history, selectedProvider, effectiveModel, fullContent))

      finalizeMessage(messageId)
      window.clearTimeout(timeoutId)
      removeToken(); removeComplete(); removeError()
      activeListenersRef.current = []
      activeMessageIdRef.current = null

      const fileMatches = [...fullContent.matchAll(PROJECT_WRITE_REGEX)]
      for (const match of fileMatches) {
        const filename = match[1].trim()
        const content = match[2].trim()
        const sourceRole = resolveSegmentRole(fullContent, match.index ?? 0)
        if (filename && content) addProjectFileAction(filename, content, messageId, sourceRole ?? undefined)
      }

      const matches = [...fullContent.matchAll(READ_TEMPLATE_REGEX)]
      if (matches.length === 0) return
      if (options.allowTemplateFollowup === false) return

      const isTemplateOnlyRequest = READ_TEMPLATE_ONLY_REGEX.test(fullContent.trim())
      const fetched = await loadTemplates(matches.map((match) => match[1].trim()))

      if (fetched.length === 0 && !isTemplateOnlyRequest) return

      const injectText = buildTemplateContinuation(fetched)
      setTimeout(() => {
        sendRef.current(injectText, { hiddenUser: true, allowTemplateFollowup: false })
      }, 80)
    })

    const removeError = window.api.onStreamError((error, id) => {
      if (id === messageId) {
        const requestedTokens = parseRequestedTokens(error)
        setTokenUsage(buildTokenUsageSnapshot(history, selectedProvider, effectiveModel, '', requestedTokens))
        addErrorMessage(error, messageId)
        window.clearTimeout(timeoutId)
        removeToken(); removeComplete(); removeError()
        activeListenersRef.current = []
        activeMessageIdRef.current = null
      }
    })

    activeListenersRef.current = [removeToken, removeComplete, removeError]

    window.api.sendMessage({
      messages: history,
      provider: selectedProvider,
      model: effectiveModel,
      messageId
    })
  }, [
    isStreaming, messages, selectedProvider, selectedModel, customModelId,
    modelJustChanged, contextStatus, currentPhase, activeRole, tasks,
    projectName, previousEffectiveModel, projectPhases, phaseLockStatus, projectFileActions,
    addUserMessage, startAssistantMessage, appendStreamToken,
    finalizeMessage, addErrorMessage, cancelStreaming, markContextSynced,
    addProjectFileAction, addSystemMessage, setTokenUsage, loadTemplates
  ])

  const cancel = useCallback(() => {
    if (!activeMessageIdRef.current) return
    activeListenersRef.current.forEach((fn) => fn())
    activeListenersRef.current = []
    activeMessageIdRef.current = null
    cancelStreaming()
  }, [cancelStreaming])

  sendRef.current = send

  return { send, cancel, isStreaming }
}
