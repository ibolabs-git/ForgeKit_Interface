import { app, BrowserWindow, shell, dialog } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'ForgeKit Interface',
    show: false
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerIpcHandlers(win)

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Update provjera — samo u production buildu
  if (!process.env['ELECTRON_RENDERER_URL']) {
    setTimeout(() => checkForUpdate(win), 3000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

async function checkForUpdate(win: BrowserWindow): Promise<void> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/ibolabs-git/ForgeKit_Interface/releases/latest',
      { headers: { 'User-Agent': 'ForgeKit-Interface-App' } }
    )
    if (!res.ok) return
    const data = await res.json() as { tag_name?: string; html_url?: string }
    const latest = data.tag_name?.replace('v', '') ?? ''
    const current = app.getVersion()
    if (latest && latest !== current) {
      const result = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Nova verzija dostupna',
        message: `ForgeKit Interface v${latest} je dostupan (trenutna: v${current})`,
        detail: 'Klikni "Preuzmi" da odes na stranicu za download.',
        buttons: ['Preuzmi', 'Kasnije']
      })
      if (result.response === 0 && data.html_url) {
        shell.openExternal(data.html_url)
      }
    }
  } catch { /* nema interneta ili greska, ignorisemo */ }
}
