import Store from 'electron-store'
import { safeStorage } from 'electron'

interface SavedTab {
  id: string
  projectPath: string
  projectName: string
}

// ── Osjetljivi podaci (API ključevi) ─────────────────────────────────────────
// SEC-04: API ključevi čuvaju se u zasebnom store-u, enkriptovani sa safeStorage
// (Windows DPAPI / macOS Keychain) — ne sa hardkodovanim stringom.
// Soft migracija: ako safeStorage verzija ne postoji, čita se iz legacy store-a.

interface SecureData {
  anthropicKey: string  // base64 safeStorage buffer, ili plaintext kao fallback
  openaiKey: string
  nvidiaKey: string
  githubToken: string
}

const secureStore = new Store<SecureData>({
  name: 'forgekit-secure',
  // Bez encryptionKey — vrednosti su već enkriptovane sa safeStorage iznutra
  defaults: { anthropicKey: '', openaiKey: '', nvidiaKey: '', githubToken: '' }
})

function encryptValue(value: string): string {
  if (!value) return ''
  if (safeStorage.isEncryptionAvailable()) {
    // Enkriptuj sa DPAPI/Keychain, čuvaj kao base64 string u JSON fajlu
    return safeStorage.encryptString(value).toString('base64')
  }
  // Fallback za okruženja bez keychain-a (CI, headless) — plain text
  return value
}

function decryptValue(stored: string): string {
  if (!stored) return ''
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      // Nije base64 safeStorage format — vjerovatno migrirani plain tekst
      return stored
    }
  }
  return stored
}

type SecureKey = 'anthropicKey' | 'openaiKey' | 'nvidiaKey' | 'githubToken'

export function setApiKeySecure(key: SecureKey, value: string): void {
  secureStore.set(key, encryptValue(value))
}

export function getApiKeySecure(key: SecureKey): string {
  const stored = secureStore.get(key)
  if (stored) return decryptValue(stored)
  // Soft migracija: proveri legacy store (može biti prazan string ako nije migriran)
  return getApiKeyLegacy(key)
}

// ── Legacy store (backward compat za postojeće instalacije) ───────────────────
// Zadržan encryptionKey kako bi se mogli čitati stari podaci.
// Ne pisati više u legacy store — samo čitati za migraciju.

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
  masterToolRepo: string  // zasebni repo za Master_ForgeKit_Tool (npr. ibolabs-git/ForgeKit_tool)
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
  masterToolRepo: '',
  currentProjectPath: '',
  openTabs: [],
  activeTabId: ''
}

export const settingsStore = new Store<AppSettings>({
  name: 'forgekit-settings',
  encryptionKey: 'forgekit-secure-storage-2026',  // zadržano samo za čitanje starih podataka
  defaults
})

function getApiKeyLegacy(key: SecureKey): string {
  // Mapa SecureKey → AppSettings polje za migraciju
  const legacyMap: Record<SecureKey, keyof AppSettings> = {
    anthropicKey: 'anthropicApiKey',
    openaiKey:    'openaiApiKey',
    nvidiaKey:    'nvidiaApiKey',
    githubToken:  'githubToken'
  }
  return settingsStore.get(legacyMap[key]) as string ?? ''
}

// ── Javne funkcije ─────────────────────────────────────────────────────────────

export function getApiKey(provider: 'anthropic' | 'openai' | 'nvidia' | string): string {
  switch (provider) {
    case 'anthropic': return getApiKeySecure('anthropicKey')
    case 'openai':    return getApiKeySecure('openaiKey')
    case 'nvidia':    return getApiKeySecure('nvidiaKey')
    default:          return ''
  }
}

export function getGitHubToken(): string {
  return getApiKeySecure('githubToken')
}

export function getNvidiaBaseUrl(): string {
  return settingsStore.get('nvidiaBaseUrl') || 'https://integrate.api.nvidia.com/v1'
}

export function getGitHubConfig() {
  return {
    token: getGitHubToken(),
    repo: settingsStore.get('githubRepo')
  }
}

// Konfiguracija za Master_ForgeKit_Tool repo (može biti isti ili zasebni repo)
export function getMasterToolConfig() {
  const token = getGitHubToken()
  const masterRepo = settingsStore.get('masterToolRepo')
  const fallbackRepo = settingsStore.get('githubRepo')
  return {
    token,
    repo: masterRepo || fallbackRepo  // ako masterToolRepo nije podesen, koristi githubRepo
  }
}
