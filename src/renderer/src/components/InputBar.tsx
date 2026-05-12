import { useState, useRef } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { FORGEKIT_SYSTEM_PROMPT } from '../prompts/system-prompt'
import './InputBar.css'

export function InputBar(): JSX.Element {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isStreaming,
    selectedProvider,
    selectedModel,
    addUserMessage,
    startAssistantMessage,
    appendStreamToken,
    finalizeMessage,
    addErrorMessage
  } = useForgeKitStore()

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    textareaRef.current?.focus()

    addUserMessage(text)

    const messageId = `ai-${Date.now()}`
    startAssistantMessage(messageId)

    const history = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }))

    history.push({ role: 'user', content: text })

    // Registruj listenere pre slanja
    const removeToken = window.api.onStreamToken((token, id) => {
      if (id === messageId) appendStreamToken(token, messageId)
    })
    const removeComplete = window.api.onStreamComplete((id) => {
      if (id === messageId) {
        finalizeMessage(messageId)
        removeToken()
        removeComplete()
        removeError()
      }
    })
    const removeError = window.api.onStreamError((error, id) => {
      if (id === messageId) {
        addErrorMessage(error, messageId)
        removeToken()
        removeComplete()
        removeError()
      }
    })

    window.api.sendMessage({
      messages: history,
      provider: selectedProvider,
      model: selectedModel,
      systemPrompt: FORGEKIT_SYSTEM_PROMPT,
      messageId
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        placeholder="Unesi poruku... (Enter za slanje, Shift+Enter za novi red)"
        disabled={isStreaming}
        rows={1}
      />
      <button
        className={`send-btn ${isStreaming ? 'loading' : ''}`}
        onClick={handleSend}
        disabled={isStreaming || !input.trim()}
        title="Posalji (Enter)"
      >
        {isStreaming ? '◼' : '▶'}
      </button>
    </div>
  )
}
