/**
 * ForgeKit Interface — Updater modul
 *
 * Logika provjere i preuzimanja azuriranja sa GitHub Releases.
 * Pokusava electron-updater (zahtijeva latest.yml u Release-u),
 * a ako ne uspije — koristi GitHub API + direktni download.
 */

import { app, BrowserWindow, dialog, shell } from 'electron'
import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'

const GITHUB_REPO = 'ibolabs-git/ForgeKit_Interface'

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl?: string
  htmlUrl?: string
  message: string
}

// ── Semver poređenje ──────────────────────────────────────────────────────────
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

// ── Provjera najnovijeg release-a na GitHub-u ─────────────────────────────────
export async function checkForLatestRelease(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'ForgeKit-Interface-App' } }
    )

    if (!res.ok) {
      return {
        hasUpdate: false, currentVersion,
        latestVersion: currentVersion,
        message: `GitHub API greska: HTTP ${res.status}`
      }
    }

    const data = await res.json() as {
      tag_name?: string
      html_url?: string
      assets?: Array<{ name: string; browser_download_url: string }>
    }

    const latestVersion = (data.tag_name ?? '').replace(/^v/, '')
    if (!latestVersion) {
      return { hasUpdate: false, currentVersion, latestVersion: '', message: 'Nije pronadjeni release-ovi' }
    }

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return {
        hasUpdate: false, currentVersion, latestVersion,
        message: `Koristis najnoviju verziju (v${currentVersion})`
      }
    }

    // Trazimo Setup .exe asset
    const exeAsset = data.assets?.find(
      (a) => a.name.endsWith('.exe') && a.name.toLowerCase().includes('setup')
    )

    return {
      hasUpdate: true, currentVersion, latestVersion,
      downloadUrl: exeAsset?.browser_download_url,
      htmlUrl: data.html_url,
      message: `Dostupna je nova verzija v${latestVersion}`
    }
  } catch {
    return {
      hasUpdate: false, currentVersion, latestVersion: '',
      message: 'Nije moguce provjeriti azuriranje (bez mreze)'
    }
  }
}

// ── Preuzimanje fajla sa pracenjem napretka ───────────────────────────────────
function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    function doGet(getUrl: string, redirects = 0) {
      if (redirects > 8) { reject(new Error('Previse preusmjeravanja')); return }

      https.get(getUrl, (res) => {
        // Pratimo redirect-e (GitHub assets se preusmeravaju na CDN)
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          doGet(res.headers.location, redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`)); return
        }

        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const file = fs.createWriteStream(destPath)

        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0) onProgress?.(Math.round((received / total) * 100))
        })

        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
        file.on('error', (err) => {
          try { fs.unlinkSync(destPath) } catch { /* ignore */ }
          reject(err)
        })
      }).on('error', reject)
    }
    doGet(url)
  })
}

// ── Preuzimanje i tiha instalacija ────────────────────────────────────────────
export async function downloadAndInstall(
  win: BrowserWindow,
  downloadUrl: string,
  latestVersion: string
): Promise<void> {
  const tempDir = app.getPath('temp')
  const filename = `ForgeKitSetup_${latestVersion}.exe`
  const destPath = path.join(tempDir, filename)

  // Ocisti stari privremeni fajl ako postoji
  try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch { /* ignore */ }

  // Progres prema rendereru
  await downloadFile(downloadUrl, destPath, (pct) => {
    if (!win.isDestroyed()) win.webContents.send('update-download-progress', pct)
  })

  // Pokrecemo installer bez cekanja — on ce sam preuzeti zatvaranje procesa
  const installer = spawn(destPath, ['/S'], { detached: true, stdio: 'ignore' })
  installer.unref()

  // Kratka pauza da se installer pokrene, pa gasi app
  await new Promise((r) => setTimeout(r, 1200))
  app.quit()
}

// ── Automatska provjera pri pokretanju ────────────────────────────────────────
export async function runStartupUpdateCheck(win: BrowserWindow): Promise<void> {
  // Pokusaj electron-updater (radi samo ako latest.yml postoji u GitHub release)
  let usedElectronUpdater = false
  try {
    const { autoUpdater } = await import('electron-updater')
    ;(autoUpdater as unknown as Record<string, unknown>).logger = null
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.once('update-available', async (info) => {
      const btn = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Nova verzija dostupna',
        message: `ForgeKit Interface v${info.version} je dostupan`,
        detail: 'Preuzimanje u pozadini. Bices obavijesten kada bude spreman.',
        buttons: ['Preuzmi', 'Kasnije'], defaultId: 0, cancelId: 1
      })
      if (btn.response === 0) {
        autoUpdater.downloadUpdate()
        if (!win.isDestroyed()) win.webContents.send('update-downloading')
      }
    })

    autoUpdater.once('update-downloaded', async (info) => {
      const btn = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Azuriranje preuzeto',
        message: `ForgeKit Interface v${info.version} spreman za instalaciju.`,
        detail: 'Klikni "Restartuj" da instaliras odmah.',
        buttons: ['Restartuj i instaliraj', 'Kasnije'], defaultId: 0, cancelId: 1
      })
      if (btn.response === 0) autoUpdater.quitAndInstall(false, true)
    })

    autoUpdater.once('update-not-available', () => { /* tiho */ })

    autoUpdater.once('error', async () => {
      if (!usedElectronUpdater) await checkAndNotifyFallback(win)
    })

    usedElectronUpdater = true
    await autoUpdater.checkForUpdates()
  } catch {
    await checkAndNotifyFallback(win)
  }
}

// ── Fallback: GitHub API + direktni download ──────────────────────────────────
export async function checkAndNotifyFallback(win: BrowserWindow): Promise<void> {
  const result = await checkForLatestRelease()
  if (!result.hasUpdate) return

  if (result.downloadUrl) {
    const btn = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Nova verzija dostupna',
      message: `ForgeKit Interface v${result.latestVersion} je dostupan  (trenutna: v${result.currentVersion})`,
      detail: 'Klikni "Preuzmi i instaliraj" — aplikacija ce se automatski zatvoriti tokom instalacije.',
      buttons: ['Preuzmi i instaliraj', 'Kasnije'], defaultId: 0, cancelId: 1
    })
    if (btn.response === 0) {
      try {
        await downloadAndInstall(win, result.downloadUrl, result.latestVersion)
      } catch (err) {
        dialog.showMessageBox(win, {
          type: 'error',
          title: 'Greska pri preuzimanju',
          message: `Preuzimanje nije uspjelo: ${(err as Error).message}`,
          detail: 'Pokusaj rucno sa GitHub stranice.',
          buttons: ['OK']
        })
        if (result.htmlUrl) shell.openExternal(result.htmlUrl)
      }
    }
  } else if (result.htmlUrl) {
    const btn = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Nova verzija dostupna',
      message: `ForgeKit Interface v${result.latestVersion} je dostupan`,
      detail: 'Direktan download nije pronadjen — otvara se GitHub stranica.',
      buttons: ['Otvori GitHub', 'Kasnije'], defaultId: 0, cancelId: 1
    })
    if (btn.response === 0) shell.openExternal(result.htmlUrl)
  }
}
