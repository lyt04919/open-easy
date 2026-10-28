<template>
  <div v-if="show" class="mb-4 bg-zinc-950 text-zinc-200 rounded-2xl p-3 text-xs font-mono border border-zinc-800 shadow-inner">
    <!-- Logs Control Bar -->
    <div class="flex flex-col space-y-2 pb-2 mb-2 border-b border-zinc-800/80 text-[11px]">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-semibold text-zinc-200">容器实时控制台</span>
          <button
            @click="toggleAutoFollow"
            :class="autoFollowLogs ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-zinc-900 text-zinc-400 border-zinc-700'"
            class="px-2 py-0.5 rounded-full border text-[10px] font-sans font-medium transition-all flex items-center space-x-1 cursor-pointer"
            title="开启/关闭自动跟随最新日志"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="autoFollowLogs ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'"></span>
            <span>{{ autoFollowLogs ? '实时追踪中' : '自动追踪' }}</span>
          </button>
        </div>

        <div class="flex items-center space-x-1.5">
          <button
            @click="fetchLogs"
            :disabled="loadingLogs"
            class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>{{ loadingLogs ? '⏳' : '🔄' }}</span>
            <span>刷新</span>
          </button>
          <button
            @click="clearLogs"
            class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="清空当前屏幕日志"
          >
            清空
          </button>
          <button
            @click="exportLogs"
            class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="导出日志到本地文件 (.log)"
          >
            导出
          </button>
          <button
            @click="copyLogs"
            class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {{ copied ? '已复制' : '复制' }}
          </button>
          <button
            @click="$emit('close')"
            class="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Secondary Filter Bar (Service Select + Keyword Filter + Tail) -->
      <div class="flex items-center space-x-2 pt-1 font-sans">
        <!-- Service Dropdown Filter -->
        <select
          v-model="logFilterService"
          @change="fetchLogs"
          class="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-zinc-600"
        >
          <option value="">全部微服务</option>
          <option v-for="svc in serviceList" :key="svc.name" :value="svc.name">
            {{ svc.name }}
          </option>
        </select>

        <!-- Keyword Search -->
        <div class="relative flex-1">
          <input
            type="text"
            v-model="logSearchQuery"
            placeholder="过滤日志关键字 (如 error, fail, port)..."
            class="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2 py-1 pl-6 text-[10px] placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <span class="absolute left-1.5 top-1 text-[10px] text-zinc-500">🔍</span>
        </div>

        <!-- Tail Selector -->
        <select
          v-model="logTail"
          @change="fetchLogs"
          class="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded px-1.5 py-1 text-[10px] focus:outline-none"
        >
          <option :value="60">60 行</option>
          <option :value="120">120 行</option>
          <option :value="300">300 行</option>
          <option :value="600">600 行</option>
        </select>
      </div>
    </div>

    <!-- Output Log Lines Container -->
    <div
      ref="logContainerRef"
      class="max-h-56 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed whitespace-pre font-mono select-text p-2.5 bg-black/60 rounded-xl"
    >
      <div v-if="loadingLogs && filteredLogLines.length === 0" class="text-zinc-500 py-4 text-center">正在抓取容器运行日志...</div>
      <div v-else-if="filteredLogLines.length === 0" class="text-zinc-500 py-4 text-center">暂无匹配的日志输出</div>
      <div
        v-for="(line, idx) in filteredLogLines"
        :key="idx"
        :class="getLineClass(line)"
        class="py-0.5 px-1 rounded transition-colors hover:bg-white/5"
        v-html="formatLine(line)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ansiToHtml } from '../../utils/ansiFormatter.js';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    required: true
  },
  serviceList: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close']);

const logsText = ref('');
const loadingLogs = ref(false);
const autoFollowLogs = ref(true);
const logFilterService = ref('');
const logSearchQuery = ref('');
const logTail = ref(120);
const copied = ref(false);
const logContainerRef = ref(null);

let streamCleanup = null;
let pollTimer = null;

function formatLine(line) {
  return ansiToHtml(line);
}

function clearLogs() {
  logsText.value = '';
}

function exportLogs() {
  if (!logsText.value) return;
  // Strip ANSI sequences when exporting plain log file
  const cleanLogs = logsText.value.replace(/\u001b\[[0-9;]*m/g, '');
  const blob = new Blob([cleanLogs], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.project.name || 'project'}-logs-${Date.now()}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyLogs() {
  if (!logsText.value) return;
  try {
    const cleanLogs = logsText.value.replace(/\u001b\[[0-9;]*m/g, '');
    await navigator.clipboard.writeText(cleanLogs);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy logs:', err);
  }
}

function toggleAutoFollow() {
  autoFollowLogs.value = !autoFollowLogs.value;
  if (autoFollowLogs.value) {
    startAutoFollow();
  } else {
    stopAutoFollow();
  }
}

function startAutoFollow() {
  stopAutoFollow();
  if (props.show && props.project?.status === 'running') {
    startStream();
  }
}

function stopAutoFollow() {
  stopStream();
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startStream() {
  stopStream();
  if (!window.electronAPI || !props.project?.composePath) return;

  if (window.electronAPI.startLogStream) {
    window.electronAPI.startLogStream(
      props.project.composePath,
      logTail.value,
      logFilterService.value
    );
  }

  if (window.electronAPI.onLogStreamData) {
    streamCleanup = window.electronAPI.onLogStreamData((data) => {
      if (data && data.composePath === props.project?.composePath && data.text) {
        appendLogChunk(data.text);
      }
    });
  } else {
    // Fallback polling if streaming listener unavailable
    pollTimer = setInterval(fetchLogs, 3000);
  }
}

function stopStream() {
  if (streamCleanup) {
    streamCleanup();
    streamCleanup = null;
  }
  if (window.electronAPI?.stopLogStream && props.project?.composePath) {
    window.electronAPI.stopLogStream(props.project.composePath);
  }
}

function appendLogChunk(chunk) {
  if (!logsText.value || logsText.value === '容器暂无控制台日志输出') {
    logsText.value = chunk;
  } else {
    logsText.value += chunk;
    const lines = logsText.value.split('\n');
    if (lines.length > 2000) {
      logsText.value = lines.slice(lines.length - 2000).join('\n');
    }
  }

  if (autoFollowLogs.value) {
    nextTick(() => {
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }
    });
  }
}

async function fetchLogs() {
  if (!window.electronAPI || !props.project?.composePath) return;
  loadingLogs.value = true;
  try {
    const res = await window.electronAPI.getProjectLogs(
      props.project.composePath,
      logTail.value,
      logFilterService.value
    );
    if (res.success) {
      logsText.value = res.logs || '容器暂无控制台日志输出';
      if (autoFollowLogs.value) {
        nextTick(() => {
          if (logContainerRef.value) {
            logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
          }
        });
      }
    }
  } catch (err) {
    logsText.value = `抓取日志失败: ${err.message}`;
  } finally {
    loadingLogs.value = false;
  }
}

const rawLines = computed(() => {
  if (!logsText.value) return [];
  return logsText.value.split('\n');
});

const filteredLogLines = computed(() => {
  const query = logSearchQuery.value.trim().toLowerCase();
  if (!query) return rawLines.value;
  return rawLines.value.filter((l) => l.toLowerCase().includes(query));
});

function getLineClass(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('fatal') || lower.includes('exception')) {
    return 'text-rose-400 bg-rose-950/20';
  }
  if (lower.includes('warn')) {
    return 'text-amber-400 bg-amber-950/20';
  }
  if (lower.includes('ready') || lower.includes('started') || lower.includes('success') || lower.includes('listening')) {
    return 'text-emerald-400';
  }
  if (lower.includes('debug')) {
    return 'text-zinc-500';
  }
  return 'text-zinc-300';
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      fetchLogs();
      if (autoFollowLogs.value && props.project?.status === 'running') {
        startStream();
      }
    } else {
      stopAutoFollow();
    }
  },
  { immediate: true }
);

watch(
  () => props.project?.id,
  () => {
    if (props.show) {
      clearLogs();
      fetchLogs();
      if (autoFollowLogs.value && props.project?.status === 'running') {
        startStream();
      }
    }
  }
);

watch(
  () => [logFilterService.value, logTail.value],
  () => {
    if (props.show) {
      clearLogs();
      fetchLogs();
      if (autoFollowLogs.value && props.project?.status === 'running') {
        startStream();
      }
    }
  }
);

onUnmounted(() => {
  stopAutoFollow();
});
</script>
