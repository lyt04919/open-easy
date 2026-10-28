<template>
  <div v-if="show" class="mb-4 bg-zinc-900 text-zinc-100 rounded-2xl p-3.5 text-xs border border-zinc-800 shadow-xl">
    <div class="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px]">
      <div class="flex items-center space-x-2">
        <span class="text-sm">📊</span>
        <span class="font-semibold text-zinc-200">微服务容器资源消耗明细</span>
        <span v-if="projectStats" class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-emerald-400">
          总 CPU: {{ projectStats.totalCpu }} · 内存: {{ projectStats.totalMemMB }} MB
        </span>
      </div>
      <div class="flex items-center space-x-1.5">
        <button
          @click="$emit('refresh')"
          :disabled="loading"
          class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[10px]"
        >
          {{ loading ? '⏳' : '🔄 刷新' }}
        </button>
        <button
          @click="$emit('close')"
          class="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>

    <div v-if="!projectStats || !projectStats.containerStats || projectStats.containerStats.length === 0" class="text-zinc-500 py-4 text-center">
      暂未检测到微服务容器实时资源消耗，请确保项目正在运行
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="c in projectStats.containerStats"
        :key="c.name"
        class="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80 flex flex-col space-y-1.5"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono font-medium text-zinc-200 truncate max-w-[260px]">{{ c.name }}</span>
          <button
            @click="$emit('exec-container', c.name)"
            class="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded border border-zinc-700/60 transition-colors font-mono cursor-pointer flex items-center space-x-1"
            title="进入该微服务容器命令行"
          >
            <span>&gt;_</span>
            <span>终端</span>
          </button>
        </div>
        <div class="flex items-center space-x-4 text-[11px] font-mono text-zinc-400">
          <span class="flex items-center space-x-1">
            <span class="text-zinc-500">CPU:</span>
            <span class="text-emerald-400 font-semibold">{{ c.cpu }}</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="text-zinc-500">MEM:</span>
            <span class="text-blue-400 font-semibold">{{ c.mem }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projectStats: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'refresh', 'exec-container']);
</script>
