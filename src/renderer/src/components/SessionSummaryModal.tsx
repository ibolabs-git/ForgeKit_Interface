import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useForgeKitStore } from '../store/forgekit.store'
import './SessionSummaryModal.css'

const SUMMARY_PROMPT = `Napravi kratak, strukturiran sažetak ove radne sesije.

Format (koristi markdown):
- **Projekat i kontekst** — o čemu se radilo
- **Ključne odluke** — šta je zaključeno ili dogovoreno
- **Urađeno** — šta je implementirano ili završeno
- **Sledeći koraci** — šta ostaje ili treba nastaviti

Budi koncizan (max 250 reči). Piši na jeziku koji dominira u razgovoru.`

export function SessionSummaryModal(): JSX.Element | null {
  const {
    showSummaryModal, setShowSummaryModal,
    messages, projectName, currentPhase,
    selectedProvider, selectedModel, customModelId,
    addUserMessage, startAssistantMessage, appendStreamToken, finalizeMessage, addErrorMessage
  } = useForgeKitStore()

  const [summaryText, setSummaryText] = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)

  const cleanupRef = useRef<(() => void) | null>(null)

  // Pokretanje sažetka pri otvaranju modala
  useEffect(() => {
    if (!showSummaryModal) return

    setSummaryText('')
    setStreaming(true)
    setDone(false)
    setError(null)
    setCopied(false)

    // Filtriraj poruke — bez divider-a, bez streaming, max 40
    const history = messages
      .filter((m) =>
        !m.isStreaming &&
        m.content !== '[SESSION_DIVIDER]' &&
        !m.content.startsWith('[MODEL_SWITCH:')
      )
      .slice(-40)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    if (history.length === 0) {
      setError('Nema poruka za sažetak.')
      setStreaming(false)
      setDone(true)
      return
    }

    // Dodaj zahtjev za sažetak kao posljednju user poruku
    history.push({ role: 'user', content: SUMMARY_PROMPT })

    const messageId = `summary-${Date.now()}`
    let accumulated = ''

    const removeToken = window.api.onStreamToken((token, id) => {
      if (id !== messageId) return
      accumulated += token
      setSummaryText(accumulated)
    })

    const removeComplete = window.api.onStreamComplete((id) => {
      if (id !== messageId) return
      setStreaming(false)
      setDone(true)
      removeToken()
      removeComplete()
      removeErr()
    })

    const removeErr = window.api.onStreamError((err, id) => {
      if (id !== messageId) return
      setError(err)
      setStreaming(false)
      setDone(true)
      removeToken()
      removeComplete()
      removeErr()
    })

    cleanupRef.current = () => { removeToken(); removeComplete(); removeErr() }

    const effectiveModel = customModelId.trim() || selectedModel

    window.api.sendMessage({
      messages: history,
      provider: selectedProvider,
      model: effectiveModel,
      messageId
    })

    return () => { cleanupRef.current?.() }
  }, [showSummaryModal]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    cleanupRef.current?.()
    setShowSummaryModal(false)
  }

  const handleCopy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleAddToChat = () => {
    if (!summaryText) return
    // Dodaj kao user → assistant par koji ostavlja trag u chatu
    const msgId = `summary-chat-${Date.now()}`
    addUserMessage(`[Sažetak sesije — ${projectName} · ${currentPhase}]`)
    startAssistantMessage(msgId)
    // Simuliraj finalizaciju s kompletnim tekstom
    const fakeAppend = summaryText
    appendStreamToken(fakeAppend, msgId)
    finalizeMessage(msgId)
    handleClose()
  }

  if (!showSummaryModal) return null

  return (
    <div className="summary-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="summary-modal">

        {/* Header */}
        <div className="summary-header">
          <div className="summary-title">
            <span className="summary-title-icon">◈</span>
            SESSION SUMMARY
            <span className="summary-title-sub">{projectName} · {currentPhase}</span>
          </div>
          <button className="summary-close" onClick={handleClose}>✕</button>
        </div>

        {/* Body */}
        <div className="summary-body">
          {streaming && summaryText === '' && (
            <div className="summary-loading">
              <span className="summary-dot" />
              <span className="summary-dot" />
              <span className="summary-dot" />
              <span className="summary-loading-text">Generišem sažetak...</span>
            </div>
          )}

          {error && (
            <div className="summary-error">⚠ {error}</div>
          )}

          {summaryText && (
            <div className="summary-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summaryText}
              </ReactMarkdown>
              {streaming && <span className="summary-cursor">▌</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="summary-footer">
          <button className="summary-btn-close" onClick={handleClose}>
            Zatvori
          </button>
          <div className="summary-footer-right">
            <button
              className="summary-btn-copy"
              onClick={handleCopy}
              disabled={!done || !summaryText}
            >
              {copied ? '✓ Kopirano' : 'Kopiraj'}
            </button>
            <button
              className="summary-btn-add"
              onClick={handleAddToChat}
              disabled={!done || !summaryText}
            >
              + Dodaj u chat
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
