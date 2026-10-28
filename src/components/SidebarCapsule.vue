<template>
  <aside class="flex flex-col items-center justify-between py-4 px-2 w-16 h-full select-none window-no-drag shrink-0 z-30">
    <!-- Top Nav Actions Capsule (3 Core Nav items with 9px micro-labels) -->
    <div class="capsule-dock rounded-2xl p-1.5 flex flex-col items-center space-y-2 shadow-sm">
      <!-- 1. Bento Dashboard Mode Button -->
      <button
        @click="$emit('update:currentView', 'bento')"
        :class="currentView === 'bento' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/80 dark:hover:bg-zinc-800/80'"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group relative"
        title="便当盒工程展台视图"
      >
        <svg class="w-4 h-4 transition-transform group-hover:scale-105" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">展台</span>
      </button>

      <!-- 2. Launchpad Grid Mode Button -->
      <button
        @click="$emit('update:currentView', 'launchpad')"
        :class="currentView === 'launchpad' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/80 dark:hover:bg-zinc-800/80'"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group relative"
        title="极简应用图标启动台"
      >
        <svg class="w-4 h-4 transition-transform group-hover:scale-105" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">图标</span>
      </button>

      <!-- 3. Port Manager Mode Button (Placed right beside 图标) -->
      <button
        @click="$emit('update:currentView', 'ports')"
        :class="currentView === 'ports' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/80 dark:hover:bg-zinc-800/80'"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group relative"
        title="本机端口全景雷达与管理"
      >
        <svg class="w-4 h-4 transition-transform group-hover:scale-105" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 2v6" />
          <path d="M18 8v5a6 6 0 0 1-12 0V8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">端口</span>
        <span
          v-if="hasConflict"
          class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
          title="存在项目端口冲突"
        ></span>
      </button>

      <!-- Subtle Divider -->
      <div class="w-5 h-px bg-zinc-200/80 dark:bg-zinc-700/80"></div>

      <!-- 4. OrbStack Quick Sync -->
      <button
        @click="$emit('sync-orb')"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group"
        title="从 OrbStack 自动发现并同步已部署项目"
      >
        <svg class="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">同步</span>
      </button>
    </div>

    <!-- Bottom Capsule: Settings and Apple Glass Theme Switcher with 9px micro-labels -->
    <div class="capsule-dock rounded-2xl p-1.5 flex flex-col items-center space-y-1.5 mt-auto shadow-sm">
      <!-- Settings Trigger -->
      <button
        @click="$emit('open-settings')"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
        title="工作台偏好设置与数据备份"
      >
        <svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">设置</span>
      </button>

      <!-- Theme Switcher -->
      <button
        @click="$emit('toggle-theme')"
        class="w-11 py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group active:scale-95"
        :class="isDark ? 'text-amber-300 hover:text-amber-200 hover:bg-white/10' : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5'"
        :title="isDark ? '切换为明亮空间主题' : '切换为深色空间主题'"
      >
        <svg
          v-if="!isDark"
          class="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <svg
          v-else
          class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 text-amber-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <span class="text-[9px] font-medium leading-none mt-1">主题</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  currentView: {
    type: String,
    default: 'bento' // 'bento' | 'launchpad' | 'ports'
  },
  activeCount: {
    type: Number,
    default: 0
  },
  orbRunning: {
    type: Boolean,
    default: true
  },
  isDark: {
    type: Boolean,
    default: false
  },
  hasConflict: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:currentView', 'sync-orb', 'toggle-theme', 'open-settings', 'open-ports']);
</script>
