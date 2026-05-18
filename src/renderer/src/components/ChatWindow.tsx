import { useEffect, useRef } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { MessageBubble } from './MessageBubble'
import './ChatWindow.css'

const PHASE_LABELS: Record<string, string> = {
  F1: 'F1 Fundament',
  F2: 'F2 ForgeKit Logika',
  F3: 'F3 Multi-model'
}

export function ChatWindow(): JSX.Element {
  const messages    = useForgeKitStore((s) => s.messages)
  const isStreaming = useForgeKitStore((s) => s.isStreaming)
  const projectName = useForgeKitStore((s) => s.projectName)
  const currentPhase = useForgeKitStore((s) => s.currentPhase)
  const activeRole  = useForgeKitStore((s) => s.activeRole)
  const bottomRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      {/* Context info bar — ChainGPT chat header style */}
      <div className="chat-header-bar">
        <div className="chat-header-title">
          CHAT <strong>{projectName} · {PHASE_LABELS[currentPhase] ?? currentPhase}</strong>
        </div>
        <div className="chat-header-mode">{activeRole} MODE</div>
      </div>

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
    </>
  )
}
