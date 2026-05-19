import { net } from 'electron'

const GITHUB_API = 'https://api.github.com'

interface GitHubConfig {
  token: string
  repo: string // format: "owner/repo"
}

async function githubFetch(
  config: GitHubConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${GITHUB_API}${endpoint}`
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'ForgeKit-Interface-App',
      ...(options.headers ?? {})
    }
  })
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await githubFetch(config, `/repos/${config.repo}`)
    if (res.ok) return { ok: true, message: 'Konekcija uspesna' }
    if (res.status === 401) return { ok: false, message: 'Nevazan token' }
    if (res.status === 404) return { ok: false, message: 'Repozitorijum nije pronadjen ili nije privatno dostupan' }
    return { ok: false, message: `HTTP ${res.status}` }
  } catch (err) {
    // COMP-06: instanceof provera umesto as Error — catch može primiti bilo koji thrown tip
    const msg = err instanceof Error ? err.message : 'Nepoznata mrežna greška'
    return { ok: false, message: `Mreža nedostupna: ${msg}` }
  }
}

export async function fetchFileFromGitHub(
  config: GitHubConfig,
  filePath: string
): Promise<string | null> {
  try {
    const res = await githubFetch(config, `/repos/${config.repo}/contents/${filePath}`)
    if (!res.ok) return null
    const data = await res.json() as { content?: string; encoding?: string }
    if (!data.content) return null
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  } catch {
    return null
  }
}

export async function uploadFileToGitHub(
  config: GitHubConfig,
  filePath: string,
  content: string,
  commitMessage: string
): Promise<{ ok: boolean; message: string }> {
  try {
    // Proverimo da li fajl vec postoji (za SHA)
    const existing = await githubFetch(config, `/repos/${config.repo}/contents/${filePath}`)
    let sha: string | undefined
    if (existing.ok) {
      const data = await existing.json() as { sha?: string }
      sha = data.sha
    }

    const body: Record<string, string> = {
      message: commitMessage,
      content: Buffer.from(content, 'utf-8').toString('base64')
    }
    if (sha) body.sha = sha

    const res = await githubFetch(config, `/repos/${config.repo}/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    if (res.ok) return { ok: true, message: 'Upload uspesno' }
    const errData = await res.json() as { message?: string }
    return { ok: false, message: errData.message ?? `HTTP ${res.status}` }
  } catch (err) {
    // COMP-06: instanceof provera umesto as Error
    const msg = err instanceof Error ? err.message : 'Nepoznata greška pri uploadu'
    return { ok: false, message: msg }
  }
}

export async function uploadMemoryRecord(
  config: GitHubConfig,
  projectName: string,
  content: string
): Promise<{ ok: boolean; message: string }> {
  // OPT-09: uklonjen nepotreban temp file — content je već u memoriji kao string,
  // nema razloga pisati ga na disk samo da bi se odmah pročitao i obrisao
  const date = new Date().toISOString().slice(0, 10)
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const timestamp = Date.now()
  const remotePath = `learning_data/${date}_${safeName}_${timestamp}.md`
  return uploadFileToGitHub(config, remotePath, content, `Memory record: ${projectName} ${date}`)
}

export async function fetchSystemPromptFromGitHub(
  config: GitHubConfig
): Promise<string | null> {
  // Struktura u ibolabs-git/ForgeKit_tool: Master_ForgeKit_Tool/00_SYSTEM/...
  const candidates = [
    'Master_ForgeKit_Tool/00_SYSTEM/forgekit_mode_prompt.md',
    'Master_ForgeKit_Tool/00_SYSTEM/orchestrator_prompt.md',
    '00_SYSTEM/forgekit_mode_prompt.md',  // fallback ako je repo bez podfolder strukture
    'system-prompt.md'
  ]
  for (const candidate of candidates) {
    const content = await fetchFileFromGitHub(config, candidate)
    if (content) return content
  }
  return null
}

// Ucitava proizvoljan fajl iz Master Tool repo-a po putanji.
// Agent moze proslediti relativnu putanju (npr. '03_STANDARD/technical_notes.md')
// ili punu putanju sa prefiksom (npr. 'Master_ForgeKit_Tool/03_STANDARD/...').
export async function fetchTemplateFromGitHub(
  config: GitHubConfig,
  filePath: string
): Promise<string | null> {
  // Uvek probaj sa Master_ForgeKit_Tool/ prefiksom prvo — to je stvarna struktura repo-a
  const withPrefix = filePath.startsWith('Master_ForgeKit_Tool/')
    ? filePath
    : `Master_ForgeKit_Tool/${filePath}`
  const withoutPrefix = filePath.startsWith('Master_ForgeKit_Tool/')
    ? filePath.replace('Master_ForgeKit_Tool/', '')
    : filePath

  for (const candidate of [withPrefix, withoutPrefix]) {
    const content = await fetchFileFromGitHub(config, candidate)
    if (content) return content
  }
  return null
}
