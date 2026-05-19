/**
 * useSendMessage — zajednički hook za slanje poruka ka AI-u.
 * Koristi ga i InputBar (normalne poruke) i LeftPanel (invoke komande).
 */
import { useRef, useCallback, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildRePrimeMessages } from '../utils/forgekit-context'

export function useSendMessage() {
  const activeListenersRef = useRef<Array<() => void>>([])

  const {
    messages, isStreaming,
    selectedProvider, selectedModel, customModelId,
    modelJustChanged, contextStatus,
    currentPhase, activeRole, tasks,
    projectName, previousEffectiveModel,
    addUserMessage, startAssistantMessage,
    appendStreamToken, finalizeMessage,
    addErrorMessage, markContextSynced
  } = useForgeKitStore()

  // Cleanup listenera pri unmount (OPT-06)
  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((fn) => fn())
      activeListenersRef.current = []
    }
  }, [])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

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
        text
      )
      markContextSynced()
    } else {
      history = messages
        .filter((m) => !m.isStreaming
          && !m.content.startsWith('[SESSION_DIVIDER]')
          && !m.content.startsWith('[MODEL_SWITCH:'))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      history.push({ role: 'user', content: text })
    }

    const removeToken = window.api.onStreamToken((token, id) => {
      if (id === messageId) appendStreamToken(token, messageId)
    })
    const removeComplete = window.api.onStreamComplete((id) => {
      if (id === messageId) {
        finalizeMessage(messageId)
        removeToken(); removeComplete(); removeError()
        activeListenersRef.current = []
      }
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
    finalizeMessage, addErrorMessage, markContextSynced
  ])

  return { send, isStreaming }
}
