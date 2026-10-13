# Open-Easy (开发者工作台项目详情弹窗版) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 macOS 独立桌面开发者工作台（Open-Easy），采用苹果 Clean Studio 浅色原生毛玻璃质感，将本地 OrbStack 中的 Docker Compose 项目展示为清爽明艳的 Squircle 应用图标。**点击任意图标居中弹出精致的毛玻璃项目详情卡片（ProjectDetailModal）**，在详情卡片中提供**一键启动并自动进入前端页面**、**VS Code / Cursor / 终端 / Finder 快捷工具栏**、**前后端各服务容器状态明细**、**端口冲突检测与自定义前端地址**，全流程配合**底部悬浮 HUD 胶囊**，零推挤、纯原生。

**Architecture:** Electron 32+ 独立居中磨砂原生质感窗口（780x540），浅灰白（#fbfbfd）高雅透光背景，主进程 Node.js 处理 Docker/Compose 命令、端口探测 (`lsof`/`net`) 与编辑器联动，渲染进程基于 Vite + Vue 3 + Tailwind CSS 构建苹果原生技术品牌浅色图标工作台与居中卡片弹窗。

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

### Task 2: 核心服务 OrbManager (项目自动发现、容器明细解析与生命周期编排)
**Files:**
- Create: `electron/services/orbManager.js`
- Test: `tests/orbManager.test.js`

**Interfaces:**
- Produces:
  - `checkOrbStatus(): Promise<{ running: boolean, version?: string }>`
  - `listProjects(): Promise<Array<ProjectInfo>>` (含每个项目内部的 containers 子清单与端口映射)
  - `startProject(composeFilePath: string): Promise<{ success: boolean, output: string }>`
  - `stopProject(composeFilePath: string): Promise<{ success: boolean }>`
  - `sleepAllProjects(): Promise<{ stoppedCount: number }>`
  - `getMemoryUsage(): Promise<{ containerCount: number, memoryMB: number }>`

- [ ] **Step 1: 编写测试用例 `tests/orbManager.test.js`**
- [ ] **Step 2: 实现 `electron/services/orbManager.js`**。
- [ ] **Step 3: 运行测试验证通过**。
- [ ] **Step 4: 提交代码**。

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
  - `showInFinder(projectPath: string): Promise<void>`
  - `waitForReady(targetUrl: string, timeoutMs: number): Promise<{ ready: boolean, durationMs: number }>`

- [ ] **Step 1: 编写端口检测与系统联动测试用例 `tests/portDiagnostics.test.js`**
- [ ] **Step 2: 实现 `electron/services/portDiagnostics.js`**。
- [ ] **Step 3: 实现 `electron/services/editorOpener.js`**。
- [ ] **Step 4: 实现 `electron/services/healthChecker.js`**。
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

- [ ] **Step 1: 实现 `electron/preload.js`**，安全暴露 `window.api`。
- [ ] **Step 2: 实现 `electron/main.js`**，创建 780x540 独立磨砂质感居中窗口，设置无边框（titleBarStyle: 'hiddenInset'）与浅色原生毛玻璃背景色（#fbfbfd）。
- [ ] **Step 3: 提交代码**。

---

### Task 6: 前端开发者工作台与项目详情弹窗 UI 开发
**Files:**
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/App.vue`
- Create: `src/components/Header.vue` (交通灯 + 搜索框 + 一键休眠按钮 🌙 + OrbStack 状态)
- Create: `src/components/AppIcon.vue` (官方技术品牌色 Squircle、Dock 绿色 LED、单击呼出详情弹窗)
- Create: `src/components/ProjectDetailModal.vue` (居中精致毛玻璃弹窗：大号启动进入主按钮、前后端微服务清单、VS Code/Terminal/Finder 快捷栏、URL 自定义输入)
- Create: `src/components/HudToast.vue` (原生底部居中悬浮半透明胶囊，自动淡入淡出，零布局位移)
- Create: `src/components/FooterBar.vue` (容器总内存、未用镜像一键清理)

- [ ] **Step 1: 编写全局 Tailwind 样式与弹窗缩放遮罩动画**。
- [ ] **Step 2: 开发 Header.vue 与 FooterBar.vue 组件**。
- [ ] **Step 3: 开发 AppIcon.vue 组件**（点击直接触发打开当前项目的 ProjectDetailModal）。
- [ ] **Step 4: 开发 ProjectDetailModal.vue 核心详情弹窗**：
  - 展示项目 Squircle 图标、名称、技术栈与运行状态徽章；
  - 提供大号「🚀 一键启动并进入前端网页」主操作按钮；
  - 启动中呈现顺滑加载自旋并在探活就绪后自动拉起浏览器；
  - 运行中提供「🌐 打开前端页面」、「⏹ 停止容器」、「🔄 重启」；
  - 嵌入开发工具快捷栏（VS Code / Terminal / Finder）；
  - 列出各微服务容器名称、角色与端口；
  - 支持自定义前端 URL 并即时保存。
- [ ] **Step 5: 开发 HudToast.vue 组件**。
- [ ] **Step 6: 提交代码**。

---

### Task 7: 端到端联调与实际项目验证
**Files:**
- Verification: 真实环境联调

- [ ] **Step 1: 启动应用联调**
  `npm run dev` 调起原生窗口。
- [ ] **Step 2: 验证点击任意图标居中弹出详情弹窗**。
- [ ] **Step 3: 验证弹窗内「一键启动并进入前端」完整探活与浏览器拉起流程**。
- [ ] **Step 4: 验证弹窗内 VS Code / Terminal 联动**。
- [ ] **Step 5: 验证全局一键休眠功能与卡片就地端口释放气泡**。
- [ ] **Step 6: 最终提交**。
