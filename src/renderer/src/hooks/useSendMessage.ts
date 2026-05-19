/**
 * useSendMessage — zajednički hook za slanje poruka ka AI-u.
 * Koristi ga i InputBar (normalne poruke) i LeftPanel (invoke komande).
 */
import { useRef, useCallback, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildRePrimeMessages } from '../utils/forgekit-context'

// Regex za detekciju READ_TEMPLATE taga u AI odgovorima
const READ_TEMPLATE_REGEX = /\[READ_TEMPLATE:\s*([^\]]+)\]/g
const PROJECT_WRITE_REGEX = /\[PROJECT_WRITE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/PROJECT_WRITE_FILE\]/g
const FORGEKIT_INIT_TEXT_REGEX = /\b(pokreni|startuj|aktiviraj|koristi|ukljuci|uključi)\b[\s\S]{0,40}\b(forge\s*kit|forgekit|forgkit|forgetkit)\b(?:[\s\S]{0,40}\b(rezim|režim|mode)\b)?/i

function normalizeOutboundText(text: string): string {
  const trimmed = text.trim()
  if (trimmed === '[FORGEKIT_INIT]') return trimmed
  if (FORGEKIT_INIT_TEXT_REGEX.test(trimmed)) return '[FORGEKIT_INIT]'
  return text
}

export function useSendMessage() {
  const activeListenersRef = useRef<Array<() => void>>([])
  // Akumulira streaming sadrzaj lokalno — koristi se za READ_TEMPLATE detekciju
  const contentRef = useRef('')
  const fetchedTemplatePathsRef = useRef<Set<string>>(new Set())

  const {
    messages, isStreaming,
    selectedProvider, selectedModel, customModelId,
    modelJustChanged, contextStatus,
    currentPhase, activeRole, tasks,
    projectName, previousEffectiveModel,
    addUserMessage, startAssistantMessage,
    appendStreamToken, finalizeMessage,
    addErrorMessage, markContextSynced,
    addProjectFileAction
  } = useForgeKitStore()

  // sendRef uvek drzi najsveziju verziju send funkcije — resava closure stale problem
  const sendRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve())


  // Cleanup listenera pri unmount (OPT-06)
  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((fn) => fn())
      activeListenersRef.current = []
    }
  }, [])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const outboundText = normalizeOutboundText(text)
    contentRef.current = ''  // reset buffer za novu poruku
    addUserMessage(text)

    const messageId = `ai-${Date.now()}`
    startAssistantMessage(messageId)

    const effectiveModel = customModelId.trim() || selectedModel
    const needsRePrime = modelJustChanged || contextStatus === 'needs_refresh'

    let history: Array<{ role: 'user' | 'assistant'; content: string }>

    if (needsRePrime) {
      history = buildRePrimeMessages(
        {
          projectName, currentPhase, activeRole, tasks,
          messages, selectedModel: effectiveModel, previousEffectiveModel
        },
        outboundText
      )
      markContextSynced()
    } else {
      history = messages
        .filter((m) => !m.isStreaming
          && !m.content.startsWith('[SESSION_DIVIDER]')
          && !m.content.startsWith('[MODEL_SWITCH:'))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      history.push({ role: 'user', content: outboundText })
    }

    const removeToken = window.api.onStreamToken((token, id) => {
      if (id === messageId) {
        appendStreamToken(token, messageId)
        contentRef.current += token  // lokalna akumulacija za READ_TEMPLATE detekciju
      }
    })
    const removeComplete = window.api.onStreamComplete(async (id) => {
      if (id !== messageId) return

      const fullContent = contentRef.current
      contentRef.current = ''

      finalizeMessage(messageId)
      removeToken(); removeComplete(); removeError()
      activeListenersRef.current = []

      // ── READ_TEMPLATE detekcija ──
      // Ako AI odgovor sadrzi [READ_TEMPLATE: putanja], fetchujemo fajl sa GitHub-a
      // i auto-injektujemo sadrzaj nazad u razgovor
      // PROJECT_WRITE_FILE detekcija: AI ne pise direktno u fajl.
      // App kreira pending akciju koju korisnik potvrdjuje u SidePanel-u.
      const fileMatches = [...fullContent.matchAll(PROJECT_WRITE_REGEX)]
      for (const match of fileMatches) {
        const filename = match[1].trim()
        const content = match[2].trim()
        if (filename && content) addProjectFileAction(filename, content, messageId)
      }

      const matches = [...fullContent.matchAll(READ_TEMPLATE_REGEX)]
      if (matches.length === 0) return

      const fetched: { path: string; content: string }[] = []
      for (const match of matches) {
        const filePath = match[1].trim()
        if (fetchedTemplatePathsRef.current.has(filePath)) continue
        try {
          const result = await window.api.githubFetchTemplate(filePath)
          if (result.ok && result.content) {
            fetched.push({ path: filePath, content: result.content })
            fetchedTemplatePathsRef.current.add(filePath)
          }
        } catch { /* ignorisi gresku pri fetchu */ }
      }

      if (fetched.length === 0) return

      // Formatiramo sadrzaj — poseban prefiks prepoznaje MessageBubble za kompaktni prikaz
      const injectText = '[TEMPLATE_INJECT]\n' +
        fetched.map((f) => `=== ${f.path} ===\n\n${f.content}`).join('\n\n---\n\n')

      // Kratak timeout da React obradi finalizeMessage pre nego sto krenemo novi send
      setTimeout(() => { sendRef.current(injectText) }, 80)
    })
    const removeError = window.api.onStreamError((error, id) => {
      if (id === messageId) {
        addErrorMessage(error, messageId)
        removeToken(); removeComplete(); removeError()
        activeListenersRef.current = []
      }
    })
    activeListenersRef.current = [removeToken, removeComplete, removeError]

    // SEC-05: systemPrompt se ne šalje — main process ga dodaje sam
    window.api.sendMessage({
      messages: history,
      provider: selectedProvider,
      model: effectiveModel,
      messageId
    })
  }, [
    isStreaming, messages, selectedProvider, selectedModel, customModelId,
    modelJustChanged, contextStatus, currentPhase, activeRole, tasks,
    projectName, previousEffectiveModel,
    addUserMessage, startAssistantMessage, appendStreamToken,
    finalizeMessage, addErrorMessage, markContextSynced,
    addProjectFileAction
  ])

  // Osvezi sendRef na svaki render da onStreamComplete uvek ima svezu verziju
  sendRef.current = send

  return { send, isStreaming }
}
