import { app, ipcMain, BrowserWindow } from 'electron'
import * as path from 'path'
import { createProvider, AVAILABLE_PROVIDERS } from './providers/factory'
import { settingsStore, getApiKey, getNvidiaBaseUrl, getGitHubConfig } from './store'
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

  // ── WINDOW CONTROLS (D5) ─────────────────────────────────────────────────
  ipcMain.handle('win:minimize', () => win.minimize())
  ipcMain.handle('win:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('win:close', () => win.close())
  ipcMain.handle('win:is-maximized', () => win.isMaximized())

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
      const apiKey = getApiKey(provider as 'anthropic' | 'openai' | 'nvidia')
      if (!apiKey) {
        const providerNames: Record<string, string> = {
          anthropic: 'Anthropic',
          openai: 'OpenAI',
          nvidia: 'NVIDIA NIM'
        }
        const displayName = providerNames[provider] ?? provider
        event.sender.send('stream-error', `API kljuc za ${displayName} nije podesen.`, messageId)
        return
      }

      const options = provider === 'nvidia' ? { baseURL: getNvidiaBaseUrl() } : undefined
      const providerInstance = createProvider(provider, apiKey, options)
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
    nvidiaApiKey: settingsStore.get('nvidiaApiKey') ? '***' : '',
    nvidiaBaseUrl: settingsStore.get('nvidiaBaseUrl') || 'https://integrate.api.nvidia.com/v1',
    defaultProvider: settingsStore.get('defaultProvider'),
    defaultAnthropicModel: settingsStore.get('defaultAnthropicModel'),
    defaultOpenAIModel: settingsStore.get('defaultOpenAIModel'),
    theme: settingsStore.get('theme'),
    hasAnthropicKey: !!settingsStore.get('anthropicApiKey'),
    hasOpenAIKey: !!settingsStore.get('openaiApiKey'),
    hasNvidiaKey: !!settingsStore.get('nvidiaApiKey'),
    githubRepo: settingsStore.get('githubRepo'),
    hasGithubToken: !!settingsStore.get('githubToken'),
    currentProjectPath: settingsStore.get('currentProjectPath')
  }))

  ipcMain.handle('save-settings', (_e, settings: Record<string, unknown>) => {
    if (typeof settings.anthropicApiKey === 'string' && settings.anthropicApiKey !== '***')
      settingsStore.set('anthropicApiKey', settings.anthropicApiKey)
    if (typeof settings.openaiApiKey === 'string' && settings.openaiApiKey !== '***')
      settingsStore.set('openaiApiKey', settings.openaiApiKey)
    if (typeof settings.nvidiaApiKey === 'string' && settings.nvidiaApiKey !== '***')
      settingsStore.set('nvidiaApiKey', settings.nvidiaApiKey)
    if (typeof settings.nvidiaBaseUrl === 'string' && settings.nvidiaBaseUrl)
      settingsStore.set('nvidiaBaseUrl', settings.nvidiaBaseUrl)
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

  // ── NVIDIA TEST ───────────────────────────────────────────────────────────

  ipcMain.handle('nvidia:test', async (_e, apiKey: string, baseUrl: string) => {
    const key = apiKey && apiKey !== '***' ? apiKey : settingsStore.get('nvidiaApiKey')
    const url = baseUrl || settingsStore.get('nvidiaBaseUrl') || 'https://integrate.api.nvidia.com/v1'
    if (!key) return { ok: false, message: 'API ključ nije podešen' }
    try {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: key, baseURL: url })
      const list = await client.models.list()
      const count = (list.data ?? []).length
      return { ok: true, message: `Veza OK · ${count > 0 ? `${count} modela dostupno` : 'endpoint aktivan'}` }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      const short = msg.includes('401') ? 'Neispravan API ključ (401)'
        : msg.includes('403') ? 'Zabranjen pristup (403)'
        : msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') ? 'Endpoint nedostupan'
        : msg.slice(0, 80)
      return { ok: false, message: short }
    }
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
    // SEC-06: ograničenje veličine payloada — sprječava OOM i zloupotrebu GitHub API kvote
    const MAX_CONTENT_BYTES = 50_000
    if (!payload?.content || payload.content.length > MAX_CONTENT_BYTES) {
      return { ok: false, message: `Sadržaj preveći za upload (max ${MAX_CONTENT_BYTES / 1000}KB)` }
    }
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
    // SEC-01: assertSafePath se poziva unutar writeProjectFile — hvatamo grešku ovdje
    try {
      writeProjectFile(projectPath, filename, content)
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Greška pri pisanju fajla'
      return { ok: false, message: msg }
    }
  })

  ipcMain.handle('project:read-file', (_e, filename: string) => {
    const projectPath = settingsStore.get('currentProjectPath')
    if (!projectPath) return null
    return readProjectFile(projectPath, filename)
  })

  // Čitanje fajla iz eksplicitnog foldera (bez oslanjanja na currentProjectPath)
  ipcMain.handle('project:read-file-from-path', (_e, projectPath: string, filename: string) => {
    if (!projectPath) return null

    // SEC-02: provjeri da je projectPath u listi poznatih (korisničkih) putanja.
    // Renderer ne smije čitati proizvoljne putanje s diska — samo one koje su
    // prethodno registrovane u electron-store kroz project:choose-folder ili
    // project:create-folder (čuvaju se u openTabs i currentProjectPath).
    const knownTabs = (settingsStore.get('openTabs') ?? []) as Array<{ projectPath: string }>
    const currentPath = settingsStore.get('currentProjectPath') as string | undefined
    const knownPaths = [
      ...knownTabs.map((t) => t.projectPath),
      currentPath
    ].filter(Boolean) as string[]

    const resolvedRequested = path.resolve(projectPath)
    const isKnown = knownPaths.some((p) => path.resolve(p) === resolvedRequested)

    if (!isKnown) {
      console.warn('[SEC] Odbijen pristup neregistrovanom folderu:', projectPath)
      return null
    }

    try {
      return readProjectFile(projectPath, filename)
    } catch (err) {
      console.warn('[SEC] Greška pri čitanju fajla:', err instanceof Error ? err.message : err)
      return null
    }
  })

  // Postavljanje aktivnog projekta (sinhronizacija pri prelasku između tabova)
  ipcMain.handle('project:set-active-path', (_e, path: string) => {
    if (path) settingsStore.set('currentProjectPath', path)
    return { ok: true }
  })

  // ── TABOVI — perzistencija ─────────────────────────────────────────────────

  ipcMain.handle('tabs:save-state', (_e,
    tabs: Array<{ id: string; projectPath: string | null; projectName: string }>,
    activeTabId: string
  ) => {
    const validTabs = tabs.filter((t) => t.projectPath !== null) as Array<{ id: string; projectPath: string; projectName: string }>
    settingsStore.set('openTabs', validTabs)
    settingsStore.set('activeTabId', activeTabId)
    return { ok: true }
  })

  ipcMain.handle('tabs:load-state', () => ({
    tabs: settingsStore.get('openTabs') ?? [],
    activeTabId: settingsStore.get('activeTabId') ?? ''
  }))

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
