<template>
  <div class="h-10 px-6 border-t border-zinc-200/80 bg-white/60 backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-500 font-normal select-none">
    <div class="flex items-center space-x-3">
      <span class="text-emerald-600 font-medium">{{ activeCount }} 个项目运行中</span>
      <span class="text-zinc-300">•</span>
      <span class="text-zinc-600">容器总内存: <b>{{ memoryMB }} MB</b></span>
      <span class="text-zinc-300">•</span>
      <span class="text-zinc-400">⚡ 开启引擎无缝自愈</span>
    </div>

    <div class="flex items-center space-x-3 text-[11px]">
      <button
        @click="$emit('clean-cache')"
        class="hover:text-emerald-600 transition-colors flex items-center space-x-1 cursor-pointer"
      >
        <span>🧹</span>
        <span>清理未用镜像与缓存</span>
      </button>
      <span class="text-zinc-300">|</span>
      <button
        @click="$emit('import-project')"
        class="text-emerald-600 hover:text-emerald-700 font-medium flex items-center space-x-1 cursor-pointer"
      >
        <span>＋</span>
        <span>导入本地 Compose</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeCount: {
    type: Number,
    default: 0
  },
  memoryMB: {
    type: Number,
    default: 0
  }
});

defineEmits(['clean-cache', 'import-project']);
</script>
