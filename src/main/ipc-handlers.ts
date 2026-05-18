import { app, ipcMain, BrowserWindow } from 'electron'
import { createProvider, AVAILABLE_PROVIDERS } from './providers/factory'
import { settingsStore, getApiKey, getGitHubConfig } from './store'
import {
  testGitHubConnection,
  uploadMemoryRecord,
  fetchSystemPromptFromGitHub
} from './github'
import {
  chooseProjectFolder,
  createProjectFolder,
  writeProjectFile,
  readProjectFile,
  initProjectFolder
} from './project-manager'
import { checkForLatestRelease, checkAndNotifyFallback } from './updater'

export function registerIpcHandlers(win: BrowserWindow): void {

  // ── AI STREAMING ──────────────────────────────────────────────────────────

  ipcMain.on('send-message', async (event, payload: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    provider: string
    model: string
    systemPrompt: string
    messageId: string
  }) => {
    const { messages, provider, model, systemPrompt, messageId } = payload

    try {
      const apiKey = getApiKey(provider as 'anthropic' | 'openai')
      if (!apiKey) {
        event.sender.send('stream-error', 'API kljuc nije podesen. Otvori Settings i unesi kljuc.', messageId)
        return
      }

      const providerInstance = createProvider(provider, apiKey)
      for await (const token of providerInstance.sendMessage(messages, systemPrompt, model)) {
        if (win.isDestroyed()) break
        event.sender.send('stream-token', token, messageId)
      }
      event.sender.send('stream-complete', messageId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nepoznata greska'
      event.sender.send('stream-error', message, messageId)
    }
  })

  // ── SETTINGS ──────────────────────────────────────────────────────────────

  ipcMain.handle('get-settings', () => ({
    anthropicApiKey: settingsStore.get('anthropicApiKey') ? '***' : '',
    openaiApiKey: settingsStore.get('openaiApiKey') ? '***' : '',
    defaultProvider: settingsStore.get('defaultProvider'),
    defaultAnthropicModel: settingsStore.get('defaultAnthropicModel'),
    defaultOpenAIModel: settingsStore.get('defaultOpenAIModel'),
    theme: settingsStore.get('theme'),
    hasAnthropicKey: !!settingsStore.get('anthropicApiKey'),
    hasOpenAIKey: !!settingsStore.get('openaiApiKey'),
    githubRepo: settingsStore.get('githubRepo'),
    hasGithubToken: !!settingsStore.get('githubToken'),
    currentProjectPath: settingsStore.get('currentProjectPath')
  }))

  ipcMain.handle('save-settings', (_e, settings: Record<string, unknown>) => {
    if (typeof settings.anthropicApiKey === 'string' && settings.anthropicApiKey !== '***')
      settingsStore.set('anthropicApiKey', settings.anthropicApiKey)
    if (typeof settings.openaiApiKey === 'string' && settings.openaiApiKey !== '***')
      settingsStore.set('openaiApiKey', settings.openaiApiKey)
    if (typeof settings.githubToken === 'string' && settings.githubToken !== '***')
      settingsStore.set('githubToken', settings.githubToken)
    if (typeof settings.githubRepo === 'string' && settings.githubRepo)
      settingsStore.set('githubRepo', settings.githubRepo)
    if (typeof settings.defaultProvider === 'string')
      settingsStore.set('defaultProvider', settings.defaultProvider as 'anthropic' | 'openai')
    if (typeof settings.defaultAnthropicModel === 'string')
      settingsStore.set('defaultAnthropicModel', settings.defaultAnthropicModel)
    if (typeof settings.defaultOpenAIModel === 'string')
      settingsStore.set('defaultOpenAIModel', settings.defaultOpenAIModel)
    if (typeof settings.theme === 'string')
      settingsStore.set('theme', settings.theme as 'dark' | 'light')
    if (typeof settings.currentProjectPath === 'string')
      settingsStore.set('currentProjectPath', settings.currentProjectPath)
    return { success: true }
  })

  ipcMain.handle('get-providers', () => AVAILABLE_PROVIDERS)

  ipcMain.handle('get-models', (_e, providerName: string) => {
    try {
      return createProvider(providerName, 'dummy').getAvailableModels()
    } catch { return [] }
  })

  // ── GITHUB ────────────────────────────────────────────────────────────────

  ipcMain.handle('github:test', async () => {
    const config = getGitHubConfig()
    if (!config.token || !config.repo)
      return { ok: false, message: 'GitHub nije podesen u Settings' }
    return testGitHubConnection(config)
  })

  ipcMain.handle('github:upload-memory', async (_e, payload: {
    projectName: string
    content: string
  }) => {
    const config = getGitHubConfig()
    if (!config.token || !config.repo)
      return { ok: false, message: 'GitHub nije podesen' }
    return uploadMemoryRecord(config, payload.projectName, payload.content)
  })

  ipcMain.handle('github:fetch-system-prompt', async () => {
    const config = getGitHubConfig()
    if (!config.token || !config.repo) return null
    return fetchSystemPromptFromGitHub(config)
  })

  // ── PROJECT FOLDER ────────────────────────────────────────────────────────

  ipcMain.handle('project:choose-folder', async () => {
    const folderPath = await chooseProjectFolder(win)
    if (folderPath) settingsStore.set('currentProjectPath', folderPath)
    return folderPath
  })

  ipcMain.handle('project:create-folder', async (_e, projectName: string) => {
    const folderPath = await createProjectFolder(win, projectName)
    if (folderPath) {
      initProjectFolder(folderPath, projectName)
      settingsStore.set('currentProjectPath', folderPath)
    }
    return folderPath
  })

  ipcMain.handle('project:get-path', () =>
    settingsStore.get('currentProjectPath') || null
  )

  ipcMain.handle('project:write-file', (_e, filename: string, content: string) => {
    const projectPath = settingsStore.get('currentProjectPath')
    if (!projectPath) return { ok: false, message: 'Nema aktivnog projekta' }
    try {
      writeProjectFile(projectPath, filename, content)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: (err as Error).message }
    }
  })

  ipcMain.handle('project:read-file', (_e, filename: string) => {
    const projectPath = settingsStore.get('currentProjectPath')
    if (!projectPath) return null
    return readProjectFile(projectPath, filename)
  })

  // ── APP INFO & UPDATE ─────────────────────────────────────────────────────

  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.handle('app:check-update', async () => {
    return checkForLatestRelease()
  })

  ipcMain.handle('app:trigger-update', async () => {
    await checkAndNotifyFallback(win)
    return { ok: true }
  })
}
