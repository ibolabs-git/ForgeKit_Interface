export type ForgeKitRole =
  | 'ORCHESTRATOR'
  | 'THINKER'
  | 'BUILDER'
  | 'REVIEWER'
  | 'MEMORY CURATOR'
  | 'OBSERVER'
  | 'USER'
  | 'SYSTEM'

export type ForgeKitPhase = 'F1' | 'F2' | 'F3'

export interface Task {
  id: string
  content: string
  completed: boolean
  phase?: ForgeKitPhase
  sourceMessageId?: string  // ID poruke iz koje je task izvučen (B3 jump-to-message)
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  forgeRole: ForgeKitRole
  timestamp: number
  isStreaming?: boolean
  action?: 'open-settings-global' | 'open-settings-project'
}

export interface ProviderInfo {
  id: string
  name: string
}

export interface ModelInfo {
  id: string
  name: string
}

export interface AppSettings {
  hasAnthropicKey: boolean
  hasOpenAIKey: boolean
  hasNvidiaKey: boolean
  nvidiaBaseUrl: string
  defaultProvider: 'anthropic' | 'openai'
  defaultAnthropicModel: string
  defaultOpenAIModel: string
  theme: 'dark' | 'light'
  githubRepo: string
  masterToolRepo: string
  hasGithubToken: boolean
  currentProjectPath: string
}

export interface MemoryRecord {
  id: string
  projectName: string
  content: string
  createdAt: number
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  errorMessage?: string
}

// Globalni window.api tip
export interface ElectronAPI {
  sendMessage: (payload: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    provider: string; model: string; systemPrompt: string; messageId: string
  }) => void
  onStreamToken: (cb: (token: string, messageId: string) => void) => () => void
  onStreamComplete: (cb: (messageId: string) => void) => () => void
  onStreamError: (cb: (error: string, messageId: string) => void) => () => void
  getSettings: () => Promise<AppSettings>
  saveSettings: (s: Record<string, unknown>) => Promise<{ success: boolean }>
  getProviders: () => Promise<ProviderInfo[]>
  getModels: (provider: string) => Promise<ModelInfo[]>
  nvidiaTest: (apiKey: string, baseUrl: string) => Promise<{ ok: boolean; message: string }>
  githubTest: () => Promise<{ ok: boolean; message: string }>
  githubUploadMemory: (p: { projectName: string; content: string }) => Promise<{ ok: boolean; message: string }>
  githubFetchSystemPrompt: () => Promise<string | null>
  githubFetchTemplate: (filePath: string) => Promise<{ ok: boolean; content: string | null; message?: string }>
  githubPromptSource: () => Promise<'github' | 'bundled' | 'pending'>
  projectChooseFolder: () => Promise<string | null>
  projectCreateFolder: (name: string) => Promise<string | null>
  projectGetPath: () => Promise<string | null>
  projectWriteFile: (filename: string, content: string) => Promise<{ ok: boolean; message?: string }>
  projectReadFile: (filename: string) => Promise<string | null>
  // App info & update
  getAppVersion: () => Promise<string>
  checkForUpdate: () => Promise<{
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string
    message: string
  }>
  triggerUpdate: () => Promise<{ ok: boolean }>
  onUpdateDownloadProgress: (cb: (pct: number) => void) => () => void
  // Prošireni project fajl operacije
  projectReadFileFromPath: (projectPath: string, filename: string) => Promise<string | null>
  setActivePath: (path: string) => Promise<{ ok: boolean }>
  // Perzistencija tabova
  tabsSaveState: (
    tabs: Array<{ id: string; projectPath: string | null; projectName: string }>,
    activeTabId: string
  ) => Promise<{ ok: boolean }>
  tabsLoadState: () => Promise<{
    tabs: Array<{ id: string; projectPath: string; projectName: string }>
    activeTabId: string
  }>
  // Window controls (D5)
  winMinimize:    () => Promise<void>
  winMaximize:    () => Promise<void>
  winClose:       () => Promise<void>
  winIsMaximized: () => Promise<boolean>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
