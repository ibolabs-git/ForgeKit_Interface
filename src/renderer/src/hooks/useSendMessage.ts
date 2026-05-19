/**
 * useSendMessage - zajednicki hook za slanje poruka ka AI-u.
 * Koristi ga i InputBar (normalne poruke) i LeftPanel (invoke komande).
 */
import { useRef, useCallback, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildRePrimeMessages } from '../utils/forgekit-context'

const READ_TEMPLATE_REGEX = /\[READ_TEMPLATE:\s*([^\]]+)\]/g
const READ_TEMPLATE_ONLY_REGEX = /^\s*(?:\[[A-Z][A-Z\s]+\]\s*)?(?:\[READ_TEMPLATE:\s*[^\]]+\]\s*)+\s*$/
const PROJECT_WRITE_REGEX = /\[PROJECT_WRITE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/PROJECT_WRITE_FILE\]/g
const FORGEKIT_INIT_TEXT_REGEX = /\b(pokreni|startuj|aktiviraj|koristi|ukljuci|uklju\u010di)\b[\s\S]{0,40}\b(forge\s*kit|forgekit|forgkit|forgetkit)\b(?:[\s\S]{0,40}\b(rezim|re\u017eim|mode)\b)?/i

interface SendOptions {
  hiddenUser?: boolean
}

function normalizeOutboundText(text: string): string {
  const trimmed = text.trim()
  if (trimmed === '[FORGEKIT_INIT]') return trimmed
  if (FORGEKIT_INIT_TEXT_REGEX.test(trimmed)) return '[FORGEKIT_INIT]'
  return text
}

function isInternalTemplateMessage(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith('[TEMPLATE_INJECT]') || READ_TEMPLATE_ONLY_REGEX.test(trimmed)
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

export function useSendMessage() {
  const activeListenersRef = useRef<Array<() => void>>([])
  const contentRef = useRef('')
  const templateCacheRef = useRef<Map<string, string>>(new Map())

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

  const sendRef = useRef<(text: string, options?: SendOptions) => Promise<void>>(
    () => Promise.resolve()
  )

  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((fn) => fn())
      activeListenersRef.current = []
    }
  }, [])

  const send = useCallback(async (text: string, options: SendOptions = {}) => {
    if (!text.trim() || isStreaming) return

    const outboundText = normalizeOutboundText(text)
    contentRef.current = ''
    if (!options.hiddenUser) addUserMessage(text)

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
          && !m.content.startsWith('[MODEL_SWITCH:')
          && !isInternalTemplateMessage(m.content))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      history.push({ role: 'user', content: outboundText })
    }

    const removeToken = window.api.onStreamToken((token, id) => {
      if (id === messageId) {
        appendStreamToken(token, messageId)
        contentRef.current += token
      }
    })

    const removeComplete = window.api.onStreamComplete(async (id) => {
      if (id !== messageId) return

      const fullContent = contentRef.current
      contentRef.current = ''

      finalizeMessage(messageId)
      removeToken(); removeComplete(); removeError()
      activeListenersRef.current = []

      const fileMatches = [...fullContent.matchAll(PROJECT_WRITE_REGEX)]
      for (const match of fileMatches) {
        const filename = match[1].trim()
        const content = match[2].trim()
        if (filename && content) addProjectFileAction(filename, content, messageId)
      }

      const matches = [...fullContent.matchAll(READ_TEMPLATE_REGEX)]
      if (matches.length === 0) return

      const isTemplateOnlyRequest = READ_TEMPLATE_ONLY_REGEX.test(fullContent.trim())
      const fetched: { path: string; content: string }[] = []

      for (const match of matches) {
        const filePath = match[1].trim()
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
          // Ucitavanje template-a je interni mehanizam; greska ne sme prekinuti chat.
        }
      }

      if (fetched.length === 0 && !isTemplateOnlyRequest) return

      const injectText = buildTemplateContinuation(fetched)
      setTimeout(() => { sendRef.current(injectText, { hiddenUser: true }) }, 80)
    })

    const removeError = window.api.onStreamError((error, id) => {
      if (id === messageId) {
        addErrorMessage(error, messageId)
        removeToken(); removeComplete(); removeError()
        activeListenersRef.current = []
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
    projectName, previousEffectiveModel,
    addUserMessage, startAssistantMessage, appendStreamToken,
    finalizeMessage, addErrorMessage, markContextSynced,
    addProjectFileAction
  ])

  sendRef.current = send

  return { send, isStreaming }
}
