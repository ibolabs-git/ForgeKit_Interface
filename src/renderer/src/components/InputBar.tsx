import { useState, useRef, useEffect } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildRePrimeMessages } from '../utils/forgekit-context'
import './InputBar.css'
// SEC-05: FORGEKIT_SYSTEM_PROMPT premješten u main process — ne importuje se ovdje

export function InputBar(): JSX.Element {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // OPT-06: čuva reference na aktivne remove funkcije za stream listenere.
  // Ako se komponenta unmountuje tokom streaminga (tab switch u budućim verzijama),
  // useEffect cleanup automatski uklanja sve registrovane listenere i sprječava memory leak.
  const activeListenersRef = useRef<Array<() => void>>([])

  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((fn) => fn())
      activeListenersRef.current = []
    }
  }, [])

  const {
    messages,
    isStreaming,
    selectedProvider,
    selectedModel,
    customModelId,
    modelJustChanged,
    contextStatus,
    currentPhase,
    activeRole,
    tasks,
    projectName,
    previousEffectiveModel,
    addUserMessage,
    startAssistantMessage,
    appendStreamToken,
    finalizeMessage,
    addErrorMessage,
    markContextSynced
  } = useForgeKitStore()

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    textareaRef.current?.focus()

    addUserMessage(text)

    const messageId = `ai-${Date.now()}`
    startAssistantMessage(messageId)

    // Efektivni model — custom ID override ili izabrani iz dropdown-a
    const effectiveModel = customModelId.trim() || selectedModel

    // Re-Prime logika: koristi se kada je model upravo promenjen ili context treba refresh
    const needsRePrime = modelJustChanged || contextStatus === 'needs_refresh'

    let history: Array<{ role: 'user' | 'assistant'; content: string }>

    if (needsRePrime) {
      // Šalji strukturiran kontekst umjesto pune historije
      history = buildRePrimeMessages(
        {
          projectName,
          currentPhase,
          activeRole,
          tasks,
          messages,
          selectedModel: effectiveModel,
          previousEffectiveModel
        },
        text
      )
      // Odmah označi kao synced — slanje je u toku
      markContextSynced()
    } else {
      // Normalan flow — puna historija (bez system divider poruka)
      history = messages
        .filter((m) => !m.isStreaming && !m.content.startsWith('[SESSION_DIVIDER]') && !m.content.startsWith('[MODEL_SWITCH:'))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      history.push({ role: 'user', content: text })
    }

    // Registruj listenere pre slanja
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
    // OPT-06: registruj u ref kako bi unmount cleanup mogao pozvati ako stream ne završi
    activeListenersRef.current = [removeToken, removeComplete, removeError]

    // SEC-05: systemPrompt se ne šalje — main process ga dodaje sam
    window.api.sendMessage({
      messages: history,
      provider: selectedProvider,
      model: effectiveModel,
      messageId
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter = pošalji; plain Enter i Shift+Enter = novi red (default)
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }

  return (
    <div className="input-bar">
      <textarea
        ref={textareaRef}
        className="input-textarea"
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Unesi poruku... (Ctrl+Enter za slanje, Enter za novi red)"
        disabled={isStreaming}
        rows={1}
      />
      <button
        className={`send-btn ${isStreaming ? 'loading' : ''}`}
        onClick={handleSend}
        disabled={isStreaming || !input.trim()}
        title="Posalji (Ctrl+Enter)"
      >
        {isStreaming ? '◼' : '▶'}
      </button>
    </div>
  )
}
