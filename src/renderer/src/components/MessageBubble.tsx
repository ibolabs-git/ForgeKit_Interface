import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
// OPT-01: PrismLight umjesto Prism — ne učitava sve jezike automatski (~60% manji bundle).
// Registrujemo samo jezike koji su relevantni za ForgeKit radne tokove.
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import type { ChatMessage } from '../types'
import { useForgeKitStore } from '../store/forgekit.store'
import './MessageBubble.css'

SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('sql', sql)

// ── Role meta ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ORCHESTRATOR:    '#ff6b00',
  THINKER:         '#9b59b6',
  BUILDER:         '#2a5fd4',
  REVIEWER:        '#e67e22',
  'MEMORY CURATOR':'#1abc9c',
  OBSERVER:        '#95a5a6',
  USER:            '#888888',
  SYSTEM:          '#e74c3c'
}

const READ_TEMPLATE_ONLY_REGEX = /^\s*(?:\[READ_TEMPLATE:\s*[^\]]+\]\s*)+\s*$/
const READ_TEMPLATE_TAG_REGEX = /\[READ_TEMPLATE:\s*([^\]]+)\]/g

function stripRoleTag(content: string): string {
  return content.replace(/^\[[A-Z][A-Z\s]+\]\s*\n?/, '')
}

function getTemplateOnlyRequest(content: string): string[] | null {
  const withoutRole = stripRoleTag(content).trim()
  if (!READ_TEMPLATE_ONLY_REGEX.test(withoutRole)) return null
  return [...withoutRole.matchAll(READ_TEMPLATE_TAG_REGEX)].map((m) => m[1].trim())
}

// ── Code block — A2+A3 ───────────────────────────────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — ne prikazuj grešku
    }
  }

  const langLabel = language && language !== 'text' ? language.toUpperCase() : 'CODE'

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-lang">{langLabel}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          {copied ? '✓ KOPIRANO' : 'COPY ›'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '10px 14px',
          fontSize: '11.5px',
          fontFamily: 'Share Tech Mono, Courier New, monospace',
          borderRadius: 0,
          background: '#1e1e1e',
          border: 'none',
          lineHeight: '1.55',
        }}
        codeTagProps={{
          style: { fontFamily: 'inherit', fontSize: 'inherit' }
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Markdown components — A1 ─────────────────────────────────────────────────

// COMP-01: koristi typed Components umesto any — TypeScript može proveriti ispravnost svakog overridea
const mdComponents: Components = {
  // Block code — override <pre> da izvučemo jezik i sadržaj
  pre({ children }: { children: React.ReactNode }) {
    const child = (Array.isArray(children) ? children[0] : children) as React.ReactElement | undefined
    const props = (child?.props ?? {}) as { className?: string; children?: React.ReactNode }
    const match = /language-(\w+)/.exec(props.className ?? '')
    const code = String(props.children ?? '').replace(/\n$/, '')
    return <CodeBlock language={match?.[1] ?? 'text'} code={code} />
  },

  // Inline code
  code({ children, className }: { children: React.ReactNode; className?: string }) {
    // Ako ima language class — dio je block code koji <pre> već hvata
    if (className?.startsWith('language-')) return <code>{children}</code>
    return <code className="inline-code">{children}</code>
  },

  // Headings
  h1({ children }: { children: React.ReactNode }) {
    return <h2 className="md-h1">{children}</h2>
  },
  h2({ children }: { children: React.ReactNode }) {
    return <h3 className="md-h2">{children}</h3>
  },
  h3({ children }: { children: React.ReactNode }) {
    return <h4 className="md-h3">{children}</h4>
  },

  // Paragraphs
  p({ children }: { children: React.ReactNode }) {
    return <p className="md-p">{children}</p>
  },

  // Lists
  ul({ children }: { children: React.ReactNode }) {
    return <ul className="md-ul">{children}</ul>
  },
  ol({ children }: { children: React.ReactNode }) {
    return <ol className="md-ol">{children}</ol>
  },
  li({ children, className }: { children: React.ReactNode; className?: string }) {
    // GFM task list — ima className "task-list-item"
    const isTask = className === 'task-list-item'
    return <li className={isTask ? 'md-task-li' : 'md-li'}>{children}</li>
  },

  // Horizontal rule
  hr() {
    return <div className="md-hr" />
  },

  // Blockquote
  blockquote({ children }: { children: React.ReactNode }) {
    return <blockquote className="md-blockquote">{children}</blockquote>
  },

  // Strong / em
  strong({ children }: { children: React.ReactNode }) {
    return <strong className="md-strong">{children}</strong>
  },
  em({ children }: { children: React.ReactNode }) {
    return <em className="md-em">{children}</em>
  },

  // Table (GFM)
  table({ children }: { children: React.ReactNode }) {
    return <div className="md-table-wrap"><table className="md-table">{children}</table></div>
  },
  th({ children }: { children: React.ReactNode }) {
    return <th className="md-th">{children}</th>
  },
  td({ children }: { children: React.ReactNode }) {
    return <td className="md-td">{children}</td>
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  message: ChatMessage
  isSearchMatch?: boolean
  isCurrentMatch?: boolean
}

// ── Komponenta ────────────────────────────────────────────────────────────────

// OPT-02: React.memo sprječava re-render MessageBubble-a kada mu se props ne mijenjaju.
// Tokom streaminga, jedino MessageBubble sa isStreaming=true će re-renderovati
// (jer čita streamingContent iz store-a), svi ostali ostaju "zamrznuti".
export const MessageBubble = React.memo(function MessageBubble(
  { message, isSearchMatch, isCurrentMatch }: Props
): JSX.Element {
  const { setShowSettings, setSettingsTab } = useForgeKitStore()
  // OPT-02: streaming sadržaj čitamo direktno iz store-a, ne iz message.content
  // koji se ažurira tek na finalizeMessage (kraj streama)
  const streamingContent = useForgeKitStore((s) =>
    message.isStreaming ? s.streamingContent : null
  )
  const displayContent = streamingContent !== null ? streamingContent : message.content
  const templateOnlyPaths = getTemplateOnlyRequest(displayContent)

  const handleOpenSettings = (tab: 'global' | 'project') => {
    setSettingsTab(tab)
    setShowSettings(true)
  }

  // ── Template inject — kompaktni prikaz ──
  if (displayContent.startsWith('[TEMPLATE_INJECT]')) {
    return <></>
  }

  // ── READ_TEMPLATE request — sakrij interne tagove od korisnika ──
  if (templateOnlyPaths && templateOnlyPaths.length > 0) {
    return <></>
  }

  // ── Session divider ──
  if (message.content === '[SESSION_DIVIDER]') {
    const d = new Date(message.timestamp)
    const label =
      d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="session-divider">
        <div className="session-divider-line" />
        <span className="session-divider-label">⬡ Nova sesija — {label}</span>
        <div className="session-divider-line" />
      </div>
    )
  }

  // ── Model switch divider ──
  const modelSwitchMatch = message.content.match(/^\[MODEL_SWITCH:(.+?)(?:->|\u2192)(.+?):(\d+)\]$/)
  if (modelSwitchMatch) {
    const [, from, to, ts] = modelSwitchMatch
    const d = new Date(Number(ts))
    const timeLabel = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
    const fromShort = from.includes('/') ? from.split('/')[1] : from.split('-').slice(0, 3).join('-')
    const toShort   = to.includes('/')   ? to.split('/')[1]   : to.split('-').slice(0, 3).join('-')
    return (
      <div className="model-switch-divider">
        <div className="session-divider-line" />
        <span className="model-switch-label">
          Model promenjen - <span className="model-switch-from">{fromShort}</span>
          {' -> '}
          <span className="model-switch-to">{toShort}</span>
          {' - '}{timeLabel}
        </span>
        <div className="session-divider-line" />
      </div>
    )
  }

  // ── Normalna poruka ──
  const color  = ROLE_COLORS[message.forgeRole] ?? '#888'
  const isUser = message.role === 'user'

  // Ukloni role tag s početka sadržaja (iz displayContent koji može biti streaming buffer)
  const cleanedContent = stripRoleTag(displayContent)

  const searchClasses = [
    isSearchMatch  ? 'search-match'   : '',
    isCurrentMatch ? 'search-current' : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${searchClasses}`}
      data-msg-id={message.id}
    >

      {/* Role badge + timestamp header */}
      <div className="msg-row-header">
        {!isUser ? (
          <span className="role-tag" style={{ color, borderColor: color + '55' }}>
            {message.forgeRole}
          </span>
        ) : (
          <span className="role-tag user-tag">YOU</span>
        )}
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Content */}
      <div className={`message-content ${isUser ? 'user-content' : 'assistant-content'}`}>
        {message.isStreaming && displayContent === '' ? (
          <span className="typing-indicator">
            <span /><span /><span />
          </span>
        ) : (
          <div className="message-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {cleanedContent}
            </ReactMarkdown>
          </div>
        )}

        {message.action === 'open-settings-global' && (
          <button
            className="msg-action-btn"
            onClick={() => handleOpenSettings('global')}
          >
            ⚙ Otvori Settings → API Ključevi
          </button>
        )}
        {message.action === 'open-settings-project' && (
          <button
            className="msg-action-btn"
            onClick={() => handleOpenSettings('project')}
          >
            ⚙ Otvori Settings → Projekat
          </button>
        )}
      </div>

    </div>
  )
})
