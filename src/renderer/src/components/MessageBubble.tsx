import type { ChatMessage } from '../types'
import './MessageBubble.css'

const ROLE_COLORS: Record<string, string> = {
  ORCHESTRATOR: '#4a9eff',
  THINKER: '#9b59b6',
  BUILDER: '#2ecc71',
  REVIEWER: '#e67e22',
  'MEMORY CURATOR': '#1abc9c',
  OBSERVER: '#95a5a6',
  USER: '#888888',
  SYSTEM: '#e74c3c'
}

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props): JSX.Element {
  const color = ROLE_COLORS[message.forgeRole] ?? '#888'
  const isUser = message.role === 'user'

  // Renderuje markdown-like formatovanje
  const renderContent = (text: string) => {
    // Ukloni role tag iz pocetka za prikaz
    const cleaned = text.replace(/^\[[A-Z][A-Z\s]+\]\s*\n?/, '')

    return cleaned.split('\n').map((line, i) => {
      // Task checkbox
      if (line.match(/^- \[( |x)\] /)) {
        const done = line.startsWith('- [x]')
        const content = line.replace(/^- \[( |x)\] /, '')
        return (
          <div key={i} className={`task-line ${done ? 'done' : ''}`}>
            <span className="task-checkbox">{done ? '☑' : '☐'}</span>
            <span>{content}</span>
          </div>
        )
      }
      // Bold **text**
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
            )}
          </p>
        )
      }
      // Code block marker
      if (line.startsWith('```')) return <div key={i} className="code-fence" />
      // Heading
      if (line.startsWith('## ')) return <h3 key={i} className="msg-heading">{line.slice(3)}</h3>
      if (line.startsWith('# ')) return <h2 key={i} className="msg-heading">{line.slice(2)}</h2>
      // List item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i}>{line.slice(2)}</li>
      }
      // Empty line
      if (line.trim() === '') return <br key={i} />
      // Normal
      return <p key={i}>{line}</p>
    })
  }

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="role-tag" style={{ color }}>
          [{message.forgeRole}]
        </div>
      )}
      <div className={`message-content ${isUser ? 'user-content' : 'assistant-content'}`}>
        {message.isStreaming && message.content === '' ? (
          <span className="typing-indicator">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <div className="message-text">
            {renderContent(message.content)}
          </div>
        )}
      </div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
