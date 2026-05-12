import Store from 'electron-store'

interface AppSettings {
  anthropicApiKey: string
  openaiApiKey: string
  defaultProvider: 'anthropic' | 'openai'
  defaultAnthropicModel: string
  defaultOpenAIModel: string
  theme: 'dark' | 'light'
  githubToken: string
  githubRepo: string
  currentProjectPath: string
}

const defaults: AppSettings = {
  anthropicApiKey: '',
  openaiApiKey: '',
  defaultProvider: 'anthropic',
  defaultAnthropicModel: 'claude-sonnet-4-6',
  defaultOpenAIModel: 'gpt-4o',
  theme: 'dark',
  githubToken: '',
  githubRepo: '',
  currentProjectPath: ''
}

export const settingsStore = new Store<AppSettings>({
  name: 'forgekit-settings',
  encryptionKey: 'forgekit-secure-storage-2026',
  defaults
})

export function getApiKey(provider: 'anthropic' | 'openai'): string {
  return provider === 'anthropic'
    ? settingsStore.get('anthropicApiKey')
    : settingsStore.get('openaiApiKey')
}

export function getGitHubConfig() {
  return {
    token: settingsStore.get('githubToken'),
    repo: settingsStore.get('githubRepo')
  }
}
