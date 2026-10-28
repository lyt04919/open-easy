<template>
  <div v-if="show" class="bg-zinc-900/95 text-zinc-100 rounded-2xl p-4 text-xs border border-zinc-800 shadow-2xl space-y-3">
    <!-- Top Bar: File Switcher, View Mode, Actions -->
    <div class="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 text-[11px] gap-2 flex-wrap">
      <!-- Left: File Selector & Count -->
      <div class="flex items-center space-x-2">
        <span class="text-sm">📝</span>
        <div class="flex items-center space-x-1.5">
          <label class="text-zinc-400 font-medium">配置文件:</label>
          <select
            v-model="envFileName"
            @change="handleFileChange"
            class="bg-zinc-800 text-zinc-100 font-mono text-[11px] px-2 py-1 rounded-lg border border-zinc-700 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option v-for="f in availableFiles" :key="f" :value="f">
              {{ f }}
            </option>
          </select>
        </div>
      </div>

      <!-- Center: View Mode Segmented Control -->
      <div class="bg-zinc-800/90 p-0.5 rounded-lg flex items-center space-x-1 text-[10px]">
        <button
          @click="switchViewMode('form')"
          :class="viewMode === 'form' ? 'bg-zinc-700 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>📋</span>
          <span>表单视图</span>
        </button>
        <button
          @click="switchViewMode('raw')"
          :class="viewMode === 'raw' ? 'bg-zinc-700 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>📜</span>
          <span>源码视图</span>
        </button>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center space-x-2 shrink-0">
        <button
          @click="saveEnv(false)"
          :disabled="savingEnv"
          class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors cursor-pointer flex items-center space-x-1 border border-zinc-700/80 shadow-2xs"
          title="保存修改到本地文件"
        >
          <span>{{ savingEnv ? '⏳' : '💾' }}</span>
          <span>保存</span>
        </button>

        <button
          @click="saveEnv(true)"
          :disabled="savingEnv"
          class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
          title="保存并重启 Compose 容器以使新变量立即生效"
        >
          <span>⚡</span>
          <span>保存并重启</span>
        </button>

        <button
          @click="$emit('close')"
          class="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center text-xs"
          title="关闭面板"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div v-if="loadingEnv" class="text-zinc-500 py-8 text-center text-xs">正在读取配置文件...</div>
    <div v-else>
      <!-- Mode 1: Key-Value Table Form View -->
      <div v-if="viewMode === 'form'" class="space-y-2">
        <div class="max-h-[360px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          <div
            v-for="(row, idx) in kvRows"
            :key="idx"
            class="flex items-center space-x-2 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 text-[11px]"
          >
            <!-- Key Input -->
            <input
              v-model="row.key"
              @input="onRowChange"
              type="text"
              placeholder="VARIABLE_KEY"
              class="w-1/3 bg-zinc-900/90 font-mono font-bold text-emerald-400 px-2 py-1.5 rounded-lg border border-zinc-700/60 focus:border-emerald-500/80 outline-none"
            />

            <span class="text-zinc-500 font-mono select-none">=</span>

            <!-- Value Input with Secret Masking -->
            <div class="flex-1 relative flex items-center">
              <input
                v-model="row.value"
                @input="onRowChange"
                :type="row.isSecret && !row.showSecret ? 'password' : 'text'"
                placeholder="value"
                class="w-full bg-zinc-900/90 font-mono text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-700/60 focus:border-emerald-500/80 outline-none pr-8"
              />
              <button
                v-if="row.isSecret"
                type="button"
                @click="row.showSecret = !row.showSecret"
                class="absolute right-2 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none text-xs"
                :title="row.showSecret ? '隐藏敏感内容' : '查看明文'"
              >
                {{ row.showSecret ? '🙈' : '👁️' }}
              </button>
            </div>

            <!-- Delete Row Button -->
            <button
              @click="removeRow(idx)"
              class="w-7 h-7 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="删除此项变量"
            >
              ✕
            </button>
          </div>

          <div v-if="kvRows.length === 0" class="text-center py-6 text-zinc-500 text-xs">
            暂无键值对配置，点击下方按钮添加。
          </div>
        </div>

        <!-- Add Variable Row Button -->
        <button
          @click="addRow"
          class="w-full py-1.5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 transition-colors flex items-center justify-center space-x-1.5 text-[11px] cursor-pointer"
        >
          <span>＋</span>
          <span>添加环境变量</span>
        </button>
      </div>

      <!-- Mode 2: Raw Source View -->
      <div v-else>
        <textarea
          v-model="envContent"
          rows="12"
          placeholder="# KEY=VALUE 格式的环境变量配置&#10;PORT=8080&#10;DATABASE_URL=..."
          class="w-full bg-zinc-950 font-mono text-[11px] text-emerald-400 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-y"
        ></textarea>
      </div>

      <!-- Footer Info -->
      <div class="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
        <span>💡 变量更改后需重启容器方能生效</span>
        <span class="font-mono">{{ viewMode === 'form' ? `${kvRows.length} 个变量` : `${envContent.length} 字符` }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'toast', 'restart-project']);

const envContent = ref('');
const envFileName = ref('.env');
const availableFiles = ref(['.env']);
const loadingEnv = ref(false);
const savingEnv = ref(false);
const viewMode = ref('form'); // 'form' | 'raw'
const kvRows = ref([]);

function isSecretKey(k) {
  return /password|secret|token|key|private|auth/i.test(k);
}

function parseContentToRows(text) {
  const lines = (text || '').split('\n');
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const k = line.slice(0, eqIdx).trim();
      let v = line.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      rows.push({
        key: k,
        value: v,
        isSecret: isSecretKey(k),
        showSecret: false
      });
    }
  }
  return rows;
}

function syncRowsToContent() {
  const lines = kvRows.value
    .filter((r) => r.key && r.key.trim())
    .map((r) => `${r.key.trim()}=${r.value}`);
  envContent.value = lines.join('\n');
}

function switchViewMode(mode) {
  if (mode === 'raw') {
    syncRowsToContent();
  } else if (mode === 'form') {
    kvRows.value = parseContentToRows(envContent.value);
  }
  viewMode.value = mode;
}

function onRowChange() {
  kvRows.value.forEach((r) => {
    r.isSecret = isSecretKey(r.key);
  });
  syncRowsToContent();
}

function addRow() {
  kvRows.value.push({
    key: '',
    value: '',
    isSecret: false,
    showSecret: false
  });
}

function removeRow(idx) {
  kvRows.value.splice(idx, 1);
  syncRowsToContent();
}

async function loadEnv(targetName) {
  if (!window.electronAPI || !props.project?.composePath) return;
  loadingEnv.value = true;
  try {
    const res = await window.electronAPI.getProjectEnv(props.project.composePath, targetName || envFileName.value);
    if (res) {
      envContent.value = res.content || '';
      envFileName.value = res.fileName || targetName || '.env';
      if (Array.isArray(res.availableFiles) && res.availableFiles.length > 0) {
        availableFiles.value = res.availableFiles;
      }
      kvRows.value = parseContentToRows(envContent.value);
    }
  } catch (err) {
    console.error('Failed to load project env:', err);
  } finally {
    loadingEnv.value = false;
  }
}

function handleFileChange() {
  loadEnv(envFileName.value);
}

async function saveEnv(andRestart = false) {
  if (!window.electronAPI || !props.project?.composePath) return;
  if (viewMode.value === 'form') {
    syncRowsToContent();
  }

  savingEnv.value = true;
  try {
    const res = await window.electronAPI.saveProjectEnv(
      props.project.composePath,
      envContent.value,
      envFileName.value
    );
    if (res && res.success) {
      emit('toast', '💾', `已保存 ${envFileName.value}`);
      if (andRestart) {
        emit('toast', '⚡', `正在重启项目以应用配置...`);
        emit('restart-project');
      }
    } else {
      emit('toast', '⚠️', `保存失败: ${res?.error || '未知错误'}`);
    }
  } catch (err) {
    emit('toast', '⚠️', `保存异常: ${err.message}`);
  } finally {
    savingEnv.value = false;
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      loadEnv();
    }
  },
  { immediate: true }
);

watch(
  () => props.project?.id,
  () => {
    if (props.show) {
      loadEnv();
    }
  }
);
</script>
