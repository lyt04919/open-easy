<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 select-none window-no-drag"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-[#18181b] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.8)] border border-zinc-200/90 dark:border-zinc-700/80 p-6 w-[520px] modal-animate text-zinc-800 dark:text-zinc-100 relative">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 text-sm">
          🎨
        </div>
        <div>
          <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">自定义项目图标</h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">为 [{{ project.name }}] 设置专属视觉标识，支持预设、Emoji 或本地图片</p>
        </div>
      </div>

      <!-- Live Preview Bar -->
      <div class="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl mb-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <!-- Squircle Preview -->
          <div
            class="w-14 h-14 squircle icon-gloss-light flex items-center justify-center text-white shrink-0 relative overflow-hidden transition-all duration-300"
            :style="{ background: previewGradient }"
          >
            <!-- Highlight shine -->
            <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>

            <!-- Custom Image Preview (Fills squircle completely) -->
            <img
              v-if="currentMode === 'image' && previewImage"
              :src="previewImage"
              alt="Icon Preview"
              class="w-full h-full object-cover select-none pointer-events-none"
            />

            <!-- Custom Emoji Preview -->
            <span
              v-else-if="currentMode === 'emoji'"
              class="text-2xl drop-shadow-md select-none"
            >
              {{ previewEmoji }}
            </span>

            <!-- Preset Tech Preview -->
            <TechIcon
              v-else
              :name="previewTech"
              :size="30"
              class="drop-shadow-md"
            />
          </div>

          <div>
            <span class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">实时预览效果</span>
            <div class="text-xs font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5 flex items-center space-x-1.5">
              <span>{{ previewLabel }}</span>
              <span class="text-zinc-300 dark:text-zinc-600">•</span>
              <span class="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">{{ previewSubLabel }}</span>
            </div>
          </div>
        </div>

        <button
          v-if="hasCustomConfig"
          @click="resetToDefault"
          class="text-xs text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 px-2.5 py-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-zinc-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 transition-all flex items-center space-x-1 cursor-pointer"
        >
          <span>↺</span>
          <span>恢复默认</span>
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center space-x-1 border-b border-zinc-200/80 dark:border-zinc-800 pb-2 mb-3 text-xs font-medium">
        <button
          @click="activeTab = 'preset'"
          :class="activeTab === 'preset' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200'"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>⚡</span>
          <span>技术栈预设</span>
        </button>
        <button
          @click="activeTab = 'emoji'"
          :class="activeTab === 'emoji' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200'"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>✨</span>
          <span>Emoji 徽标</span>
        </button>
        <button
          @click="activeTab = 'upload'"
          :class="activeTab === 'upload' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200'"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
        >
          <span>🖼️</span>
          <span>上传本地图片</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="h-[225px] overflow-y-auto p-1.5 -m-1.5">
        <!-- 1. Presets Tab -->
        <div v-if="activeTab === 'preset'" class="grid grid-cols-5 gap-2.5">
          <button
            v-for="p in TECH_PRESETS"
            :key="p.name"
            @click="selectPreset(p)"
            :class="previewTech === p.name && currentMode === 'preset' 
              ? 'border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs' 
              : 'border-2 border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/80 bg-white dark:bg-zinc-800/60'"
            class="w-full h-[84px] rounded-xl flex flex-col items-center justify-center space-y-1.5 p-2 text-center cursor-pointer outline-none focus:outline-none transition-colors"
          >
            <div
              class="w-10 h-10 squircle flex items-center justify-center text-white shadow-xs shrink-0"
              :style="{ background: p.gradient }"
            >
              <TechIcon :name="p.name" :size="22" />
            </div>
            <span
              class="text-[10px] font-medium truncate w-full"
              :class="previewTech === p.name && currentMode === 'preset' ? 'text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'"
            >
              {{ p.label || p.name }}
            </span>
          </button>
        </div>

        <!-- 2. Emoji Tab -->
        <div v-else-if="activeTab === 'emoji'" class="space-y-3">
          <!-- Emoji Grid -->
          <div>
            <span class="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">选择徽标图标</span>
            <div class="grid grid-cols-8 gap-2">
              <button
                v-for="emo in EMOJI_LIST"
                :key="emo"
                @click="selectEmoji(emo)"
                :class="previewEmoji === emo && currentMode === 'emoji' 
                  ? 'border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 shadow-xs' 
                  : 'border-2 border-zinc-200/70 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/60'"
                class="w-full h-10 rounded-lg flex items-center justify-center text-xl transition-colors cursor-pointer outline-none focus:outline-none"
              >
                {{ emo }}
              </button>
            </div>
          </div>

          <!-- Background Palette -->
          <div>
            <span class="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">选择底色质感</span>
            <div class="grid grid-cols-8 gap-2">
              <button
                v-for="g in GRADIENT_PRESETS"
                :key="g.name"
                @click="selectGradient(g.value)"
                :title="g.name"
                :class="previewGradient === g.value 
                  ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 shadow-sm' 
                  : 'border-2 border-white/40 dark:border-white/10 hover:opacity-90'"
                class="w-full h-7 rounded-lg transition-colors cursor-pointer shadow-xs outline-none focus:outline-none"
                :style="{ background: g.value }"
              ></button>
            </div>
          </div>
        </div>

        <!-- 3. Upload Tab -->
        <div v-else-if="activeTab === 'upload'" class="space-y-3 pt-0.5">
          <!-- Dropzone area with native input overlay -->
          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            class="relative w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            :class="isDragging ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 scale-[0.99]' : 'border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20'"
          >
            <!-- Native invisible file input: clicking or dropping triggers instantly with zero IPC blocks -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              @change="handleHtmlFileChange"
              title="点击或拖拽图片到此处上传"
            />

            <!-- Case A: Image is already selected -->
            <div v-if="previewImage && currentMode === 'image'" class="flex flex-col items-center py-1 z-0 pointer-events-none">
              <!-- Full bleed squircle preview with specular shine -->
              <div class="w-20 h-20 squircle icon-gloss-light flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden relative mb-2.5">
                <img :src="previewImage" alt="Preview" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
              </div>
              <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1">
                <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                <span>图片已完整铺满图标（已自动居中裁切）</span>
              </span>
              <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">无边缘背景残留，点击此区域可更换其他图片</p>
            </div>

            <!-- Case B: Empty upload zone -->
            <div v-else class="flex flex-col items-center py-4 z-0 pointer-events-none">
              <span class="text-4xl mb-2">{{ isDragging ? '📥' : '🖼️' }}</span>
              <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {{ isDragging ? '松开鼠标即可载入图片' : '点击选择本地图片，或直接将图片拖拽到此处' }}
              </span>
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[320px]">
                图片将直接作为整个图标，非正方形图片会自动裁切保留正中间部分；支持 PNG, JPG, WebP, GIF, ICO, SVG 及 Cmd+V 剪贴板粘贴
              </span>
            </div>
          </div>

          <!-- Error Alert if any -->
          <p v-if="uploadError" class="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
            <span>⚠️</span>
            <span>{{ uploadError }}</span>
          </p>

          <!-- Action bar when image is loaded -->
          <div v-if="previewImage && currentMode === 'image'" class="flex items-center justify-between px-1 pt-1">
            <span class="text-[11px] text-zinc-400 dark:text-zinc-500">已成功应用整图图标模式</span>
            <button
              @click="clearImage"
              class="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>🗑️</span>
              <span>移除自定义图片</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Actions -->
      <div class="mt-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
        <span class="text-[11px] text-zinc-400 dark:text-zinc-500">ESC 键取消关闭</span>
        <div class="flex items-center space-x-2">
          <button
            @click="$emit('close')"
            class="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            @click="handleApply"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>✓</span>
            <span>保存并应用</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import TechIcon from './TechIcon.vue';
import { TECH_PRESETS } from '../utils/techPresets.js';

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'save']);

const activeTab = ref('preset');
const fileInputRef = ref(null);
const isDragging = ref(false);
const uploadError = ref('');

const EMOJI_LIST = [
  '🚀', '🤖', '💻', '☕', '🌟', '📦', '⚡', '🔥',
  '🎯', '🎨', '📈', '🛠️', '🌐', '🧬', '💡', '🛡️'
];

const GRADIENT_PRESETS = [
  { name: '翡翠绿', value: 'linear-gradient(135deg, #10b981, #047857)' },
  { name: '黑曜石', value: 'linear-gradient(135deg, #1f2937, #111827)' },
  { name: '暖琥珀', value: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { name: '皇家蓝', value: 'linear-gradient(135deg, #0284c7, #0369a1)' },
  { name: '丁香紫', value: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { name: '落日红', value: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { name: '赛博青', value: 'linear-gradient(135deg, #06b6d4, #0f766e)' },
  { name: '石板灰', value: 'linear-gradient(135deg, #64748b, #334155)' }
];

// Current draft states
const currentMode = ref(
  props.project.customIcon ? 'image' : props.project.customEmoji ? 'emoji' : props.project.customTech ? 'preset' : 'preset'
);

const previewTech = ref(props.project.customTech || props.project.tech || 'Docker');
const previewEmoji = ref(props.project.customEmoji || '🚀');
const previewImage = ref(props.project.customIcon || null);
const previewGradient = ref(
  props.project.customBgGradient ||
  (TECH_PRESETS.find(p => p.name === previewTech.value)?.gradient || 'linear-gradient(135deg, #0284c7, #0369a1)')
);

const hasCustomConfig = computed(() => {
  return Boolean(props.project.customIcon || props.project.customEmoji || props.project.customTech || props.project.customBgGradient);
});

const previewLabel = computed(() => {
  if (currentMode.value === 'image') return '本地自定义图片';
  if (currentMode.value === 'emoji') return `Emoji 徽标 (${previewEmoji.value})`;
  return `技术栈预设 (${previewTech.value})`;
});

const previewSubLabel = computed(() => {
  if (currentMode.value === 'image') return 'PNG/SVG';
  if (currentMode.value === 'emoji') return 'Squircle';
  return previewTech.value;
});

function selectPreset(preset) {
  currentMode.value = 'preset';
  previewTech.value = preset.name;
  previewGradient.value = preset.gradient;
}

function selectEmoji(emo) {
  currentMode.value = 'emoji';
  previewEmoji.value = emo;
}

function selectGradient(gradient) {
  previewGradient.value = gradient;
}

/**
 * Center-crops and optimizes an image to a 1:1 square (max 512x512) via HTML5 Canvas
 */
function compressAndSetImage(dataUrl, mimeType = 'image/png') {
  if (mimeType.includes('svg') || dataUrl.startsWith('data:image/svg')) {
    previewImage.value = dataUrl;
    currentMode.value = 'image';
    uploadError.value = '';
    return;
  }

  const img = new Image();
  img.onload = () => {
    // 1. Calculate center crop square dimensions
    const sourceDim = Math.min(img.width, img.height);
    const sx = Math.floor((img.width - sourceDim) / 2);
    const sy = Math.floor((img.height - sourceDim) / 2);

    // 2. Target canvas square size (max 512x512)
    const targetDim = Math.min(sourceDim, 512);
    const canvas = document.createElement('canvas');
    canvas.width = targetDim;
    canvas.height = targetDim;
    const ctx = canvas.getContext('2d');

    // 3. Draw the exact center square of the uploaded image
    ctx.drawImage(img, sx, sy, sourceDim, sourceDim, 0, 0, targetDim, targetDim);

    const optimized = canvas.toDataURL('image/png');
    previewImage.value = optimized;
    currentMode.value = 'image';
    uploadError.value = '';
  };
  img.onerror = () => {
    uploadError.value = '图片解析失败，请尝试其他格式图片';
  };
  img.src = dataUrl;
}

function processImageFile(file) {
  if (!file) return;
  uploadError.value = '';

  const reader = new FileReader();
  reader.onload = (event) => {
    compressAndSetImage(event.target.result, file.type || 'image/png');
  };
  reader.onerror = () => {
    uploadError.value = '读取本地图片失败，请重试';
  };
  reader.readAsDataURL(file);
}

async function handlePickFile() {
  uploadError.value = '';
  if (window.electronAPI && window.electronAPI.pickIconImage) {
    try {
      const res = await window.electronAPI.pickIconImage();
      if (res && !res.canceled && res.dataUrl) {
        compressAndSetImage(res.dataUrl);
      } else if (res && res.error) {
        uploadError.value = res.error;
      }
    } catch (err) {
      fileInputRef.value?.click();
    }
  } else {
    fileInputRef.value?.click();
  }
}

function handleHtmlFileChange(e) {
  const file = e.target.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function clearImage() {
  previewImage.value = null;
  currentMode.value = 'preset';
  uploadError.value = '';
}

function handlePaste(e) {
  if (activeTab.value !== 'upload') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) {
        processImageFile(file);
        break;
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});

function resetToDefault() {
  currentMode.value = 'preset';
  previewTech.value = props.project.tech || 'Docker';
  previewImage.value = null;
  previewEmoji.value = '🚀';
  const matched = TECH_PRESETS.find(p => p.name === previewTech.value);
  previewGradient.value = matched?.gradient || 'linear-gradient(135deg, #0284c7, #0369a1)';

  emit('save', {
    customIcon: null,
    customEmoji: null,
    customTech: null,
    customBgGradient: null
  });
}

function handleApply() {
  if (currentMode.value === 'image') {
    emit('save', {
      customIcon: previewImage.value,
      customEmoji: null,
      customTech: null,
      customBgGradient: previewGradient.value
    });
  } else if (currentMode.value === 'emoji') {
    emit('save', {
      customIcon: null,
      customEmoji: previewEmoji.value,
      customTech: null,
      customBgGradient: previewGradient.value
    });
  } else {
    emit('save', {
      customIcon: null,
      customEmoji: null,
      customTech: previewTech.value,
      customBgGradient: previewGradient.value
    });
  }
}
</script>
