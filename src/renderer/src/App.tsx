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
    initTabsFromSaved,
    messages, tasks, activeTabId, tabs
  } = useForgeKitStore()

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Startup — pokušaj restauracije sačuvanih tabova, inače standardni tok
  useEffect(() => {
    window.api.tabsLoadState().then(async ({ tabs: savedTabs, activeTabId: savedActiveId }) => {
      if (savedTabs && savedTabs.length > 0) {
        // Restauriraj sve sačuvane tabove
        initTabsFromSaved(savedTabs, savedActiveId)
        // Učitaj sesiju aktivnog taba (ostali se učitavaju lazy pri prelasku)
        await loadSession()
      } else {
        // Nema sačuvanih tabova — standardni tok (jedan tab, prethodni folder)
        const path = await window.api.projectGetPath()
        if (path) {
          setProjectPath(path)
          await loadSession()
        } else {
          setShowProjectSetup(true)
        }
      }
    })
  }, [])

  // Auto-save aktivnog taba pri promeni poruka ili taskova (debounce 1.2s)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveSession() }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [messages, tasks, activeTabId])

  // Auto-save liste tabova u electron-store (debounce 1s) — za restauraciju pri ponovnom pokretanju
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
