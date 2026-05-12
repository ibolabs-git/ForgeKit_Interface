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
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  forgeRole: ForgeKitRole
  timestamp: number
  isStreaming?: boolean
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
  defaultProvider: 'anthropic' | 'openai'
  defaultAnthropicModel: string
  defaultOpenAIModel: string
  theme: 'dark' | 'light'
  githubRepo: string
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
  githubTest: () => Promise<{ ok: boolean; message: string }>
  githubUploadMemory: (p: { projectName: string; content: string }) => Promise<{ ok: boolean; message: string }>
  githubFetchSystemPrompt: () => Promise<string | null>
  projectChooseFolder: () => Promise<string | null>
  projectCreateFolder: (name: string) => Promise<string | null>
  projectGetPath: () => Promise<string | null>
  projectWriteFile: (filename: string, content: string) => Promise<{ ok: boolean; message?: string }>
  projectReadFile: (filename: string) => Promise<string | null>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
