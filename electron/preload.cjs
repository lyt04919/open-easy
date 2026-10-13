const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // OrbStack
  checkOrbStatus: () => ipcRenderer.invoke('orb:checkStatus'),
  ensureOrbRunning: () => ipcRenderer.invoke('orb:ensureRunning'),

  // Projects
  listProjects: () => ipcRenderer.invoke('projects:list'),
  startProject: (id, composePath, targetUrl) => ipcRenderer.invoke('project:start', { id, composePath, targetUrl }),
  stopProject: (id, composePath) => ipcRenderer.invoke('project:stop', { id, composePath }),
  restartProject: (id, composePath) => ipcRenderer.invoke('project:restart', { id, composePath }),
  updateProject: (id, updates) => ipcRenderer.invoke('project:updateConfig', { id, updates }),
  sleepAll: () => ipcRenderer.invoke('projects:sleepAll'),

  // System & Stats
  getStats: () => ipcRenderer.invoke('system:stats'),
  pruneSystem: () => ipcRenderer.invoke('system:prune'),

  // Browser & Native Launchers
  openUrl: (url) => ipcRenderer.invoke('browser:openUrl', url),
  openInEditor: (projectPath, editor) => ipcRenderer.invoke('ide:open', { projectPath, editor }),
  openInTerminal: (projectPath) => ipcRenderer.invoke('terminal:open', projectPath),
  showInFinder: (projectPath) => ipcRenderer.invoke('finder:show', projectPath),

  // Port Diagnostics
  checkPortConflict: (port) => ipcRenderer.invoke('port:check', port),
  killPortProcess: (pid) => ipcRenderer.invoke('port:kill', pid)
});
