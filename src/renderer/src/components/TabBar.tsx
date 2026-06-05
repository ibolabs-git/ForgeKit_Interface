import { useState } from 'react'
import { useForgeKitStore } from '../store/forgekit.store'
import type { MouseEvent } from 'react'
import './TabBar.css'

const MAX_TABS = 4

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, addTab, removeTab, switchToTab, saveProjectPack } = useForgeKitStore()
  const [pendingCloseTab, setPendingCloseTab] = useState<typeof tabs[number] | null>(null)
  const [isSavingClose, setIsSavingClose] = useState(false)

  const handleCloseTab = (tab: typeof tabs[number], event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (tabs.length <= 1) return
    setPendingCloseTab(tab)
  }

  const handleSaveAndClose = async () => {
    if (!pendingCloseTab || isSavingClose) return
    if (pendingCloseTab.id !== activeTabId) {
      window.alert('Za snimanje clone paketa prvo aktiviraj ovaj tab, pa ga zatvori.')
      return
    }
    setIsSavingClose(true)
    try {
      await saveProjectPack()
      removeTab(pendingCloseTab.id)
      setPendingCloseTab(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepoznata greska.'
      window.alert(`Snimanje projekta nije uspelo: ${message}`)
    } finally {
      setIsSavingClose(false)
    }
  }

  const handleCloseWithoutSaving = () => {
    if (!pendingCloseTab) return
    removeTab(pendingCloseTab.id)
    setPendingCloseTab(null)
  }

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => switchToTab(tab.id)}
            title={tab.projectPath ?? tab.projectName}
          >
            <span className="tab-icon">
              {tab.projectPath ? '⬡' : '○'}
            </span>
            <span className="tab-name">{tab.projectName}</span>
            {tab.isStreaming && <span className="tab-streaming" title="AI odgovara..." />}
            <button
              className="tab-close"
              onClick={(e) => { handleCloseTab(tab, e) }}
              title="Zatvori projekat"
              disabled={tabs.length <= 1}
            >✕</button>
          </div>
        ))}
      </div>

      {tabs.length < MAX_TABS && (
        <button
          className="tab-add"
          onClick={addTab}
          title={`Otvori novi projekat u novom tabu (${tabs.length}/${MAX_TABS})`}
        >
          ＋ Novi projekat
        </button>
      )}

      {tabs.length >= MAX_TABS && (
        <span className="tab-limit" title="Maksimalan broj otvorenih projekata dostignut (4/4)">
          max 4 projekta
        </span>
      )}

      {pendingCloseTab && (
        <div className="tab-close-modal-overlay" onClick={() => setPendingCloseTab(null)}>
          <div className="tab-close-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tab-close-modal-header">Zatvaranje projekta</div>
            <div className="tab-close-modal-body">
              <p>
                Zatvaras projekat <strong>{pendingCloseTab.projectName}</strong>.
              </p>
              <p>
                Ako izaberes snimanje, ForgeKit ce u projektni folder sacuvati sve sto je potrebno
                da kasnije otvoris isti folder i nastavis rad od ove tacke.
              </p>
              {pendingCloseTab.projectPath && pendingCloseTab.id !== activeTabId && (
                <div className="tab-close-modal-note">
                  Snimanje je dostupno kada je tab aktivan. Aktiviraj ovaj tab ako zelis `Snimi i zatvori`.
                </div>
              )}
              {!pendingCloseTab.projectPath && (
                <div className="tab-close-modal-note">
                  Ovaj tab nema projektni folder, pa moze samo da se zatvori bez clone paketa.
                </div>
              )}
            </div>
            <div className="tab-close-modal-actions">
              <button
                className="tab-close-action primary"
                onClick={() => { void handleSaveAndClose() }}
                disabled={!pendingCloseTab.projectPath || pendingCloseTab.id !== activeTabId || isSavingClose}
              >
                {isSavingClose ? 'Snimam...' : 'Snimi i zatvori'}
              </button>
              <button
                className="tab-close-action danger"
                onClick={handleCloseWithoutSaving}
                disabled={isSavingClose}
              >
                Samo zatvori
              </button>
              <button
                className="tab-close-action"
                onClick={() => setPendingCloseTab(null)}
                disabled={isSavingClose}
              >
                Otkazi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
