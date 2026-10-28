<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 select-none window-no-drag"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-[#18181b] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.8)] border border-zinc-200/90 dark:border-zinc-700/80 p-6 w-[560px] modal-animate text-zinc-800 dark:text-zinc-100 relative">
      <!-- Close Button -->
      <button
        @click="$emit('close')"
        class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        ✕
      </button>

      <!-- Top Header -->
      <div class="flex items-center justify-between mb-3 pr-6">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 font-bold text-sm">
            ⚡
          </div>
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">添加项目与同步</h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">从本地文件夹导入或直接从 OrbStack 读取已部署项目</p>
          </div>
        </div>
      </div>

      <!-- Prominent Local Folder Import Button -->
      <div class="mb-3">
        <button
          @click="$emit('open-finder-import')"
          class="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-all flex items-center justify-center space-x-2 font-medium text-xs shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <span class="text-base">📁</span>
          <span class="font-bold">从本地文件夹选择导入...</span>
          <span class="text-[11px] opacity-75 font-normal">(支持自动解析 docker-compose.yml)</span>
        </button>
      </div>

      <!-- Actions Bar -->
      <div class="flex items-center justify-between py-2 border-b border-zinc-200/70 dark:border-zinc-800 mb-3 text-xs">
        <span class="text-zinc-500 dark:text-zinc-400 font-medium">
          发现 <b>{{ deployedProjects.length }}</b> 个项目 ({{ unaddedCount }} 个待添加)
        </span>
        <div class="flex items-center space-x-2">
          <button
            @click="fetchDeployed"
            :disabled="loading"
            class="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span :class="{ 'animate-spin': loading }">🔄</span>
            <span>刷新</span>
          </button>
          <button
            v-if="unaddedCount > 0"
            @click="addAllUnadded"
            class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>⚡</span>
            <span>一键全部添加 ({{ unaddedCount }})</span>
          </button>
        </div>
      </div>

      <!-- Projects List -->
      <div class="max-h-[300px] overflow-y-auto space-y-2 pr-1">
        <!-- Loading State -->
        <div v-if="loading" class="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
          <svg class="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span class="text-xs">正在从 OrbStack 底层读取已部署项目...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="deployedProjects.length === 0" class="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-1 text-xs">
          <span class="text-2xl mb-1">📦</span>
          <span>OrbStack 中暂无已部署的 Compose 项目</span>
          <span class="text-[11px] text-zinc-400">请先在本地终端或 OrbStack 中运行过 docker compose</span>
        </div>

        <!-- Project Cards -->
        <div
          v-else
          v-for="p in deployedProjects"
          :key="p.id"
          class="p-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl flex items-center justify-between transition-colors"
        >
          <div class="flex items-center space-x-3 min-w-0 pr-3">
            <!-- Tech Badge -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              :style="{ background: getTechGradient(p.tech) }"
            >
              <TechIcon :name="p.tech" :size="22" />
            </div>

            <!-- Details -->
            <div class="min-w-0">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{{ p.name }}</span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[9px] font-medium"
                  :class="p.status === 'running' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'"
                >
                  {{ p.status === 'running' ? '● 运行中' : '⚪ 已休眠' }}
                </span>
                <span v-if="p.frontendPort" class="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  :{{ p.frontendPort }}
                </span>
              </div>
              <p class="text-[10px] text-zinc-400 font-mono truncate mt-0.5" :title="p.composePath">
                {{ p.composePath }}
              </p>
            </div>
          </div>

          <!-- Add Button or Added Tag -->
          <div class="shrink-0">
            <span
              v-if="isAlreadyAdded(p)"
              class="px-2.5 py-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 rounded-lg text-xs font-medium flex items-center space-x-1"
            >
              <span>✓</span>
              <span>已在工作台</span>
            </span>
            <button
              v-else
              @click="addSingle(p)"
              class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
            >
              <span>＋</span>
              <span>添加</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Fallback / Help -->
      <div class="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <span>快捷提示: 按 ESC 键关闭</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TechIcon from './TechIcon.vue';
import { getTechGradient } from '../utils/techPresets.js';

const props = defineProps({
  existingProjects: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'imported', 'open-finder-import']);

const loading = ref(false);
const deployedProjects = ref([]);
const localAddedPaths = ref(new Set());

function isAlreadyAdded(p) {
  if (localAddedPaths.value.has(p.composePath) || localAddedPaths.value.has(p.id)) {
    return true;
  }
  return props.existingProjects.some(
    (item) => item.id === p.id || item.composePath === p.composePath
  );
}

const unaddedCount = computed(() => {
  return deployedProjects.value.filter((p) => !isAlreadyAdded(p)).length;
});

async function fetchDeployed() {
  if (!window.electronAPI) return;
  loading.value = true;
  try {
    const res = await window.electronAPI.getOrbStackDeployedProjects();
    if (res && res.projects) {
      deployedProjects.value = res.projects;
    }
  } catch (err) {
    console.error('Failed to fetch deployed projects:', err);
  } finally {
    loading.value = false;
  }
}

async function addSingle(project) {
  if (!window.electronAPI) return;
  try {
    const raw = JSON.parse(JSON.stringify(project));
    localAddedPaths.value.add(raw.composePath);
    localAddedPaths.value.add(raw.id);
    await window.electronAPI.addProject(raw);
    emit('imported', raw);
  } catch (err) {
    console.error('Failed to add project:', err);
  }
}

async function addAllUnadded() {
  if (!window.electronAPI) return;
  try {
    const unadded = deployedProjects.value.filter((p) => !isAlreadyAdded(p));
    for (const p of unadded) {
      const raw = JSON.parse(JSON.stringify(p));
      localAddedPaths.value.add(raw.composePath);
      localAddedPaths.value.add(raw.id);
      await window.electronAPI.addProject(raw);
    }
    emit('imported', null);
  } catch (err) {
    console.error('Failed to add all projects:', err);
  }
}


onMounted(() => {
  fetchDeployed();
});
</script>
