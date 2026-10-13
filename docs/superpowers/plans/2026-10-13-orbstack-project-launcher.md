# Open-Easy (OrbStack 项目一键启动与浏览器联动工具) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 macOS 桌面与状态栏应用（Open-Easy），能自动感知本地 OrbStack 中的 Docker Compose 项目，支持一键后台启动容器，智能探活前端端口就绪后自动拉起系统浏览器进入页面。

**Architecture:** Electron 32+ 作为桌面宿主，主进程（Node.js）负责与 `docker`/`orb` CLI 通信、端口解析与 HTTP 探活轮询；渲染进程采用 Vite + Vue 3 + Tailwind CSS 构建现代化原生质感面板；通过预加载层 ContextBridge 暴露类型安全的 IPC 接口。

**Tech Stack:** Electron, Node.js child_process, Vite, Vue 3, Tailwind CSS, Lucide Icons, electron-store.

**Spec:** [docs/superpowers/specs/2026-10-13-orbstack-project-launcher-design.md](file:///Users/liyuteng/Documents/open-easy/docs/superpowers/specs/2026-10-13-orbstack-project-launcher-design.md)

## Global Constraints
- 平台限定：macOS (Darwin arm64/x64)，优先适配 OrbStack CLI 环境与 Docker Compose。
- 开发语言与环境：Node.js v20.x，无 Rust/Cargo 本地编译依赖。
- 零破坏性原则：仅通过标准 `docker compose up -d` / `stop` / `ls` 交互，不修改用户的原始代码及 `docker-compose.yml`。

---

## 任务分解 (Tasks)

### Task 1: 项目工程脚手架与依赖初始化
**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Test: `npm run dev` / `node -e "require('electron')"`

**Interfaces:**
- Produces: 启动脚本 `npm run dev`（同时拉起 Vite 开发服务器与 Electron 窗口）

- [ ] **Step 1: 创建 package.json 并配置依赖**
  配置 electron, vite, vue, @vitejs/plugin-vue, tailwindcss, postcss, autoprefixer, lucide-vue-next, concurrently, wait-on。
- [ ] **Step 2: 安装依赖并验证安装成功**
  运行 `npm install`。
- [ ] **Step 3: 配置 vite.config.js 与 Tailwind 预处理**
  配置 root、base 与构建输出目录。
- [ ] **Step 4: 提交脚手架代码**
  ```bash
  git add package.json vite.config.js tailwind.config.js postcss.config.js package-lock.json
  git commit -m "chore: scaffold electron vite vue3 project"
  ```

---

### Task 2: 核心服务 OrbManager (项目自动发现与生命周期编排)
**Files:**
- Create: `electron/services/orbManager.js`
- Test: `tests/orbManager.test.js`

**Interfaces:**
- Produces:
  - `checkOrbStatus(): Promise<{ running: boolean, version?: string }>`
  - `listProjects(): Promise<Array<ProjectInfo>>`
  - `startProject(composeFilePath: string): Promise<{ success: boolean, output: string }>`
  - `stopProject(composeFilePath: string): Promise<{ success: boolean }>`

- [ ] **Step 1: 编写测试用例 `tests/orbManager.test.js`**
  验证读取现有的 `hometown_vue`、`2025-blog-public`、`web-ai-project02` 的解析正确性。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/orbManager.test.js` (预期模块不存在)。
- [ ] **Step 3: 实现 `electron/services/orbManager.js`**
  调用 `docker compose ls --format json` 与 `docker compose ps --format json`，实现服务启发式端口推导算法。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/orbManager.test.js` 验证成功识别到本机全部已有容器与前端端口。
- [ ] **Step 5: 提交代码**
  ```bash
  git add electron/services/orbManager.js tests/orbManager.test.js
  git commit -m "feat(core): implement OrbManager for compose project discovery"
  ```

---

### Task 3: 智能就绪探活服务 (HealthChecker) 与系统浏览器联动
**Files:**
- Create: `electron/services/healthChecker.js`
- Test: `tests/healthChecker.test.js`

**Interfaces:**
- Produces:
  - `waitForReady(targetUrl: string, timeoutMs: number): Promise<{ ready: boolean, durationMs: number }>`
  - `openExternalBrowser(url: string): Promise<void>`

- [ ] **Step 1: 编写测试用例 `tests/healthChecker.test.js`**
  使用 Node 原生 `http.createServer` 模拟启动前超时与启动后 200 就绪响应。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/healthChecker.test.js`。
- [ ] **Step 3: 实现 `electron/services/healthChecker.js`**
  实现定时 500ms 重试探活，结合 HTTP GET 及 TCP connect fallback，就绪后调用 `shell.openExternal` 或 `child_process.execFile('open')`。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/healthChecker.test.js` PASS。
- [ ] **Step 5: 提交代码**
  ```bash
  git add electron/services/healthChecker.js tests/healthChecker.test.js
  git commit -m "feat(core): implement HealthChecker polling and browser opening"
  ```

---

### Task 4: 本地配置存储服务 (ConfigStore)
**Files:**
- Create: `electron/services/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces:
  - `getProjectConfig(id: string): object`
  - `setProjectConfig(id: string, config: object): void`
  - `getAllCustomProjects(): Array<string>`

- [ ] **Step 1: 编写测试用例 `tests/store.test.js`**
- [ ] **Step 2: 实现 `electron/services/store.js`**（保存至 `~/.open-easy/config.json`，支持自定义前端 URL、别名）。
- [ ] **Step 3: 运行测试并验证**。
- [ ] **Step 4: 提交代码**。

---

### Task 5: Electron 主进程、Preload 与 IPC 桥接层
**Files:**
- Create: `electron/preload.js`
- Create: `electron/tray.js`
- Create: `electron/main.js`

**Interfaces:**
- Preload 暴露安全全局对象 `window.api`:
  - `api.checkOrbStatus()`
  - `api.listProjects()`
  - `api.launchProject(id, url, composePath)`
  - `api.stopProject(composePath)`
  - `api.openExternal(url)`
  - `api.saveConfig(id, config)`
  - `api.selectDirectory()`

- [ ] **Step 1: 实现 `electron/preload.js`**，通过 `contextBridge.exposeInMainWorld` 封装 IPC。
- [ ] **Step 2: 实现 `electron/tray.js`**，注册 macOS 顶部状态栏图标及快速下拉面板。
- [ ] **Step 3: 实现 `electron/main.js`**，监听各 IPC 管道并绑定至 `OrbManager` / `HealthChecker` / `ConfigStore`。
- [ ] **Step 4: 提交代码**。

---

### Task 6: 前端现代化 UI 开发 (Vue 3 + Tailwind CSS)
**Files:**
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/App.vue`
- Create: `src/components/Header.vue`
- Create: `src/components/ProjectCard.vue`
- Create: `src/components/EditModal.vue`

- [ ] **Step 1: 编写基础样式与 Tailwind 配置**。
- [ ] **Step 2: 开发 Header 组件**（展示 OrbStack 状态灯、搜索筛选框、刷新按钮、导入按钮）。
- [ ] **Step 3: 开发 ProjectCard 核心组件**：
  - 显示状态（已停止/启动中/运行中）
  - 前端地址点击与一键「🚀 启动并进入」按钮交互
  - 启动中加载动画与实时就绪气泡
  - 运行中提供「🌐 打开网页」、「⏹ 停止」、「🔄 重启」
- [ ] **Step 4: 开发 EditModal 组件**（允许用户快捷修改自定义前端 URL 和项目显示名称）。
- [ ] **Step 5: 提交代码**。

---

### Task 7: 端到端联调与实际项目启动验证
**Files:**
- Verification: 真实环境联调

- [ ] **Step 1: 启动应用联调**
  执行 `npm run dev` 调起 Open-Easy 应用。
- [ ] **Step 2: 验证项目扫描**
  核对界面是否成功展示 `hometown_vue`、`2025-blog-public`、`web-ai-project02` 及其对应端口。
- [ ] **Step 3: 执行一键启动测试**
  点击其中一个项目的「启动并进入」：
  - 观察主进程执行 `docker compose up -d`；
  - 观察探活轮询器检测端口 HTTP 响应；
  - 验证 macOS 浏览器是否自动弹起并打开对应前端页面。
- [ ] **Step 4: 执行停止测试**
  点击「停止」按钮，验证对应容器正常关闭，状态恢复为「已停止」。
- [ ] **Step 5: 最终提交与产出构建说明**。
