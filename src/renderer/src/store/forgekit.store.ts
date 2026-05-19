import { create } from 'zustand'
import type { ChatMessage, ForgeKitRole, ForgeKitPhase, Task, MemoryRecord } from '../types'

// ── Regex parseri ──────────────────────────────────────────────────────────────
const ROLE_REGEX = /^\[([A-Z][A-Z\s]+)\]/
const MEMORY_CURATOR_REGEX = /\[MEMORY CURATOR\]([\s\S]+?)(?=\[(?:ORCHESTRATOR|THINKER|BUILDER|REVIEWER|OBSERVER)\]|$)/
const PHASE_REGEX = /\b(F1|F2|F3)\b/

// Ključne riječi koje signaliziraju task sekciju (case-insensitive)
const TASK_KEYWORD_RE = /\btask(?:ov[ia]?)?\b|\bzadac[ia]?\b|\bzadatak\b|\bakcij[ae]?\b|\btodo\b/i
// Checkbox format
const CHECKBOX_RE = /^[-*] \[( |x)\] (.+)$/

const VALID_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER',
  'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

const MAX_TABS = 4

// Mapiranje: koji modeli pripadaju kom provideru
const PROVIDER_MODEL_PREFIXES: Record<string, string[]> = {
  anthropic: ['claude'],
  openai:    ['gpt', 'o1', 'o3'],
  nvidia:    []  // NVIDIA NIM modeli imaju format "owner/model" — provjera po znaku /
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',  // COMP-09: gpt-5.4 ne postoji — fallback na provjereni model
  nvidia:    'nvidia/nemotron-3-nano-30b-a3b'
}

function isModelCompatible(provider: string, model: string): boolean {
  // NVIDIA NIM: svi modeli imaju format "owner/model" (sadrže /)
  if (provider === 'nvidia') return model.includes('/')
  const prefixes = PROVIDER_MODEL_PREFIXES[provider]
  if (!prefixes) return false
  return prefixes.some((p) => model.toLowerCase().startsWith(p))
}

function sanitizeProviderModel(provider: string, model: string): { provider: string; model: string } {
  if (isModelCompatible(provider, model)) return { provider, model }
  // Mismatch — resetuj model na default za taj provider
  return { provider, model: DEFAULT_MODELS[provider] ?? model }
}

function extractRole(content: string): ForgeKitRole {
  const match = content.match(ROLE_REGEX)
  if (!match) return 'ORCHESTRATOR'
  const role = match[1].trim() as ForgeKitRole
  return VALID_ROLES.includes(role) ? role : 'ORCHESTRATOR'
}

function extractTasks(content: string, sourceMessageId?: string): Task[] {
  const tasks: Task[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const checkMatch = CHECKBOX_RE.exec(line)
    if (!checkMatch) continue

    // Provjeri da li postoji keyword za taskove u prethodnih 8 redova (uključujući trenutni)
    let hasTaskContext = false
    for (let j = Math.max(0, i - 8); j <= i; j++) {
      if (TASK_KEYWORD_RE.test(lines[j])) {
        hasTaskContext = true
        break
      }
    }
    if (!hasTaskContext) continue

    tasks.push({
      id: `task-${Date.now()}-${Math.random()}`,
      content: checkMatch[2].trim(),
      completed: checkMatch[1] === 'x',
      sourceMessageId
    })
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
  customModelId: string
  modelHistory: Array<{ from: string; to: string; time: number }>
  previousEffectiveModel: string
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
    customModelId: '',
    modelHistory: [],
    previousEffectiveModel: 'claude-sonnet-4-6',
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
    customModelId: s.customModelId,
    modelHistory: s.modelHistory,
    previousEffectiveModel: s.previousEffectiveModel,
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
  settingsTab: 'global' | 'project' | 'appearance'

  // ── Handoff modal (C2) ──
  showHandoffModal: boolean
  setShowHandoffModal: (show: boolean) => void

  // ── Session summary modal (C3) ──
  showSummaryModal: boolean
  setShowSummaryModal: (show: boolean) => void

  // ── Tema (globalno) ──
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

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
  addSessionDivider: () => void

  // ── Akcije — ForgeKit stanje ──
  toggleTask: (id: string) => void
  addManualTask: (content: string) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  setPhase: (phase: ForgeKitPhase) => void
  setProjectName: (name: string) => void
  newSession: () => void
  initTabsFromSaved: (
    savedTabs: Array<{ id: string; projectPath: string; projectName: string }>,
    savedActiveId: string
  ) => void

  // ── Model switch ──
  customModelId: string
  modelJustChanged: boolean
  contextStatus: 'synced' | 'needs_refresh'
  modelHistory: Array<{ from: string; to: string; time: number }>
  previousEffectiveModel: string

  // ── Akcije — provider ──
  setProvider: (provider: string, model: string) => void
  setModel: (model: string) => void
  setCustomModelId: (id: string) => void
  refreshContext: () => void
  markContextSynced: () => void

  // ── Jump to message (B3) ──
  highlightMessageId: string | null
  setHighlightMessageId: (id: string | null) => void

  // ── Settings ──
  setShowSettings: (show: boolean) => void
  setSettingsTab: (tab: 'global' | 'project' | 'appearance') => void

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
    const { activeTabId, tabSnapshots, tabs } = get()
    if (id === activeTabId) return

    // Sačuvaj trenutni tab
    const currentSnapshot = captureSnapshot(get())
    const targetSnapshot = tabSnapshots[id]
    const targetHeader = tabs.find((t) => t.id === id)

    if (!targetSnapshot && targetHeader?.projectPath) {
      // Tab je restaurisan ali sesija još nije učitana — lazy load
      const path = targetHeader.projectPath
      window.api.setActivePath(path)
      set((s) => ({
        tabSnapshots: { ...s.tabSnapshots, [activeTabId]: currentSnapshot },
        tabs: s.tabs.map((t) => t.id === activeTabId
          ? { ...t, projectName: currentSnapshot.projectName, projectPath: currentSnapshot.projectPath, isStreaming: false }
          : t
        ),
        activeTabId: id,
        ...makeDefaultSnapshot({ projectPath: path, projectName: targetHeader.projectName })
      }))
      // Učitaj session.json iz projektnog foldera
      get().loadSession()
      return
    }

    // Normalan prelaz iz memorijskog snapshot-a
    const snap = targetSnapshot ?? makeDefaultSnapshot()
    if (snap.projectPath) window.api.setActivePath(snap.projectPath)

    set((s) => ({
      tabSnapshots: { ...s.tabSnapshots, [activeTabId]: currentSnapshot },
      tabs: s.tabs.map((t) => t.id === activeTabId
        ? { ...t, projectName: currentSnapshot.projectName, projectPath: currentSnapshot.projectPath, isStreaming: false }
        : t
      ),
      activeTabId: id,
      ...snap
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
  showHandoffModal: false,
  showSummaryModal: false,
  theme: ((): 'light' | 'dark' => {
    try { return (localStorage.getItem('fk-theme') as 'light' | 'dark') ?? 'light' } catch { return 'light' }
  })(),
  memoryRecords: [],
  projectPath: null,
  showProjectSetup: false,

  // ── Model switch ──
  customModelId: '',
  modelJustChanged: false,
  contextStatus: 'synced' as const,
  modelHistory: [],
  previousEffectiveModel: 'claude-sonnet-4-6',

  // ── Jump to message (B3) ──
  highlightMessageId: null,

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
    const newTasks = extractTasks(msg.content, messageId)
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
    const isNoKeyError = error.toLowerCase().includes('kljuc') || error.toLowerCase().includes('api key') || error.toLowerCase().includes('401')
    set((s) => ({
      isStreaming: false,
      streamingMessageId: null,
      tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, isStreaming: false } : t),
      messages: s.messages.map((m) =>
        m.id === _messageId
          ? {
              ...m,
              content: error,
              isStreaming: false,
              forgeRole: 'SYSTEM' as ForgeKitRole,
              action: isNoKeyError ? 'open-settings-global' as const : undefined
            }
          : m
      )
    }))
  },

  addSessionDivider: () => {
    set((s) => ({
      messages: [...s.messages, {
        id: `divider-${Date.now()}`,
        role: 'assistant' as const,
        content: '[SESSION_DIVIDER]',
        forgeRole: 'SYSTEM' as ForgeKitRole,
        timestamp: Date.now()
      }]
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

  initTabsFromSaved: (savedTabs, savedActiveId) => {
    if (savedTabs.length === 0) return

    const tabHeaders: TabHeader[] = savedTabs.map((t) => ({
      id: t.id,
      projectName: t.projectName,
      projectPath: t.projectPath,
      isStreaming: false
    }))

    // Odaberi aktivni tab — preferiraj sačuvani, inače prvi
    const activeId = savedTabs.find((t) => t.id === savedActiveId)
      ? savedActiveId
      : savedTabs[0].id
    const activeTab = savedTabs.find((t) => t.id === activeId) ?? savedTabs[0]

    // Postavi electron-store currentProjectPath na aktivni tab
    if (activeTab.projectPath) window.api.setActivePath(activeTab.projectPath)

    set({
      tabs: tabHeaders,
      activeTabId: activeId,
      tabSnapshots: {},              // Snapshoti se pune lazy (pri prelasku ili loadSession)
      projectPath: activeTab.projectPath,
      projectName: activeTab.projectName
    })
  },

  // ── Provider ──

  setProvider: (provider, model) => set({
    selectedProvider: provider,
    selectedModel: model,
    customModelId: '',
    // Provider switch = context needs refresh ako već imamo poruke
    modelJustChanged: get().messages.some((m) => m.role === 'assistant' && !m.content.startsWith('[')),
    contextStatus: get().messages.some((m) => m.role === 'assistant' && !m.content.startsWith('[')) ? 'needs_refresh' : 'synced',
    previousEffectiveModel: get().customModelId.trim() || get().selectedModel
  }),

  setModel: (newModel) => {
    const s = get()
    const oldEffective = s.customModelId.trim() || s.selectedModel
    const isMidSession = s.messages.some((m) => m.role === 'assistant' && !m.content.startsWith('['))

    if (isMidSession && newModel !== s.selectedModel) {
      const switchMsg: ChatMessage = {
        id: `model-switch-${Date.now()}`,
        role: 'assistant',
        content: `[MODEL_SWITCH:${oldEffective}→${newModel}:${Date.now()}]`,
        forgeRole: 'SYSTEM',
        timestamp: Date.now()
      }
      set((st) => ({
        selectedModel: newModel,
        customModelId: '',
        modelJustChanged: true,
        contextStatus: 'needs_refresh',
        previousEffectiveModel: oldEffective,
        messages: [...st.messages, switchMsg],
        modelHistory: [...st.modelHistory, { from: oldEffective, to: newModel, time: Date.now() }]
      }))
    } else {
      set({ selectedModel: newModel, customModelId: '' })
    }
  },

  setCustomModelId: (id) => {
    const s = get()
    const oldEffective = s.customModelId.trim() || s.selectedModel
    const newEffective = id.trim() || s.selectedModel
    const isMidSession = s.messages.some((m) => m.role === 'assistant' && !m.content.startsWith('['))

    if (isMidSession && newEffective !== oldEffective && id.trim()) {
      const switchMsg: ChatMessage = {
        id: `model-switch-${Date.now()}`,
        role: 'assistant',
        content: `[MODEL_SWITCH:${oldEffective}→${newEffective}:${Date.now()}]`,
        forgeRole: 'SYSTEM',
        timestamp: Date.now()
      }
      set((st) => ({
        customModelId: id,
        modelJustChanged: true,
        contextStatus: 'needs_refresh',
        previousEffectiveModel: oldEffective,
        messages: [...st.messages, switchMsg],
        modelHistory: [...st.modelHistory, { from: oldEffective, to: newEffective, time: Date.now() }]
      }))
    } else {
      set({ customModelId: id })
    }
  },

  refreshContext: () => set({ modelJustChanged: true, contextStatus: 'needs_refresh' }),
  markContextSynced: () => set({ modelJustChanged: false, contextStatus: 'synced' }),

  // ── Jump to message (B3) ──
  setHighlightMessageId: (id) => set({ highlightMessageId: id }),

  // ── Settings ──

  setShowSettings: (show) => set({ showSettings: show }),
  setShowHandoffModal: (show) => set({ showHandoffModal: show }),
  setShowSummaryModal: (show) => set({ showSummaryModal: show }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setTheme: (theme) => {
    try { localStorage.setItem('fk-theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

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

  setProjectPath: (path) => {
    // Sinhroniziraj electron-store currentProjectPath kako bi write operacije koristile pravi folder
    if (path) window.api.setActivePath(path)
    set((s) => ({
      projectPath: path,
      tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, projectPath: path } : t)
    }))
  },

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
    const path = get().projectPath
    if (!path) return
    // Čitamo direktno iz projektnog foldera — neovisno od electron-store currentProjectPath
    const raw = await window.api.projectReadFileFromPath(path, 'session.json')
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
      // Validacija provider/model — sprječava mismatch iz starih session.json
      const { provider: safeProvider, model: safeModel } = sanitizeProviderModel(
        data.selectedProvider ?? get().selectedProvider,
        data.selectedModel ?? get().selectedModel
      )
      set((s) => ({
        projectName: data.projectName ?? s.projectName,
        tasks: data.tasks ?? [],
        messages: data.messages ?? [],
        currentPhase: data.currentPhase ?? s.currentPhase,
        selectedProvider: safeProvider,
        selectedModel: safeModel,
        tabs: s.tabs.map((t) => t.id === s.activeTabId
          ? { ...t, projectName: data.projectName ?? t.projectName }
          : t
        )
      }))
    } catch { /* korumpiran fajl, ignorisemo */ }
  }
}))
