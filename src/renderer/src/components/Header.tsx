import { useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import { TabBar } from './TabBar'
import type { ChatMessage, Task, ForgeKitPhase } from '../types'
import './Header.css'

function buildHandoffDoc(
  projectName: string,
  phase: ForgeKitPhase,
  tasks: Task[],
  messages: ChatMessage[],
  provider: string,
  model: string
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })

  const completed = tasks.filter((t) => t.completed)
  const pending = tasks.filter((t) => !t.completed)

  const taskList = tasks.length > 0
    ? tasks.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.content}`).join('\n')
    : '_Nema evidentiranih zadataka_'

  const lastMsgs = messages.slice(-6)
  const msgPreview = lastMsgs.length > 0
    ? lastMsgs.map((m) => {
        const roleLabel = m.role === 'user' ? 'Korisnik' : `ForgeKit [${m.forgeRole}]`
        const preview = m.content.length > 300
          ? m.content.slice(0, 300) + '...'
          : m.content
        return `**${roleLabel}:**\n${preview}`
      }).join('\n\n---\n\n')
    : '_Nema poruka u sesiji_'

  const phaseNames: Record<ForgeKitPhase, string> = {
    F1: 'F1 — Fundament',
    F2: 'F2 — ForgeKit Logika',
    F3: 'F3 — Multi-model'
  }

  return `# Handoff dokument — ${projectName}

**Datum:** ${dateStr} u ${timeStr}
**Faza:** ${phaseNames[phase]}
**Model:** ${provider} / ${model}

---

## Status zadataka

| Kategorija | Broj |
|---|---|
| Završeni | ${completed.length} |
| Na čekanju | ${pending.length} |
| Ukupno | ${tasks.length} |

### Lista zadataka

${taskList}

---

## Izvod sesije

Ukupno poruka u sesiji: **${messages.length}**

### Poslednje poruke

${msgPreview}

---

*Handoff dokument generisan automatski — ForgeKit Interface*
*Nova sesija je pokrenuta nakon ovog zapisa.*
`
}

export function Header(): JSX.Element {
  const {
    projectName, setProjectName, setShowSettings,
    addSessionDivider, currentPhase, tasks, messages,
    selectedProvider, selectedModel, projectPath
  } = useForgeKitStore()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(projectName)

  const handleNameSubmit = () => {
    setProjectName(nameInput.trim() || projectName)
    setEditingName(false)
  }

  const handleNewSession = async () => {
    if (!window.confirm(
      'Sačuvati Handoff projekta?\n\nHandoff dokument ce biti sacuvan u projektni folder.\nRazgovor i taskovi ostaju netaknuti — samo se dodaje vremenski separator.'
    )) return

    // Sačuvaj handoff u projektni folder
    if (projectPath) {
      try {
        const handoffContent = buildHandoffDoc(
          projectName, currentPhase, tasks, messages, selectedProvider, selectedModel
        )
        const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
        await window.api.projectWriteFile(`handoff_${ts}.md`, handoffContent)
      } catch (err) {
        console.error('Greska pri cuvanju handoff dokumenta:', err)
      }
    }

    // Dodaj vizuelni separator u razgovor — NE brišemo ništa
    addSessionDivider()
  }

  return (
    <header className="header">
      {/* Logo zone — left, fixed width to align with left panel */}
      <div className="header-left">
        <div className="header-logo">
          <div className="header-logo-mark">FK</div>
          <div className="header-logo-text">
            <span className="header-logo-name">FORGEKIT</span>
            <span className="header-logo-sub">INTERFACE</span>
          </div>
        </div>
      </div>

      {/* Tabs — inline in header, fill remaining space */}
      <TabBar />

      {/* Right controls */}
      <div className="header-right">
        <button
          className="header-icon-btn"
          onClick={handleNewSession}
          title="Sacuvaj handoff dokument i oznaci novi radni period (razgovor ostaje)"
        >📋</button>
        <button
          className="header-icon-btn"
          onClick={() => setShowSettings(true)}
          title="Podesavanja"
        >⚙</button>
        <button
          className="header-cta"
          onClick={handleNewSession}
          title="Handoff projekta"
        >HANDOFF &nbsp;›</button>
      </div>
    </header>
  )
}
