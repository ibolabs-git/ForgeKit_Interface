import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { TabBar } from './components/TabBar'
import { ChatWindow } from './components/ChatWindow'
import { InputBar } from './components/InputBar'
import { SidePanel } from './components/SidePanel'
import { SettingsModal } from './components/SettingsModal'
import { ProjectSetupModal } from './components/ProjectSetupModal'
import { useForgeKitStore } from './store/forgekit.store'
import './App.css'

export function App(): JSX.Element {
  const {
    setProjectPath, setShowProjectSetup, loadSession, saveSession,
    messages, tasks, activeTabId
  } = useForgeKitStore()

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Startup — učitaj projektni folder i sesiju za inicijalni tab
  useEffect(() => {
    window.api.projectGetPath().then(async (path) => {
      if (path) {
        setProjectPath(path)
        await loadSession()
      } else {
        setShowProjectSetup(true)
      }
    })
  }, [])

  // Auto-save aktivnog taba pri promeni poruka ili taskova (debounce 1.2s)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveSession() }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [messages, tasks, activeTabId])

  return (
    <div className="app-shell">
      <Header />
      <TabBar />
      <div className="app-body">
        <main className="app-main">
          <ChatWindow />
          <InputBar />
        </main>
        <SidePanel />
      </div>
      <SettingsModal />
      <ProjectSetupModal />
    </div>
  )
}
