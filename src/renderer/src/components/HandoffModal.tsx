import { useState, useMemo } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { buildHandoffDoc } from '../utils/forgekit-context'
import './HandoffModal.css'

const PHASE_LABELS: Record<string, string> = {
  F1: 'F1 — Fundament',
  F2: 'F2 — ForgeKit Logika',
  F3: 'F3 — Multi-model'
}

export function HandoffModal(): JSX.Element | null {
  const {
    showHandoffModal, setShowHandoffModal,
    projectName, currentPhase, tasks, messages,
    selectedProvider, selectedModel, projectPath,
    addSessionDivider
  } = useForgeKitStore()

  const [includeTasks,    setIncludeTasks]    = useState(true)
  const [includeMessages, setIncludeMessages] = useState(true)
  const [previewOpen,     setPreviewOpen]     = useState(false)
  const [saving,          setSaving]          = useState(false)

  const completedCount = tasks.filter((t) => t.completed).length

  // Generisani dokument — reaguje na toggle opcije
  const docContent = useMemo(() =>
    buildHandoffDoc(projectName, currentPhase, tasks, messages, selectedProvider, selectedModel, {
      includeTasks,
      includeMessages
    }),
    [projectName, currentPhase, tasks, messages, selectedProvider, selectedModel, includeTasks, includeMessages]
  )

  const handleSave = async () => {
    setSaving(true)
    if (projectPath) {
      try {
        const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
        await window.api.projectWriteFile(`handoff_${ts}.md`, docContent)
      } catch (err) {
        console.error('Handoff greška:', err)
      }
    }
    addSessionDivider()
    setSaving(false)
    setShowHandoffModal(false)
  }

  const handleCancel = () => {
    setPreviewOpen(false)
    setShowHandoffModal(false)
  }

  if (!showHandoffModal) return null

  return (
    <div className="handoff-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}>
      <div className="handoff-modal">

        {/* Header */}
        <div className="handoff-header">
          <div className="handoff-title">
            <span className="handoff-title-icon">📋</span>
            HANDOFF PROJEKTA
          </div>
          <button className="handoff-close" onClick={handleCancel}>✕</button>
        </div>

        {/* Meta info */}
        <div className="handoff-meta">
          <span className="handoff-meta-item"><span className="handoff-meta-label">PROJEKAT</span>{projectName}</span>
          <span className="handoff-meta-sep">·</span>
          <span className="handoff-meta-item"><span className="handoff-meta-label">FAZA</span>{PHASE_LABELS[currentPhase] ?? currentPhase}</span>
          <span className="handoff-meta-sep">·</span>
          <span className="handoff-meta-item"><span className="handoff-meta-label">MODEL</span>{selectedModel}</span>
        </div>

        {/* Opcije */}
        <div className="handoff-options">
          <div className="handoff-option-label">UKLJUČI U DOKUMENT</div>

          <label className="handoff-toggle">
            <input
              type="checkbox"
              checked={includeTasks}
              onChange={(e) => setIncludeTasks(e.target.checked)}
            />
            <span className="handoff-toggle-box" />
            <span className="handoff-toggle-text">
              Taskovi
              <span className="handoff-toggle-sub">
                {completedCount}/{tasks.length} završenih
              </span>
            </span>
          </label>

          <label className="handoff-toggle">
            <input
              type="checkbox"
              checked={includeMessages}
              onChange={(e) => setIncludeMessages(e.target.checked)}
            />
            <span className="handoff-toggle-box" />
            <span className="handoff-toggle-text">
              Izvod sesije
              <span className="handoff-toggle-sub">
                poslednjih 6 poruka (od {messages.length} ukupno)
              </span>
            </span>
          </label>
        </div>

        {/* Preview */}
        <div className="handoff-preview-section">
          <button
            className="handoff-preview-toggle"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? '▾' : '▸'} PREVIEW DOKUMENTA
          </button>

          {previewOpen && (
            <div className="handoff-preview-content">
              <pre className="handoff-preview-text">{docContent}</pre>
            </div>
          )}
        </div>

        {/* Napomena o folderu */}
        {!projectPath && (
          <div className="handoff-warning">
            ⚠ Projekat nema folder — dokument neće biti sačuvan na disku.
          </div>
        )}

        {/* Footer */}
        <div className="handoff-footer">
          <button className="handoff-btn-cancel" onClick={handleCancel}>
            Otkaži
          </button>
          <button
            className="handoff-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⟳ Čuvam...' : '✓ Sačuvaj Handoff'}
          </button>
        </div>

      </div>
    </div>
  )
}
