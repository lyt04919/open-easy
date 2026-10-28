<template>
  <div class="grid grid-cols-12 gap-3 mb-4 select-none">
    <!-- 1. Circular Progress Gauge Bento (4 cols) -->
    <div class="col-span-4 glass-card rounded-2xl p-3.5 flex flex-col justify-between">
      <div class="flex items-center justify-between text-[11px] font-medium text-zinc-500 mb-2">
        <span class="flex items-center space-x-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"></span>
          <span class="font-semibold text-zinc-800 dark:text-zinc-100">系统与容器负载</span>
        </span>
        <span class="text-[10px] font-mono text-zinc-400">OrbStack</span>
      </div>

      <div class="flex items-center justify-around py-1">
        <!-- Circular Gauge 1: Active Containers Rate -->
        <div class="flex flex-col items-center">
          <div class="relative w-16 h-16 flex items-center justify-center">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <!-- Background ring -->
              <path
                class="text-zinc-200/80 dark:text-zinc-700/60"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <!-- Progress ring -->
              <path
                class="text-emerald-500 transition-all duration-700 ease-out"
                :stroke-dasharray="`${activeRate}, 100`"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-100 leading-none">{{ activeCount }}</span>
              <span class="text-[8px] text-zinc-400 font-sans mt-0.5">运行中</span>
            </div>
          </div>
          <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">微服务状态</span>
        </div>

        <!-- Circular Gauge 2: Memory Load -->
        <div class="flex flex-col items-center">
          <div class="relative w-16 h-16 flex items-center justify-center">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <!-- Background ring -->
              <path
                class="text-zinc-200/80 dark:text-zinc-700/60"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <!-- Progress ring -->
              <path
                class="text-zinc-800 dark:text-zinc-200 transition-all duration-700 ease-out"
                :stroke-dasharray="`${memoryRate}, 100`"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-100 leading-none">{{ memoryMB }}</span>
              <span class="text-[8px] text-zinc-400 font-sans mt-0.5">MB 内存</span>
            </div>
          </div>
          <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">容器开销</span>
        </div>
      </div>

      <div class="mt-2 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
        <span>点击自动唤醒</span>
        <span class="font-mono text-zinc-500 dark:text-zinc-400">{{ totalProjects }} 个工程</span>
      </div>
    </div>

    <!-- 2. Command Bento (Extended to 5 cols for unconstrained buttons) -->
    <div class="col-span-5 glass-card rounded-2xl p-3.5 flex flex-col justify-between">
      <div class="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
        <span class="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 8 4 4-4 4" /><path d="M15 16h-2" />
          </svg>
          <span>开发控制中心</span>
        </span>
        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700">Studio</span>
      </div>

      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-2">
        {{ activeCount > 0 ? `当前有 ${activeCount} 个微服务正在常驻运行` : '容器环境已整体处于健康待机休眠' }}
      </p>

      <!-- Quick Action Buttons Inside Bento Card (Spacious 3 cols with nowrap) -->
      <div class="grid grid-cols-3 gap-2">
        <button
          @click="$emit('sleep-all')"
          :disabled="activeCount === 0"
          :class="activeCount > 0 
            ? 'bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700/70 active:scale-[0.98] cursor-pointer' 
            : 'bg-zinc-100/50 dark:bg-zinc-800/30 text-zinc-400 dark:text-zinc-600 border-zinc-200/40 dark:border-zinc-800/50 cursor-not-allowed'"
          class="py-2 px-2 rounded-xl text-[11px] font-medium border transition-all flex items-center justify-center space-x-1.5 shadow-2xs whitespace-nowrap"
          title="将所有运行中的微服务容器安全停止并释放内存"
        >
          <svg class="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <span class="whitespace-nowrap">一键休眠</span>
        </button>

        <button
          @click="$emit('clean-cache')"
          class="bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70 py-2 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer shadow-2xs whitespace-nowrap"
          title="清除 Docker 悬空构建缓存与临时镜像"
        >
          <svg class="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span class="whitespace-nowrap">清理缓存</span>
        </button>

        <button
          @click="$emit('open-ports')"
          class="bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70 py-2 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer shadow-2xs whitespace-nowrap"
          title="查看与管理本机占用端口"
        >
          <svg class="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 2v6" /><path d="M18 8v5a6 6 0 0 1-12 0V8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
          </svg>
          <span class="whitespace-nowrap">端口监控</span>
        </button>
      </div>

      <div class="mt-2 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
        <span class="truncate pr-1">快捷键: ⌘+Shift+O</span>
        <span class="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light shrink-0"></span>
          <span>Docker 引擎正常</span>
        </span>
      </div>
    </div>

    <!-- 3. Database Microservices Radar Bento -->
    <div class="col-span-3 glass-card rounded-2xl p-3.5 flex flex-col justify-between">
      <div class="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
        <span class="flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
          </svg>
          <span class="font-semibold text-zinc-800 dark:text-zinc-100">数据库雷达</span>
        </span>
        <span class="text-[10px] font-mono text-zinc-400">{{ detectedDatabases.length }} 个识别</span>
      </div>

      <!-- Database Items (Scrollable fixed height container) -->
      <div class="space-y-1 my-auto overflow-y-auto max-h-[76px] pr-0.5">
        <div
          v-if="detectedDatabases.length === 0"
          class="text-[10px] text-zinc-400 py-2 text-center"
        >
          支持自动识别 Postgres/MySQL/Redis
        </div>
        <div
          v-for="(db, idx) in detectedDatabases"
          :key="idx"
          class="flex items-center justify-between text-[10px] bg-white/70 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg px-2 py-1 shadow-2xs"
        >
          <div class="truncate flex items-center space-x-1.5 mr-1">
            <!-- 实时运行状态圆点 (运行中绿灯 / 已休眠灰点) -->
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
              :class="db.isRunning ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]' : 'bg-zinc-300 dark:bg-zinc-600'"
              :title="db.isRunning ? '运行中 (Running)' : '已休眠 (Stopped)'"
            ></span>
            <!-- 数据库图标 -->
            <span class="shrink-0">{{ db.icon }}</span>
            <!-- 服务名 -->
            <span class="truncate font-medium text-zinc-700 dark:text-zinc-300">{{ db.name }}</span>
            <!-- 所属项目名简称 -->
            <span
              v-if="db.projectName"
              class="text-[9px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[60px] shrink-0"
              :title="`所属项目: ${db.projectName}`"
            >
              {{ db.projectName }}
            </span>
          </div>

          <button
            @click="copyUri(db.uri)"
            class="text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded transition-colors cursor-pointer shrink-0 font-medium border border-indigo-200/60 dark:border-indigo-800/50"
            title="复制数据库连接串"
          >
            {{ copiedUri === db.uri ? '已复制' : '复制' }}
          </button>
        </div>
      </div>


      <div class="mt-1 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
        <span>点击右侧按钮一键复制连接 URI</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { detectDatabaseService } from '../utils/databaseHelper.js';

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  activeCount: {
    type: Number,
    default: 0
  },
  memoryMB: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['sleep-all', 'clean-cache', 'notify', 'open-ports']);

const copiedUri = ref('');

const totalProjects = computed(() => props.projects.length);

const activeRate = computed(() => {
  if (totalProjects.value === 0) return 0;
  return Math.min(100, Math.round((props.activeCount / totalProjects.value) * 100));
});

const memoryRate = computed(() => {
  // Rough percentage against 4GB threshold
  return Math.min(100, Math.max(5, Math.round((props.memoryMB / 4096) * 100)));
});

// Scan all project services for detected databases (Prioritizes real extracted p.databases)
const detectedDatabases = computed(() => {
  const list = [];
  for (const p of props.projects) {
    const isProjRunning = p.status === 'running';
    const projName = p.name || 'Unnamed';

    if (p.databases && p.databases.length > 0) {
      for (const d of p.databases) {
        const matchedContainer = (p.containers || []).find(
          (c) => c.service === d.service || c.name?.includes(d.service)
        );
        const isRunning = matchedContainer
          ? Boolean(matchedContainer.state && matchedContainer.state.toLowerCase().includes('up'))
          : isProjRunning;

        list.push({
          name: d.service,
          projectName: projName,
          isRunning,
          ...d
        });
      }
    } else if (p.containers && p.containers.length > 0) {
      for (const c of p.containers) {
        const info = detectDatabaseService(c.service || c.name, c.ports, '', p.orbProjectName || '', c.image || '');
        if (info.isDb) {
          const isRunning = Boolean(c.state && c.state.toLowerCase().includes('up'));
          list.push({
            name: c.service || c.name,
            projectName: projName,
            isRunning,
            ...info
          });
        }
      }
    } else if (p.services && p.services.length > 0) {
      for (const s of p.services) {
        const info = detectDatabaseService(s, '', '', p.orbProjectName || '');
        if (info.isDb) {
          list.push({
            name: s,
            projectName: projName,
            isRunning: isProjRunning,
            ...info
          });
        }
      }
    }
  }
  return list;
});


function copyUri(uri) {
  if (!uri) return;
  navigator.clipboard.writeText(uri);
  copiedUri.value = uri;
  emit('notify', { icon: '📋', msg: `已复制数据库连接串: ${uri}` });
  setTimeout(() => {
    if (copiedUri.value === uri) {
      copiedUri.value = '';
    }
  }, 2000);
}
</script>
