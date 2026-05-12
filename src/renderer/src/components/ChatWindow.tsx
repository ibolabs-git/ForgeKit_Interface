import { useEffect, useRef } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { MessageBubble } from './MessageBubble'
import './ChatWindow.css'

export function ChatWindow(): JSX.Element {
  const messages = useForgeKitStore((s) => s.messages)
  const isStreaming = useForgeKitStore((s) => s.isStreaming)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="chat-empty">
          <div className="chat-empty-icon">⬡</div>
          <div className="chat-empty-title">ForgeKit Interface</div>
          <div className="chat-empty-subtitle">
            Zapocni razgovor. Orchestrator vodi proces.
          </div>
        </div>
      )}

      <div className="messages-list">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {isStreaming && (
        <div className="streaming-indicator">
          <span className="streaming-dot" />
          Generisem odgovor...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
