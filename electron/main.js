import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkOrbStatus,
  ensureOrbRunning,
  inspectComposeFile,
  getProjectRuntimeStatus,
  startProject,
  stopProject,
  restartProject,
  sleepAllProjects,
  pruneSystem,
  getStats
} from './services/orbManager.js';
import { checkPortConflict, killProcess } from './services/portDiagnostics.js';
import { openInEditor, openInTerminal, showInFinder } from './services/editorOpener.js';
import { waitForReady } from './services/healthChecker.js';
import { store } from './services/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 560,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#fbfbfd',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Forward renderer console logs to main process terminal
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  // Load Vite dev server in dev mode, or load dist/index.html in production
  if (process.env.VITE_DEV === 'true') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpc() {
  // OrbStack status & auto-healing
  ipcMain.handle('orb:checkStatus', async () => {
    return await checkOrbStatus();
  });

  ipcMain.handle('orb:ensureRunning', async () => {
    return await ensureOrbRunning();
  });

  // Projects list with inspection & live status
  ipcMain.handle('projects:list', async () => {
    const stored = store.getProjects();
    const enriched = await Promise.all(
      stored.map(async (p) => {
        const inspected = inspectComposeFile(p.composePath);
        const runtime = await getProjectRuntimeStatus(p.composePath);
        return {
          ...p,
          tech: p.tech || inspected.tech,
          frontendPort: p.frontendPort || inspected.hostPorts[0] || 8080,
          frontendUrl: p.frontendUrl || inspected.defaultUrl,
          services: inspected.serviceNames,
          containers: runtime.containers,
          status: runtime.status
        };
      })
    );
    return enriched;
  });

  // Start project with auto-healing and healthcheck browser launch
  ipcMain.handle('project:start', async (_, { id, composePath, targetUrl }) => {
    try {
      // 1. Silent auto-healing if OrbStack is down
      const orbRes = await ensureOrbRunning();

      // 2. Start Compose containers
      await startProject(composePath);

      // 3. Healthcheck probe
      const health = await waitForReady(targetUrl, 25000);

      // 4. Auto-launch browser if probe succeeded
      if (health.ready) {
        await shell.openExternal(targetUrl);
      }

      return {
        success: true,
        ready: health.ready,
        durationMs: health.durationMs,
        autoHealed: orbRes.autoStarted
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:stop', async (_, { composePath }) => {
    try {
      await stopProject(composePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:restart', async (_, { composePath }) => {
    try {
      await restartProject(composePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:updateConfig', async (_, { id, updates }) => {
    return store.updateProject(id, updates);
  });

  // Sleep all running containers
  ipcMain.handle('projects:sleepAll', async () => {
    const list = store.getProjects().map((p) => p.composePath);
    return await sleepAllProjects(list);
  });

  // System stats & prune
  ipcMain.handle('system:stats', async () => {
    return await getStats();
  });

  ipcMain.handle('system:prune', async () => {
    return await pruneSystem();
  });

  // Browser & native launchers
  ipcMain.handle('browser:openUrl', async (_, url) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('ide:open', async (_, { projectPath, editor }) => {
    const projectDir = path.dirname(projectPath);
    return await openInEditor(projectDir, editor);
  });

  ipcMain.handle('terminal:open', async (_, projectPath) => {
    const projectDir = path.dirname(projectPath);
    return await openInTerminal(projectDir);
  });

  ipcMain.handle('finder:show', async (_, projectPath) => {
    const projectDir = path.dirname(projectPath);
    return await showInFinder(projectDir);
  });

  // Port Diagnostics
  ipcMain.handle('port:check', async (_, port) => {
    return await checkPortConflict(port);
  });

  ipcMain.handle('port:kill', async (_, pid) => {
    return await killProcess(pid);
  });
}
