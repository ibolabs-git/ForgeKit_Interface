import { useState, useRef } from 'react'
import { useSendMessage } from '../hooks/useSendMessage'
import './InputBar.css'

export function InputBar(): JSX.Element {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { send, cancel, isStreaming } = useSendMessage()

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    textareaRef.current?.focus()
    await send(text)
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
        onClick={isStreaming ? cancel : handleSend}
        disabled={!isStreaming && !input.trim()}
        title={isStreaming ? 'Prekini odgovor' : 'Posalji (Ctrl+Enter)'}
      >
        {isStreaming ? '◼' : '▶'}
      </button>
    </div>
  )
}
