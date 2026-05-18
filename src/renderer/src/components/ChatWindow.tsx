import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { MessageBubble } from './MessageBubble'
import './ChatWindow.css'

const PHASE_LABELS: Record<string, string> = {
  F1: 'F1 Fundament',
  F2: 'F2 ForgeKit Logika',
  F3: 'F3 Multi-model'
}

export function ChatWindow(): JSX.Element {
  const messages           = useForgeKitStore((s) => s.messages)
  const isStreaming        = useForgeKitStore((s) => s.isStreaming)
  const projectName        = useForgeKitStore((s) => s.projectName)
  const currentPhase       = useForgeKitStore((s) => s.currentPhase)
  const activeRole         = useForgeKitStore((s) => s.activeRole)
  const projectPath        = useForgeKitStore((s) => s.projectPath)
  const highlightMessageId = useForgeKitStore((s) => s.highlightMessageId)
  const setHighlightMessageId = useForgeKitStore((s) => s.setHighlightMessageId)

  const bottomRef      = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex,  setMatchIndex]  = useState(0)

  // ── Export state ──────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false)

  // ── IDs poruka koje sadrže search upit ────────────────────────────────────
  const matchIds = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return messages
      .filter((m) =>
        m.content !== '[SESSION_DIVIDER]' &&
        !m.content.startsWith('[MODEL_SWITCH:') &&
        m.content.toLowerCase().includes(q)
      )
      .map((m) => m.id)
  }, [messages, searchQuery])

  // ── Scroll do poruke po ID-u ──────────────────────────────────────────────
  const scrollToId = useCallback((id: string) => {
    const el = document.querySelector(`[data-msg-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const goNext = useCallback(() => {
    if (!matchIds.length) return
    const next = (matchIndex + 1) % matchIds.length
    setMatchIndex(next)
    scrollToId(matchIds[next])
  }, [matchIds, matchIndex, scrollToId])

  const goPrev = useCallback(() => {
    if (!matchIds.length) return
    const prev = (matchIndex - 1 + matchIds.length) % matchIds.length
    setMatchIndex(prev)
    scrollToId(matchIds[prev])
  }, [matchIds, matchIndex, scrollToId])

  // ── Kbd: Ctrl+F = otvori, Escape = zatvori ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 40)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
        setMatchIndex(0)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen])

  // ── Pri promjeni upita: resetuj na prvu podudarnost ──────────────────────
  useEffect(() => {
    setMatchIndex(0)
    if (matchIds.length > 0) scrollToId(matchIds[0])
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll na dno (samo kad search nije aktivan) ────────────────────
  useEffect(() => {
    if (!searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, searchOpen])

  // ── B3: Jump to message ───────────────────────────────────────────────────
  useEffect(() => {
    if (!highlightMessageId) return
    const el = document.querySelector(`[data-msg-id="${highlightMessageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('jump-highlight')
      const t = setTimeout(() => {
        el.classList.remove('jump-highlight')
        setHighlightMessageId(null)
      }, 1600)
      return () => clearTimeout(t)
    }
    setHighlightMessageId(null)
  }, [highlightMessageId, setHighlightMessageId])

  // ── Zatvori export dropdown klikom izvan njega ────────────────────────────
  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.export-wrap')) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (format: 'md' | 'txt') => {
    setExportOpen(false)
    const lines: string[] = []

    if (format === 'md') {
      lines.push(`# Chat Export — ${projectName}`)
      lines.push(`\n*Izvezeno: ${new Date().toLocaleString('sr-RS')}*\n`)
      lines.push('---\n')
    } else {
      lines.push(`CHAT EXPORT — ${projectName.toUpperCase()}`)
      lines.push(`Izvezeno: ${new Date().toLocaleString('sr-RS')}`)
      lines.push('='.repeat(60), '')
    }

    for (const msg of messages) {
      if (msg.content === '[SESSION_DIVIDER]') {
        const d = new Date(msg.timestamp)
        const label = d.toLocaleDateString('sr-RS') + ' · ' + d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
        if (format === 'md') {
          lines.push(`\n---\n*Nova sesija — ${label}*\n---\n`)
        } else {
          lines.push(`\n${'─'.repeat(40)}\nNova sesija — ${label}\n${'─'.repeat(40)}\n`)
        }
        continue
      }
      if (msg.content.startsWith('[MODEL_SWITCH:')) continue

      const time = new Date(msg.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
      const role = msg.role === 'user' ? 'YOU' : msg.forgeRole
      const content = msg.content.replace(/^\[[A-Z][A-Z\s]+\]\s*\n?/, '')

      if (format === 'md') {
        lines.push(`### [${role}] — ${time}\n\n${content}\n`)
      } else {
        lines.push(`[${role}] ${time}\n${content}\n`)
      }
    }

    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
    const filename = `chat_export_${ts}.${format}`
    try {
      await window.api.projectWriteFile(filename, lines.join('\n'))
    } catch (err) {
      console.error('Export greška:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Context info bar */}
      <div className="chat-header-bar">
        <div className="chat-header-title">
          CHAT <strong>{projectName} · {PHASE_LABELS[currentPhase] ?? currentPhase}</strong>
        </div>

        <div className="chat-header-actions">
          {/* Export */}
          <div className="export-wrap">
            <button
              className="chat-header-btn"
              onClick={() => setExportOpen((v) => !v)}
              title="Izvezi razgovor"
              disabled={messages.length === 0 || !projectPath}
            >
              EXPORT ›
            </button>
            {exportOpen && (
              <div className="export-dropdown">
                <button className="export-option" onClick={() => handleExport('md')}>
                  ↓ &nbsp;Markdown (.md)
                </button>
                <button className="export-option" onClick={() => handleExport('txt')}>
                  ↓ &nbsp;Plaintext (.txt)
                </button>
              </div>
            )}
          </div>

          {/* Search toggle */}
          <button
            className={`chat-header-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => {
              setSearchOpen((v) => {
                if (!v) setTimeout(() => searchInputRef.current?.focus(), 40)
                else { setSearchQuery(''); setMatchIndex(0) }
                return !v
              })
            }}
            title="Pretraži razgovor (Ctrl+F)"
          >
            SEARCH
          </button>
        </div>

        <div className="chat-header-mode">{activeRole} MODE</div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext() }
              if (e.key === 'Enter' && e.shiftKey)  { e.preventDefault(); goPrev() }
              if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setMatchIndex(0) }
            }}
            placeholder="Pretraži razgovor..."
          />
          {searchQuery && (
            <span className="search-count">
              {matchIds.length > 0 ? `${matchIndex + 1} / ${matchIds.length}` : '0'}
            </span>
          )}
          <button className="search-nav-btn" onClick={goPrev} disabled={matchIds.length < 2} title="Prethodna (Shift+Enter)">↑</button>
          <button className="search-nav-btn" onClick={goNext} disabled={matchIds.length < 2} title="Sljedeća (Enter)">↓</button>
          <button className="search-close-btn" onClick={() => { setSearchOpen(false); setSearchQuery(''); setMatchIndex(0) }}>✕</button>
        </div>
      )}

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
            <MessageBubble
              key={msg.id}
              message={msg}
              isSearchMatch={matchIds.includes(msg.id)}
              isCurrentMatch={matchIds[matchIndex] === msg.id}
            />
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
