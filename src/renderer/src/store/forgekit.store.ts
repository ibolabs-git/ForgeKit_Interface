import { create } from 'zustand'
import type { ChatMessage, ForgeKitRole, ForgeKitPhase, Task, MemoryRecord } from '../types'

const ROLE_REGEX = /^\[([A-Z][A-Z\s]+)\]/
const MEMORY_CURATOR_REGEX = /\[MEMORY CURATOR\]([\s\S]+?)(?=\[(?:ORCHESTRATOR|THINKER|BUILDER|REVIEWER|OBSERVER)\]|$)/
const TASK_REGEX = /^- \[( |x)\] (.+)$/gm
const PHASE_REGEX = /\b(F1|F2|F3)\b/

const VALID_ROLES: ForgeKitRole[] = [
  'ORCHESTRATOR', 'THINKER', 'BUILDER',
  'REVIEWER', 'MEMORY CURATOR', 'OBSERVER'
]

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
    tasks.push({
      id: `task-${Date.now()}-${Math.random()}`,
      content: m[2],
      completed: m[1] === 'x'
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

interface ForgeKitStore {
  // Sesija
  sessionId: string
  projectName: string

  // Poruke
  messages: ChatMessage[]
  streamingMessageId: string | null
  isStreaming: boolean

  // ForgeKit stanje
  activeRole: ForgeKitRole
  currentPhase: ForgeKitPhase
  tasks: Task[]

  // Provider / model — per projekat
  selectedProvider: string
  selectedModel: string

  // Settings modal
  showSettings: boolean
  settingsTab: 'global' | 'project'

  // Memory records
  memoryRecords: MemoryRecord[]
  projectPath: string | null

  // Project setup modal
  showProjectSetup: boolean

  // Akcije — poruke
  addUserMessage: (content: string) => string
  startAssistantMessage: (messageId: string) => void
  appendStreamToken: (token: string, messageId: string) => void
  finalizeMessage: (messageId: string) => void
  addErrorMessage: (error: string, messageId: string) => void

  // Akcije — ForgeKit stanje
  toggleTask: (id: string) => void
  addManualTask: (content: string) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  setPhase: (phase: ForgeKitPhase) => void
  setProjectName: (name: string) => void
  newSession: () => void

  // Akcije — provider
  setProvider: (provider: string, model: string) => void
  setModel: (model: string) => void

  // Settings
  setShowSettings: (show: boolean) => void
  setSettingsTab: (tab: 'global' | 'project') => void

  // Memory
  addMemoryRecord: (content: string) => void
  updateMemoryStatus: (id: string, status: MemoryRecord['status'], errorMessage?: string) => void
  removeMemoryRecord: (id: string) => void

  // Project
  setProjectPath: (path: string | null) => void
  setShowProjectSetup: (show: boolean) => void

  // Perzistencija
  saveSession: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useForgeKitStore = create<ForgeKitStore>((set, get) => ({
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

  addUserMessage: (content) => {
    const id = `msg-${Date.now()}`
    set((s) => ({
      messages: [...s.messages, {
        id,
        role: 'user',
        content,
        forgeRole: 'USER',
        timestamp: Date.now()
      }]
    }))
    return id
  },

  startAssistantMessage: (messageId) => {
    set((s) => ({
      isStreaming: true,
      streamingMessageId: messageId,
      messages: [...s.messages, {
        id: messageId,
        role: 'assistant',
        content: '',
        forgeRole: 'ORCHESTRATOR',
        timestamp: Date.now(),
        isStreaming: true
      }]
    }))
  },

  appendStreamToken: (token, messageId) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + token } : m
      )
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
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, forgeRole: role, isStreaming: false } : m
      )
    }))

    // Automatski kreiraj memory record ako poruka sadrzi [MEMORY CURATOR] sekciju
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
      messages: s.messages.map((m) =>
        m.id === _messageId
          ? { ...m, content: `Greska: ${error}`, isStreaming: false, forgeRole: 'SYSTEM' as ForgeKitRole }
          : m
      )
    }))
  },

  toggleTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)
    }))
  },

  addManualTask: (content) => {
    set((s) => ({
      tasks: [...s.tasks, {
        id: `task-manual-${Date.now()}`,
        content,
        completed: false
      }]
    }))
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  clearTasks: () => set({ tasks: [] }),

  setPhase: (phase) => set({ currentPhase: phase }),

  setProjectName: (name) => set({ projectName: name }),

  newSession: () => set((s) => ({
    sessionId: `session-${Date.now()}`,
    messages: [],
    tasks: [],
    activeRole: 'ORCHESTRATOR',
    currentPhase: 'F1',
    isStreaming: false,
    streamingMessageId: null,
    projectName: s.projectName
  })),

  setProvider: (provider, model) => set({ selectedProvider: provider, selectedModel: model }),

  setModel: (model) => set({ selectedModel: model }),

  setShowSettings: (show) => set({ showSettings: show }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

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
      memoryRecords: s.memoryRecords.map((r) =>
        r.id === id ? { ...r, status, errorMessage } : r
      )
    }))
  },

  removeMemoryRecord: (id) => {
    set((s) => ({ memoryRecords: s.memoryRecords.filter((r) => r.id !== id) }))
  },

  setProjectPath: (path) => set({ projectPath: path }),

  setShowProjectSetup: (show) => set({ showProjectSetup: show }),

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
        selectedModel: data.selectedModel ?? s.selectedModel
      }))
    } catch { /* korumpiran fajl, ignorisemo */ }
  }
}))
