<template>
  <div
    class="flex flex-col items-center group cursor-pointer"
    @click="$emit('open-detail', project)"
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
        :style="{ background: techConfig.gradient }"
      >
        <!-- Icon Glass Specular Highlight -->
        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>

        <!-- Port Badge (Top Right) -->
        <div
          v-if="hasConflict"
          class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs tracking-tight flex items-center space-x-0.5 border border-amber-300"
          title="检测到端口已被占用！点击进入详情释放"
        >
          <span>⚠️</span>
          <span>:{{ project.frontendPort }}</span>
        </div>
        <div
          v-else-if="project.frontendPort"
          class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-white/30 backdrop-blur-md text-white border border-white/40 shadow-xs tracking-tight"
        >
          :{{ project.frontendPort }}
        </div>

        <!-- Tech Stack SVG Logo -->
        <div class="w-10 h-10 flex items-center justify-center text-white drop-shadow-md">
          <!-- Vue -->
          <svg v-if="project.tech === 'Vue'" viewBox="0 0 128 128" class="w-9 h-9 fill-current">
            <path d="M78.8,10L64,35.4L49.2,10H0l64,108L128,10H78.8z" fill="#fff" opacity="0.95"/>
            <path d="M78.8,10L64,35.4L49.2,10H25.4L64,76.8L102.6,10H78.8z" fill="#42b883"/>
          </svg>

          <!-- Java -->
          <svg v-else-if="project.tech === 'Java'" viewBox="0 0 24 24" class="w-9 h-9 fill-none stroke-current" stroke-width="1.8">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>

          <!-- Next -->
          <svg v-else-if="project.tech === 'Next'" viewBox="0 0 180 180" class="w-9 h-9 fill-current">
            <mask height="180" id="mask0" maskUnits="userSpaceOnUse" width="180" x="0" y="0">
              <circle cx="90" cy="90" fill="black" r="90"></circle>
            </mask>
            <g mask="url(#mask0)">
              <circle cx="90" cy="90" fill="#111" r="90"></circle>
              <path d="M149.508 157.438L69.1478 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.141 149.508 157.438Z" fill="white"></path>
              <rect fill="white" height="72" width="12" x="115" y="54"></rect>
            </g>
          </svg>

          <!-- Python -->
          <svg v-else-if="project.tech === 'Python'" viewBox="0 0 128 128" class="w-9 h-9 fill-current">
            <path d="M63.4,6.2C48.6,6.2,49.8,12.6,49.8,12.6l0.1,6.6h27.9v8.3H38.5c0,0-15.6,0.3-22.1,8.3c-6.8,8.4-6.6,24.6-6.6,24.6s-0.8,10.6,6.6,18.4c6.3,6.7,14.6,6.8,14.6,6.8h8.8v-12.3c0,0-0.5-14.7,14.3-14.7h27.5c0,0,13.7-0.7,13.7-14V19.8C95.3,19.8,96.3,6.2,63.4,6.2z M45.8,15.6c2.6,0,4.7,2.1,4.7,4.7c0,2.6-2.1,4.7-4.7,4.7c-2.6,0-4.7-2.1-4.7-4.7C41.1,17.7,43.2,15.6,45.8,15.6z" fill="#ffd43b"/>
            <path d="M64.6,121.8c14.8,0,13.6-6.4,13.6-6.4l-0.1-6.6H50.2v-8.3h39.3c0,0,15.6-0.3,22.1-8.3c6.8-8.4,6.6-24.6,6.6-24.6s0.8-10.6-6.6-18.4c-6.3-6.7-14.6-6.8-14.6-6.8h-8.8v12.3c0,0,0.5,14.7-14.3,14.7H46.4c0,0-13.7,0.7-13.7,14v24.8C32.7,108.2,31.7,121.8,64.6,121.8z M82.2,112.4c-2.6,0-4.7-2.1-4.7-4.7c0-2.6,2.1-4.7,4.7-4.7c2.6,0,4.7,2.1,4.7,4.7C86.9,110.3,84.8,112.4,82.2,112.4z" fill="#306998"/>
          </svg>

          <!-- Docker Generic -->
          <svg v-else viewBox="0 0 24 24" class="w-9 h-9 fill-none stroke-current" stroke-width="1.8">
            <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
            <path d="M2 14h20"/>
            <rect x="6" y="8" width="3" height="3"/>
            <rect x="11" y="8" width="3" height="3"/>
            <rect x="16" y="8" width="3" height="3"/>
            <rect x="11" y="4" width="3" height="3"/>
          </svg>
        </div>
      </div>

      <!-- Dock LED indicator -->
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
    <span class="text-xs font-semibold text-zinc-700 tracking-tight text-center max-w-[96px] truncate group-hover:text-zinc-950 transition-colors">
      {{ project.name }}
    </span>
    <!-- Subtitle (Port / Tech) -->
    <span class="text-[10px] text-zinc-400 font-mono mt-0.5">
      {{ project.tech }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  hasConflict: {
    type: Boolean,
    default: false
  }
});

defineEmits(['open-detail']);

const techConfig = computed(() => {
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
</script>
