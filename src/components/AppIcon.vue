<template>
  <div
    class="flex flex-col items-center group cursor-pointer"
    @click="handleClick"
    @contextmenu.prevent="$emit('card-contextmenu', $event, project)"
  >
    <!-- App Squircle Icon Container -->
    <div class="relative w-20 h-20 mb-2.5">
      <!-- Starting pulse wave -->
      <div
        v-if="project.status === 'starting'"
        class="absolute -inset-1.5 rounded-[26px] bg-emerald-400/30 launching-wave-light"
      ></div>

      <!-- Main Squircle Icon -->
      <div
        class="w-full h-full squircle app-icon icon-gloss-light flex items-center justify-center relative overflow-hidden transition-all duration-200"
        :class="[
          isFocused ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#fbfbfd] dark:ring-offset-[#121214] scale-[1.04] shadow-md' : 'group-hover:scale-[1.02]',
          batchMode && isSelected ? 'ring-2 ring-emerald-500 scale-[1.03]' : ''
        ]"
        :style="{ background: displayGradient }"
      >
        <!-- Icon Glass Specular Highlight -->
        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>

        <!-- Batch Checkbox (Top Left) -->
        <button
          v-if="batchMode"
          @click.stop="$emit('toggle-select', project.id)"
          class="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] backdrop-blur-md shadow-xs border transition-all z-20 cursor-pointer"
          :class="isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-black/50 border-white/50 text-transparent hover:border-emerald-400'"
          title="选择/取消选择"
        >
          <svg v-if="isSelected" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>

        <!-- Pin Badge / Toggle Button (Top Left when not in batch mode) -->
        <button
          v-else
          @click.stop="$emit('toggle-pin', project)"
          :class="[
            project.pinned
              ? 'opacity-100 bg-amber-500/90 text-white border-amber-300 scale-100'
              : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/90 border-white/30 hover:bg-amber-500/90 hover:border-amber-300',
            'absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] backdrop-blur-md shadow-xs border transition-all z-20 cursor-pointer'
          ]"
          :title="project.pinned ? '取消置顶' : '置顶此项目到最前排'"
        >
          <span>📌</span>
        </button>

        <!-- Port Badge (Top Right) -->
        <div
          v-if="hasConflict"
          class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs tracking-tight flex items-center space-x-0.5 border border-amber-300 z-10"
          title="检测到端口已被占用！点击进入详情释放"
        >
          <span>⚠️</span>
          <span>:{{ project.frontendPort }}</span>
        </div>
        <div
          v-else-if="project.frontendPort"
          class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-white/30 backdrop-blur-md text-white border border-white/40 shadow-xs tracking-tight z-10"
        >
          :{{ project.frontendPort }}
        </div>

        <!-- 1. Custom Image (Fills entire squircle directly) -->
        <img
          v-if="project.customIcon"
          :src="project.customIcon"
          alt="Project Icon"
          class="w-full h-full object-cover select-none pointer-events-none"
        />

        <!-- 2. Custom Emoji -->
        <span
          v-else-if="project.customEmoji"
          class="text-3xl drop-shadow-md select-none"
        >
          {{ project.customEmoji }}
        </span>

        <!-- 3. Tech Stack SVG Logo (Custom or Default) -->
        <TechIcon
          v-else
          :name="effectiveTech"
          :size="36"
          class="drop-shadow-md"
        />

        <!-- Hover Quick Action Button (Direct Launch or Open Web) -->
        <button
          v-if="project.status === 'running'"
          @click.stop="$emit('quick-open', project.frontendUrl)"
          class="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-20 cursor-pointer"
          title="在浏览器中直接打开前端页面"
        >
          <span>🌐</span>
        </button>
        <button
          v-else-if="project.status !== 'starting'"
          @click.stop="$emit('quick-start', project)"
          class="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-zinc-900/80 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-20 cursor-pointer pl-0.5"
          title="一键静默启动并直达网页"
        >
          <span>▶</span>
        </button>
      </div>

      <!-- Dock LED indicator -->      <!-- Dock LED indicator -->
      <div class="h-3 flex items-center justify-center mt-1">
        <span
          v-if="project.status === 'running'"
          class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"
          title="服务运行中"
        ></span>
        <span
          v-else-if="project.status === 'starting'"
          class="w-1.5 h-1.5 rounded-full bg-amber-400 led-amber-light animate-ping"
          title="启动中"
        ></span>
      </div>
    </div>

    <!-- App Name Label -->
    <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tracking-tight text-center max-w-[96px] truncate group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
      {{ project.name }}
    </span>
    <!-- Subtitle (Port / Tech) -->
    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
      {{ effectiveTech }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TechIcon from './TechIcon.vue';
import { getTechGradient } from '../utils/techPresets.js';

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  hasConflict: {
    type: Boolean,
    default: false
  },
  isFocused: {
    type: Boolean,
    default: false
  },
  batchMode: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['open-detail', 'quick-open', 'quick-start', 'toggle-pin', 'toggle-select', 'card-contextmenu']);

function handleClick() {
  if (props.batchMode) {
    emit('toggle-select', props.project.id);
  } else {
    emit('open-detail', props.project);
  }
}

const effectiveTech = computed(() => {
  return props.project.customTech || props.project.tech || 'Docker';
});

const displayGradient = computed(() => {
  if (props.project.customBgGradient) {
    return props.project.customBgGradient;
  }
  return getTechGradient(effectiveTech.value);
});
</script>
