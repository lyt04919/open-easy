import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, globalShortcut, Notification } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkOrbStatus,
  ensureOrbRunning,
  inspectComposeFile,
  getProjectRuntimeStatus,
  getBatchProjectsRuntimeStatus,
  startProject,
  stopProject,
  restartProject,
  rebuildProject,
  pullProject,
  resetProjectVolumes,
  getProjectLogs,
  sleepAllProjects,
  pruneSystem,
  getStats,
  getOrbStackDeployedProjects,
  getProjectResourceUsage,
  getProjectEnv,
  saveProjectEnv,
  startService,
  stopService,
  restartService,
  startMiddlewareServices,
  getProjectGitInfo,
  dumpDatabase,
  restoreDatabase
} from './services/orbManager.js';
import { checkPortConflict, checkPortsConflict, killProcess, listAllOccupiedPorts } from './services/portDiagnostics.js';
import { openInEditor, openInTerminal, showInFinder, execInTerminal, execDbShellInTerminal } from './services/editorOpener.js';

import { waitForReady, pingRoute } from './services/healthChecker.js';
import { store } from './services/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let isQuitting = false;
const activeLogStreams = new Map();

function stopLogStream(composePath) {
  if (composePath && activeLogStreams.has(composePath)) {
    const child = activeLogStreams.get(composePath);
    try {
      child.kill('SIGTERM');
    } catch {}
    activeLogStreams.delete(composePath);
  } else if (!composePath) {
    for (const [cp, child] of activeLogStreams.entries()) {
      try {
        child.kill('SIGTERM');
      } catch {}
    }
    activeLogStreams.clear();
  }
}

function toggleMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>`;
  const icon = nativeImage.createFromBuffer(Buffer.from(svg));
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }
  return icon;
}

async function updateTrayMenu() {
  if (!tray) return;

  const storedProjects = store.getProjects();
  const menuItems = [
    {
      label: `Open-Easy 工作台 (${storedProjects.length} 个空间项目)`,
      enabled: false
    },
    { type: 'separator' }
  ];

  if (storedProjects.length === 0) {
    menuItems.push({
      label: '暂无项目 (点击打开工作台添加)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } else {
    let runtimeMap = {};
    try {
      const composePaths = storedProjects.map((p) => p.composePath);
      runtimeMap = await getBatchProjectsRuntimeStatus(composePaths);
    } catch {}

    storedProjects.forEach((p) => {
      const isRunning = runtimeMap[p.composePath]?.status === 'running';
      const statusIcon = isRunning ? '🟢' : '⚪';
      const pName = p.name || path.basename(path.dirname(p.composePath || ''));
      menuItems.push({
        label: `${statusIcon} ${pName}`,
        submenu: [
          {
            label: isRunning ? '重启该项目' : '启动该项目',
            click: async () => {
              try {
                await ensureOrbRunning();
                if (isRunning) {
                  await restartProject(p.composePath);
                } else {
                  await startProject(p.composePath);
                }
                updateTrayMenu();
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('projects:refreshed');
                }
              } catch (err) {
                console.error('Tray start/restart error:', err);
              }
            }
          },
          {
            label: '停止该项目',
            enabled: isRunning,
            click: async () => {
              try {
                await stopProject(p.composePath);
                updateTrayMenu();
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('projects:refreshed');
                }
              } catch (err) {
                console.error('Tray stop error:', err);
              }
            }
          },
          { type: 'separator' },
          {
            label: '在浏览器中打开',
            click: () => {
              const url = p.frontendUrl || `http://localhost:${p.frontendPort || 8080}`;
              shell.openExternal(url);
            }
          },
          {
            label: '在编辑器中打开',
            click: () => {
              const settings = store.getSettings();
              openInEditor(path.dirname(p.composePath), settings.preferredEditor);
            }
          },
          {
            label: '在终端中打开',
            click: () => {
              const settings = store.getSettings();
              openInTerminal(path.dirname(p.composePath), settings.preferredTerminal);
            }
          }
        ]
      });
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: '⚡ 一键休眠全部容器',
      click: async () => {
        try {
          const list = store.getProjects().map((p) => p.composePath);
          await sleepAllProjects(list);
          updateTrayMenu();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('projects:refreshed');
          }
        } catch (err) {
          console.error('Tray sleepAll error:', err);
        }
      }
    },
    {
      label: '🖥 显示主控制台',
      accelerator: 'CommandOrControl+Shift+O',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出 Open-Easy',
      accelerator: 'Command+Q',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
}

function setupTray() {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Open-Easy 空间工作台');
    tray.on('click', () => {
      toggleMainWindow();
    });
    updateTrayMenu();
  } catch (err) {
    console.warn('Failed to setup tray:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 620,
    minWidth: 780,
    minHeight: 540,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f6f4ee',
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

  // Support Cmd+R / Ctrl+R reload shortcut
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.meta || input.control) && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  // Hide window on close on macOS instead of terminating the app
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.env.VITE_DEV === 'true') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.show();
  mainWindow.focus();
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../build/icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        app.dock.setIcon(iconPath);
      } catch {}
    }
  }
  setupIpc();
  createWindow();
  setupTray();

  try {
    globalShortcut.register('CommandOrControl+Shift+O', () => {
      toggleMainWindow();
    });
  } catch (err) {
    console.warn('Failed to register global shortcut:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopLogStream();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

  // Query all deployed Compose projects directly from OrbStack
  ipcMain.handle('orb:getDeployedProjects', async () => {
    try {
      const deployed = await getOrbStackDeployedProjects();
      return { success: true, projects: deployed };
    } catch (err) {
      return { success: false, error: err.message, projects: [] };
    }
  });

  // Add project to workspace
  ipcMain.handle('projects:add', async (_, project) => {
    try {
      const added = store.addProject(project);
      updateTrayMenu();
      return { success: true, project: added };
    } catch (err) {
      console.error('IPC projects:add error:', err);
      return { success: false, error: err.message };
    }
  });

  // Track container states for abnormal exit detection and desktop notifications
  const lastKnownContainerStates = new Map();

  function trackAndNotifyCrashes(projectName, containers = []) {
    if (!Array.isArray(containers)) return;
    const settings = store.getSettings();
    if (settings.crashNotifications === false) return;

    for (const c of containers) {
      const key = `${projectName}:${c.name}`;
      const prev = lastKnownContainerStates.get(key);
      const currState = (c.state || '').toLowerCase();
      const currStatus = (c.status || '').toLowerCase();
      const isExited = currState === 'exited' || currStatus.includes('exited');

      if (prev && (prev === 'running' || prev.startsWith('up')) && isExited) {
        const match = currStatus.match(/exited\s*\(([1-9]\d*)\)/i);
        const isAbnormal = match || currStatus.includes('error') || currStatus.includes('failed');
        if (isAbnormal) {
          try {
            if (Notification.isSupported()) {
              new Notification({
                title: `⚠️ 容器异常退出: ${c.name}`,
                body: `项目 [${projectName}] 中的微服务容器 ${c.name} 异常终止 (${c.status || '退出码非0'})，请查看日志排查。`
              }).show();
            }
          } catch (e) {
            console.error('Notification error:', e);
          }
        }
      }
      lastKnownContainerStates.set(key, currState || currStatus);
    }
  }

  // Projects list with inspection & live status (Batch aggregated with Git info)
  ipcMain.handle('projects:list', async () => {
    const stored = store.getProjects();
    const composePaths = stored.map((p) => p.composePath);
    const [runtimeMap, gitInfos] = await Promise.all([
      getBatchProjectsRuntimeStatus(composePaths),
      Promise.all(stored.map((p) => getProjectGitInfo(p.composePath)))
    ]);

    return stored.map((p, idx) => {
      const inspected = inspectComposeFile(p.composePath);
      const runtime = runtimeMap[p.composePath] || { status: 'stopped', containers: [] };
      const git = gitInfos[idx] || { branch: '', dirty: false };

      trackAndNotifyCrashes(p.name, runtime.containers);

      return {
        ...p,
        tags: p.tags || [],
        tech: p.tech || inspected.tech,
        frontendPort: p.frontendPort || inspected.frontendPort || inspected.hostPorts[0] || 8080,
        frontendUrl: p.frontendUrl || inspected.defaultUrl,
        orbLocalUrl: inspected.orbLocalUrl || '',
        orbProjectName: inspected.orbProjectName || '',
        hostPorts: inspected.hostPorts || [],
        services: inspected.serviceNames,
        parsedServices: inspected.parsedServices || [],
        databases: inspected.databases || [],
        containers: runtime.containers || [],
        status: runtime.status || 'stopped',
        gitBranch: git.branch,
        gitDirty: git.dirty
      };
    });
  });

  // Start project with auto-healing and healthcheck browser launch
  ipcMain.handle('project:start', async (_, { id, composePath, targetUrl }) => {
    try {
      const settings = store.getSettings();

      // 1. Silent auto-healing if OrbStack is down and setting allows
      let orbRes = { autoStarted: false };
      if (settings.autoHealOrbStack !== false) {
        orbRes = await ensureOrbRunning();
      }

      // 2. Start Compose containers
      await startProject(composePath);

      // 3. Healthcheck probe
      const health = await waitForReady(targetUrl, 25000);

      // 4. Auto-launch browser if probe succeeded and user setting allows
      if (health.ready && settings.autoLaunchBrowser !== false) {
        await shell.openExternal(targetUrl);
      }

      updateTrayMenu();

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
      updateTrayMenu();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:restart', async (_, { composePath }) => {
    try {
      await restartProject(composePath);
      updateTrayMenu();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:rebuild', async (_, { composePath }) => {
    try {
      await rebuildProject(composePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:pull', async (_, { composePath }) => {
    try {
      await pullProject(composePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:resetVolumes', async (_, { composePath }) => {
    try {
      await resetProjectVolumes(composePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:ping', async (_, targetUrl) => {
    return await pingRoute(targetUrl);
  });

  ipcMain.handle('workspace:export', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出 Open-Easy 工作台配置',
        defaultPath: 'open-easy-workspace.json',
        filters: [{ name: 'JSON 配置文件', extensions: ['json'] }]
      });
      if (canceled || !filePath) return { canceled: true };
      const content = store.exportConfig();
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('workspace:import', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '导入 Open-Easy 工作台配置',
        properties: ['openFile'],
        filters: [{ name: 'JSON 配置文件', extensions: ['json'] }]
      });
      if (canceled || filePaths.length === 0) return { canceled: true };
      const content = fs.readFileSync(filePaths[0], 'utf8');
      const res = store.importConfig(content);
      return { success: true, count: res.count };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('window:setTheme', async (_, theme) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(theme === 'dark' ? '#121214' : '#f6f4ee');
    }
    return { success: true };
  });

  ipcMain.handle('project:logs', async (_, { composePath, tail, serviceName }) => {
    return await getProjectLogs(composePath, tail, serviceName);
  });

  ipcMain.handle('project:getEnv', async (_, params) => {
    const composePath = typeof params === 'string' ? params : params?.composePath;
    const fileName = typeof params === 'object' ? params?.fileName : undefined;
    return await getProjectEnv(composePath, fileName);
  });

  ipcMain.handle('project:saveEnv', async (_, { composePath, content, fileName }) => {
    try {
      return await saveProjectEnv(composePath, content, fileName);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('database:openClient', async (_, uri) => {
    try {
      await shell.openExternal(uri);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Database Dump SQL Backup to ~/Downloads/open-easy-dumps
  ipcMain.handle('db:dump', async (_, { composePath, serviceName, dbType, dbConfig }) => {
    try {
      const res = await dumpDatabase(composePath, serviceName, dbType, dbConfig);
      if (res.filePath) {
        shell.showItemInFolder(res.filePath);
      }
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Database Restore SQL Script
  ipcMain.handle('db:restore', async (_, { composePath, serviceName, dbType, dbConfig }) => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择要导入的 SQL 脚本文件',
        properties: ['openFile'],
        filters: [
          { name: 'SQL 文件 (*.sql)', extensions: ['sql'] },
          { name: '所有文件 (*.*)', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const sqlFilePath = result.filePaths[0];

      // Auto-wake database container if not currently running
      if (composePath) {
        const runtime = await getProjectRuntimeStatus(composePath);
        const container = runtime.containers?.find(
          (c) => c.service === serviceName || c.name?.includes(serviceName)
        );
        const isUp = container && container.state?.toLowerCase().includes('up');
        if (!isUp) {
          await startService(composePath, serviceName);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      const res = await restoreDatabase(composePath, serviceName, dbType, dbConfig, sqlFilePath);
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:stats', async (_, composePath) => {
    return await getProjectResourceUsage(composePath);
  });

  ipcMain.handle('terminal:execContainer', async (_, containerName) => {
    const settings = store.getSettings();
    const prefTerminal = settings.preferredTerminal || 'terminal';
    const prefShell = settings.preferredShell || 'sh';
    return await execInTerminal(containerName, prefShell, prefTerminal);
  });

  // Direct Interactive Database Shell CLI (psql, mysql, redis-cli, mongosh)
  ipcMain.handle('terminal:execDbShell', async (_, { composePath, serviceName, containerName, dbInfo }) => {
    try {
      const settings = store.getSettings();
      const prefTerminal = settings.preferredTerminal || 'terminal';
      let targetContainer = containerName || serviceName;

      // Auto-wake if composePath is provided and container is not running
      if (composePath && serviceName) {
        const runtime = await getProjectRuntimeStatus(composePath);
        const container = runtime.containers?.find(
          (c) => c.service === serviceName || c.name?.includes(serviceName)
        );
        const isUp = container && container.state?.toLowerCase().includes('up');

        if (!isUp) {
          await startService(composePath, serviceName);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const updatedRuntime = await getProjectRuntimeStatus(composePath);
        const updatedContainer = updatedRuntime.containers?.find(
          (c) => c.service === serviceName || c.name?.includes(serviceName)
        );
        if (updatedContainer?.name) {
          targetContainer = updatedContainer.name;
        }
      }

      return await execDbShellInTerminal(targetContainer, dbInfo, prefTerminal);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });


  ipcMain.handle('project:updateConfig', async (_, { id, updates }) => {
    return store.updateProject(id, updates);
  });

  // Pick custom icon image from disk and convert to Base64 Data URL
  ipcMain.handle('project:pickIcon', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择自定义项目图标图片',
        properties: ['openFile'],
        filters: [
          { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico', 'bmp', 'avif'] },
          { name: '所有文件 (*.*)', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      let mime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.ico') mime = 'image/x-icon';
      else if (ext === '.bmp') mime = 'image/bmp';
      else if (ext === '.avif') mime = 'image/avif';

      const fileBuffer = fs.readFileSync(filePath);
      // Cap at 20MB for initial read; renderer compresses to ~50KB
      if (fileBuffer.length > 20 * 1024 * 1024) {
        return { error: '所选图片大小超过 20MB，请选择较小的图片' };
      }

      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;

      return {
        canceled: false,
        dataUrl,
        filePath,
        fileName: path.basename(filePath),
        fileSize: fileBuffer.length
      };
    } catch (err) {
      return { error: err.message };
    }
  });

  // Project Import Path Helper for both Dialog and Drag-and-Drop
  async function importPathHelper(chosenPath) {
    if (!chosenPath || typeof chosenPath !== 'string') {
      return { error: '无效的文件或文件夹路径' };
    }
    let composePath = chosenPath;

    try {
      if (!fs.existsSync(chosenPath)) {
        return { error: '指定的文件或目录不存在' };
      }

      if (fs.statSync(chosenPath).isDirectory()) {
        const candidates = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
        let found = null;
        for (const c of candidates) {
          const p = path.join(chosenPath, c);
          if (fs.existsSync(p)) {
            found = p;
            break;
          }
        }
        if (!found) {
          return { error: '所选目录下未找到 docker-compose.yml 文件' };
        }
        composePath = found;
      } else if (!composePath.endsWith('.yml') && !composePath.endsWith('.yaml')) {
        return { error: '请选择或拖入有效的 docker-compose.yml 配置文件或项目目录' };
      }

      const folderName = path.basename(path.dirname(composePath));
      const inspected = inspectComposeFile(composePath);
      const id = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '_' + Date.now().toString(36);

      const newProject = {
        id,
        name: inspected.orbProjectName || folderName,
        composePath,
        tech: inspected.tech || 'Node.js',
        frontendPort: inspected.frontendPort || inspected.hostPorts[0] || 8080,
        frontendUrl: inspected.defaultUrl || `http://localhost:${inspected.frontendPort || 8080}`,
        description: `本地导入项目 (${inspected.tech || 'Node.js'})`,
        tags: [],
        pinned: false
      };

      store.addProject(newProject);
      updateTrayMenu();
      return { success: true, project: newProject };
    } catch (err) {
      return { error: err.message };
    }
  }

  // Native File Dialog Import Project
  ipcMain.handle('projects:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择本地 Docker Compose 项目目录或文件',
      properties: ['openDirectory', 'openFile'],
      filters: [
        { name: 'Docker Compose', extensions: ['yml', 'yaml'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return await importPathHelper(result.filePaths[0]);
  });

  // Direct Path Drag & Drop Import
  ipcMain.handle('projects:importPath', async (_, inputPath) => {
    return await importPathHelper(inputPath);
  });

  // Remove Project from Workspace
  ipcMain.handle('project:remove', async (_, id) => {
    store.removeProject(id);
    updateTrayMenu();
    return { success: true };
  });

  // Sleep all running containers
  ipcMain.handle('projects:sleepAll', async () => {
    const list = store.getProjects().map((p) => p.composePath);
    const res = await sleepAllProjects(list);
    updateTrayMenu();
    return res;
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
    const prefEditor = editor || store.getSettings().preferredEditor || 'code';
    return await openInEditor(projectDir, prefEditor);
  });

  ipcMain.handle('terminal:open', async (_, { projectPath, terminal } = {}) => {
    const targetPath = typeof projectPath === 'string' ? projectPath : '';
    const projectDir = path.dirname(targetPath);
    const prefTerminal = terminal || store.getSettings().preferredTerminal || 'terminal';
    return await openInTerminal(projectDir, prefTerminal);
  });

  ipcMain.handle('finder:show', async (_, projectPath) => {
    const projectDir = path.dirname(projectPath);
    return await showInFinder(projectDir);
  });

  // Microservice Individual Controls
  ipcMain.handle('service:start', async (_, { composePath, serviceName }) => {
    try {
      const res = await startService(composePath, serviceName);
      updateTrayMenu();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('service:stop', async (_, { composePath, serviceName }) => {
    try {
      const res = await stopService(composePath, serviceName);
      updateTrayMenu();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('service:restart', async (_, { composePath, serviceName }) => {
    try {
      const res = await restartService(composePath, serviceName);
      updateTrayMenu();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('service:startMiddleware', async (_, { composePath, middlewareNames }) => {
    try {
      const res = await startMiddlewareServices(composePath, middlewareNames);
      updateTrayMenu();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Streaming Real-time Logs via IPC
  ipcMain.handle('project:startLogStream', async (_, { composePath, tail = 120, serviceName = '' }) => {
    stopLogStream(composePath);
    if (!composePath || !fs.existsSync(composePath)) {
      return { success: false, error: '未找到 docker-compose.yml 配置文件' };
    }

    const dir = path.dirname(composePath);
    const args = ['compose', '-f', composePath, 'logs', '-f', '--tail', String(tail)];
    const cleanSvc = (serviceName || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (cleanSvc) {
      args.push(cleanSvc);
    }

    try {
      const child = spawn('docker', args, {
        cwd: dir,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`
        }
      });

      activeLogStreams.set(composePath, child);

      child.stdout.on('data', (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project:logStreamData', {
            composePath,
            text: chunk.toString()
          });
        }
      });

      child.stderr.on('data', (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project:logStreamData', {
            composePath,
            text: chunk.toString()
          });
        }
      });

      child.on('close', () => {
        if (activeLogStreams.get(composePath) === child) {
          activeLogStreams.delete(composePath);
        }
      });

      child.on('error', (err) => {
        console.error('Log stream error:', err);
        if (activeLogStreams.get(composePath) === child) {
          activeLogStreams.delete(composePath);
        }
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:stopLogStream', async (_, { composePath } = {}) => {
    stopLogStream(composePath);
    return { success: true };
  });

  // Settings & Preferences
  ipcMain.handle('settings:get', async () => {
    return store.getSettings();
  });

  ipcMain.handle('settings:update', async (_, updates) => {
    return store.updateSettings(updates);
  });

  ipcMain.handle('settings:openConfigFolder', async () => {
    try {
      const configPath = store.filePath;
      if (fs.existsSync(configPath)) {
        shell.showItemInFolder(configPath);
        return { success: true, path: configPath };
      }
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await shell.openPath(dir);
      return { success: true, path: dir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Project Tags
  ipcMain.handle('project:updateTags', async (_, { id, tags }) => {
    return store.updateProjectTags(id, tags);
  });

  // Port Diagnostics
  ipcMain.handle('port:check', async (_, port) => {
    return await checkPortConflict(port);
  });

  ipcMain.handle('ports:checkConflicts', async (_, portsArray) => {
    return await checkPortsConflict(portsArray);
  });

  ipcMain.handle('port:kill', async (_, target) => {
    return await killProcess(target);
  });

  ipcMain.handle('ports:listAll', async () => {
    try {
      const stored = store.getProjects();
      const composePaths = stored.map((p) => p.composePath);
      const runtimeMap = await getBatchProjectsRuntimeStatus(composePaths);
      const projectsWithStatus = stored.map((p) => {
        const inspected = inspectComposeFile(p.composePath);
        const runtime = runtimeMap[p.composePath] || { status: 'stopped' };
        return {
          ...p,
          status: runtime.status || 'stopped',
          hostPorts: inspected.hostPorts || (p.frontendPort ? [p.frontendPort] : []),
          frontendPort: p.frontendPort || inspected.frontendPort,
          parsedServices: inspected.parsedServices || []
        };
      });
      return await listAllOccupiedPorts(projectsWithStatus);
    } catch (err) {
      console.error('IPC ports:listAll error:', err);
      return [];
    }
  });
}
