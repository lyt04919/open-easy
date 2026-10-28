<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md window-no-drag">
    <div
      class="w-[738px] h-[520px] max-w-[94vw] max-h-[88vh] aspect-[44/31] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col modal-animate relative text-zinc-800 dark:text-zinc-100"
    >
      <!-- Specular Top Rim Light -->
      <div class="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/20 to-transparent pointer-events-none rounded-t-3xl"></div>

      <!-- Header (Compact Fixed 54px Height) -->
      <div class="h-[54px] px-6 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-xs leading-tight text-zinc-900 dark:text-zinc-100">工作台偏好设置</h3>
            <p class="text-[10px] text-zinc-500 dark:text-zinc-400">定制外观主题、开发工具链、容器自动化与数据备份</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          title="关闭 (Esc)"
        >
          ✕
        </button>
      </div>

      <!-- Split Layout Body: Left Sidebar + Right Content Area (Fills exact remaining height) -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- Left Sidebar Navigation -->
        <aside class="w-44 border-r border-zinc-200/80 dark:border-zinc-800 p-2.5 flex flex-col justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40 select-none">
          <nav class="space-y-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="activeTab === tab.id
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 border border-transparent'"
              class="w-full px-3 py-2 rounded-xl text-xs flex items-center space-x-2.5 transition-all text-left cursor-pointer"
            >
              <span class="text-sm shrink-0">{{ tab.icon }}</span>
              <span class="truncate">{{ tab.label }}</span>
            </button>
          </nav>

          <!-- App Version Footnote -->
          <div class="px-2 py-1.5 border-t border-zinc-200/60 dark:border-zinc-800/80 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
            <span class="font-mono">Open-Easy Studio</span>
            <span class="font-mono text-zinc-500 dark:text-zinc-400 font-medium">v1.0.0</span>
          </div>
        </aside>

        <!-- Right Content Area -->
        <main class="flex-1 overflow-y-auto px-5 py-3.5 space-y-4">
          <!-- 1. 常规与外观 -->
          <div v-if="activeTab === 'general'" class="space-y-4">
            <!-- Theme Selection -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">空间外观主题</h4>
                  <p class="text-[11px] text-zinc-400 dark:text-zinc-400">选择应用视觉模式，支持暖色沙丘明亮与高对比深色曜石</p>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2.5">
                <button
                  v-for="theme in themeOptions"
                  :key="theme.id"
                  @click="selectTheme(theme.id)"
                  :class="settings.themeMode === theme.id
                    ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300'"
                  class="p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer text-center relative"
                >
                  <span class="text-xl">{{ theme.icon }}</span>
                  <span class="text-xs font-medium">{{ theme.name }}</span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-400">{{ theme.desc }}</span>
                  <span
                    v-if="settings.themeMode === theme.id"
                    class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"
                  ></span>
                </button>
              </div>
            </div>

            <!-- Default Startup View -->
            <div class="space-y-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              <div>
                <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">启动默认主视图</h4>
                <p class="text-[11px] text-zinc-400 dark:text-zinc-400">每次打开 Open-Easy 时默认呈现的工作台布局模式</p>
              </div>

              <div class="grid grid-cols-3 gap-2.5">
                <button
                  v-for="view in viewOptions"
                  :key="view.id"
                  @click="settings.defaultView = view.id"
                  :class="settings.defaultView === view.id
                    ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300'"
                  class="p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer text-center relative"
                >
                  <span class="text-lg">{{ view.icon }}</span>
                  <span class="text-xs font-medium">{{ view.name }}</span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-400 leading-tight">{{ view.desc }}</span>
                  <span
                    v-if="settings.defaultView === view.id"
                    class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. 开发工具链 -->
          <div v-else-if="activeTab === 'toolchain'" class="space-y-4">
            <!-- Preferred IDE -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">默认代码编辑器 (IDE)</h4>
                  <p class="text-[11px] text-zinc-400 dark:text-zinc-400">右键菜单与详情面板中一键拉起项目的首选开发工具</p>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="ed in editorOptions"
                  :key="ed.id"
                  @click="settings.preferredEditor = ed.id"
                  :class="settings.preferredEditor === ed.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs font-semibold'
                    : 'bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/90'"
                  class="px-2.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>{{ ed.icon }}</span>
                  <span class="truncate">{{ ed.name }}</span>
                </button>
              </div>
            </div>

            <!-- Preferred Terminal -->
            <div class="space-y-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">默认终端模拟器 (Terminal)</h4>
                  <p class="text-[11px] text-zinc-400 dark:text-zinc-400">调用打开终端、容器 Exec 与数据库 Shell 时调起的终端程序</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="term in terminalOptions"
                  :key="term.id"
                  @click="settings.preferredTerminal = term.id"
                  :class="settings.preferredTerminal === term.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs font-semibold'
                    : 'bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/90'"
                  class="px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>{{ term.icon }}</span>
                  <span>{{ term.name }}</span>
                </button>
              </div>
            </div>

            <!-- Preferred Exec Shell -->
            <div class="space-y-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">容器终端交互 Shell</h4>
                  <p class="text-[11px] text-zinc-400 dark:text-zinc-400">一键 Exec 容器时优先进入的命令行环境（不支持时自动回退 sh）</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="settings.preferredShell = 'sh'"
                  :class="settings.preferredShell === 'sh'
                    ? 'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300'"
                  class="p-2.5 rounded-xl border text-left flex flex-col space-y-1 transition-all cursor-pointer"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-mono font-bold">/bin/sh</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">默认推荐</span>
                  </div>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-400">兼容所有精简基础镜像 (Alpine / Busybox)</span>
                </button>

                <button
                  @click="settings.preferredShell = 'bash'"
                  :class="settings.preferredShell === 'bash'
                    ? 'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300'"
                  class="p-2.5 rounded-xl border text-left flex flex-col space-y-1 transition-all cursor-pointer"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-mono font-bold">/bin/bash</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">功能完整</span>
                  </div>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-400">支持历史命令高亮与高级快捷键补全</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3. 工作流与引擎 -->
          <div v-else-if="activeTab === 'workflow'" class="space-y-3.5">
            <!-- Automation Toggles -->
            <div class="space-y-2.5">
              <!-- Auto Launch Browser -->
              <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60">
                <div class="flex flex-col pr-4">
                  <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">启动后自动在浏览器打开前端</span>
                  <span class="text-[11px] text-zinc-400 dark:text-zinc-400 mt-0.5">检测 HTTP 路由探活就绪后静默拉起系统默认浏览器</span>
                </div>
                <!-- Native Apple-like Toggle Switch -->
                <button
                  type="button"
                  @click="settings.autoLaunchBrowser = !settings.autoLaunchBrowser"
                  :class="settings.autoLaunchBrowser ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'"
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                >
                  <span
                    :class="settings.autoLaunchBrowser ? 'translate-x-4' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                  />
                </button>
              </div>

              <!-- Auto Heal OrbStack -->
              <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60">
                <div class="flex flex-col pr-4">
                  <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">OrbStack 待机自愈唤醒</span>
                  <span class="text-[11px] text-zinc-400 dark:text-zinc-400 mt-0.5">启动工程时若发现底层容器引擎处于休眠状态，自动静默拉起引擎</span>
                </div>
                <button
                  type="button"
                  @click="settings.autoHealOrbStack = !settings.autoHealOrbStack"
                  :class="settings.autoHealOrbStack ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'"
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                >
                  <span
                    :class="settings.autoHealOrbStack ? 'translate-x-4' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                  />
                </button>
              </div>

              <!-- Crash Notifications -->
              <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60">
                <div class="flex flex-col pr-4">
                  <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">容器异常退出桌面通知</span>
                  <span class="text-[11px] text-zinc-400 dark:text-zinc-400 mt-0.5">微服务容器意外非零退出或报错崩溃时，发送 macOS 系统桌面横幅通知</span>
                </div>
                <button
                  type="button"
                  @click="settings.crashNotifications = !settings.crashNotifications"
                  :class="settings.crashNotifications ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'"
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                >
                  <span
                    :class="settings.crashNotifications ? 'translate-x-4' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                  />
                </button>
              </div>
            </div>

            <!-- Poll Interval -->
            <div class="space-y-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">容器状态同步与探活频率</h4>
                  <p class="text-[11px] text-zinc-400 dark:text-zinc-400">后台自动检测端口占用、健康检查与容器运行状态的轮询周期</p>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="p in pollOptions"
                  :key="p.value"
                  @click="settings.pollInterval = p.value"
                  :class="settings.pollInterval === p.value
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 font-semibold shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300'"
                  class="p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5"
                >
                  <span class="text-xs font-bold font-mono">{{ p.label }}</span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-400">{{ p.desc }}</span>
                </button>
              </div>
            </div>

            <!-- Quick Engine Maintenance Actions -->
            <div class="p-3 bg-zinc-50/80 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/60 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2.5">
                <span class="text-lg">🧹</span>
                <div>
                  <div class="font-bold text-zinc-800 dark:text-zinc-200">引擎维护与快速休眠</div>
                  <div class="text-[10px] text-zinc-400 dark:text-zinc-400">随时释放容器资源或清除 Docker 悬空构建缓存</div>
                </div>
              </div>
              <div class="flex items-center space-x-1.5">
                <button
                  @click="$emit('sleep-all')"
                  class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-[11px] font-medium transition-colors cursor-pointer text-zinc-700 dark:text-zinc-200"
                  title="休眠所有运行容器"
                >
                  一键休眠
                </button>
                <button
                  @click="$emit('clean-cache')"
                  class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-[11px] font-medium transition-colors cursor-pointer text-zinc-700 dark:text-zinc-200"
                  title="清除构建缓存与临时镜像"
                >
                  清理缓存
                </button>
              </div>
            </div>
          </div>

          <!-- 4. 数据与快捷键 -->
          <div v-else-if="activeTab === 'data'" class="space-y-4">
            <!-- Data Backup & Restore -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">工作台配置备份与恢复</h4>
              <p class="text-[11px] text-zinc-400 dark:text-zinc-400">将已收纳的项目清单、自定义图标、标签与端口备注导出备份或无损迁移恢复</p>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  @click="$emit('export-config')"
                  class="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>📤</span>
                  <span>导出配置备份 (JSON)</span>
                </button>
                <button
                  @click="$emit('import-config')"
                  class="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>📥</span>
                  <span>导入恢复配置 (JSON)</span>
                </button>
              </div>
            </div>

            <!-- Config File Location -->
            <div class="p-3 bg-zinc-50/80 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/60 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2 min-w-0 pr-2">
                <span class="text-base shrink-0">📁</span>
                <div class="min-w-0">
                  <div class="font-bold text-zinc-800 dark:text-zinc-200">本地持久化存储路径</div>
                  <div class="text-[10px] text-zinc-400 dark:text-zinc-400 font-mono truncate" title="~/.open-easy/config.json">
                    ~/.open-easy/config.json
                  </div>
                </div>
              </div>
              <button
                @click="openConfigFolder"
                class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-[11px] font-medium transition-colors cursor-pointer shrink-0 text-zinc-700 dark:text-zinc-200"
              >
                在访达中显示
              </button>
            </div>

            <!-- Global & App Keyboard Shortcuts Table -->
            <div class="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">键盘快捷键速查</h4>
                <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">macOS Optimized</span>
              </div>

              <div class="space-y-1 text-xs">
                <div
                  v-for="(sc, idx) in shortcutsList"
                  :key="idx"
                  class="flex items-center justify-between py-1 px-2.5 rounded-lg bg-zinc-50/60 dark:bg-zinc-800/30 text-[11px]"
                >
                  <span class="text-zinc-600 dark:text-zinc-300 font-medium">{{ sc.action }}</span>
                  <kbd class="px-2 py-0.5 rounded bg-white dark:bg-zinc-700/80 border border-zinc-200/90 dark:border-zinc-600 font-mono text-[10px] shadow-2xs text-zinc-700 dark:text-zinc-200 font-semibold">
                    {{ sc.key }}
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Footer Action Bar (Compact Fixed 52px Height) -->
      <div class="h-[52px] px-6 py-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
        <button
          @click="resetDefaults"
          class="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          恢复默认偏好
        </button>

        <div class="flex items-center space-x-2">
          <button
            @click="$emit('close')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            @click="saveSettings"
            :disabled="saving"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
          >
            <span v-if="saving" class="animate-spin text-xs">⏳</span>
            <span>{{ saving ? '保存中...' : '保存偏好设置' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emit = defineEmits([
  'close',
  'saved',
  'export-config',
  'import-config',
  'sleep-all',
  'clean-cache',
  'theme-change'
]);

const activeTab = ref('general');
const saving = ref(false);

const tabs = [
  { id: 'general', label: '常规与外观', icon: '🎨' },
  { id: 'toolchain', label: '开发工具链', icon: '💻' },
  { id: 'workflow', label: '工作流与引擎', icon: '⚡' },
  { id: 'data', label: '数据与快捷键', icon: '📦' }
];

const defaultSettings = {
  themeMode: 'system',
  defaultView: 'bento',
  preferredEditor: 'code',
  preferredTerminal: 'terminal',
  preferredShell: 'sh',
  autoLaunchBrowser: true,
  autoHealOrbStack: true,
  crashNotifications: true,
  pollInterval: 5000
};

const settings = ref({ ...defaultSettings });

const themeOptions = [
  { id: 'system', name: '跟随系统', desc: '根据 macOS 外观自动切换', icon: '💻' },
  { id: 'light', name: '暖色明亮', desc: '自然暖沙色系与高通透毛玻璃', icon: '☀️' },
  { id: 'dark', name: '深色曜石', desc: '沉浸黑曜石材质与绿色高亮', icon: '🌙' }
];

const viewOptions = [
  { id: 'bento', name: '便当盒展台', desc: '微服务指标、状态与开发操作中枢', icon: '🍱' },
  { id: 'launchpad', name: '图标启动台', desc: '高密度应用网格，极简直观展示', icon: '🚀' },
  { id: 'ports', name: '端口监控', desc: '本机监听端口雷达与冲突诊断', icon: '📡' }
];

const editorOptions = [
  { id: 'code', name: 'VS Code', icon: '💻' },
  { id: 'cursor', name: 'Cursor', icon: '✨' },
  { id: 'idea', name: 'IntelliJ', icon: '💡' },
  { id: 'webstorm', name: 'WebStorm', icon: '⚡' },
  { id: 'zed', name: 'Zed', icon: '⚡' }
];

const terminalOptions = [
  { id: 'terminal', name: 'Terminal.app', icon: '🖥️' },
  { id: 'iterm', name: 'iTerm2', icon: '🚀' },
  { id: 'warp', name: 'Warp', icon: '⚡' },
  { id: 'ghostty', name: 'Ghostty', icon: '👻' }
];

const pollOptions = [
  { value: 3000, label: '3 秒', desc: '高敏探活' },
  { value: 5000, label: '5 秒', desc: '标准均衡' },
  { value: 10000, label: '10 秒', desc: '低功耗省电' }
];

const shortcutsList = [
  { action: '全局唤起 / 隐藏工作台面板', key: '⌘ + Shift + O' },
  { action: '快速聚焦搜索过滤输入框', key: '⌘ + F' },
  { action: '方向键卡片网格焦点导航', key: '↑ / ↓ / ← / →' },
  { action: '展开当前选中项目详情面板', key: 'Space (空格)' },
  { action: '一键启动项目 / 打开前端网页', key: 'Enter (回车)' },
  { action: '关闭当前浮层弹窗 / 取消聚焦', key: 'Esc' },
  { action: '重新加载与刷新工作台状态', key: '⌘ + R' }
];

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    try {
      const current = await window.electronAPI.getSettings();
      if (current) {
        settings.value = { ...defaultSettings, ...current };
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }
});

function selectTheme(mode) {
  settings.value.themeMode = mode;
  emit('theme-change', mode);
}

function resetDefaults() {
  settings.value = { ...defaultSettings };
  emit('theme-change', defaultSettings.themeMode);
}

async function openConfigFolder() {
  if (window.electronAPI?.openConfigFolder) {
    await window.electronAPI.openConfigFolder();
  }
}

async function saveSettings() {
  if (!window.electronAPI?.updateSettings) {
    emit('close');
    return;
  }
  saving.value = true;
  try {
    const cleanSettings = JSON.parse(JSON.stringify(settings.value));
    await window.electronAPI.updateSettings(cleanSettings);
    emit('saved', cleanSettings);
    emit('close');
  } catch (err) {
    console.error('Failed to save settings:', err);
  } finally {
    saving.value = false;
  }
}
</script>
