<template>
  <div
    class="h-screen w-screen flex flex-col overflow-hidden font-sans select-none relative transition-colors duration-300"
    :class="isDark ? 'bg-[#121214] text-zinc-100 dark' : 'bg-[#f6f4ee] text-zinc-800'"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Drag and Drop Frosted Overlay -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-98"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-98"
    >
      <div
        v-if="isDragging"
        class="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/45 backdrop-blur-md border-4 border-dashed border-emerald-500/80 m-4 rounded-3xl"
      >
        <div class="px-8 py-6 rounded-3xl bg-zinc-900/90 border border-emerald-500/40 shadow-2xl flex flex-col items-center space-y-3 text-center">
          <span class="text-5xl animate-bounce">📂</span>
          <div>
            <h3 class="text-base font-bold text-white tracking-wide">松开鼠标即可导入 Compose 项目</h3>
            <p class="text-xs text-zinc-400 mt-1">支持拖入项目根目录或 docker-compose.yml 配置文件</p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Ambient Atmospheric Lighting (Adapts to Light / Dark) -->
    <template v-if="!isDark">
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/4 -right-32 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 left-1/3 w-80 h-80 bg-stone-200/40 rounded-full blur-3xl pointer-events-none"></div>
    </template>
    <template v-else>
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 left-1/3 w-80 h-80 bg-zinc-700/20 rounded-full blur-3xl pointer-events-none"></div>
    </template>

    <!-- Top Spatial Header -->
    <Header
      ref="headerRef"
      v-model:searchQuery="searchQuery"
      :orb-running="orbRunning"
      :memory-m-b="stats.memoryMB"
      :active-count="runningCount"
      @toggle-orb="checkOrb"
      @add-project="showSyncModal = true"
      @import-project="showSyncModal = true"
    />

    <!-- Main Workspace Area: Sidebar Capsule + Main Stage -->
    <div class="flex-1 flex overflow-hidden relative z-10">
      <!-- Left Floating Vertical Capsule Dock (Ref 1 Inspiration) -->
      <SidebarCapsule
        v-model:currentView="currentView"
        :active-count="runningCount"
        :orb-running="orbRunning"
        :is-dark="isDark"
        :has-conflict="totalConflictsCount > 0"
        @toggle-theme="toggleTheme"
        @open-settings="showSettingsModal = true"
        @sync-orb="showSyncModal = true"
        @clean-cache="handleCleanCache"
        @export-config="handleExportWorkspace"
        @import-config="handleImportWorkspace"
      />

      <!-- Main Stage Area -->
      <main class="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        <!-- Hero System Bento Overview (Shown in Bento Mode) -->
        <BentoHeroStats
          v-if="currentView === 'bento'"
          :projects="projects"
          :active-count="runningCount"
          :memory-m-b="stats.memoryMB"
          @sleep-all="handleSleepAll"
          @clean-cache="handleCleanCache"
          @open-ports="currentView = 'ports'"
          @notify="e => toast(e.icon, e.msg)"
        />

        <!-- Section Title Bar & View Indicator (Shown for project views) -->
        <div v-if="currentView === 'bento' || currentView === 'launchpad'" class="mb-3 px-1 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <div class="flex items-center space-x-2">
            <span class="uppercase tracking-wider text-[10px] font-bold text-zinc-700 font-mono">
              {{ currentView === 'bento' ? '便当盒工程展台' : '应用启动台网格' }}
            </span>
            <span class="text-zinc-300">/</span>
            <span class="text-zinc-500 text-[11px] font-normal">
              {{ displayedProjects.length }} 个工程接入 · 支持微服务直出与一键 Exec
            </span>
          </div>

          <div class="flex items-center space-x-3 text-zinc-400 text-[10px]">
            <span class="flex items-center space-x-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"></span>
              <span>运行中</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
              <span>已休眠</span>
            </span>
          </div>
        </div>

        <!-- 1. Spatial Bento Grid View (Primary Mode) -->
        <div v-if="currentView === 'bento'" class="grid grid-cols-2 gap-3.5">
          <BentoProjectCard
            v-for="(proj, idx) in displayedProjects"
            :key="proj.id"
            :project="proj"
            :batch-mode="isBatchMode"
            :is-selected="selectedProjectIds.has(proj.id)"
            :has-conflict="getProjectConflicts(proj).length > 0"
            :conflicts-list="getProjectConflicts(proj)"
            :is-focused="focusedIndex === idx && !selectedProject && !showSyncModal"
            @open-detail="openDetail"
            @toggle-select="toggleSelectProject"
            @quick-open="handleOpenBrowser"
            @quick-start="handleStartProject"
            @stop-project="handleStopProject"
            @restart-project="handleRestartProject"
            @toggle-pin="handleTogglePin"
            @exec-container="handleExecContainerDirect"
            @card-contextmenu="handleProjectContextMenu"
            @kill-conflict="handleCardKillConflict"
            @notify="e => toast(e.icon, e.msg)"
          />
        </div>

        <!-- 2. Classic Launchpad Grid View (Secondary Mode) -->
        <div v-else-if="currentView === 'launchpad'" class="grid grid-cols-4 gap-y-7 gap-x-4 px-2 py-4">
          <AppIcon
            v-for="(proj, idx) in displayedProjects"
            :key="proj.id"
            :project="proj"
            :batch-mode="isBatchMode"
            :is-selected="selectedProjectIds.has(proj.id)"
            :has-conflict="getProjectConflicts(proj).length > 0"
            :conflicts-list="getProjectConflicts(proj)"
            :is-focused="focusedIndex === idx && !selectedProject && !showSyncModal"
            @open-detail="openDetail"
            @toggle-select="toggleSelectProject"
            @quick-open="handleOpenBrowser"
            @quick-start="handleStartProject"
            @toggle-pin="handleTogglePin"
            @card-contextmenu="handleProjectContextMenu"
          />
        </div>

        <!-- 3. Port Manager Embedded View (New Dedicated Mode) -->
        <div v-else-if="currentView === 'ports'">
          <PortManagerView
            v-model:searchQuery="searchQuery"
            @notify="e => toast(e.icon, e.msg)"
            @ports-updated="handlePortsUpdated"
          />
        </div>

        <!-- Empty State 1: Fresh Workspace Onboarding Card -->
        <div
          v-if="currentView !== 'ports' && totalProjectsCount === 0"
          class="my-8 p-8 rounded-3xl bg-white/70 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 shadow-lg backdrop-blur-md flex flex-col items-center justify-center text-center max-w-lg mx-auto"
        >
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 dark:from-emerald-950/60 dark:to-teal-900/40 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4 shadow-sm">
            ✨
          </div>
          <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-1">欢迎使用 Open-Easy 空间工作台</h3>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm leading-relaxed">
            当前工作区暂未添加任何本地 Docker Compose 项目。你可以一键同步 OrbStack 已部署服务，或直接导入本地工程目录。
          </p>
          <div class="flex items-center space-x-3">
            <button
              @click="showSyncModal = true"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <span>🔄</span>
              <span>同步 OrbStack 项目</span>
            </button>
            <button
              @click="handleFinderImport"
              class="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <span>📁</span>
              <span>导入本地目录</span>
            </button>
          </div>
        </div>

        <!-- Empty State 2: Filter/Search without match -->
        <div
          v-else-if="currentView !== 'ports' && displayedProjects.length === 0"
          class="h-56 flex flex-col items-center justify-center text-zinc-400 text-xs"
        >
          <span class="text-3xl mb-2">🔍</span>
          <span class="font-medium text-zinc-600 dark:text-zinc-300">未检索到匹配的微服务工程</span>
          <span class="text-[11px] text-zinc-400 mt-1">请尝试切换底部筛选标签或清除关键词</span>
        </div>
      </main>
    </div>

    <!-- Floating Bottom Action Capsule Dock (Ref 1 & 2 Bottom Pill Inspiration) -->
    <FloatingDock
      v-if="currentView !== 'ports'"
      v-model:activeFilter="activeFilter"
      :total-count="totalProjectsCount"
      :running-count="runningCount"
      :pinned-count="pinnedProjectsCount"
      :tags="allUniqueTags"
      :batch-mode="isBatchMode"
      :selected-count="selectedProjectIds.size"
      :is-all-selected="displayedProjects.length > 0 && selectedProjectIds.size === displayedProjects.length"
      @toggle-batch="toggleBatchMode"
      @batch-start="handleBatchStart"
      @batch-stop="handleBatchStop"
      @toggle-select-all="toggleSelectAll"
    />

    <!-- Centered Project Detail Modal (Spatial Glass Sheet) -->
    <ProjectDetailModal
      v-if="selectedProject"
      :project="selectedProject"
      :conflict-info="conflicts[selectedProject.frontendPort]"
      :conflicts-list="getProjectConflicts(selectedProject)"
      :starting-text="startingText"
      @close="selectedProject = null"
      @start-project="handleStartProject"
      @stop-project="handleStopProject"
      @restart-project="handleRestartProject"
      @open-browser="handleOpenBrowser"
      @open-editor="handleOpenEditor"
      @open-terminal="handleOpenTerminal"
      @show-finder="handleShowFinder"
      @kill-conflict-process="handleKillConflict"
      @update-url="handleUpdateUrl"
      @update-icon="handleUpdateIcon"
      @update-memo="handleUpdateMemo"
      @update-tags="handleUpdateTags"
      @remove-project="handleRemoveProject"
      @notify="e => toast(e.icon, e.msg)"
    />

    <!-- OrbStack Sync Modal -->
    <OrbStackSyncModal
      v-if="showSyncModal"
      :existing-projects="projects"
      @close="showSyncModal = false"
      @imported="handleProjectImported"
      @open-finder-import="handleFinderImport"
    />

    <!-- Preferences Settings Modal -->
    <SettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
      @saved="handleSettingsSaved"
      @theme-change="handleThemeModeChange"
      @export-config="handleExportWorkspace"
      @import-config="handleImportWorkspace"
      @sleep-all="handleSleepAll"
      @clean-cache="handleCleanCache"
    />

    <!-- Floating Glass Context Menu -->
    <div
      v-if="contextMenu.visible && contextMenu.project"
      class="fixed z-50 w-48 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 text-xs text-zinc-700 dark:text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <div class="px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate border-b border-zinc-100 dark:border-zinc-800 mb-1">
        {{ contextMenu.project.name }}
      </div>

      <!-- Start / Stop -->
      <button
        v-if="contextMenu.project.status === 'running'"
        @click="runMenuAction(() => handleStopProject(contextMenu.project))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>⏹</span>
        <span>停止运行</span>
      </button>
      <button
        v-else
        @click="runMenuAction(() => handleStartProject(contextMenu.project))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>▶</span>
        <span>启动项目</span>
      </button>

      <!-- Open in browser -->
      <button
        v-if="contextMenu.project.frontendUrl"
        @click="runMenuAction(() => handleOpenBrowser(contextMenu.project.frontendUrl))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>🌐</span>
        <span>在浏览器打开</span>
      </button>

      <!-- Open in default IDE -->
      <button
        @click="runMenuAction(() => handleOpenEditor(contextMenu.project.composePath))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>💻</span>
        <span>在默认 IDE 打开</span>
      </button>

      <!-- Open in terminal -->
      <button
        @click="runMenuAction(() => handleOpenTerminal(contextMenu.project.composePath))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>⚡</span>
        <span>在终端中打开</span>
      </button>

      <!-- Pin / Unpin -->
      <button
        @click="runMenuAction(() => handleTogglePin(contextMenu.project))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>📌</span>
        <span>{{ contextMenu.project.pinned ? '取消置顶' : '置顶项目' }}</span>
      </button>

      <div class="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>

      <!-- Remove project -->
      <button
        @click="runMenuAction(() => handleRemoveProject(contextMenu.project.id))"
        class="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 cursor-pointer transition-colors"
      >
        <span>🗑️</span>
        <span>从工作台移除</span>
      </button>
    </div>

    <!-- Non-intrusive Floating HUD Toast -->
    <HudToast ref="hudRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Header from './components/Header.vue';
import SidebarCapsule from './components/SidebarCapsule.vue';
import BentoHeroStats from './components/BentoHeroStats.vue';
import BentoProjectCard from './components/BentoProjectCard.vue';
import FloatingDock from './components/FloatingDock.vue';
import AppIcon from './components/AppIcon.vue';
import ProjectDetailModal from './components/ProjectDetailModal.vue';
import OrbStackSyncModal from './components/OrbStackSyncModal.vue';
import HudToast from './components/HudToast.vue';
import SettingsModal from './components/SettingsModal.vue';
import PortManagerView from './components/PortManagerView.vue';

const headerRef = ref(null);
const hudRef = ref(null);
const searchQuery = ref('');
const orbRunning = ref(true);
const projects = ref([]);
const selectedProject = ref(null);
const showSyncModal = ref(false);
const showSettingsModal = ref(false);
const conflicts = ref({});
const startingText = ref('正在启动并探活中...');
const stats = ref({ running: true, containerCount: 0, memoryMB: 0 });

// Batch Selection Mode State
const isBatchMode = ref(false);
const selectedProjectIds = ref(new Set());

// VisionOS Theme System (Light warm sand vs Dark obsidian vs Follow system)
const isDark = ref(false);
const themeMode = ref('system'); // 'light' | 'dark' | 'system'
const currentPollInterval = ref(5000);

function computeIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme(dark) {
  isDark.value = dark;
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  if (window.electronAPI?.setTheme) {
    window.electronAPI.setTheme(dark ? 'dark' : 'light');
  }
}

function handleThemeModeChange(mode) {
  themeMode.value = mode;
  localStorage.setItem('open-easy-theme-mode', mode);
  applyTheme(computeIsDark(mode));
}

function initTheme() {
  const savedMode = localStorage.getItem('open-easy-theme-mode');
  if (savedMode) {
    themeMode.value = savedMode;
  }
  applyTheme(computeIsDark(themeMode.value));

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', (e) => {
      if (themeMode.value === 'system') {
        applyTheme(e.matches);
      }
    });
  }
}

function toggleTheme() {
  const nextDark = !isDark.value;
  themeMode.value = nextDark ? 'dark' : 'light';
  localStorage.setItem('open-easy-theme-mode', themeMode.value);
  if (window.electronAPI?.updateSettings) {
    window.electronAPI.updateSettings({ themeMode: themeMode.value }).catch(() => {});
  }
  applyTheme(nextDark);
  toast(nextDark ? '🌙' : '☀️', `已切换至${nextDark ? '深色空间' : '暖色明亮'}主题`);
}

function handleSettingsSaved(newSettings) {
  toast('⚙️', '偏好设置已更新并生效');
  if (newSettings?.themeMode) {
    handleThemeModeChange(newSettings.themeMode);
  }
  if (newSettings?.pollInterval) {
    currentPollInterval.value = newSettings.pollInterval;
  }
}

// View modes & filters
const currentView = ref('bento'); // 'bento' | 'launchpad'
const activeFilter = ref('all'); // 'all' | 'running' | 'database' | 'pinned' | 'tag:xxx'
const focusedIndex = ref(0);

// Unique tags extracted from all projects
const allUniqueTags = computed(() => {
  const set = new Set();
  projects.value.forEach((p) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t) => {
        if (t && typeof t === 'string' && t.trim()) {
          set.add(t.trim());
        }
      });
    }
  });
  return Array.from(set);
});

// Filtered and sorted project list
const displayedProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = projects.value;

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tech.toLowerCase().includes(q) ||
        String(p.frontendPort).includes(q) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (activeFilter.value === 'running') {
    list = list.filter((p) => p.status === 'running');
  } else if (activeFilter.value === 'pinned') {
    list = list.filter((p) => p.pinned);
  } else if (activeFilter.value.startsWith('tag:')) {
    const targetTag = activeFilter.value.slice(4);
    list = list.filter((p) => Array.isArray(p.tags) && p.tags.includes(targetTag));
  }

  return [...list].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0;
    const pinB = b.pinned ? 1 : 0;
    return pinB - pinA;
  });
});

const totalProjectsCount = computed(() => projects.value.length);
const runningCount = computed(() => projects.value.filter((p) => p.status === 'running').length);
const pinnedProjectsCount = computed(() => projects.value.filter((p) => p.pinned).length);

// Extract all occupied port conflict diagnostics for a given project
function getProjectConflicts(proj) {
  if (!proj || !conflicts.value) return [];
  // If this project is running, its own listening containers are NOT an external conflict!
  if (proj.status === 'running') return [];

  const ports = Array.isArray(proj.hostPorts) && proj.hostPorts.length > 0
    ? proj.hostPorts
    : (proj.frontendPort ? [proj.frontendPort] : []);
  const list = [];
  for (const port of ports) {
    const c = conflicts.value[port];
    if (c && c.occupied) {
      list.push({ port, ...c });
    }
  }
  return list;
}

const totalConflictsCount = computed(() => {
  let count = 0;
  for (const p of projects.value) {
    count += getProjectConflicts(p).length;
  }
  return count;
});

// Floating Glass Context Menu State
const contextMenu = ref({ visible: false, x: 0, y: 0, project: null });

function handleProjectContextMenu(event, project) {
  event.preventDefault();
  event.stopPropagation();
  const menuWidth = 192;
  const menuHeight = 260;
  const x = Math.min(event.clientX, window.innerWidth - menuWidth - 10);
  const y = Math.min(event.clientY, window.innerHeight - menuHeight - 10);
  contextMenu.value = {
    visible: true,
    x: Math.max(10, x),
    y: Math.max(10, y),
    project
  };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function runMenuAction(action) {
  closeContextMenu();
  if (typeof action === 'function') {
    action();
  }
}

// Toast Helper
function toast(icon, msg, duration = 2400) {
  if (hudRef.value) {
    hudRef.value.show(icon, msg, duration);
  }
}

// Initial Data Load
async function checkOrb() {
  if (window.electronAPI) {
    const res = await window.electronAPI.checkOrbStatus();
    orbRunning.value = res.running;
    if (res.running) {
      toast('🟢', 'OrbStack 引擎运行中');
    } else {
      toast('⚪', 'OrbStack 已待机 (点击项目将自动自愈唤醒)');
    }
  }
}

let isRefreshing = false;
async function refreshProjects() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    if (window.electronAPI) {
      const list = await window.electronAPI.listProjects();
      projects.value = list;

      // Batch check port conflicts for all stopped projects in a single lsof call
      const portsToCheck = [];
      for (const p of list) {
        if (p.status !== 'running') {
          if (Array.isArray(p.hostPorts) && p.hostPorts.length > 0) {
            portsToCheck.push(...p.hostPorts);
          } else if (p.frontendPort) {
            portsToCheck.push(p.frontendPort);
          }
        }
      }

      if (window.electronAPI.checkPortsConflict && portsToCheck.length > 0) {
        const batchResults = await window.electronAPI.checkPortsConflict(portsToCheck);
        conflicts.value = batchResults || {};
      } else if (portsToCheck.length === 0) {
        conflicts.value = {};
      }

      // Refresh stats
      const s = await window.electronAPI.getStats();
      stats.value = s;
    }
  } catch (err) {
    console.warn('[Open-Easy] refreshProjects error:', err);
  } finally {
    isRefreshing = false;
  }
}

function openDetail(project) {
  selectedProject.value = project;
}

// Start Project with Auto-Healing & Browser Launch
async function handleStartProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  p.status = 'starting';
  if (!orbRunning.value) {
    startingText.value = '⚡ 正在自愈唤醒 OrbStack 引擎...';
    toast('⚡', '检测到 OrbStack 未启动，正在静默自愈唤醒中...', 3000);
  } else {
    startingText.value = '正在启动容器并探活中...';
    toast('🚀', `正在启动 [${p.name}] 容器服务...`, 2000);
  }

  try {
    const result = await window.electronAPI.startProject(p.id, p.composePath, p.frontendUrl);
    if (result.success) {
      p.status = 'running';
      orbRunning.value = true;
      if (result.autoHealed) {
        toast('✨', `OrbStack 已自愈！服务就绪，已直达前端网页`);
      } else {
        toast('🌐', `服务探活就绪 (${result.durationMs}ms)，已自动进入前端网页`);
      }
    } else {
      p.status = 'stopped';
      toast('❌', `启动失败: ${result.error || '未知错误'}`);
    }
  } catch (err) {
    p.status = 'stopped';
    toast('❌', `启动发生异常: ${err.message}`);
  } finally {
    await refreshProjects();
    if (selectedProject.value && selectedProject.value.id === p.id) {
      selectedProject.value = { ...p };
    }
  }
}

// Stop Project
async function handleStopProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  toast('⏳', `正在停止 [${p.name}] 容器...`);
  await window.electronAPI.stopProject(p.id, p.composePath);
  p.status = 'stopped';
  toast('⏹', `[${p.name}] 容器已停止并释放系统资源`);
  await refreshProjects();
  if (selectedProject.value && selectedProject.value.id === p.id) {
    selectedProject.value = { ...p };
  }
}

// Restart Project
async function handleRestartProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  p.status = 'starting';
  startingText.value = '正在重启容器并探活...';
  toast('🔄', `正在重启 [${p.name}]...`);
  await window.electronAPI.restartProject(p.id, p.composePath);
  await refreshProjects();
  toast('✨', `[${p.name}] 重启成功`);
  if (selectedProject.value && selectedProject.value.id === p.id) {
    selectedProject.value = { ...p };
  }
}

// Sleep All Projects
async function handleSleepAll() {
  const running = projects.value.filter((p) => p.status === 'running');
  if (running.length === 0) {
    toast('💤', '当前没有运行中的容器需要休眠');
    return;
  }
  toast('🌙', '正在一键休眠所有运行容器...');
  const res = await window.electronAPI.sleepAll();
  await refreshProjects();
  toast('✨', `已休眠 ${res.stoppedCount || running.length} 个项目，已释放 OrbStack 内存与 CPU`);
  if (selectedProject.value) {
    const updated = projects.value.find((p) => p.id === selectedProject.value.id);
    if (updated) selectedProject.value = { ...updated };
  }
}

// Clean Cache & Prune
async function handleCleanCache() {
  toast('🧹', '正在清理未引用镜像与构建缓存...');
  try {
    await window.electronAPI.pruneSystem();
    toast('✨', 'OrbStack 缓存清理完成，已回收磁盘空间');
    await refreshProjects();
  } catch (err) {
    toast('⚠️', '清理失败: ' + err.message);
  }
}

function handleOpenBrowser(url) {
  if (window.electronAPI) {
    window.electronAPI.openUrl(url);
    toast('🌐', `已在默认浏览器中打开: ${url}`);
  }
}

function handleOpenEditor(composePath, editor = undefined) {
  if (window.electronAPI) {
    window.electronAPI.openInEditor(composePath, editor);
    toast('💻', '已在代码编辑器中打开项目目录');
  }
}

function handleOpenTerminal(composePath) {
  if (window.electronAPI) {
    window.electronAPI.openInTerminal(composePath);
    toast('⚡', '已在 macOS 终端中打开项目目录');
  }
}

function handleShowFinder(composePath) {
  if (window.electronAPI) {
    window.electronAPI.showInFinder(composePath);
    toast('📁', '已在访达中显示项目目录');
  }
}

async function handleExecContainerDirect(containerName) {
  if (!containerName || !window.electronAPI?.execContainer) return;
  try {
    await window.electronAPI.execContainer(containerName);
    toast('⚡', `已调起终端并进入容器 [${containerName}]`);
  } catch (err) {
    toast('⚠️', `打开容器终端失败: ${err.message}`);
  }
}

async function handleKillConflict(target) {
  if (window.electronAPI) {
    const res = await window.electronAPI.killPortProcess(target);
    if (res && res.success) {
      toast('✨', res.message || '占用进程已终止，端口已成功释放！');
      await refreshProjects();
    } else {
      toast('⚠️', '释放端口失败: ' + (res?.message || '未知原因'));
    }
  }
}

async function handleCardKillConflict(project) {
  const confs = getProjectConflicts(project);
  if (confs.length === 0) return;
  const portsStr = confs.map((c) => `:${c.port}`).join(', ');
  toast('⏳', `正在彻底释放端口 ${portsStr}...`);
  for (const c of confs) {
    await handleKillConflict({ pid: c.pid, port: c.port });
  }
}

async function handlePortsUpdated() {
  await loadProjects();
}

async function handleUpdateUrl({ id, url }) {
  if (window.electronAPI) {
    await window.electronAPI.updateProject(id, { frontendUrl: url });
    const p = projects.value.find((item) => item.id === id);
    if (p) p.frontendUrl = url;
    toast('✏️', `前端打开地址已更新为: ${url}`);
  }
}

async function handleUpdateIcon({ id, updates }) {
  if (window.electronAPI) {
    const cleanUpdates = JSON.parse(JSON.stringify(updates));
    await window.electronAPI.updateProject(id, cleanUpdates);
    const p = projects.value.find((item) => item.id === id);
    if (p) {
      Object.assign(p, cleanUpdates);
    }
    if (selectedProject.value && selectedProject.value.id === id) {
      selectedProject.value = { ...selectedProject.value, ...cleanUpdates };
    }
    toast('🎨', '项目自定义图标已更新并保存');
    await refreshProjects();
  }
}

async function handleUpdateMemo({ id, memo }) {
  if (window.electronAPI) {
    await window.electronAPI.updateProject(id, { memo });
    const p = projects.value.find((item) => item.id === id);
    if (p) {
      p.memo = memo;
    }
    if (selectedProject.value && selectedProject.value.id === id) {
      selectedProject.value = { ...selectedProject.value, memo };
    }
    toast('📋', '工程便签已成功保存');
  }
}

// Project Workspace Tags Update
async function handleUpdateTags({ id, tags }) {
  if (!window.electronAPI?.updateProjectTags) return;
  try {
    await window.electronAPI.updateProjectTags(id, tags);
    const target = projects.value.find((p) => p.id === id);
    if (target) {
      target.tags = tags;
    }
    if (selectedProject.value && selectedProject.value.id === id) {
      selectedProject.value = { ...selectedProject.value, tags };
    }
    toast('🏷️', '项目分类标签已更新并保存');
  } catch (err) {
    toast('❌', `更新标签失败: ${err.message}`);
  }
}

// Batch Mode Actions
function toggleBatchMode() {
  isBatchMode.value = !isBatchMode.value;
  if (!isBatchMode.value) {
    selectedProjectIds.value = new Set();
  } else {
    toast('⚡', '已开启多选批量模式，可点选项目批量启动或停止');
  }
}

function toggleSelectProject(id) {
  const next = new Set(selectedProjectIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedProjectIds.value = next;
}

function toggleSelectAll() {
  if (selectedProjectIds.value.size === displayedProjects.value.length) {
    selectedProjectIds.value = new Set();
  } else {
    selectedProjectIds.value = new Set(displayedProjects.value.map((p) => p.id));
  }
}

async function handleBatchStart() {
  const targetList = projects.value.filter((p) => selectedProjectIds.value.has(p.id));
  if (targetList.length === 0) return;
  toast('🚀', `正在批量启动 ${targetList.length} 个项目...`);
  const results = await Promise.allSettled(targetList.map((p) => handleStartProject(p)));
  const count = results.filter((r) => r.status === 'fulfilled').length;
  toast('✨', `批量启动已执行完毕，共拉起 ${count}/${targetList.length} 个项目`);
  isBatchMode.value = false;
  selectedProjectIds.value = new Set();
  await refreshProjects();
}

async function handleBatchStop() {
  const targetList = projects.value.filter((p) => selectedProjectIds.value.has(p.id));
  if (targetList.length === 0) return;
  toast('⏹', `正在批量停止 ${targetList.length} 个项目...`);
  const results = await Promise.allSettled(targetList.map((p) => handleStopProject(p)));
  const count = results.filter((r) => r.status === 'fulfilled').length;
  toast('✨', `批量停止已执行完毕，已休眠 ${count}/${targetList.length} 个项目`);
  isBatchMode.value = false;
  selectedProjectIds.value = new Set();
  await refreshProjects();
}

async function handleExportWorkspace() {
  if (window.electronAPI?.exportWorkspace) {
    const res = await window.electronAPI.exportWorkspace();
    if (res && res.success) {
      toast('📦', '工作台配置已成功导出备份！');
    } else if (res && res.error) {
      toast('⚠️', '导出配置失败: ' + res.error);
    }
  }
}

async function handleImportWorkspace() {
  if (window.electronAPI?.importWorkspace) {
    const res = await window.electronAPI.importWorkspace();
    if (res && res.success) {
      toast('✨', `成功导入并同步了 ${res.count} 个工程配置！`);
      await refreshProjects();
    } else if (res && res.error) {
      toast('⚠️', '导入配置失败: ' + res.error);
    }
  }
}


async function handleProjectImported(project) {
  await refreshProjects();
  if (project) {
    toast('✨', `成功将 [${project.name}] 添加到工作台！`);
    const added = projects.value.find((p) => p.id === project.id || p.composePath === project.composePath);
    if (added) {
      selectedProject.value = added;
    }
    showSyncModal.value = false;
  } else {
    toast('✨', '已将所有未添加的已部署项目加入工作台！');
    showSyncModal.value = false;
  }
}

async function handleFinderImport() {
  if (window.electronAPI) {
    const res = await window.electronAPI.importProject();
    if (!res || res.canceled) return;
    if (res.error) {
      toast('⚠️', res.error, 3000);
      return;
    }
    toast('✨', `成功导入本地 Compose 项目 [${res.project.name}]！`);
    await refreshProjects();
    const added = projects.value.find((p) => p.id === res.project.id);
    if (added) {
      selectedProject.value = added;
      showSyncModal.value = false;
    }
  }
}

// Global Drag & Drop Compose Project Import
const isDragging = ref(false);
let dragCounter = 0;

function handleDragEnter(e) {
  e.preventDefault();
  dragCounter++;
  isDragging.value = true;
}

function handleDragOver(e) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(e) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    isDragging.value = false;
    dragCounter = 0;
  }
}

async function handleDrop(e) {
  e.preventDefault();
  isDragging.value = false;
  dragCounter = 0;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const item = files[0];
  const droppedPath = item.path;
  if (!droppedPath) return;

  if (window.electronAPI?.importProjectPath) {
    try {
      const res = await window.electronAPI.importProjectPath(droppedPath);
      if (res && res.success) {
        toast('🎉', `成功导入项目 [${res.project.name}]！`);
        await refreshProjects();
        const added = projects.value.find((p) => p.id === res.project.id);
        if (added) {
          selectedProject.value = added;
        }
      } else {
        toast('⚠️', `导入失败: ${res?.error || '无法识别该项目目录'}`);
      }
    } catch (err) {
      toast('⚠️', `导入异常: ${err.message}`);
    }
  }
}

async function handleRemoveProject(id) {
  if (window.electronAPI) {
    const p = projects.value.find((item) => item.id === id);
    const name = p?.name || '项目';
    await window.electronAPI.removeProject(id);
    selectedProject.value = null;
    await refreshProjects();
    toast('🗑️', `已将 [${name}] 从工作台网格移除`);
  }
}

async function handleTogglePin(project) {
  if (!window.electronAPI) return;
  const newPinned = !project.pinned;
  await window.electronAPI.updateProject(project.id, { pinned: newPinned });
  project.pinned = newPinned;
  toast(newPinned ? '📌' : '📍', newPinned ? `已置顶项目 [${project.name}] 到最前排` : `已取消置顶 [${project.name}]`);
}

function handleKeyDown(e) {
  // If user is actively typing in search or an input box, let standard typing proceed
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    if (e.key === 'Escape') {
      document.activeElement?.blur();
    }
    return;
  }

  if (e.key === 'Escape') {
    if (contextMenu.value.visible) {
      closeContextMenu();
    } else if (showSettingsModal.value) {
      showSettingsModal.value = false;
    } else if (showSyncModal.value) {
      showSyncModal.value = false;
    } else if (selectedProject.value) {
      selectedProject.value = null;
    }
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    headerRef.value?.focusSearch();
  } else if (!selectedProject.value && !showSyncModal.value) {
    const total = displayedProjects.value.length;
    if (total === 0) return;

    const cols = currentView.value === 'bento' ? 2 : 4;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusedIndex.value = (focusedIndex.value + 1) % total;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusedIndex.value = (focusedIndex.value - 1 + total) % total;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focusedIndex.value + cols < total) {
        focusedIndex.value += cols;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedIndex.value - cols >= 0) {
        focusedIndex.value -= cols;
      }
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const target = displayedProjects.value[focusedIndex.value];
      if (target) {
        openDetail(target);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = displayedProjects.value[focusedIndex.value];
      if (target) {
        if (target.status === 'running') {
          handleOpenBrowser(target.frontendUrl);
        } else {
          handleStartProject(target);
        }
      }
    }
  }
}

async function onWindowFocus() {
  await checkOrb();
  await refreshProjects();
}

let pollTimer = null;
let unsubRefreshed = null;

onMounted(async () => {
  initTheme();
  await checkOrb();
  await refreshProjects();

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', closeContextMenu);
  window.addEventListener('focus', onWindowFocus);

  if (window.electronAPI?.getSettings) {
    try {
      const s = await window.electronAPI.getSettings();
      if (s) {
        if (s.themeMode && !localStorage.getItem('open-easy-theme-mode')) {
          themeMode.value = s.themeMode;
          applyTheme(computeIsDark(s.themeMode));
        }
        if (s.defaultView) {
          currentView.value = s.defaultView;
        }
        if (s.pollInterval) {
          currentPollInterval.value = s.pollInterval;
        }
      }
    } catch {}
  }

  if (window.electronAPI?.onProjectsRefreshed) {
    unsubRefreshed = window.electronAPI.onProjectsRefreshed(() => {
      refreshProjects();
    });
  }

  // Background adaptive sync (dynamic poll interval, 2s when any project is starting)
  function scheduleNextPoll() {
    if (pollTimer) clearTimeout(pollTimer);
    const hasStarting = projects.value.some((p) => p.status === 'starting');
    const delay = hasStarting ? 2000 : (currentPollInterval.value || 5000);
    pollTimer = setTimeout(async () => {
      if (document.visibilityState === 'visible') {
        await refreshProjects();
      }
      scheduleNextPoll();
    }, delay);
  }
  scheduleNextPoll();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('click', closeContextMenu);
  window.removeEventListener('focus', onWindowFocus);
  if (pollTimer) clearTimeout(pollTimer);
  if (unsubRefreshed) unsubRefreshed();
});
</script>
