# Open-Easy (开发者工作台浅色增强版) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 macOS 独立桌面开发者工作台（Open-Easy），采用苹果 Clean Studio 浅色原生毛玻璃质感，将本地 OrbStack 中的 Docker Compose 项目展示为清爽明艳的 Squircle 应用图标。除了单击一键后台启动并探活拉起默认浏览器外，深度整合三大开发者高频功能：**全局一键休眠与内存释放**、**智能端口冲突检测与进程释放**、**一键在 VS Code/Cursor 或终端打开项目代码**。

**Architecture:** Electron 32+ 独立居中磨砂原生质感窗口（780x580），浅灰白（#fbfbfd）高雅透光背景，主进程 Node.js 处理 Docker/Compose 命令、端口探测 (`lsof`/`net`) 与编辑器联动，渲染进程基于 Vite + Vue 3 + Tailwind CSS 构建苹果原生技术品牌浅色图标工作台。

**Tech Stack:** Electron, Node.js child_process, Vite, Vue 3, Tailwind CSS, Lucide Icons, electron-store.

**Spec:** [docs/superpowers/specs/2026-10-13-orbstack-project-launcher-design.md](file:///Users/liyuteng/Documents/open-easy/docs/superpowers/specs/2026-10-13-orbstack-project-launcher-design.md)

---

## 任务分解 (Tasks)

### Task 1: 项目工程脚手架与依赖初始化
**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Test: `npm run dev` / `node -e "require('electron')"`

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

### Task 2: 核心服务 OrbManager (项目自动发现、生命周期编排与全局休眠)
**Files:**
- Create: `electron/services/orbManager.js`
- Test: `tests/orbManager.test.js`

**Interfaces:**
- Produces:
  - `checkOrbStatus(): Promise<{ running: boolean, version?: string }>`
  - `listProjects(): Promise<Array<ProjectInfo>>`
  - `startProject(composeFilePath: string): Promise<{ success: boolean, output: string }>`
  - `stopProject(composeFilePath: string): Promise<{ success: boolean }>`
  - `sleepAllProjects(): Promise<{ stoppedCount: number }>` (一键休眠所有正在运行的项目)
  - `getMemoryUsage(): Promise<{ containerCount: number, memoryMB: number }>`

- [ ] **Step 1: 编写测试用例 `tests/orbManager.test.js`**
  验证读取现有的 `hometown_vue`、`2025-blog-public`、`web-ai-project02` 的解析正确性与休眠逻辑。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/orbManager.test.js`。
- [ ] **Step 3: 实现 `electron/services/orbManager.js`**
  调用 `docker compose ls --format json` 与 `docker compose ps --format json`，实现项目发现、服务启动/停止、与全局一键休眠。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/orbManager.test.js`。
- [ ] **Step 5: 提交代码**
  ```bash
  git add electron/services/orbManager.js tests/orbManager.test.js
  git commit -m "feat(core): implement OrbManager with sleepAll and resource stats"
  ```

---

### Task 3: 端口冲突检测与系统联动服务 (PortDiagnostics & EditorOpener)
**Files:**
- Create: `electron/services/portDiagnostics.js`
- Create: `electron/services/editorOpener.js`
- Create: `electron/services/healthChecker.js`
- Test: `tests/portDiagnostics.test.js`
- Test: `tests/healthChecker.test.js`

**Interfaces:**
- Produces:
  - `checkPortConflict(port: number): Promise<{ occupied: boolean, pid?: number, command?: string }>`
  - `killProcess(pid: number): Promise<{ success: boolean }>`
  - `openInEditor(projectPath: string, editor?: 'code' | 'cursor'): Promise<{ success: boolean }>`
  - `openInTerminal(projectPath: string): Promise<{ success: boolean }>`
  - `waitForReady(targetUrl: string, timeoutMs: number): Promise<{ ready: boolean, durationMs: number }>`

- [ ] **Step 1: 编写端口检测与进程释放测试用例 `tests/portDiagnostics.test.js`**
- [ ] **Step 2: 实现 `electron/services/portDiagnostics.js`**（使用 Node `lsof -i :<port>` 检测占用进程，提供 kill 命令）。
- [ ] **Step 3: 实现 `electron/services/editorOpener.js`**（调用 `code`、`cursor` 或系统 `open -a` 打开编辑器与终端）。
- [ ] **Step 4: 实现 `electron/services/healthChecker.js`**（就绪探活并打开浏览器）。
- [ ] **Step 5: 运行测试并验证通过**。
- [ ] **Step 6: 提交代码**。

---

### Task 4: 本地配置存储服务 (ConfigStore)
**Files:**
- Create: `electron/services/store.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: 编写测试用例 `tests/store.test.js`**
- [ ] **Step 2: 实现 `electron/services/store.js`**（保存用户自定义别名、首选代码编辑器 VS Code/Cursor、自定义 URL）。
- [ ] **Step 3: 运行测试并验证**。
- [ ] **Step 4: 提交代码**。

---

### Task 5: Electron 主进程与 IPC 桥接层
**Files:**
- Create: `electron/preload.js`
- Create: `electron/main.js`

- [ ] **Step 1: 实现 `electron/preload.js`**，安全暴露 `window.api`（包含休眠、端口检测、打开编辑器等新 API）。
- [ ] **Step 2: 实现 `electron/main.js`**，创建 780x580 独立磨砂质感居中窗口，设置无边框（titleBarStyle: 'hiddenInset'）与浅色原生毛玻璃背景色（#fbfbfd）。
- [ ] **Step 3: 提交代码**。

---

### Task 6: 前端开发者工作台增强版 UI 开发
**Files:**
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/App.vue`
- Create: `src/components/Header.vue` (交通灯 + 搜索框 + 一键休眠按钮 🌙 + OrbStack 状态)
- Create: `src/components/AppIcon.vue` (官方技术品牌色 Squircle、悬浮 VS Code 快捷按钮、端口冲突 ⚠️ 警告角标、Dock 绿色 LED)
- Create: `src/components/ContextMenu.vue` (在 VS Code 打开、在终端打开、检测端口占用、生命周期控制)
- Create: `src/components/ConflictBanner.vue` (端口占用警告与一键释放条)
- Create: `src/components/FooterBar.vue` (容器总内存、未用镜像一键清理)
- Create: `src/components/EditModal.vue` (地址与端口修改弹窗)

- [ ] **Step 1: 编写全局 Tailwind 样式与浅色 Squircle 光泽高光柔和阴影**。
- [ ] **Step 2: 开发 Header.vue 与 FooterBar.vue 组件**（集成一键休眠与内存概览）。
- [ ] **Step 3: 开发 AppIcon.vue 与 ConflictBanner.vue**：
  - 呈现端口冲突告警与一键释放；
  - 悬浮在图标右下角浮出微型 VS Code 快捷打开按钮；
  - 单击未运行图标执行启动探活并打开浏览器。
- [ ] **Step 4: 开发 ContextMenu.vue 组件**。
- [ ] **Step 5: 开发 EditModal.vue 组件**。
- [ ] **Step 6: 提交代码**。

---

### Task 7: 端到端联调与实际项目验证
**Files:**
- Verification: 真实环境联调

- [ ] **Step 1: 启动应用联调**
  `npm run dev` 调起原生窗口。
- [ ] **Step 2: 验证品牌色图标网格展示与资源内存概览**。
- [ ] **Step 3: 验证一键点击启动前端、自动打开浏览器流程**。
- [ ] **Step 4: 验证一键在 VS Code / Cursor 中打开项目代码**。
- [ ] **Step 5: 验证全局一键休眠功能（所有运行中容器停止）**。
- [ ] **Step 6: 最终提交**。
