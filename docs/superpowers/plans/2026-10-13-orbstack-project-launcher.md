# Open-Easy (苹果原生浅色主题应用图标启动器) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 macOS 独立桌面启动器（Open-Easy），采用苹果 Clean Studio 浅色原生毛玻璃质感与官方技术栈经典品牌色，将本地 OrbStack 中的 Docker Compose 项目展示为清爽明艳的 Squircle 应用图标，支持单击一键后台启动并探活拉起默认浏览器，右键管理容器生命周期。

**Architecture:** Electron 32+ 独立居中磨砂原生质感窗口（740x550），浅灰白（#fbfbfd）高雅透光背景，主进程 Node.js 处理 Docker/Compose 命令与端口 HTTP 探活，渲染进程基于 Vite + Vue 3 + Tailwind CSS 构建苹果原生技术品牌浅色图标网格体系。

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
  验证读取现有的 `hometown_vue`、`2025-blog-public`、`web-ai-project02` 的解析正确性与图标类别识别。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/orbManager.test.js`。
- [ ] **Step 3: 实现 `electron/services/orbManager.js`**
  调用 `docker compose ls --format json` 与 `docker compose ps --format json`，实现服务启发式端口推导与技术栈自动识别。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/orbManager.test.js`。
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
- [ ] **Step 2: 实现 `electron/services/healthChecker.js`**（HTTP/TCP 探活，成功后调用系统默认浏览器打开网页）。
- [ ] **Step 3: 运行测试并验证**。
- [ ] **Step 4: 提交代码**。

---

### Task 4: 本地配置存储服务 (ConfigStore)
**Files:**
- Create: `electron/services/store.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: 编写测试用例 `tests/store.test.js`**
- [ ] **Step 2: 实现 `electron/services/store.js`**（保存用户自定义别名、URL）。
- [ ] **Step 3: 运行测试并验证**。
- [ ] **Step 4: 提交代码**。

---

### Task 5: Electron 主进程与 IPC 桥接层
**Files:**
- Create: `electron/preload.js`
- Create: `electron/main.js`

- [ ] **Step 1: 实现 `electron/preload.js`**，安全暴露 `window.api`。
- [ ] **Step 2: 实现 `electron/main.js`**，创建 740x550 独立磨砂质感居中窗口，设置无边框（titleBarStyle: 'hiddenInset'）与浅色原生毛玻璃背景色（#fbfbfd）。
- [ ] **Step 3: 提交代码**。

---

### Task 6: 前端苹果原生浅色应用图标网格 UI 开发
**Files:**
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/App.vue`
- Create: `src/components/Header.vue` (红黄绿交通灯 + 浅色搜索胶囊 + OrbStack 浅绿状态胶囊)
- Create: `src/components/AppIcon.vue` (官方技术品牌色 Squircle、浅色柔和阴影与高光、白透端口角标、Dock 风格翠绿 LED 指示点)
- Create: `src/components/ContextMenu.vue` (纯白毛玻璃 macOS 原生右键菜单)
- Create: `src/components/EditModal.vue` (浅色地址与端口修改弹窗)

- [ ] **Step 1: 编写全局 Tailwind 样式与浅色 Squircle 光泽高光柔和阴影**。
- [ ] **Step 2: 开发 Header.vue 组件**。
- [ ] **Step 3: 开发 AppIcon.vue 核心组件**：
  - 单击未运行图标：触发弹性按压与微光浅绿波纹环，执行后台启动并探活，就绪后拉起浏览器；
  - 单击运行中图标：直接打开前端页面；
  - 呈现 Dock 翠绿色发光运行圆点。
- [ ] **Step 4: 开发 ContextMenu.vue 组件**（右键执行停止、重启、查看日志、编辑配置）。
- [ ] **Step 5: 开发 EditModal.vue 组件**。
- [ ] **Step 6: 提交代码**。

---

### Task 7: 端到端联调与实际项目验证
**Files:**
- Verification: 真实环境联调

- [ ] **Step 1: 启动应用联调**
  `npm run dev` 调起原生窗口。
- [ ] **Step 2: 验证浅色品牌图标网格展示**
  核对界面是否以清爽高透的质感展示本机已有项目。
- [ ] **Step 3: 验证一键点击启动并自动打开浏览器流程**
  点击任意图标，观察启动、端口探活并准时调起浏览器。
- [ ] **Step 4: 验证右键停止与状态同步**。
- [ ] **Step 5: 最终提交**。
