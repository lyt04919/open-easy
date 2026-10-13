<template>
  <div class="h-14 px-5 border-b border-zinc-200/80 flex items-center justify-between bg-white/70 backdrop-blur-md select-none">
    <!-- Left: traffic light offset + app title -->
    <div class="flex items-center space-x-3 pl-16">
      <div class="flex items-center space-x-2">
        <span class="font-semibold text-zinc-900 text-sm tracking-tight">Open-Easy</span>
        <span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-500 font-mono font-medium">Studio</span>
      </div>
    </div>

    <!-- Center: Quick Search Filter -->
    <div class="relative w-64">
      <input
        type="text"
        :value="searchQuery"
        @input="$emit('update:searchQuery', $event.target.value)"
        placeholder="搜索项目或端口..."
        class="w-full bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-emerald-500/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
      />
      <span class="absolute left-2.5 top-2 text-zinc-400 text-xs">🔍</span>
    </div>

    <!-- Right: Global Actions & OrbStack Status -->
    <div class="flex items-center space-x-2">
      <!-- One-click sleep all containers -->
      <button
        @click="$emit('sleep-all')"
        title="一键休眠所有容器并释放内存"
        class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 rounded-full text-[11px] font-medium transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
      >
        <span>🌙</span>
        <span>一键休眠</span>
      </button>

      <!-- OrbStack Status Pill -->
      <button
        @click="$emit('toggle-orb')"
        :title="orbRunning ? 'OrbStack 引擎运行中 (点击刷新)' : 'OrbStack 已待机 (点击项目将自动自愈唤醒)'"
        class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer"
        :class="orbRunning 
          ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/60' 
          : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200/80'"
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="orbRunning ? 'bg-emerald-500 led-green-light' : 'bg-zinc-400'"
        ></span>
        <span>{{ orbRunning ? 'OrbStack 运行中' : 'OrbStack 待机中' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  searchQuery: {
    type: String,
    default: ''
  },
  orbRunning: {
    type: Boolean,
    default: true
  }
});

defineEmits(['update:searchQuery', 'sleep-all', 'toggle-orb']);
</script>
