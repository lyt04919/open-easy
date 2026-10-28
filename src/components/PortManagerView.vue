<template>
  <div class="w-full flex flex-col space-y-3.5 pb-12 select-none">
    <!-- 1. Compact Header & Control Bar -->
    <div class="glass-card rounded-2xl px-4 py-3.5 border border-white/60 dark:border-white/10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <!-- Left: Title & Live Status -->
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22v-5" />
            <path d="M9 8V2" />
            <path d="M15 2v6" />
            <path d="M18 8v5a6 6 0 0 1-12 0V8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">本机端口管理</h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
              {{ devCount }} 个开发服务 · 共 {{ portsList.length }} 端口
            </span>
            <button
              v-if="conflictCount > 0"
              @click="handleKillAllConflicts"
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs flex items-center space-x-1 cursor-pointer transition-colors"
              title="一键释放所有阻塞项目的冲突端口"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span>{{ conflictCount }} 个冲突 · 点击全部释放</span>
            </button>
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            自动过滤系统噪音进程，点击端口号可快速复制地址，点击行可展开完整启动命令
          </p>
        </div>
      </div>

      <!-- Right: Segmented Category Tabs + Search + Refresh -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Segmented Tabs -->
        <div class="flex items-center space-x-0.5 p-1 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-xl text-xs border border-zinc-200/60 dark:border-zinc-700/60">
          <button
            @click="activeCategory = 'dev'"
            :class="activeCategory === 'dev' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer"
          >
            开发与项目 ({{ devCount }})
          </button>

          <button
            @click="activeCategory = 'conflict'"
            :class="activeCategory === 'conflict' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 text-[11px] cursor-pointer"
          >
            <span v-if="conflictCount > 0" class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>冲突 ({{ conflictCount }})</span>
          </button>

          <button
            @click="activeCategory = 'system'"
            :class="activeCategory === 'system' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer"
          >
            系统与应用 ({{ systemGroupCount }})
          </button>

          <button
            @click="activeCategory = 'all'"
            :class="activeCategory === 'all' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer"
          >
            全部 ({{ portsList.length }})
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-48">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
            type="text"
            placeholder="查端口号、服务、路径..."
            class="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-8 pr-6 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-all font-mono"
          />
          <button
            v-if="searchQuery"
            @click="$emit('update:searchQuery', '')"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Refresh Button -->
        <button
          @click="loadPorts"
          :disabled="loading"
          class="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center space-x-1 text-xs transition-colors cursor-pointer border border-zinc-200/80 dark:border-zinc-700 font-medium active:scale-95"
          title="重新扫描本机监听端口"
        >
          <svg class="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300 transition-transform" :class="loading ? 'animate-spin' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          <span class="text-[11px]">{{ loading ? '扫描中' : '刷新' }}</span>
        </button>
      </div>
    </div>

    <!-- 2. High-Density Native Table List -->
    <div class="glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading && portsList.length === 0" class="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-2.5">
        <svg class="animate-spin h-6 w-6 text-zinc-600 dark:text-zinc-300" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span class="text-xs font-medium">正在扫描本机 LISTEN 端口并解析服务归属...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="displayedRows.length === 0" class="py-16 px-6 flex flex-col items-center justify-center text-zinc-400 text-xs text-center space-y-2">
        <svg v-if="activeCategory === 'conflict'" class="w-7 h-7 text-emerald-500 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <svg v-else class="w-7 h-7 text-zinc-400 dark:text-zinc-500 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="font-bold text-xs text-zinc-800 dark:text-zinc-200">
          {{
            activeCategory === 'conflict'
              ? '当前没有任何项目端口冲突'
              : activeCategory === 'dev' && !searchQuery
                ? '当前没有运行中的本地开发服务或数据库'
                : '未检索到符合条件的占用端口'
          }}
        </span>
        <span class="text-[11px] text-zinc-400 max-w-sm">
          {{
            activeCategory === 'conflict'
              ? '所有已停止项目的端口均处于空闲状态，可随时启动项目'
              : activeCategory === 'dev' && !searchQuery
                ? 'macOS 系统服务与桌面应用已自动归类至「系统与应用」标签页'
                : '可尝试清空搜索关键词或切换顶部分类标签'
          }}
        </span>
        <div class="flex items-center space-x-2 mt-1">
          <button
            v-if="searchQuery"
            @click="$emit('update:searchQuery', '')"
            class="px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px] font-medium cursor-pointer transition-colors"
          >
            清空搜索词
          </button>
          <button
            v-if="activeCategory === 'dev' && portsList.length > 0"
            @click="activeCategory = 'system'"
            class="px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px] font-medium cursor-pointer transition-colors"
          >
            查看系统与应用端口 ({{ systemGroupCount }})
          </button>
        </div>
      </div>

      <!-- Table Header + Rows -->
      <div v-else>
        <!-- Column Headers (Strict CSS Grid for Pixel-Perfect Alignment) -->
        <div class="grid grid-cols-[100px_180px_1fr_210px] items-center gap-3 px-5 py-2 bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200/70 dark:border-zinc-800 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          <div>监听端口</div>
          <div>服务与类型</div>
          <div>工作目录 / 进程 PID</div>
          <div class="text-right">快捷操作</div>
        </div>

        <!-- Rows List -->
        <div class="divide-y divide-zinc-200/60 dark:divide-zinc-800/70">
          <div
            v-for="row in displayedRows"
            :key="row.rowKey"
            class="transition-colors group"
            :class="[
              row.isConflict
                ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30'
                : 'hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40'
            ]"
          >
            <!-- Main Compact Single Line -->
            <div
              class="grid grid-cols-[100px_180px_1fr_210px] items-center gap-3 px-5 py-2.5 text-xs cursor-pointer"
              @click="toggleExpand(row.rowKey)"
            >
              <!-- Col 1: Port Badges -->
              <div class="flex flex-wrap items-center gap-1" @click.stop>
                <button
                  v-for="pNum in row.ports"
                  :key="pNum"
                  @click="copyPortAddress(pNum)"
                  class="px-2 py-0.5 rounded-lg font-mono font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center space-x-1 active:scale-95 shadow-2xs"
                  :class="[
                    row.isConflict
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : row.category === 'project'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : row.category === 'dev'
                          ? 'bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-100 dark:hover:bg-zinc-300 dark:text-zinc-900'
                          : 'bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  ]"
                  :title="`点击复制 localhost:${pNum}`"
                >
                  <span>:{{ pNum }}</span>
                </button>
              </div>

              <!-- Col 2: Service Name + Subtitle + Status Tag -->
              <div class="min-w-0 pr-1">
                <div class="flex items-center space-x-1.5">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate text-[13px]">{{ row.command }}</span>
                  <!-- Conflict / Project / Service Type Badge -->
                  <span
                    v-if="row.isConflict"
                    class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0 whitespace-nowrap"
                  >
                    冲突: {{ row.projectName }}
                  </span>
                  <span
                    v-else-if="row.category === 'project'"
                    class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0 whitespace-nowrap"
                  >
                    {{ row.projectName }}
                  </span>
                  <span
                    v-else-if="row.serviceType"
                    class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0 whitespace-nowrap"
                  >
                    {{ row.serviceType }}
                  </span>
                </div>
                <div v-if="row.subtitle" class="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono mt-0.5">
                  {{ row.subtitle }}
                </div>
              </div>

              <!-- Col 3: Working Directory & PID (Broad space, untruncated) -->
              <div class="min-w-0 flex flex-col justify-center overflow-hidden">
                <div
                  v-if="row.displayCwd"
                  class="text-xs font-mono text-zinc-600 dark:text-zinc-300 truncate hover:underline cursor-pointer"
                  @click.stop="openFinder(row.cwd)"
                  :title="`在访达中打开: ${row.cwd}`"
                >
                  {{ row.displayCwd }}
                </div>
                <div class="flex items-center space-x-1.5 text-[11px] font-mono text-zinc-400">
                  <span>PID {{ row.pid }}</span>
                  <span v-if="row.ports.length > 1">· {{ row.ports.length }} 个端口</span>
                  <span class="text-zinc-300 dark:text-zinc-600">·</span>
                  <span class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    {{ expandedKeys.has(row.rowKey) ? '收起详情' : '命令详情' }}
                  </span>
                </div>
              </div>

              <!-- Col 4: Action Buttons (Identical 2-Char Buttons, Perfectly Aligned) -->
              <div class="flex items-center justify-end space-x-1.5" @click.stop>
                <!-- Action A: Open (打开) for Web HTTP -->
                <button
                  v-if="row.protocol === 'http'"
                  @click="openUrl(`http://localhost:${row.port}`)"
                  class="h-7 w-[62px] justify-center rounded-lg bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center space-x-1 active:scale-95 shadow-2xs"
                  :title="`在浏览器打开 http://localhost:${row.port}`"
                >
                  <svg class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>打开</span>
                </button>

                <!-- Action B: Copy (复制) for DB or Other -->
                <button
                  v-else
                  @click="copyPortAddress(row.port)"
                  class="h-7 w-[62px] justify-center rounded-lg bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center space-x-1 active:scale-95 shadow-2xs"
                  :title="`复制连接地址 localhost:${row.port}`"
                >
                  <svg class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span>复制</span>
                </button>

                <!-- Action C: Reveal in Finder (目录) -->
                <button
                  v-if="row.cwd"
                  @click="openFinder(row.cwd)"
                  class="h-7 w-[62px] justify-center rounded-lg bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center space-x-1 active:scale-95 shadow-2xs"
                  :title="`在访达中定位目录: ${row.cwd}`"
                >
                  <svg class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  <span>目录</span>
                </button>

                <!-- Action D: Release (释放) or System Protected -->
                <span
                  v-if="row.isProtected && !row.isConflict"
                  class="h-7 px-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 text-xs font-medium whitespace-nowrap shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 select-none flex items-center justify-center"
                  title="系统核心守护进程或容器引擎内部通信端口，受防误杀保护"
                >
                  系统保护
                </span>
                <button
                  v-else
                  @click="handleKillPort(row)"
                  :disabled="killingPort === row.port"
                  class="h-7 w-[62px] justify-center rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center space-x-1 active:scale-95 shadow-2xs"
                  :class="[
                    row.isConflict
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-600'
                      : 'bg-zinc-100/90 hover:bg-rose-50 dark:bg-zinc-800/90 dark:hover:bg-rose-950/60 text-zinc-700 hover:text-rose-600 dark:text-zinc-200 dark:hover:text-rose-300 border border-zinc-200/80 dark:border-zinc-700 hover:border-rose-200 dark:hover:border-rose-800'
                  ]"
                  :title="`终止进程 ${row.command} (PID: ${row.pid}) 并释放端口`"
                >
                  <svg v-if="killingPort === row.port" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                  <span>{{ killingPort === row.port ? '释放中' : '释放' }}</span>
                </button>
              </div>
            </div>

            <!-- Collapsible Drawer: Full Command Line & CWD (Only shown when clicked) -->
            <div
              v-if="expandedKeys.has(row.rowKey)"
              class="px-5 py-3 bg-zinc-100/70 dark:bg-zinc-900/60 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-mono space-y-1.5"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="text-zinc-600 dark:text-zinc-300 break-all select-all">
                  <span class="text-zinc-400 select-none mr-1.5 font-bold">$</span>{{ row.fullCommand || row.command }}
                </div>
                <button
                  @click="copyText(row.fullCommand || row.command, `cmd_${row.rowKey}`)"
                  class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-[11px] shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                >
                  {{ copiedKey === `cmd_${row.rowKey}` ? '已复制命令' : '复制启动命令' }}
                </button>
              </div>
              <div v-if="row.cwd" class="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400">
                <span class="text-zinc-400 select-none">完整工作目录:</span>
                <span class="select-all cursor-pointer hover:underline" @click="openFinder(row.cwd)">{{ row.cwd }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['notify', 'update:searchQuery', 'ports-updated']);

const loading = ref(false);
const portsList = ref([]);
const activeCategory = ref('dev'); // 'dev' | 'conflict' | 'system' | 'all'
const killingPort = ref(null);
const copiedKey = ref('');
const expandedKeys = ref(new Set());

async function loadPorts() {
  if (loading.value) return;
  loading.value = true;
  try {
    if (window.electronAPI?.listAllPorts) {
      const list = await window.electronAPI.listAllPorts();
      portsList.value = Array.isArray(list) ? list : [];
      emit('ports-updated', portsList.value);
    }
  } catch (err) {
    emit('notify', { icon: '!', msg: `加载端口列表失败: ${err.message}` });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadPorts();
});

const conflictCount = computed(() => {
  return portsList.value.filter((p) => p.isConflict).length;
});

const devCount = computed(() => {
  return portsList.value.filter((p) => p.category === 'dev' || p.category === 'project' || p.isConflict).length;
});

// Count of unique PIDs in system category
const systemGroupCount = computed(() => {
  const sysItems = portsList.value.filter((p) => p.category === 'system' && !p.isConflict);
  const pids = new Set(sysItems.map((i) => i.pid));
  return pids.size;
});

// Group system processes by PID so multi-port apps (WeChat, rapportd, ControlCenter) don't spam 5 rows
const displayedRows = computed(() => {
  let list = portsList.value;

  // 1. Category Filter
  if (activeCategory.value === 'conflict') {
    list = list.filter((p) => p.isConflict);
  } else if (activeCategory.value === 'dev') {
    list = list.filter((p) => p.category === 'dev' || p.category === 'project' || p.isConflict);
  } else if (activeCategory.value === 'system') {
    list = list.filter((p) => p.category === 'system' && !p.isConflict);
  }

  // 2. Search Query Filter
  const q = props.searchQuery.trim().toLowerCase();
  if (q) {
    const cleanQ = q.replace(/^:/, '');
    list = list.filter(
      (p) =>
        String(p.port).includes(cleanQ) ||
        (p.command && p.command.toLowerCase().includes(q)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        (p.serviceType && p.serviceType.toLowerCase().includes(q)) ||
        (p.fullCommand && p.fullCommand.toLowerCase().includes(q)) ||
        (p.cwd && p.cwd.toLowerCase().includes(q)) ||
        (p.projectName && p.projectName.toLowerCase().includes(q))
    );
  }

  // 3. Group system items that share the same PID into a single clean row with multiple port badges
  const rows = [];
  const sysPidMap = new Map();

  for (const item of list) {
    if (item.category === 'system' && !item.isConflict) {
      if (!sysPidMap.has(item.pid)) {
        const groupRow = {
          ...item,
          rowKey: `sys_${item.pid}`,
          ports: [item.port]
        };
        sysPidMap.set(item.pid, groupRow);
        rows.push(groupRow);
      } else {
        const existing = sysPidMap.get(item.pid);
        if (!existing.ports.includes(item.port)) {
          existing.ports.push(item.port);
        }
      }
    } else {
      rows.push({
        ...item,
        rowKey: `port_${item.port}`,
        ports: [item.port]
      });
    }
  }

  return rows;
});

function toggleExpand(rowKey) {
  const next = new Set(expandedKeys.value);
  if (next.has(rowKey)) {
    next.delete(rowKey);
  } else {
    next.add(rowKey);
  }
  expandedKeys.value = next;
}

function copyPortAddress(port) {
  const addr = `localhost:${port}`;
  navigator.clipboard.writeText(addr);
  emit('notify', { icon: '✓', msg: `已复制 ${addr}` });
}

async function handleKillPort(item) {
  if (killingPort.value) return;

  if (item.category === 'system' && !item.isConflict) {
    const ok = window.confirm(
      `提示: [${item.command}] 属于${item.serviceType || '桌面或系统进程'} (PID: ${item.pid}, 端口: ${item.ports.map((p) => ':' + p).join(', ')})。\n\n确认要终止该进程吗？`
    );
    if (!ok) return;
  }

  killingPort.value = item.port;
  try {
    if (window.electronAPI?.killPortProcess) {
      const res = await window.electronAPI.killPortProcess({ pid: item.pid, port: item.port });
      if (res && res.success) {
        emit('notify', { icon: '✓', msg: res.message || `已释放端口 :${item.port}` });
        await loadPorts();
      } else {
        emit('notify', { icon: '!', msg: res?.message || `释放端口 :${item.port} 失败` });
      }
    }
  } catch (err) {
    emit('notify', { icon: '✕', msg: `释放端口失败: ${err.message}` });
  } finally {
    killingPort.value = null;
  }
}

async function handleKillAllConflicts() {
  const conflicts = portsList.value.filter((p) => p.isConflict);
  if (conflicts.length === 0 || killingPort.value) return;
  for (const item of conflicts) {
    killingPort.value = item.port;
    try {
      await window.electronAPI?.killPortProcess({ pid: item.pid, port: item.port });
    } catch {}
  }
  killingPort.value = null;
  emit('notify', { icon: '✓', msg: `已释放全部 ${conflicts.length} 个冲突端口` });
  await loadPorts();
}

function openUrl(url) {
  if (window.electronAPI?.openUrl) {
    window.electronAPI.openUrl(url);
  } else {
    window.open(url, '_blank');
  }
}

function openFinder(pathStr) {
  if (!pathStr || pathStr === '/') return;
  if (window.electronAPI?.showInFinder) {
    window.electronAPI.showInFinder(pathStr);
  }
}

function copyText(text, key) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  copiedKey.value = key;
  emit('notify', { icon: '✓', msg: '已复制到剪贴板' });
  setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = '';
    }
  }, 2000);
}

defineExpose({
  loadPorts
});
</script>
