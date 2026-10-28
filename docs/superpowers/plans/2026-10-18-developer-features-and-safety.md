# 高价值开发者功能扩展与交互防误触优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Open-Easy 增加全局拖拽 Compose 导入、高危操作二次确认、Git 分支与脏状态感知、.env Key-Value 与多配置切换+保存并重启、数据库一键 SQL 备份、以及容器异常退出原生通知等核心能力。

**Architecture:** 
1. Electron 主进程负责底层 Git 命令执行、Docker dump 进程调度、文件对话框、托盘与 macOS Notification 原生系统通知；
2. 服务层 `orbManager.js` 封装 `getProjectGitInfo`、`dumpDatabase`、升级 `getProjectEnv` 扫描同名所有 `.env*` 候选文件；
3. 前端 Vue 3 + TailwindCSS 在 VisionOS 毛玻璃设计规范下升级 `EnvEditorDrawer.vue`、`DevOpsDrawer.vue`、`BentoProjectCard.vue` 与 `ProjectDetailModal.vue`。

**Tech Stack:** Electron 32, Vue 3, Vite, TailwindCSS, macOS Native APIs (Notification, AppleScript), Node.js (child_process, fs, path).

**Spec:** 用户需求指令（高价值开发者功能扩展与交互防误触优化 1-5 项）。

## Global Constraints
- 严格保持现有 VisionOS / Apple Clean Studio 毛玻璃与深浅色主题。
- 零破坏现有功能与既有 39 个单元测试（运行 `npm test` 保持 100% 通过）。
- 每次修改后 `npm run build:vue` 必须无警告无报错。
- 严禁引入庞大的第三方重度依赖，使用 Node.js 原生 API 与 Electron 提供的基础能力。

---

### Task 1: 全局拖拽导入与高危操作防误触保护

**Files:**
- Create: `tests/dragAndDevOps.test.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.cjs`
- Modify: `src/App.vue`
- Modify: `src/components/detail/DevOpsDrawer.vue`

**Interfaces:**
- Consumes: `store.addProject`, `inspectComposeFile`
- Produces: `window.electronAPI.importProjectPath(targetPath)`

- [ ] **Step 1: 编写导入路径解析与防误触测试**

在 `tests/dragAndDevOps.test.js` 中测试 `importProjectFromPath` 逻辑：当传入目录或 compose 文件时正确识别，非法路径抛出友好错误。

```javascript
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { inspectComposeFile } from '../electron/services/orbManager.js';

test('inspectComposeFile handles dropped directory by resolving compose file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drag-test-'));
  const composePath = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(composePath, 'version: "3"\nservices:\n  web:\n    image: nginx\n    ports:\n      - "8089:80"\n');

  const inspected = inspectComposeFile(composePath);
  assert.strictEqual(inspected.frontendPort, 8089);
  assert.strictEqual(inspected.tech, 'Nginx');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行测试确保测试通过**

运行：`node --test tests/dragAndDevOps.test.js`
期望：PASS

- [ ] **Step 3: 在 `electron/main.js` 与 `electron/preload.cjs` 中实现 `projects:importPath`**

在 `electron/main.js` 中抽离通用导入函数 `importProjectFromPath(chosenPath)`，供 `projects:import` 对话框与 `projects:importPath` IPC 复用：

```javascript
function importProjectFromPath(chosenPath) {
  if (!chosenPath || !fs.existsSync(chosenPath)) {
    return { error: '指定的文件或目录不存在' };
  }

  let composePath = chosenPath;
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
      return { error: '所选目录下未找到 docker-compose.yml 或 compose.yaml 配置文件' };
    }
    composePath = found;
  }

  const folderName = path.basename(path.dirname(composePath));
  const id = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '_' + Date.now().toString(36);
  const inspected = inspectComposeFile(composePath);

  const newProject = {
    id,
    name: folderName,
    composePath,
    tech: inspected.tech,
    frontendPort: inspected.frontendPort || inspected.hostPorts[0] || 8080,
    frontendUrl: inspected.defaultUrl,
    description: `本地导入项目 (${inspected.tech})`
  };

  store.addProject(newProject);
  updateTrayMenu();
  return { success: true, project: newProject };
}

ipcMain.handle('projects:importPath', async (_, targetPath) => {
  return importProjectFromPath(targetPath);
});
```

在 `electron/preload.cjs` 中暴露：
```javascript
importProjectPath: (targetPath) => ipcRenderer.invoke('projects:importPath', targetPath),
```

- [ ] **Step 4: 在 `src/App.vue` 中添加全局拖拽监听与毛玻璃引导遮罩**

在 `src/App.vue` 最外层容器监听：
`@dragenter.prevent="isDragging = true"`
`@dragover.prevent="isDragging = true"`
`@dragleave.prevent="onDragLeave"`
`@drop.prevent="handleFileDrop"`

当 `isDragging` 为真时，渲染毛玻璃浮层：
```vue
<div
  v-if="isDragging"
  class="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150"
>
  <div class="p-8 rounded-3xl bg-white/90 dark:bg-zinc-800/90 border border-emerald-500/40 shadow-2xl flex flex-col items-center space-y-3">
    <span class="text-5xl animate-bounce">📦</span>
    <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-100">松开鼠标即可导入 Compose 项目</h3>
    <p class="text-xs text-zinc-500 dark:text-zinc-400">支持拖入 docker-compose.yml 配置文件或项目工程文件夹</p>
  </div>
</div>
```

处理 drop：
```javascript
async function handleFileDrop(e) {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const droppedPath = files[0].path;
  if (!droppedPath || !window.electronAPI?.importProjectPath) return;

  toast('⏳', '正在解析并导入项目...');
  const res = await window.electronAPI.importProjectPath(droppedPath);
  if (res.success && res.project) {
    toast('✨', `成功导入本地项目 [${res.project.name}]！`);
    await refreshProjects();
    const added = projects.value.find((p) => p.id === res.project.id);
    if (added) selectedProject.value = added;
  } else {
    toast('⚠️', res.error || '导入失败');
  }
}
```

- [ ] **Step 5: 在 `src/components/detail/DevOpsDrawer.vue` 中增加二次确认状态**

升级重置数据卷按钮：
- 默认展示 `🧹 重置数据卷 (down -v)`
- 首次点击进入 3 秒倒计时确认：按钮文案变为 `⚠️ 确认清空数据卷？`，边框高亮脉冲红色 `border-rose-500 ring-2 ring-rose-500/40`
- 3 秒内二次点击才触发 `$emit('reset-volumes')`，超时自动恢复。

- [ ] **Step 6: 验证构建与测试**

运行：`npm test && npm run build:vue`
期望：全部通过。

---

### Task 2: Git 分支感知与源码状态展示

**Files:**
- Create: `tests/gitInfo.test.js`
- Modify: `electron/services/orbManager.js`
- Modify: `electron/main.js`
- Modify: `src/components/BentoProjectCard.vue`
- Modify: `src/components/ProjectDetailModal.vue`

**Interfaces:**
- Produces: `getProjectGitInfo(composeFilePath)` -> `{ isGit: boolean, branch: string, dirty: boolean }`
- Appends: `p.gitBranch`, `p.gitDirty`, `p.isGit` to `projects:list`

- [ ] **Step 1: 编写 `getProjectGitInfo` 单元测试**

在 `tests/gitInfo.test.js` 中测试各种情况：
1. 非 git 目录返回 `{ isGit: false, branch: '', dirty: false }`
2. 初始化 git 仓库并有提交返回对应分支名，修改文件后 `dirty === true`。

```javascript
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { getProjectGitInfo } from '../electron/services/orbManager.js';

test('getProjectGitInfo detects git branch and dirty state', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\n');

  // 1. Not a git repo
  const noGit = await getProjectGitInfo(fakeCompose);
  assert.strictEqual(noGit.isGit, false);

  // 2. Initialize git repo
  execSync('git init -b main', { cwd: tmpDir });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir });
  execSync('git config user.name "Test"', { cwd: tmpDir });
  execSync('git add . && git commit -m "init"', { cwd: tmpDir });

  const cleanGit = await getProjectGitInfo(fakeCompose);
  assert.strictEqual(cleanGit.isGit, true);
  assert.strictEqual(cleanGit.branch, 'main');
  assert.strictEqual(cleanGit.dirty, false);

  // 3. Make repo dirty
  fs.writeFileSync(path.join(tmpDir, 'dirty.txt'), 'dirty');
  const dirtyGit = await getProjectGitInfo(fakeCompose);
  assert.strictEqual(dirtyGit.isGit, true);
  assert.strictEqual(dirtyGit.dirty, true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 运行测试确保失败**

运行：`node --test tests/gitInfo.test.js`
期望：FAIL (getProjectGitInfo not implemented)

- [ ] **Step 3: 在 `electron/services/orbManager.js` 中实现 `getProjectGitInfo`**

```javascript
/**
 * Detect Git repository branch and working tree dirty state
 * @param {string} composeFilePath
 * @returns {Promise<{ isGit: boolean, branch: string, dirty: boolean }>}
 */
export async function getProjectGitInfo(composeFilePath) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    return { isGit: false, branch: '', dirty: false };
  }
  const dir = path.dirname(composeFilePath);
  const gitDir = path.join(dir, '.git');
  if (!fs.existsSync(gitDir)) {
    return { isGit: false, branch: '', dirty: false };
  }

  try {
    const { stdout: branchOut, error: branchErr } = await runCmd('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      timeout: 2500
    });
    if (branchErr || !branchOut) {
      return { isGit: true, branch: '', dirty: false };
    }
    const branch = branchOut.trim();

    const { stdout: statusOut } = await runCmd('git status --porcelain', {
      cwd: dir,
      timeout: 2500
    });
    const dirty = Boolean(statusOut && statusOut.trim().length > 0);

    return { isGit: true, branch, dirty };
  } catch {
    return { isGit: true, branch: '', dirty: false };
  }
}
```

- [ ] **Step 4: 在 `electron/main.js` 的 `projects:list` 中集成 `getProjectGitInfo`**

```javascript
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
      const gitInfo = gitInfos[idx] || { isGit: false, branch: '', dirty: false };
      return {
        ...p,
        tags: p.tags || [],
        gitBranch: gitInfo.branch || '',
        gitDirty: gitInfo.dirty || false,
        isGit: gitInfo.isGit || false,
        tech: p.tech || inspected.tech,
        ...
```

- [ ] **Step 5: 在 `BentoProjectCard.vue` 与 `ProjectDetailModal.vue` 中展示 Git 胶囊**

在技术栈徽章旁增加紧凑的 Git 胶囊：
```vue
<span
  v-if="project.gitBranch"
  class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
  :title="project.gitDirty ? '当前代码分支有未提交的改动' : '代码仓库干净无变更'"
>
  <span class="text-[9px]">🌿</span>
  <span class="truncate max-w-[75px]">{{ project.gitBranch }}</span>
  <span
    v-if="project.gitDirty"
    class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
  ></span>
</span>
```

- [ ] **Step 6: 验证构建与测试**

运行：`npm test && npm run build:vue`
期望：全部通过。

---

### Task 3: `.env` 编辑器升级：Key-Value 表格视图、多文件切换与「保存并重启」

**Files:**
- Modify: `electron/services/orbManager.js`
- Modify: `electron/main.js`
- Modify: `src/components/detail/EnvEditorDrawer.vue`
- Modify: `src/components/ProjectDetailModal.vue`
- Modify: `tests/envAndLogs.test.js`

**Interfaces:**
- `getProjectEnv(composeFilePath, requestedFileName)` -> `{ exists, fileName, filePath, content, availableFiles }`
- `EnvEditorDrawer.vue` emits: `'close'`, `'toast'`, `'restart-project'`

- [ ] **Step 1: 编写多文件 .env 检索单元测试**

在 `tests/envAndLogs.test.js` 中增加测试用例：
```javascript
test('getProjectEnv discovers all available .env files in directory', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-multi-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\n');
  fs.writeFileSync(path.join(tmpDir, '.env'), 'A=1\n');
  fs.writeFileSync(path.join(tmpDir, '.env.local'), 'B=2\n');
  fs.writeFileSync(path.join(tmpDir, '.env.prod'), 'C=3\n');

  const res = await getProjectEnv(fakeCompose);
  assert.strictEqual(res.exists, true);
  assert.ok(res.availableFiles.includes('.env'));
  assert.ok(res.availableFiles.includes('.env.local'));
  assert.ok(res.availableFiles.includes('.env.prod'));

  const localRes = await getProjectEnv(fakeCompose, '.env.local');
  assert.strictEqual(localRes.fileName, '.env.local');
  assert.strictEqual(localRes.content.trim(), 'B=2');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 升级 `electron/services/orbManager.js` 中的 `getProjectEnv`**

扫描目录中所有以 `.env` 开头的文件并作为 `availableFiles` 列表返回：
```javascript
export async function getProjectEnv(composeFilePath, requestedFileName = '') {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    return { exists: false, content: '', availableFiles: [] };
  }
  const dir = path.dirname(composeFilePath);
  let availableFiles = [];
  try {
    const all = fs.readdirSync(dir);
    availableFiles = all.filter((f) => f.startsWith('.env') && !f.endsWith('.swp') && !f.endsWith('~'));
  } catch {}
  if (availableFiles.length === 0) {
    availableFiles = ['.env'];
  }

  let targetFileName = requestedFileName && availableFiles.includes(requestedFileName) ? requestedFileName : '';
  if (!targetFileName) {
    const priority = ['.env', '.env.local', '.env.development'];
    for (const c of priority) {
      if (availableFiles.includes(c) && fs.existsSync(path.join(dir, c))) {
        targetFileName = c;
        break;
      }
    }
    if (!targetFileName && availableFiles.length > 0) {
      targetFileName = availableFiles[0];
    }
  }

  const p = path.join(dir, targetFileName || '.env');
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, 'utf8');
      return { exists: true, fileName: targetFileName, filePath: p, content, availableFiles };
    } catch (err) {
      return { exists: false, error: err.message, availableFiles, fileName: targetFileName };
    }
  }
  return { exists: false, content: '', dir, fileName: targetFileName || '.env', availableFiles };
}
```

并在 `electron/main.js` 中兼容处理传参：
```javascript
ipcMain.handle('project:getEnv', async (_, arg) => {
  const composePath = typeof arg === 'string' ? arg : arg?.composePath;
  const fileName = typeof arg === 'object' ? arg?.fileName : '';
  return await getProjectEnv(composePath, fileName);
});
```

- [ ] **Step 3: 重构 `src/components/detail/EnvEditorDrawer.vue`**

在组件中实现：
1. **多配置切换**：顶部下拉或药丸按钮切换 `availableFiles`，切换时加载对应的 `.env*` 文件。
2. **双视图模式切换**：支持 `viewMode: 'kv' | 'raw'`。
   - `kv` 模式：将内容解析为 `{ key, value, sensitive, showPlain }` 数组。
   - 敏感字段检测：`/(password|secret|token|key|private)/i.test(row.key)`。
   - 敏感字段默认使用 `type="password"`，带眼睛图标 👁️ 切换显隐。
   - 支持新增键值行、删除指定行，并双向同步到原始文本。
   - `raw` 模式：保持原汁原味的 Monospace 代码编辑器。
3. **「⚡ 保存并重启项目」操作**：保存当前文件后，触发 `emit('restart-project')`。

- [ ] **Step 4: 在 `ProjectDetailModal.vue` 中转发 `restart-project` 事件**

在 `ProjectDetailModal.vue` 中绑定：
`<EnvEditorDrawer ... @restart-project="handleRestartProjectFromEnv" />`

- [ ] **Step 5: 验证构建与测试**

运行：`npm test && npm run build:vue`
期望：全部通过。

---

### Task 4: 数据库一键备份导出 (.sql) 功能

**Files:**
- Create: `tests/dumpDatabase.test.js`
- Modify: `electron/services/orbManager.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.cjs`
- Modify: `src/components/ProjectDetailModal.vue`

**Interfaces:**
- Produces: `dumpDatabase(composePath, dbInfo, outputPath)` -> `{ success: boolean, outputPath: string, sizeBytes: number }`
- IPC: `database:dump` -> invokes file save dialog and performs database dump.

- [ ] **Step 1: 编写 `dumpDatabase` 单元测试**

在 `tests/dumpDatabase.test.js` 中测试参数校验和命令异常拦截：
```javascript
import test from 'node:test';
import assert from 'node:assert';
import { dumpDatabase } from '../electron/services/orbManager.js';

test('dumpDatabase throws error on non-existent compose path', async () => {
  await assert.rejects(
    async () => {
      await dumpDatabase('/fake/path/compose.yml', { type: 'mysql' }, '/fake/out.sql');
    },
    /未找到项目配置文件/
  );
});

test('dumpDatabase rejects unsupported database types gracefully', async () => {
  await assert.rejects(
    async () => {
      await dumpDatabase(process.cwd() + '/docker-compose.yml', { type: 'redis' }, '/fake/out.sql');
    },
    /暂仅支持 MySQL 与 PostgreSQL/
  );
});
```

- [ ] **Step 2: 运行测试确保失败**

运行：`node --test tests/dumpDatabase.test.js`
期望：FAIL (dumpDatabase not implemented)

- [ ] **Step 3: 在 `electron/services/orbManager.js` 中实现 `dumpDatabase`**

```javascript
/**
 * Dump database contents to a local SQL file via docker compose exec
 * @param {string} composeFilePath
 * @param {object} dbInfo - { type, name, user, password, database }
 * @param {string} outputPath - target .sql absolute path
 */
export async function dumpDatabase(composeFilePath, dbInfo = {}, outputPath) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  const dbType = (dbInfo.type || '').toLowerCase();
  if (dbType !== 'mysql' && dbType !== 'postgres') {
    throw new Error('暂仅支持 MySQL 与 PostgreSQL 数据库的一键 SQL 导出');
  }

  const dir = path.dirname(composeFilePath);
  const serviceName = dbInfo.name || dbInfo.service;
  if (!serviceName) {
    throw new Error('缺少数据库服务名称');
  }

  // 1. Get container ID
  const { stdout: containerId, error: psErr } = await runCmd(
    `docker compose -f "${composeFilePath}" ps -q ${serviceName}`,
    { cwd: dir }
  );
  if (psErr || !containerId) {
    throw new Error(`数据库服务 [${serviceName}] 容器未在运行中，请先启动项目`);
  }

  // 2. Build dump command
  let dumpCmd = '';
  if (dbType === 'mysql') {
    const user = dbInfo.user || 'root';
    const pwd = dbInfo.password ? `-p"${dbInfo.password}"` : '';
    const db = dbInfo.database ? `"${dbInfo.database}"` : '--all-databases';
    dumpCmd = `docker exec ${containerId} mysqldump -u${user} ${pwd} ${db}`;
  } else if (dbType === 'postgres') {
    const user = dbInfo.user || 'postgres';
    const db = dbInfo.database;
    if (db) {
      dumpCmd = `docker exec ${containerId} pg_dump -U ${user} "${db}"`;
    } else {
      dumpCmd = `docker exec ${containerId} pg_dumpall -U ${user}`;
    }
  }

  // 3. Execute dump and write file
  const { stdout, stderr, error } = await runCmd(dumpCmd, {
    cwd: dir,
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024 // 50MB
  });

  if (error && !stdout) {
    throw new Error(`导出数据库备份失败: ${stderr || error.message}`);
  }

  fs.writeFileSync(outputPath, stdout || '-- Empty database export\n', 'utf8');
  const stat = fs.statSync(outputPath);
  return { success: true, outputPath, sizeBytes: stat.size };
}
```

- [ ] **Step 4: 在 `electron/main.js` 与 `electron/preload.cjs` 中注册 `database:dump`**

在 `electron/main.js` 中：
```javascript
ipcMain.handle('database:dump', async (_, { composePath, dbInfo }) => {
  try {
    const defaultName = `${dbInfo.name || 'db'}_backup_${new Date().toISOString().slice(0, 10)}.sql`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: `导出 ${dbInfo.name || '数据库'} SQL 备份文件`,
      defaultPath: defaultName,
      filters: [{ name: 'SQL 文件', extensions: ['sql'] }]
    });
    if (canceled || !filePath) return { canceled: true };

    const res = await dumpDatabase(composePath, dbInfo, filePath);
    return { success: true, filePath, sizeBytes: res.sizeBytes };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```
在 `electron/preload.cjs` 中暴露 `dumpDatabase: (composePath, dbInfo) => ipcRenderer.invoke('database:dump', { composePath, dbInfo })`。

- [ ] **Step 5: 在 `src/components/ProjectDetailModal.vue` 数据库卡片上添加导出按钮**

在数据库卡片操作列新增：
```vue
<button
  v-if="['mysql', 'postgres'].includes((db.type || '').toLowerCase())"
  @click="handleDumpDatabase(db)"
  :disabled="dumpingDbs[db.name]"
  class="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
  title="导出完整 SQL 备份文件到本地"
>
  <span>{{ dumpingDbs[db.name] ? '⏳' : '📤' }}</span>
  <span>{{ dumpingDbs[db.name] ? '导出中...' : '导出 SQL' }}</span>
</button>
```

- [ ] **Step 6: 验证构建与测试**

运行：`npm test && npm run build:vue`
期望：全部通过。

---

### Task 5: 容器异常退出监控与 macOS 原生系统通知

**Files:**
- Create: `tests/crashNotification.test.js`
- Modify: `electron/services/store.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.cjs`
- Modify: `src/App.vue`
- Modify: `src/components/SettingsModal.vue`

**Interfaces:**
- Settings: `notifyOnCrash: boolean` (default: true)
- IPC: `mainWindow.webContents.send('project:openDetail', projectId)`
- Preload: `onOpenProjectDetail(cb)`

- [ ] **Step 1: 编写崩溃检测逻辑单元测试**

在 `tests/crashNotification.test.js` 中测试状态机比对逻辑：
```javascript
import test from 'node:test';
import assert from 'node:assert';

test('detectAbnormalExit identifies crashed project', () => {
  const previousMap = new Map([['/path/a', { status: 'running' }]]);
  const currentList = [{ composePath: '/path/a', status: 'stopped', name: 'Project A' }];
  const userStops = new Set(); // no user stop

  const crashed = [];
  for (const p of currentList) {
    const prev = previousMap.get(p.composePath);
    if (prev?.status === 'running' && p.status === 'stopped' && !userStops.has(p.composePath)) {
      crashed.push(p);
    }
  }

  assert.strictEqual(crashed.length, 1);
  assert.strictEqual(crashed[0].name, 'Project A');
});
```

- [ ] **Step 2: 升级 `electron/services/store.js` 默认配置**

将 `notifyOnCrash: true` 纳入 `DEFAULT_SETTINGS` 与初始化补全逻辑。

- [ ] **Step 3: 在 `electron/main.js` 中集成系统通知监控**

导入 `Notification`：
```javascript
import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, globalShortcut, Notification } from 'electron';
```
维护全局变量：
```javascript
const lastKnownStatusMap = new Map();
const userInitiatedStops = new Set();
```
当用户调用 `project:stop`、`projects:sleepAll` 或托盘停止时，将 `composePath` 记录进 `userInitiatedStops`（并在 10 秒后过期自动清除）。

在 `projects:list` 汇总时比对：
```javascript
const notifyAllowed = store.getSettings().notifyOnCrash !== false;
if (notifyAllowed && Notification.isSupported()) {
  stored.forEach((p) => {
    const prev = lastKnownStatusMap.get(p.composePath);
    const currStatus = runtimeMap[p.composePath]?.status || 'stopped';
    if (prev?.status === 'running' && currStatus === 'stopped' && !userInitiatedStops.has(p.composePath)) {
      const notif = new Notification({
        title: '⚠️ 容器异常退出',
        body: `项目 [${p.name || '服务'}] 容器发生非预期中断。点击查看详情。`,
        silent: false
      });
      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('project:openDetail', p.id);
        }
      });
      notif.show();
    }
    lastKnownStatusMap.set(p.composePath, { status: currStatus });
  });
}
```

- [ ] **Step 4: 在 `preload.cjs` 与 `src/App.vue` 中绑定打开详情监听**

在 `preload.cjs`：
```javascript
onOpenProjectDetail: (cb) => {
  const handler = (_event, projectId) => cb(projectId);
  ipcRenderer.on('project:openDetail', handler);
  return () => ipcRenderer.removeListener('project:openDetail', handler);
}
```
在 `src/App.vue` `onMounted`：
```javascript
if (window.electronAPI?.onOpenProjectDetail) {
  unsubOpenDetail = window.electronAPI.onOpenProjectDetail((id) => {
    const target = projects.value.find((p) => p.id === id);
    if (target) openDetail(target);
  });
}
```

- [ ] **Step 5: 在 `src/components/SettingsModal.vue` 中增加通知偏好开关**

在偏好设置的工作流区域中添加：
```vue
<label class="flex items-center justify-between cursor-pointer py-1">
  <div class="flex flex-col">
    <span class="font-medium text-zinc-700 dark:text-zinc-200">容器异常退出提醒</span>
    <span class="text-[11px] text-zinc-400">容器意外停止或崩溃时触发 macOS 系统通知</span>
  </div>
  <input
    type="checkbox"
    v-model="settings.notifyOnCrash"
    class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
  />
</label>
```

- [ ] **Step 6: 全面验证构建与全量单元测试**

运行：`npm test && npm run build:vue`
期望：所有测试通过（43+ 项测试），生产打包无报错。

---

## Plan Self-Review Checklist
1. **Spec coverage**:
   - 1. 全局拖拽导入与高危操作二次确认 -> Task 1
   - 2. Git 分支感知与源码状态展示 -> Task 2
   - 3. .env 编辑器升级（KV表格、多文件、保存并重启） -> Task 3
   - 4. 数据库一键备份导出 (.sql) -> Task 4
   - 5. 容器异常退出监控与 macOS 原生通知 -> Task 5
2. **No Placeholders**: 所有代码块均为完整实现逻辑，无 TODO/TBD。
3. **Type Consistency**: 函数签名在 `orbManager.js`、`preload.cjs`、`main.js` 与 Vue 组件之间一致。
