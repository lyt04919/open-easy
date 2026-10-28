<template>
  <div
    class="glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-200"
    :class="[
      isFocused ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#f6f4ee] dark:ring-offset-[#121214] scale-[1.015] shadow-lg' : '',
      batchMode && isSelected ? 'ring-2 ring-emerald-500/80 bg-emerald-500/5' : ''
    ]"
    @click="handleClick"
    @contextmenu.prevent="$emit('card-contextmenu', $event, project)"
  >
    <!-- Card Top Specular Rim Light -->
    <div class="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"></div>

    <!-- Top Row: Icon + Title + Status + Pin -->
    <div class="flex items-start justify-between mb-2.5">
      <div class="flex items-center space-x-3 min-w-0">
        <!-- 50x50 Squircle Icon -->
        <div
          class="w-12 h-12 squircle icon-gloss-light flex items-center justify-center text-white shrink-0 relative overflow-hidden shadow-xs"
          :style="{ background: displayGradient }"
        >
          <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>
          
          <img
            v-if="project.customIcon"
            :src="project.customIcon"
            alt="Icon"
            class="w-full h-full object-cover select-none pointer-events-none"
          />
          <span
            v-else-if="project.customEmoji"
            class="text-2xl drop-shadow-sm select-none"
          >
            {{ project.customEmoji }}
          </span>
          <TechIcon
            v-else
            :name="effectiveTech"
            :size="26"
            class="drop-shadow-sm"
          />
        </div>

        <!-- Title & Tech -->
        <div class="min-w-0">
          <div class="flex items-center space-x-1.5">
            <h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs truncate max-w-[120px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {{ project.name }}
            </h3>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
              {{ effectiveTech }}
            </span>
            <!-- Git Branch Capsule -->
            <span
              v-if="project.gitBranch"
              class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 flex items-center space-x-1"
              :title="`Git 分支: ${project.gitBranch}${project.gitDirty ? ' (有未提交变更)' : ''}`"
            >
              <span>🌿 {{ project.gitBranch }}</span>
              <span
                v-if="project.gitDirty"
                class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                title="存在未提交的代码修改"
              ></span>
            </span>
            <span
              v-if="project.memo"
              class="text-[10px] text-amber-600 dark:text-amber-400 shrink-0 select-none"
              :title="`已记录便签: ${project.memo.slice(0, 40)}...`"
            >
              📝
            </span>
          </div>
          <p class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 max-w-[160px]">
            {{ project.description || project.composePath }}
          </p>

          <!-- Project Custom Tags -->
          <div v-if="project.tags && project.tags.length > 0" class="flex items-center space-x-1 flex-wrap gap-y-0.5 mt-1">
            <span
              v-for="t in project.tags"
              :key="t"
              class="px-1.5 py-0.2 rounded text-[9px] font-sans bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
            >
              #{{ t }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right Top: Batch Select / Pin Toggle / Status Indicator -->
      <div class="flex items-center space-x-1.5 shrink-0" @click.stop>
        <!-- Batch Checkbox -->
        <button
          v-if="batchMode"
          @click="$emit('toggle-select', project.id)"
          class="w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-xs"
          :class="isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/80 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-emerald-400'"
          title="选择/取消选择该项目进行批量操作"
        >
          <svg v-if="isSelected" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>

        <!-- Pin Button (Shown when not in batch mode) -->
        <button
          v-else
          @click="$emit('toggle-pin', project)"
          :class="[
            project.pinned
              ? 'opacity-100 bg-amber-500 text-white'
              : 'opacity-0 group-hover:opacity-100 bg-zinc-200/80 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white text-zinc-600 dark:text-zinc-400',
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all cursor-pointer shadow-2xs'
          ]"
          :title="project.pinned ? '取消置顶' : '置顶此项目'"
        >
          <span>📌</span>
        </button>

        <!-- Status Pill -->
        <div
          v-if="project.status === 'running'"
          class="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"></span>
          <span>运行中</span>
        </div>
        <div
          v-else-if="project.status === 'starting'"
          class="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>启动中</span>
        </div>
        <div
          v-else
          class="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
          <span>已休眠</span>
        </div>
      </div>
    </div>

    <!-- Middle: Microservices & Ports Direct Transparency (Key Bento Feature) -->
    <div class="bg-white/60 dark:bg-zinc-900/60 rounded-xl p-2 border border-zinc-200/50 dark:border-zinc-800/80 mb-3 text-[10px]">
      <div class="flex items-center justify-between text-zinc-400 dark:text-zinc-500 font-medium mb-1 text-[9px] uppercase tracking-wider">
        <span>微服务拓扑与端口</span>
        <button
          v-if="hasConflict"
          @click.stop="$emit('kill-conflict', project)"
          class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition-all cursor-pointer shadow-2xs active:scale-95"
          :title="conflictTooltip"
        >
          <span>⚠️ {{ conflictLabel }} (一键释放)</span>
        </button>
        <span v-else class="text-zinc-400 dark:text-zinc-500 font-mono">:{{ project.frontendPort }}</span>
      </div>

      <!-- Service Tag Pills -->
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(svc, idx) in microserviceTags"
          :key="idx"
          @click.stop="handleTagClick(svc)"
          class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono border transition-all hover:scale-105 cursor-pointer shadow-2xs"
          :class="[
            svc.isDb && project.status === 'running'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
              : project.status === 'running'
                ? 'bg-zinc-50 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                : 'bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50'
          ]"
          :title="svc.isDb ? '点击复制数据库连接串' : (project.status === 'running' && svc.port ? `点击在浏览器打开 :${svc.port}` : (svc.port ? `${svc.name} :${svc.port}` : svc.name))"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="project.status === 'running' ? 'bg-emerald-500 led-green-light' : 'bg-zinc-300 dark:bg-zinc-600'"
          ></span>
          <span v-if="svc.icon">{{ svc.icon }}</span>
          <span class="font-medium truncate max-w-[80px]">{{ svc.name }}</span>

          <!-- Database: show port (if any) and 📋 suffix -->
          <template v-if="svc.isDb">
            <span v-if="svc.port" class="text-zinc-400 dark:text-zinc-500 font-semibold">:{{ svc.port }}</span>
            <span class="text-[9px] opacity-80 shrink-0">📋</span>
          </template>

          <!-- Running with port: show :port ↗ -->
          <template v-else-if="project.status === 'running' && svc.port">
            <span class="text-emerald-700 dark:text-emerald-400 font-semibold">:{{ svc.port }} ↗</span>
          </template>

          <!-- Stopped with port: show :port -->
          <template v-else-if="svc.port">
            <span class="text-zinc-400 dark:text-zinc-500 font-medium">:{{ svc.port }}</span>
          </template>
        </span>
      </div>
    </div>

    <!-- Bottom Row: Realtime CPU/Mem + Action Buttons -->
    <div class="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs" @click.stop>
      <!-- Real-time Resource Info or URL Hint -->
      <div class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate max-w-[150px]">
        <span v-if="project.status === 'running'" class="text-emerald-700 dark:text-emerald-400 font-medium flex items-center space-x-1" :title="`${runningContainerCount}/${totalContainerCount} 个微服务容器正在运行`">
          <span>⚡</span>
          <span>{{ runningContainerCount }}/{{ totalContainerCount }} 运行中 · :{{ project.frontendPort }}</span>
        </span>
        <span v-else class="text-zinc-400 dark:text-zinc-500 truncate">
          {{ project.frontendUrl }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1.5">
        <!-- Quick Restart (If running) -->
        <button
          v-if="project.status === 'running'"
          @click="$emit('restart-project', project)"
          class="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center active:rotate-180"
          title="重启容器"
        >
          <span>🔄</span>
        </button>

        <!-- Quick Stop (If running) -->
        <button
          v-if="project.status === 'running'"
          @click="$emit('stop-project', project)"
          class="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center active:scale-95"
          title="一键停止项目"
        >
          <span>⏹</span>
        </button>

        <!-- Direct Browser or Start -->
        <button
          v-if="project.status === 'running'"
          @click="$emit('quick-open', project.frontendUrl)"
          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-medium shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
          title="在浏览器中直接打开前端网页"
        >
          <span>🌐</span>
          <span>打开网页</span>
        </button>

        <button
          v-else-if="project.status !== 'starting'"
          @click="$emit('quick-start', project)"
          class="px-2.5 py-1 bg-zinc-900 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-medium shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
          title="一键静默自愈启动并直达网页"
        >
          <span>▶</span>
          <span>一键启动</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TechIcon from './TechIcon.vue';
import { getTechGradient } from '../utils/techPresets.js';
import { detectDatabaseService } from '../utils/databaseHelper.js';

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  hasConflict: {
    type: Boolean,
    default: false
  },
  conflictsList: {
    type: Array,
    default: () => []
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

const emit = defineEmits([
  'open-detail',
  'quick-open',
  'quick-start',
  'restart-project',
  'stop-project',
  'toggle-pin',
  'exec-container',
  'notify',
  'toggle-select',
  'card-contextmenu',
  'kill-conflict'
]);

function handleClick() {
  if (props.batchMode) {
    emit('toggle-select', props.project.id);
  } else {
    emit('open-detail', props.project);
  }
}

function handleTagClick(svc) {
  if (svc.isDb && svc.uri) {
    navigator.clipboard.writeText(svc.uri);
    emit('notify', { icon: '📋', msg: `已复制数据库连接串: ${svc.uri}` });
  } else if (svc.port && props.project.status === 'running') {
    emit('quick-open', `http://localhost:${svc.port}`);
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

const conflictLabel = computed(() => {
  if (Array.isArray(props.conflictsList) && props.conflictsList.length > 0) {
    return `${props.conflictsList.map((c) => `:${c.port}`).join(', ')} 端口冲突`;
  }
  return '端口冲突';
});

const conflictTooltip = computed(() => {
  if (Array.isArray(props.conflictsList) && props.conflictsList.length > 0) {
    const desc = props.conflictsList
      .map((c) => `端口 :${c.port} 被 ${c.details || '外部进程'} 占用`)
      .join('；');
    return `${desc}。点击立即一键查杀并释放端口`;
  }
  return '检测到端口被占用，点击立即一键查杀并释放端口';
});

// Extract microservices for tag list
const microserviceTags = computed(() => {
  const parsedMap = new Map(
    (props.project.parsedServices || []).map((ps) => [ps.name, ps])
  );

  let list = [];
  if (props.project.containers && props.project.containers.length > 0) {
    list = props.project.containers.map((c) => ({
      name: c.service || c.name,
      ports: c.ports || ''
    }));
  } else if (props.project.services && props.project.services.length > 0) {
    list = props.project.services.map((s, idx) => ({
      name: s,
      ports: parsedMap.size === 0 && idx === 0 ? `:${props.project.frontendPort}` : ''
    }));
  } else {
    list = [{ name: 'web', ports: `:${props.project.frontendPort}` }];
  }

  const preParsedDbs = props.project.databases || [];

  return list.slice(0, 4).map((item) => {
    const parsedSvc = parsedMap.get(item.name);
    const configuredPort = parsedSvc?.ports?.[0]?.host || null;
    const matchedDb = preParsedDbs.find((d) => d.service === item.name);
    const dbInfo = matchedDb || detectDatabaseService(item.name, item.ports || configuredPort || '');
    const m = String(item.ports).match(/:(\d+)/) || String(item.ports).match(/(\d+)->/);
    const port = m ? m[1] : (configuredPort || dbInfo.port || null);
    return {
      name: item.name,
      port,
      isDb: dbInfo.isDb,
      uri: dbInfo.uri,
      icon: dbInfo.isDb ? dbInfo.icon : null
    };
  });
});

const primaryServiceName = computed(() => {
  if (props.project.containers && props.project.containers.length > 0) {
    return props.project.containers[0].name || props.project.containers[0].service;
  }
  if (props.project.services && props.project.services.length > 0) {
    return props.project.services[0];
  }
  return props.project.name;
});

const runningContainerCount = computed(() => {
  if (!props.project.containers || props.project.containers.length === 0) {
    return props.project.status === 'running' ? 1 : 0;
  }
  return props.project.containers.filter((c) => {
    const state = (c.state || c.status || '').toLowerCase();
    return state.includes('running') || state.startsWith('up');
  }).length;
});

const totalContainerCount = computed(() => {
  if (props.project.containers && props.project.containers.length > 0) {
    return props.project.containers.length;
  }
  if (props.project.services && props.project.services.length > 0) {
    return props.project.services.length;
  }
  return 1;
});
</script>
