<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 select-none window-no-drag transition-all max-w-[94vw]">
    <div class="capsule-dock-dark rounded-full px-3 py-1.5 flex items-center space-x-2.5 shadow-2xl border border-white/20 overflow-x-auto scrollbar-none">
      <!-- Standard Filter Pills -->
      <div class="flex items-center space-x-1 text-[11px] font-medium shrink-0">
        <button
          @click="$emit('update:activeFilter', 'all')"
          :class="activeFilter === 'all' ? 'bg-white/25 text-white shadow-xs font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded-full transition-all cursor-pointer"
        >
          <span>全部 ({{ totalCount }})</span>
        </button>

        <button
          @click="$emit('update:activeFilter', 'running')"
          :class="activeFilter === 'running' ? 'bg-emerald-500/80 text-white shadow-xs font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center space-x-1"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>运行中 ({{ runningCount }})</span>
        </button>

        <button
          v-if="pinnedCount > 0"
          @click="$emit('update:activeFilter', 'pinned')"
          :class="activeFilter === 'pinned' ? 'bg-amber-500/80 text-white shadow-xs font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>📌</span>
          <span>置顶 ({{ pinnedCount }})</span>
        </button>
      </div>

      <!-- Custom Project Category Tag Pills -->
      <div v-if="tags && tags.length > 0" class="flex items-center space-x-1 border-l border-white/20 pl-2 shrink-0">
        <button
          v-for="t in tags"
          :key="t"
          @click="$emit('update:activeFilter', activeFilter === `tag:${t}` ? 'all' : `tag:${t}`)"
          :class="activeFilter === `tag:${t}` ? 'bg-indigo-500/90 text-white font-semibold shadow-xs' : 'text-white/60 hover:text-white hover:bg-white/10'"
          class="px-2 py-0.5 rounded-full text-[10px] transition-all cursor-pointer"
        >
          #{{ t }}
        </button>
      </div>

      <!-- Batch Actions Section -->
      <div class="flex items-center space-x-1.5 border-l border-white/20 pl-2 shrink-0">
        <template v-if="batchMode">
          <span class="text-[10px] text-emerald-400 font-mono font-semibold px-1">
            已选 {{ selectedCount }}
          </span>

          <button
            @click="$emit('batch-start')"
            :disabled="selectedCount === 0"
            class="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-[10px] font-medium transition-all cursor-pointer shadow-xs flex items-center space-x-1"
            title="批量启动所有已选项目"
          >
            <span>▶</span>
            <span>启动</span>
          </button>

          <button
            @click="$emit('batch-stop')"
            :disabled="selectedCount === 0"
            class="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-[10px] font-medium transition-all cursor-pointer shadow-xs flex items-center space-x-1"
            title="批量停止所有已选项目"
          >
            <span>⏹</span>
            <span>停止</span>
          </button>

          <button
            @click="$emit('toggle-select-all')"
            class="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-[10px] transition-all cursor-pointer"
          >
            {{ isAllSelected ? '清空' : '全选' }}
          </button>

          <button
            @click="$emit('toggle-batch')"
            class="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] transition-all cursor-pointer"
          >
            退出
          </button>
        </template>

        <button
          v-else
          @click="$emit('toggle-batch')"
          class="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[10px] font-medium transition-all cursor-pointer flex items-center space-x-1"
          title="开启多选批量启动或停止工作流"
        >
          <span>⚡</span>
          <span>批量</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeFilter: {
    type: String,
    default: 'all' // 'all' | 'running' | 'database' | 'pinned' | 'tag:xxx'
  },
  totalCount: {
    type: Number,
    default: 0
  },
  runningCount: {
    type: Number,
    default: 0
  },
  pinnedCount: {
    type: Number,
    default: 0
  },
  tags: {
    type: Array,
    default: () => []
  },
  batchMode: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  isAllSelected: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'update:activeFilter',
  'toggle-batch',
  'batch-start',
  'batch-stop',
  'toggle-select-all'
]);
</script>
