<template>
  <div v-if="show" class="mb-4 bg-zinc-900 text-zinc-100 rounded-2xl p-3.5 text-xs border border-zinc-800 shadow-xl">
    <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800 text-[11px]">
      <div class="flex items-center space-x-2">
        <span class="text-sm">🛠️</span>
        <span class="font-semibold text-zinc-200">Docker Compose 高级运维指令</span>
      </div>
      <button
        @click="$emit('close')"
        class="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        ✕
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <!-- 1. Rebuild -->
      <button
        @click="$emit('rebuild')"
        :disabled="operating"
        class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 hover:text-white transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        title="执行 docker compose up -d --build，重新编译变更源码"
      >
        <span class="text-base mb-1 group-hover:scale-110 transition-transform">🔨</span>
        <span class="font-semibold text-[11px]">重新构建</span>
        <span class="text-[9px] text-zinc-400 mt-0.5 font-mono">up --build</span>
      </button>

      <!-- 2. Pull -->
      <button
        @click="$emit('pull')"
        :disabled="operating"
        class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 hover:text-white transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        title="执行 docker compose pull，拉取各微服务最新基础镜像"
      >
        <span class="text-base mb-1 group-hover:scale-110 transition-transform">⬇️</span>
        <span class="font-semibold text-[11px]">更新镜像</span>
        <span class="text-[9px] text-zinc-400 mt-0.5 font-mono">pull</span>
      </button>

      <!-- 3. Reset Data Volumes with 3-second two-step confirmation -->
      <button
        @click="handleResetClick"
        :disabled="operating"
        :class="confirmReset ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 ring-2 ring-rose-500/50 animate-pulse text-white' : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-200 hover:text-white'"
        class="flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        :title="confirmReset ? '请在 3 秒内再次点击以确认清空所有数据卷！' : '执行 docker compose down -v && up -d，清空脏数据卷重新初始化'"
      >
        <span class="text-base mb-1 group-hover:scale-110 transition-transform">{{ confirmReset ? '⚠️' : '🧹' }}</span>
        <span class="font-semibold text-[11px]" :class="confirmReset ? 'text-white' : 'text-rose-300'">
          {{ confirmReset ? '确认清空数据卷？' : '重置数据卷' }}
        </span>
        <span class="text-[9px] mt-0.5 font-mono" :class="confirmReset ? 'text-white/80' : 'text-rose-400'">
          {{ confirmReset ? '3 秒内再次点击' : 'down -v' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  operating: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'rebuild', 'pull', 'reset-volumes']);

const confirmReset = ref(false);
let confirmTimer = null;

function handleResetClick() {
  if (confirmReset.value) {
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmReset.value = false;
    emit('reset-volumes');
  } else {
    confirmReset.value = true;
    confirmTimer = setTimeout(() => {
      confirmReset.value = false;
    }, 3000);
  }
}

onUnmounted(() => {
  if (confirmTimer) clearTimeout(confirmTimer);
});
</script>
