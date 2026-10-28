const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // OrbStack
  checkOrbStatus: () => ipcRenderer.invoke('orb:checkStatus'),
  ensureOrbRunning: () => ipcRenderer.invoke('orb:ensureRunning'),
  getOrbStackDeployedProjects: () => ipcRenderer.invoke('orb:getDeployedProjects'),

  // Projects
  listProjects: () => ipcRenderer.invoke('projects:list'),
  startProject: (id, composePath, targetUrl) => ipcRenderer.invoke('project:start', { id, composePath, targetUrl }),
  stopProject: (id, composePath) => ipcRenderer.invoke('project:stop', { id, composePath }),
  restartProject: (id, composePath) => ipcRenderer.invoke('project:restart', { id, composePath }),
  rebuildProject: (composePath) => ipcRenderer.invoke('project:rebuild', { composePath }),
  pullProject: (composePath) => ipcRenderer.invoke('project:pull', { composePath }),
  resetProjectVolumes: (composePath) => ipcRenderer.invoke('project:resetVolumes', { composePath }),
  pingRoute: (targetUrl) => ipcRenderer.invoke('project:ping', targetUrl),
  exportWorkspace: () => ipcRenderer.invoke('workspace:export'),
  importWorkspace: () => ipcRenderer.invoke('workspace:import'),
  setTheme: (theme) => ipcRenderer.invoke('window:setTheme', theme),
  getProjectEnv: (composePath, fileName) => ipcRenderer.invoke('project:getEnv', { composePath, fileName }),
  saveProjectEnv: (composePath, content, fileName = '.env') => ipcRenderer.invoke('project:saveEnv', { composePath, content, fileName }),
  openDatabaseClient: (uri) => ipcRenderer.invoke('database:openClient', uri),
  dumpDatabase: (params) => ipcRenderer.invoke('db:dump', params),
  restoreDatabase: (params) => ipcRenderer.invoke('db:restore', params),
  getProjectResourceUsage: (composePath) => ipcRenderer.invoke('project:stats', composePath),
  updateProject: (id, updates) => ipcRenderer.invoke('project:updateConfig', { id, updates }),
  pickIconImage: () => ipcRenderer.invoke('project:pickIcon'),
  importProject: () => ipcRenderer.invoke('projects:import'),
  importProjectPath: (filePath) => ipcRenderer.invoke('projects:importPath', filePath),
  addProject: (project) => {
    const clean = project ? JSON.parse(JSON.stringify(project)) : {};
    return ipcRenderer.invoke('projects:add', clean);
  },
  removeProject: (id) => ipcRenderer.invoke('project:remove', id),
  sleepAll: () => ipcRenderer.invoke('projects:sleepAll'),

  // Container Terminal
  execContainer: (containerName) => ipcRenderer.invoke('terminal:execContainer', containerName),
  execDbShell: (params) => ipcRenderer.invoke('terminal:execDbShell', params),


  // System & Stats
  getStats: () => ipcRenderer.invoke('system:stats'),
  pruneSystem: () => ipcRenderer.invoke('system:prune'),

  // Microservice Individual Controls
  startService: (composePath, serviceName) => ipcRenderer.invoke('service:start', { composePath, serviceName }),
  stopService: (composePath, serviceName) => ipcRenderer.invoke('service:stop', { composePath, serviceName }),
  restartService: (composePath, serviceName) => ipcRenderer.invoke('service:restart', { composePath, serviceName }),
  startMiddlewareServices: (composePath, middlewareNames) => ipcRenderer.invoke('service:startMiddleware', { composePath, middlewareNames }),

  // Streaming Real-time Logs
  startLogStream: (composePath, tail = 120, serviceName = '') => ipcRenderer.invoke('project:startLogStream', { composePath, tail, serviceName }),
  stopLogStream: (composePath) => ipcRenderer.invoke('project:stopLogStream', { composePath }),
  onLogStreamData: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('project:logStreamData', handler);
    return () => ipcRenderer.removeListener('project:logStreamData', handler);
  },

  // Settings & Preferences
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates) => ipcRenderer.invoke('settings:update', updates),
  openConfigFolder: () => ipcRenderer.invoke('settings:openConfigFolder'),

  // Project Tags
  updateProjectTags: (id, tags) => ipcRenderer.invoke('project:updateTags', { id, tags }),

  // System Events
  onProjectsRefreshed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('projects:refreshed', handler);
    return () => ipcRenderer.removeListener('projects:refreshed', handler);
  },

  // Browser & Native Launchers
  openUrl: (url) => ipcRenderer.invoke('browser:openUrl', url),
  openInEditor: (projectPath, editor) => ipcRenderer.invoke('ide:open', { projectPath, editor }),
  openInTerminal: (projectPath, terminal) => ipcRenderer.invoke('terminal:open', { projectPath, terminal }),
  showInFinder: (projectPath) => ipcRenderer.invoke('finder:show', projectPath),

  // Port Diagnostics
  checkPortConflict: (port) => ipcRenderer.invoke('port:check', port),
  checkPortsConflict: (ports) => ipcRenderer.invoke('ports:checkConflicts', ports),
  killPortProcess: (pid) => ipcRenderer.invoke('port:kill', pid),
  listAllPorts: () => ipcRenderer.invoke('ports:listAll')
});
