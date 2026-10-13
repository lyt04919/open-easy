<template>
  <div
    v-if="project"
    class="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    @click.self="$emit('close')"
  >
    <div class="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-6 w-[500px] modal-animate text-zinc-800 relative">
      <!-- Close Button -->
      <button
        @click="$emit('close')"
        class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer"
      >
        ✕
      </button>

      <!-- Top info -->
      <div class="flex items-center space-x-4 mb-5">
        <!-- 64x64 Squircle Icon -->
        <div
          class="w-16 h-16 squircle icon-gloss-light flex items-center justify-center text-white shrink-0 relative overflow-hidden"
          :style="{ background: techConfig.gradient }"
        >
          <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>
          
          <!-- Logo -->
          <div class="w-8 h-8 flex items-center justify-center text-white drop-shadow-md">
            <svg v-if="project.tech === 'Vue'" viewBox="0 0 128 128" class="w-8 h-8 fill-current">
              <path d="M78.8,10L64,35.4L49.2,10H0l64,108L128,10H78.8z" fill="#fff" opacity="0.95"/>
              <path d="M78.8,10L64,35.4L49.2,10H25.4L64,76.8L102.6,10H78.8z" fill="#42b883"/>
            </svg>
            <svg v-else-if="project.tech === 'Java'" viewBox="0 0 24 24" class="w-8 h-8 fill-none stroke-current" stroke-width="1.8">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
            <svg v-else-if="project.tech === 'Next'" viewBox="0 0 180 180" class="w-8 h-8 fill-current">
              <circle cx="90" cy="90" fill="#111" r="90"></circle>
              <path d="M149.508 157.438L69.1478 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.141 149.508 157.438Z" fill="white"></path>
              <rect fill="white" height="72" width="12" x="115" y="54"></rect>
            </svg>
            <svg v-else-if="project.tech === 'Python'" viewBox="0 0 128 128" class="w-8 h-8 fill-current">
              <path d="M63.4,6.2C48.6,6.2,49.8,12.6,49.8,12.6l0.1,6.6h27.9v8.3H38.5c0,0-15.6,0.3-22.1,8.3c-6.8,8.4-6.6,24.6-6.6,24.6s-0.8,10.6,6.6,18.4c6.3,6.7,14.6,6.8,14.6,6.8h8.8v-12.3c0,0-0.5-14.7,14.3-14.7h27.5c0,0,13.7-0.7,13.7-14V19.8C95.3,19.8,96.3,6.2,63.4,6.2z" fill="#ffd43b"/>
              <path d="M64.6,121.8c14.8,0,13.6-6.4,13.6-6.4l-0.1-6.6H50.2v-8.3h39.3c0,0,15.6-0.3,22.1-8.3c6.8-8.4,6.6-24.6,6.6-24.6s0.8-10.6-6.6-18.4c-6.3-6.7-14.6-6.8-14.6-6.8h-8.8v12.3c0,0,0.5,14.7-14.3,14.7H46.4c0,0-13.7,0.7-13.7,14v24.8C32.7,108.2,31.7,121.8,64.6,121.8z" fill="#306998"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" class="w-8 h-8 fill-none stroke-current" stroke-width="1.8">
              <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
              <path d="M2 14h20"/>
              <rect x="6" y="8" width="3" height="3"/>
              <rect x="11" y="8" width="3" height="3"/>
            </svg>
          </div>
        </div>

        <!-- Meta info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <h2 class="text-base font-bold text-zinc-900 truncate">{{ project.name }}</h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
              {{ project.tech }}
            </span>
          </div>
          <p class="text-xs text-zinc-500 truncate mt-0.5">{{ project.description || project.composePath }}</p>

          <!-- Status badge -->
          <div class="mt-1.5 flex items-center space-x-2">
            <span
              v-if="project.status === 'running'"
              class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 flex items-center space-x-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"></span>
              <span>运行中</span>
            </span>
            <span
              v-else-if="project.status === 'starting'"
              class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 flex items-center space-x-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>{{ startingText }}</span>
            </span>
            <span
              v-else
              class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-500"
            >
              已休眠 / 停止
            </span>
          </div>
        </div>
      </div>

      <!-- Port Conflict Banner (if any) -->
      <div
        v-if="conflictInfo && conflictInfo.occupied"
        class="mb-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs"
      >
        <div class="flex items-center space-x-2 text-amber-800">
          <span class="text-base">⚠️</span>
          <div>
            <div class="font-semibold">端口 :{{ project.frontendPort }} 已被占用</div>
            <div class="text-[11px] text-amber-700">占用进程: {{ conflictInfo.details }}</div>
          </div>
        </div>
        <button
          @click="$emit('kill-conflict-process', conflictInfo.pid)"
          class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-[11px] shadow-xs cursor-pointer transition-colors"
        >
          一键释放端口
        </button>
      </div>

      <!-- Action Buttons Area -->
      <div class="mb-4">
        <!-- Starting State -->
        <button
          v-if="project.status === 'starting'"
          disabled
          class="w-full py-2.5 bg-zinc-200 text-zinc-600 font-medium rounded-xl text-xs cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <svg class="animate-spin h-4 w-4 text-zinc-600" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span>{{ startingText }}</span>
        </button>

        <!-- Running State -->
        <div v-else-if="project.status === 'running'" class="flex items-center space-x-2">
          <button
            @click="$emit('open-browser', project.frontendUrl)"
            class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>🌐</span>
            <span>在浏览器中打开前端</span>
          </button>
          <button
            @click="$emit('stop-project', project)"
            class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-xs transition-colors cursor-pointer"
            title="停止容器并释放资源"
          >
            <span>⏹</span>
            <span>停止</span>
          </button>
          <button
            @click="$emit('restart-project', project)"
            class="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-xs transition-colors cursor-pointer"
            title="重启容器"
          >
            <span>🔄</span>
          </button>
        </div>

        <!-- Stopped State: Prominent Launch Button -->
        <button
          v-else
          @click="$emit('start-project', project)"
          class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
        >
          <span>🚀</span>
          <span class="font-semibold">一键启动并进入前端网页</span>
        </button>
      </div>

      <!-- Quick Developer Toolbar -->
      <div class="flex items-center justify-between bg-zinc-50 border border-zinc-200/60 rounded-xl p-2 mb-4 text-xs text-zinc-600">
        <span class="text-[11px] font-medium text-zinc-400 pl-1">快速联动:</span>
        <div class="flex items-center space-x-1">
          <button
            @click="$emit('open-editor', project.composePath, 'code')"
            class="px-2.5 py-1 hover:bg-white hover:text-zinc-900 rounded-lg transition-all flex items-center space-x-1 text-[11px] font-medium cursor-pointer"
            title="在 VS Code 中打开项目目录"
          >
            <span>💻</span>
            <span>VS Code</span>
          </button>
          <button
            @click="$emit('open-terminal', project.composePath)"
            class="px-2.5 py-1 hover:bg-white hover:text-zinc-900 rounded-lg transition-all flex items-center space-x-1 text-[11px] font-medium cursor-pointer"
            title="在终端中打开项目目录"
          >
            <span>⚡</span>
            <span>终端</span>
          </button>
          <button
            @click="$emit('show-finder', project.composePath)"
            class="px-2.5 py-1 hover:bg-white hover:text-zinc-900 rounded-lg transition-all flex items-center space-x-1 text-[11px] font-medium cursor-pointer"
            title="在访达中显示"
          >
            <span>📁</span>
            <span>访达</span>
          </button>
        </div>
      </div>

      <!-- Microservices / Containers List -->
      <div class="border border-zinc-200/70 rounded-xl p-3 bg-zinc-50/50 mb-4">
        <div class="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-2">
          <span>COMPOSE 微服务清单</span>
          <span>端口映射</span>
        </div>
        <div class="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          <div
            v-for="(svc, idx) in serviceList"
            :key="idx"
            class="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-zinc-200/50"
          >
            <div class="flex items-center space-x-2">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="project.status === 'running' ? 'bg-emerald-500 led-green-light' : 'bg-zinc-300'"
              ></span>
              <span class="font-medium text-zinc-700">{{ svc.name }}</span>
            </div>
            <span class="font-mono text-[11px] text-zinc-500">{{ svc.ports || '内部通信' }}</span>
          </div>
        </div>
      </div>

      <!-- Custom Frontend URL Setting -->
      <div class="flex items-center space-x-2 pt-2 border-t border-zinc-200/60">
        <span class="text-[11px] text-zinc-500 whitespace-nowrap">前端地址:</span>
        <input
          type="text"
          v-model="customUrl"
          class="flex-1 bg-zinc-100 focus:bg-white border border-transparent focus:border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-700 focus:outline-none transition-all"
        />
        <button
          @click="saveUrl"
          class="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  project: {
    type: Object,
    default: null
  },
  conflictInfo: {
    type: Object,
    default: null
  },
  startingText: {
    type: String,
    default: '正在启动并探活中...'
  }
});

const emit = defineEmits([
  'close',
  'start-project',
  'stop-project',
  'restart-project',
  'open-browser',
  'open-editor',
  'open-terminal',
  'show-finder',
  'kill-conflict-process',
  'update-url'
]);

const customUrl = ref('');

watch(
  () => props.project,
  (newVal) => {
    if (newVal) {
      customUrl.value = newVal.frontendUrl || `http://localhost:${newVal.frontendPort || 8080}`;
    }
  },
  { immediate: true }
);

function saveUrl() {
  if (customUrl.value && props.project) {
    emit('update-url', { id: props.project.id, url: customUrl.value });
  }
}

const techConfig = computed(() => {
  if (!props.project) return { gradient: 'linear-gradient(135deg, #0284c7, #0369a1)' };
  switch (props.project.tech) {
    case 'Vue':
      return { gradient: 'linear-gradient(135deg, #42b883, #35495e)' };
    case 'Java':
      return { gradient: 'linear-gradient(135deg, #f39c12, #d35400)' };
    case 'Next':
      return { gradient: 'linear-gradient(135deg, #1f2937, #111827)' };
    case 'Python':
      return { gradient: 'linear-gradient(135deg, #3776ab, #1e415f)' };
    default:
      return { gradient: 'linear-gradient(135deg, #0284c7, #0369a1)' };
  }
});

const serviceList = computed(() => {
  if (!props.project) return [];
  if (props.project.containers && props.project.containers.length > 0) {
    return props.project.containers.map((c) => ({
      name: c.service || c.name,
      ports: c.ports || ''
    }));
  }
  if (props.project.services && props.project.services.length > 0) {
    return props.project.services.map((s, idx) => ({
      name: s,
      ports: idx === 0 ? `:${props.project.frontendPort}` : ''
    }));
  }
  return [
    { name: 'frontend', ports: `:${props.project.frontendPort}` }
  ];
});
</script>
