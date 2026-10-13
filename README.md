# Open-Easy (开发者工作台)

<p align="center">
  <img src="https://img.shields.io/badge/Platform-macOS-black?style=flat-square&logo=apple" alt="Platform" />
  <img src="https://img.shields.io/badge/Electron-32.0.0-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Engine-OrbStack%20%7C%20Docker-1D63ED?style=flat-square&logo=docker" alt="OrbStack" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

<p align="center">
  专为 <b>macOS + OrbStack</b> 开发者打造的轻量级原生工作台应用。<br/>
  将本地复杂的 Docker Compose 微服务抽象为<b>精美的 Launchpad 应用图标</b>，提供<b>免开机静默自愈</b>与<b>一键启动直达前端网页</b>的极致体验。
</p>

---

## ✨ 核心特性

- 🍏 **Apple Clean Studio 原生质感**：780×560 原生毛玻璃窗口（`#fbfbfd`），交通灯无缝内嵌，Squircle 苹果圆角高光图标；
- ⚡ **OrbStack 自动免开机感知与自愈 (Auto-Healing)**：
  - 启动项目前自动检查 Docker 引擎；
  - 若 OrbStack 处于关闭或休眠状态，**自动无感在后台静默唤醒** (`orb start` / `open -g -a OrbStack`)；
  - 引擎就绪后**无缝继续启动容器、探活端口并弹出浏览器**，全程免去人工干预；
- 🪟 **精致毛玻璃详情弹窗 (ProjectDetailModal)**：
  - 单击图标呼出居中卡片，展示微服务及容器清单（前端、后端、数据库各端口与状态）；
  - 提供大号 **「🚀 一键启动并进入前端网页」** 主按钮；
  - 快速调用 **VS Code**、**Cursor**、**系统终端** 与 **访达** 打开项目；
  - 支持自定义前端打开 URL（含路径与端口），即时生效并持久化；
- 💊 **零位移浮动 HUD 胶囊 (Zero-Layout-Shift)**：
  - 彻底淘汰推挤页面排版的顶部横幅，采用底部居中半透明浮动胶囊展示操作反馈，温和淡入淡出；
- ⚠️ **智能端口冲突诊断与释放**：
  - 启动前自动通过 `lsof` 扫描目标端口；
  - 若被本地其他进程占用，在图标标出警示微标，详情卡片中提供**一键终止冲突 PID**；
- 🌙 **一键休眠与内存释放**：
  - 一键优雅停止全部运行中的 Compose 容器，释放 OrbStack 内存与 CPU；
  - 提供一键清理未引用镜像与构建缓存功能（`docker system prune`）。

---

## 🏛️ 架构设计

```mermaid
flowchart TD
    subgraph UI ["Open-Easy 渲染层 (Vue 3 + Vite + Tailwind)"]
        Header["原生浅色标题栏 (搜索 + 🌙休眠 + 引擎状态)"]
        Grid["应用图标网格 (4列 Squircle 品牌色大图标)"]
        DetailModal["居中毛玻璃详情面板 (微服务清单 + 快捷工具)"]
        HudToast["底部浮动 HUD 胶囊 (非侵入式反馈)"]
    end

    subgraph IPCBridge ["Electron 安全桥接层 (preload.cjs)"]
        ContextBridge["window.electronAPI (contextIsolation)"]
    end

    subgraph CoreServices ["主进程核心服务 (Node.js)"]
        OrbMgr["OrbManager (自愈唤醒 / Compose 编排 / 内存监控)"]
        Health["HealthChecker (HTTP/TCP 探针轮询)"]
        PortDiag["PortDiagnostics (lsof 端口冲突检测与释放)"]
        Store["ConfigStore (~/.open-easy/config.json 持久化)"]
        Launcher["EditorOpener (VS Code / 终端 / 浏览器联动)"]
    end

    subgraph System ["macOS 系统与容器底层"]
        OrbStack["OrbStack Engine (/opt/homebrew/bin/orb)"]
        DockerCompose["Docker Compose CLI"]
        Browser["默认浏览器 (Safari / Chrome / Arc)"]
        IDE["VS Code / Cursor / Terminal / Finder"]
    end

    Grid -->|单击应用图标| DetailModal
    DetailModal --> ContextBridge
    Header --> ContextBridge
    ContextBridge --> CoreServices
    OrbMgr -->|静默自愈 / up -d| OrbStack
    OrbMgr --> DockerCompose
    Health -->|探活就绪| Launcher
    Launcher --> Browser
    Launcher --> IDE
    PortDiag -->|lsof / kill| System
```

---

## 🚀 快速上手

### 环境要求
- **macOS**（Apple Silicon M系列或 Intel 均可，推荐 macOS 14+）
- **Node.js** >= 18.x
- **OrbStack** 或 Docker Desktop（已安装命令行工具 `docker` 与 `orb`）

### 1. 克隆代码与安装依赖
```bash
git clone https://github.com/lyt04919/open-easy.git
cd open-easy
npm install
```

### 2. 运行单元测试
```bash
npm test
```
> 内置 Node.js 原生测试套件，全面覆盖 Compose 文件解析、端口冲突探测、HTTP/TCP 探针探活与配置持久化存储。

### 3. 开发模式启动
```bash
npm run dev
```
> 同时调起 Vite 热更新服务与 Electron 桌面客户端。

### 4. 运行已构建的客户端
```bash
npm run build:vue
npm start
```

---

## 📁 目录结构

```text
open-easy/
├── electron/
│   ├── main.js                  # Electron 主进程入口与 IPC 通信调度
│   ├── preload.cjs              # 安全 ContextBridge 预加载脚本
│   └── services/
│       ├── orbManager.js        # OrbStack 自愈唤醒与 Compose 容器生命周期管理
│       ├── healthChecker.js     # 前端服务毫秒级轮询探针
│       ├── portDiagnostics.js   # lsof 端口冲突检测与进程释放
│       ├── editorOpener.js      # VS Code / Cursor / 终端 / 访达系统联动
│       └── store.js             # 用户配置持久化存储服务
├── src/
│   ├── components/
│   │   ├── Header.vue           # 顶部原生标题栏、搜索过滤与休眠按钮
│   │   ├── AppIcon.vue          # 技术品牌色 Squircle 图标与 Dock 运行指示点
│   │   ├── ProjectDetailModal.vue # 居中毛玻璃详情面板与微服务清单
│   │   ├── HudToast.vue         # 底部浮动毛玻璃 HUD 提示胶囊
│   │   └── FooterBar.vue        # 底部状态栏与一键缓存清理
│   ├── App.vue                  # 客户端主页面与状态管理
│   ├── main.js                  # Vue 应用挂载入口
│   └── style.css                # Tailwind 与原生质感动效定义
├── tests/                       # 自动化单元测试套件
├── docs/                        # 设计规格说明书与实施计划
├── index.html                   # Vite HTML 模板
├── package.json                 # 依赖配置与启动脚本
└── vite.config.js               # Vite 打包配置
```

---

## 🗺️ 后续迭代规划 (Roadmap)

- [ ] **全局快捷键一键唤起**：支持 `⌥ + Space` 类似 Raycast / Spotlight 随时呼出工作台面板，按键盘秒级直达项目；
- [ ] **详情页内置实时控制台日志 (Live Logs)**：无需切换终端，在详情弹窗内直接流式查看前后端容器的实时彩色运行日志；
- [ ] **容器轻量资源监控**：详情页集成微型 CPU 占用率与内存波形条（Sparkline）；
- [ ] **自定义应用图标定制**：支持上传本地图片或选择自定义 Emoji 作为项目图标。

---

## 📄 开源许可

本项目遵循 [MIT](LICENSE) 开源协议。
