import { create } from 'zustand'
import type { ChatMessage, ForgeKitRole, ForgeKitPhase, Task, MemoryRecord } from '../types'

// ── Regex parseri ──────────────────────────────────────────────────────────────
const ROLE_REGEX = /^\[([A-Z][A-Z\s]+)\]/
const MEMORY_CURATOR_REGEX = /\[MEMORY CURATOR\]([\s\S]+?)(?=\[(?:ORCHESTRATOR|THINKER|BUILDER|REVIEWER|OBSERVER)\]|$)/
const TASK_REGEX = /^- \[( |x)\] (.+)$/gm
const PHASE_REGEX = /\b(F1|F2|F3)\b/

const VALID_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER',
  'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

const MAX_TABS = 4

function extractRole(content: string): ForgeKitRole {
  const match = content.match(ROLE_REGEX)
  if (!match) return 'ORCHESTRATOR'
  const role = match[1].trim() as ForgeKitRole
  return VALID_ROLES.includes(role) ? role : 'ORCHESTRATOR'
}

function extractTasks(content: string): Task[] {
  const tasks: Task[] = []
  let m: RegExpExecArray | null
  TASK_REGEX.lastIndex = 0
  while ((m = TASK_REGEX.exec(content)) !== null) {
    tasks.push({ id: `task-${Date.now()}-${Math.random()}`, content: m[2], completed: m[1] === 'x' })
  }
  return tasks
}

function extractMemoryContent(content: string): string | null {
  const m = content.match(MEMORY_CURATOR_REGEX)
  return m ? m[1].trim() : null
}

function extractPhase(content: string): ForgeKitPhase | null {
  const m = content.match(PHASE_REGEX)
  return m ? (m[1] as ForgeKitPhase) : null
}

// ── Tab tipovi ────────────────────────────────────────────────────────────────

/** Lagani zapis za tab bar — samo prikaz */
export interface TabHeader {
  id: string
  projectName: string
  projectPath: string | null
  isStreaming: boolean
}

/** Puna kopija stanja jednog taba (za memoriju pri prelasku) */
interface TabSnapshot {
  sessionId: string
  projectName: string
  projectPath: string | null
  messages: ChatMessage[]
  streamingMessageId: string | null
  isStreaming: boolean
  activeRole: ForgeKitRole
  currentPhase: ForgeKitPhase
  tasks: Task[]
  selectedProvider: string
  selectedModel: string
  memoryRecords: MemoryRecord[]
}

function makeDefaultSnapshot(overrides?: Partial<TabSnapshot>): TabSnapshot {
  return {
    sessionId: `session-${Date.now()}`,
    projectName: 'Novi projekat',
    projectPath: null,
    messages: [],
    streamingMessageId: null,
    isStreaming: false,
    activeRole: 'ORCHESTRATOR',
    currentPhase: 'F1',
    tasks: [],
    selectedProvider: 'anthropic',
    selectedModel: 'claude-sonnet-4-6',
    memoryRecords: [],
    ...overrides
  }
}

function captureSnapshot(s: ForgeKitStore): TabSnapshot {
  return {
    sessionId: s.sessionId,
    projectName: s.projectName,
    projectPath: s.projectPath,
    messages: s.messages,
    streamingMessageId: s.streamingMessageId,
    isStreaming: s.isStreaming,
    activeRole: s.activeRole,
    currentPhase: s.currentPhase,
    tasks: s.tasks,
    selectedProvider: s.selectedProvider,
    selectedModel: s.selectedModel,
    memoryRecords: s.memoryRecords
  }
}

// ── Store interfejs ───────────────────────────────────────────────────────────

interface ForgeKitStore {
  // ── Tab menadžment ──
  tabs: TabHeader[]
  activeTabId: string
  tabSnapshots: Record<string, TabSnapshot>
  addTab: () => void
  removeTab: (id: string) => void
  switchToTab: (id: string) => void

  // ── Sesija (aktivni tab) ──
  sessionId: string
  projectName: string
  messages: ChatMessage[]
  streamingMessageId: string | null
  isStreaming: boolean

  // ── ForgeKit stanje (aktivni tab) ──
  activeRole: ForgeKitRole
  currentPhase: ForgeKitPhase
  tasks: Task[]

  // ── Provider / model (aktivni tab) ──
  selectedProvider: string
  selectedModel: string

  // ── Settings (globalno) ──
  showSettings: boolean
  settingsTab: 'global' | 'project'

  // ── Memory (aktivni tab) ──
  memoryRecords: MemoryRecord[]

  // ── Projekat (aktivni tab) ──
  projectPath: string | null
  showProjectSetup: boolean

  // ── Akcije — poruke ──
  addUserMessage: (content: string) => string
  startAssistantMessage: (messageId: string) => void
  appendStreamToken: (token: string, messageId: string) => void
  finalizeMessage: (messageId: string) => void
  addErrorMessage: (error: string, messageId: string) => void

  // ── Akcije — ForgeKit stanje ──
  toggleTask: (id: string) => void
  addManualTask: (content: string) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  setPhase: (phase: ForgeKitPhase) => void
  setProjectName: (name: string) => void
  newSession: () => void

  // ── Akcije — provider ──
  setProvider: (provider: string, model: string) => void
  setModel: (model: string) => void

  // ── Settings ──
  setShowSettings: (show: boolean) => void
  setSettingsTab: (tab: 'global' | 'project') => void

  // ── Memory ──
  addMemoryRecord: (content: string) => void
  updateMemoryStatus: (id: string, status: MemoryRecord['status'], errorMessage?: string) => void
  removeMemoryRecord: (id: string) => void

  // ── Project ──
  setProjectPath: (path: string | null) => void
  setShowProjectSetup: (show: boolean) => void

  // ── Perzistencija ──
  saveSession: () => Promise<void>
  loadSession: () => Promise<void>
}

// ── Inicijalni tab ────────────────────────────────────────────────────────────

const INITIAL_TAB_ID = `tab-${Date.now()}`

// ── Store ─────────────────────────────────────────────────────────────────────

export const useForgeKitStore = create<ForgeKitStore>((set, get) => ({

  // Tab menadžment
  tabs: [{ id: INITIAL_TAB_ID, projectName: 'Novi projekat', projectPath: null, isStreaming: false }],
  activeTabId: INITIAL_TAB_ID,
  tabSnapshots: {},

  addTab: () => {
    const { tabs, activeTabId } = get()
    if (tabs.length >= MAX_TABS) return

    const newId = `tab-${Date.now()}`
    const snapshot = captureSnapshot(get())
    const fresh = makeDefaultSnapshot({ sessionId: `session-${Date.now()}` })

    set((s) => ({
      // Sačuvaj trenutni tab
      tabSnapshots: { ...s.tabSnapshots, [activeTabId]: snapshot },
      // Ažuriraj header aktivnog taba
      tabs: [
        ...s.tabs.map((t) => t.id === activeTabId
          ? { ...t, projectName: snapshot.projectName, projectPath: snapshot.projectPath }
          : t
        ),
        { id: newId, projectName: 'Novi projekat', projectPath: null, isStreaming: false }
      ],
      // Aktiviraj novi tab
      activeTabId: newId,
      // Postavi fresh stanje
      ...fresh,
      // Novi tab = odmah pokaži setup
      showProjectSetup: true
    }))
  },

  removeTab: (id) => {
    const { tabs, activeTabId, tabSnapshots } = get()
    if (tabs.length <= 1) return  // ne može zatvoriti jedini tab

    const newTabs = tabs.filter((t) => t.id !== id)
    const newSnapshots = { ...tabSnapshots }
    delete newSnapshots[id]

    if (id === activeTabId) {
      // Prelaz na prethodni ili sledeći tab
      const idx = tabs.findIndex((t) => t.id === id)
      const nextTab = newTabs[Math.max(0, idx - 1)]
      const snap = newSnapshots[nextTab.id] ?? makeDefaultSnapshot()

      set({
        tabs: newTabs,
        activeTabId: nextTab.id,
        tabSnapshots: newSnapshots,
        ...snap
      })
    } else {
      set({ tabs: newTabs, tabSnapshots: newSnapshots })
    }
  },

  switchToTab: (id) => {
    const { activeTabId, tabSnapshots } = get()
    if (id === activeTabId) return

    // Sačuvaj trenutni tab
    const currentSnapshot = captureSnapshot(get())
    // Učitaj ciljni tab
    const targetSnapshot = tabSnapshots[id] ?? makeDefaultSnapshot()

    set((s) => ({
      tabSnapshots: { ...s.tabSnapshots, [activeTabId]: currentSnapshot },
      // Ažuriraj header prethodnog taba
      tabs: s.tabs.map((t) => t.id === activeTabId
        ? { ...t, projectName: currentSnapshot.projectName, projectPath: currentSnapshot.projectPath, isStreaming: false }
        : t
      ),
      activeTabId: id,
      ...targetSnapshot
    }))
  },

  // ── Sesija ──
  sessionId: `session-${Date.now()}`,
  projectName: 'Novi projekat',
  messages: [],
  streamingMessageId: null,
  isStreaming: false,
  activeRole: 'ORCHESTRATOR',
  currentPhase: 'F1',
  tasks: [],
  selectedProvider: 'anthropic',
  selectedModel: 'claude-sonnet-4-6',
  showSettings: false,
  settingsTab: 'global',
  memoryRecords: [],
  projectPath: null,
  showProjectSetup: false,

  // ── Poruke ──

  addUserMessage: (content) => {
    const id = `msg-${Date.now()}`
    set((s) => ({
      messages: [...s.messages, { id, role: 'user', content, forgeRole: 'USER', timestamp: Date.now() }]
    }))
    return id
  },

  startAssistantMessage: (messageId) => {
    set((s) => ({
      isStreaming: true,
      streamingMessageId: messageId,
      // Ažuriraj streaming indikator u tab headeru
      tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, isStreaming: true } : t),
      messages: [...s.messages, {
        id: messageId, role: 'assistant', content: '',
        forgeRole: 'ORCHESTRATOR', timestamp: Date.now(), isStreaming: true
      }]
    }))
  },

  appendStreamToken: (token, messageId) => {
    set((s) => ({
      messages: s.messages.map((m) => m.id === messageId ? { ...m, content: m.content + token } : m)
    }))
  },

  finalizeMessage: (messageId) => {
    const msg = get().messages.find((m) => m.id === messageId)
    if (!msg) return

    const role = extractRole(msg.content)
    const newTasks = extractTasks(msg.content)
    const phase = extractPhase(msg.content)

    set((s) => ({
      isStreaming: false,
      streamingMessageId: null,
      activeRole: role,
      currentPhase: phase ?? s.currentPhase,
      tasks: newTasks.length > 0 ? [...s.tasks, ...newTasks] : s.tasks,
      // Isključi streaming indikator na tabu
      tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, isStreaming: false } : t),
      messages: s.messages.map((m) => m.id === messageId ? { ...m, forgeRole: role, isStreaming: false } : m)
    }))

    const memoryContent = extractMemoryContent(msg.content)
    if (memoryContent) {
      const record: MemoryRecord = {
        id: `mem-${Date.now()}-${Math.random()}`,
        projectName: get().projectName,
        content: memoryContent,
        createdAt: Date.now(),
        status: 'uploading'
      }
      set((s) => ({ memoryRecords: [...s.memoryRecords, record] }))
      window.api.githubUploadMemory({ projectName: get().projectName, content: memoryContent })
        .then((result) => {
          get().updateMemoryStatus(record.id, result.ok ? 'uploaded' : 'error', result.ok ? undefined : result.message)
        })
        .catch((err: Error) => {
          get().updateMemoryStatus(record.id, 'error', err.message)
        })
    }
  },

  addErrorMessage: (error, _messageId) => {
    set((s) => ({
      isStreaming: false,
      streamingMessageId: null,
      tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, isStreaming: false } : t),
      messages: s.messages.map((m) =>
        m.id === _messageId
          ? { ...m, content: `Greska: ${error}`, isStreaming: false, forgeRole: 'SYSTEM' as ForgeKitRole }
          : m
      )
    }))
  },

  // ── Taskovi ──

  toggleTask: (id) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t) }))
  },

  addManualTask: (content) => {
    set((s) => ({
      tasks: [...s.tasks, { id: `task-manual-${Date.now()}`, content, completed: false }]
    }))
  },

  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  clearTasks: () => set({ tasks: [] }),

  setPhase: (phase) => set({ currentPhase: phase }),

  setProjectName: (name) => set((s) => ({
    projectName: name,
    // Sinhroniziraj tab header
    tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, projectName: name } : t)
  })),

  newSession: () => set((s) => ({
    sessionId: `session-${Date.now()}`,
    messages: [],
    tasks: [],
    activeRole: 'ORCHESTRATOR',
    currentPhase: 'F1',
    isStreaming: false,
    streamingMessageId: null,
    // Zadrži ime i folder projekta
    projectName: s.projectName,
    projectPath: s.projectPath
  })),

  // ── Provider ──

  setProvider: (provider, model) => set({ selectedProvider: provider, selectedModel: model }),
  setModel: (model) => set({ selectedModel: model }),

  // ── Settings ──

  setShowSettings: (show) => set({ showSettings: show }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  // ── Memory ──

  addMemoryRecord: (content) => {
    const record: MemoryRecord = {
      id: `mem-${Date.now()}-${Math.random()}`,
      projectName: get().projectName,
      content,
      createdAt: Date.now(),
      status: 'pending'
    }
    set((s) => ({ memoryRecords: [...s.memoryRecords, record] }))
  },

  updateMemoryStatus: (id, status, errorMessage) => {
    set((s) => ({
      memoryRecords: s.memoryRecords.map((r) => r.id === id ? { ...r, status, errorMessage } : r)
    }))
  },

  removeMemoryRecord: (id) => {
    set((s) => ({ memoryRecords: s.memoryRecords.filter((r) => r.id !== id) }))
  },

  // ── Projekat ──

  setProjectPath: (path) => set((s) => ({
    projectPath: path,
    // Sinhroniziraj tab header
    tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, projectPath: path } : t)
  })),

  setShowProjectSetup: (show) => set({ showProjectSetup: show }),

  // ── Perzistencija ──

  saveSession: async () => {
    const s = get()
    if (!s.projectPath) return
    const data = {
      projectName: s.projectName,
      tasks: s.tasks,
      messages: s.messages.filter((m) => !m.isStreaming),
      currentPhase: s.currentPhase,
      selectedProvider: s.selectedProvider,
      selectedModel: s.selectedModel,
      savedAt: Date.now()
    }
    await window.api.projectWriteFile('session.json', JSON.stringify(data, null, 2))
  },

  loadSession: async () => {
    const raw = await window.api.projectReadFile('session.json')
    if (!raw) return
    try {
      const data = JSON.parse(raw) as {
        projectName?: string
        tasks?: Task[]
        messages?: ChatMessage[]
        currentPhase?: ForgeKitPhase
        selectedProvider?: string
        selectedModel?: string
      }
      set((s) => ({
        projectName: data.projectName ?? s.projectName,
        tasks: data.tasks ?? [],
        messages: data.messages ?? [],
        currentPhase: data.currentPhase ?? s.currentPhase,
        selectedProvider: data.selectedProvider ?? s.selectedProvider,
        selectedModel: data.selectedModel ?? s.selectedModel,
        // Ažuriraj i tab header
        tabs: s.tabs.map((t) => t.id === s.activeTabId
          ? { ...t, projectName: data.projectName ?? t.projectName }
          : t
        )
      }))
    } catch { /* korumpiran fajl, ignorisemo */ }
  }
}))
