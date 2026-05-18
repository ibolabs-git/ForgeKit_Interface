import Store from 'electron-store'

interface SavedTab {
  id: string
  projectPath: string
  projectName: string
}

interface AppSettings {
  anthropicApiKey: string
  openaiApiKey: string
  nvidiaApiKey: string
  nvidiaBaseUrl: string
  defaultProvider: 'anthropic' | 'openai'
  defaultAnthropicModel: string
  defaultOpenAIModel: string
  theme: 'dark' | 'light'
  githubToken: string
  githubRepo: string
  currentProjectPath: string
  openTabs: SavedTab[]
  activeTabId: string
}

const defaults: AppSettings = {
  anthropicApiKey: '',
  openaiApiKey: '',
  nvidiaApiKey: '',
  nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
  defaultProvider: 'anthropic',
  defaultAnthropicModel: 'claude-sonnet-4-6',
  defaultOpenAIModel: 'gpt-4o',
  theme: 'dark',
  githubToken: '',
  githubRepo: '',
  currentProjectPath: '',
  openTabs: [],
  activeTabId: ''
}

export const settingsStore = new Store<AppSettings>({
  name: 'forgekit-settings',
  encryptionKey: 'forgekit-secure-storage-2026',
  defaults
})

export function getApiKey(provider: 'anthropic' | 'openai' | 'nvidia' | string): string {
  switch (provider) {
    case 'anthropic': return settingsStore.get('anthropicApiKey')
    case 'openai':    return settingsStore.get('openaiApiKey')
    case 'nvidia':    return settingsStore.get('nvidiaApiKey')
    default:          return ''
  }
}

export function getNvidiaBaseUrl(): string {
  return settingsStore.get('nvidiaBaseUrl') || 'https://integrate.api.nvidia.com/v1'
}

export function getGitHubConfig() {
  return {
    token: settingsStore.get('githubToken'),
    repo: settingsStore.get('githubRepo')
  }
}
