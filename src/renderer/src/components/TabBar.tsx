import { useForgeKitStore } from '../store/forgekit.store'
import './TabBar.css'

const MAX_TABS = 4

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, addTab, removeTab, switchToTab } = useForgeKitStore()

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
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id) }}
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
    </div>
  )
}
