import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { InputBar } from './components/InputBar'
import { LeftPanel } from './components/LeftPanel'
import { SidePanel } from './components/SidePanel'
import { TopStateBar } from './components/TopStateBar'
import { SettingsModal } from './components/SettingsModal'
import { ProjectSetupModal } from './components/ProjectSetupModal'
import { HandoffModal } from './components/HandoffModal'
import { SessionSummaryModal } from './components/SessionSummaryModal'
import { useForgeKitStore } from './store/forgekit.store'
import './App.css'

export function App(): JSX.Element {
  const {
    setProjectPath, setShowProjectSetup, loadSession, saveSession,
    initTabsFromSaved,
    messages, tasks, activeTabId, tabs,
    theme, switchToTab, setShowSettings, setSettingsTab
  } = useForgeKitStore()

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Primeni temu pri startu i svaki put kada se promeni
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Globalni keyboard shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ctrl+, = otvori Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
        return
      }
      // Ctrl+Tab = sledeći tab (ciklično)
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        if (tabs.length <= 1) return
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
        const nextIndex = (currentIndex + 1) % tabs.length
        switchToTab(tabs[nextIndex].id)
        return
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [tabs, activeTabId, switchToTab, setShowSettings])

  // Startup — pokušaj restauracije sačuvanih tabova, inače standardni tok
  useEffect(() => {
    window.api.tabsLoadState().then(async ({ tabs: savedTabs, activeTabId: savedActiveId }) => {
      if (savedTabs && savedTabs.length > 0) {
        initTabsFromSaved(savedTabs, savedActiveId)
        await loadSession()
      } else {
        const path = await window.api.projectGetPath()
        if (path) {
          setProjectPath(path)
          await loadSession()
        } else {
          setShowProjectSetup(true)
        }
      }

      // D6 — Onboarding: ako nema nijednog API ključa, otvori Settings → Global
      try {
        const settings = await window.api.getSettings()
        const noKey = !settings.hasAnthropicKey && !settings.hasOpenAIKey && !settings.hasNvidiaKey
        if (noKey) {
          setSettingsTab('global')
          setShowSettings(true)
        }
      } catch { /* ignoriši — ne blokiraj startup */ }
    })
  }, [])

  // Auto-save aktivnog taba pri promeni poruka ili taskova (debounce 1.2s)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveSession() }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [messages, tasks, activeTabId])

  // Auto-save liste tabova u electron-store (debounce 1s)
  useEffect(() => {
    if (tabsSaveTimer.current) clearTimeout(tabsSaveTimer.current)
    tabsSaveTimer.current = setTimeout(() => {
      window.api.tabsSaveState(
        tabs.map((t) => ({ id: t.id, projectPath: t.projectPath, projectName: t.projectName })),
        activeTabId
      )
    }, 1000)
    return () => { if (tabsSaveTimer.current) clearTimeout(tabsSaveTimer.current) }
  }, [tabs, activeTabId])

  return (
    <div className="app-shell">
      <Header />
      <TopStateBar />
      <div className="app-body">
        <LeftPanel />
        <main className="app-main">
          <ChatWindow />
          <InputBar />
        </main>
        <SidePanel />
      </div>
      <SettingsModal />
      <ProjectSetupModal />
      <HandoffModal />
      <SessionSummaryModal />
    </div>
  )
}
