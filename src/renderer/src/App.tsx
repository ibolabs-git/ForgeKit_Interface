import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { InputBar } from './components/InputBar'
import { SidePanel } from './components/SidePanel'
import { SettingsModal } from './components/SettingsModal'
import { ProjectSetupModal } from './components/ProjectSetupModal'
import { useForgeKitStore } from './store/forgekit.store'
import './App.css'

export function App(): JSX.Element {
  const { setProjectPath, setShowProjectSetup, loadSession, saveSession, messages, tasks } =
    useForgeKitStore()

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Startup — ucitaj projektni folder i sesiju
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

  // Auto-save sesije pri promeni poruka ili taskova (debounce 1s)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveSession() }, 1000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [messages, tasks])

  return (
    <div className="app-shell">
      <Header />
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
