<template>
  <header class="h-14 px-5 flex items-center justify-between select-none window-drag z-20 shrink-0">
    <!-- Left: traffic light offset + app title -->
    <div class="flex items-center space-x-3 pl-16">
      <div class="flex items-center space-x-2">
        <span class="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight font-sans">Open-Easy</span>
        <span class="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-semibold">Studio</span>
      </div>
    </div>

    <!-- Center: Floating Spatial Frosted Search Capsule (no-drag) -->
    <div class="relative w-72 window-no-drag">
      <div class="capsule-dock rounded-full px-3 py-1 flex items-center space-x-2 shadow-xs transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white dark:focus-within:bg-zinc-800/90">
        <span class="text-zinc-400 text-xs pointer-events-none select-none">🔍</span>
        <input
          ref="searchInputRef"
          type="text"
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)"
          placeholder="搜索项目、微服务或端口... (⌘F)"
          class="w-full bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none cursor-text font-normal"
        />
        <button
          v-if="searchQuery"
          @click="$emit('update:searchQuery', '')"
          class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[11px] rounded-full w-4 h-4 flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Right: Engine Status Capsule & Quick Import (no-drag) -->
    <div class="flex items-center space-x-2.5 window-no-drag">
      <!-- OrbStack Status Pill -->
      <button
        @click="$emit('toggle-orb')"
        :title="orbRunning ? 'OrbStack 引擎运行中 (点击自愈体检)' : 'OrbStack 引擎已待机 (点击自动自愈唤醒)'"
        class="capsule-dock hover:bg-white dark:hover:bg-zinc-800 flex items-center space-x-2 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer shadow-xs"
      >
        <span
          class="w-2 h-2 rounded-full transition-all"
          :class="orbRunning ? 'bg-emerald-500 led-green-light' : 'bg-zinc-400'"
        ></span>
        <span class="text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
          {{ orbRunning ? (memoryMB ? `${memoryMB} MB` : '运行中') : '已待机' }}
        </span>
      </button>

      <!-- Add Project Button -->
      <button
        @click="$emit('add-project')"
        class="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-full text-[11px] font-medium shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
        title="添加或同步 Docker Compose 项目"
      >
        <span>+</span>
        <span>添加项目</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  searchQuery: {
    type: String,
    default: ''
  },
  orbRunning: {
    type: Boolean,
    default: true
  },
  memoryMB: {
    type: Number,
    default: 0
  },
  activeCount: {
    type: Number,
    default: 0
  }
});

defineEmits(['update:searchQuery', 'sleep-all', 'toggle-orb', 'add-project', 'import-project']);

const searchInputRef = ref(null);

function focusSearch() {
  if (searchInputRef.value) {
    searchInputRef.value.focus();
    searchInputRef.value.select();
  }
}

defineExpose({ focusSearch });
</script>
