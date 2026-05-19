import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { runStartupUpdateCheck } from './updater'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true   // SEC-03: eksplicitni sandbox; preload koristi samo ipcRenderer+contextBridge koji rade u sandbox modu
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

  // Provjera azuriranja — samo u production buildu, sa odgodom od 5s
  if (!process.env['ELECTRON_RENDERER_URL']) {
    setTimeout(() => runStartupUpdateCheck(win), 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
