import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // AI streaming
  sendMessage: (payload: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    provider: string; model: string; systemPrompt: string; messageId: string
  }) => ipcRenderer.send('send-message', payload),

  onStreamToken: (cb: (token: string, messageId: string) => void) => {
    const h = (_: Electron.IpcRendererEvent, token: string, id: string) => cb(token, id)
    ipcRenderer.on('stream-token', h)
    return () => ipcRenderer.removeListener('stream-token', h)
  },
  onStreamComplete: (cb: (messageId: string) => void) => {
    const h = (_: Electron.IpcRendererEvent, id: string) => cb(id)
    ipcRenderer.on('stream-complete', h)
    return () => ipcRenderer.removeListener('stream-complete', h)
  },
  onStreamError: (cb: (error: string, messageId: string) => void) => {
    const h = (_: Electron.IpcRendererEvent, error: string, id: string) => cb(error, id)
    ipcRenderer.on('stream-error', h)
    return () => ipcRenderer.removeListener('stream-error', h)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: Record<string, unknown>) => ipcRenderer.invoke('save-settings', s),
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getModels: (provider: string) => ipcRenderer.invoke('get-models', provider),

  // GitHub
  githubTest: () => ipcRenderer.invoke('github:test'),
  githubUploadMemory: (payload: { projectName: string; content: string }) =>
    ipcRenderer.invoke('github:upload-memory', payload),
  githubFetchSystemPrompt: () => ipcRenderer.invoke('github:fetch-system-prompt'),

  // Project folder
  projectChooseFolder: () => ipcRenderer.invoke('project:choose-folder'),
  projectCreateFolder: (name: string) => ipcRenderer.invoke('project:create-folder', name),
  projectGetPath: () => ipcRenderer.invoke('project:get-path'),
  projectWriteFile: (filename: string, content: string) =>
    ipcRenderer.invoke('project:write-file', filename, content),
  projectReadFile: (filename: string) => ipcRenderer.invoke('project:read-file', filename),

  // App info & update
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdate: () => ipcRenderer.invoke('app:check-update'),
  triggerUpdate: () => ipcRenderer.invoke('app:trigger-update'),
  onUpdateDownloadProgress: (cb: (pct: number) => void) => {
    const h = (_: Electron.IpcRendererEvent, pct: number) => cb(pct)
    ipcRenderer.on('update-download-progress', h)
    return () => ipcRenderer.removeListener('update-download-progress', h)
  }
})
