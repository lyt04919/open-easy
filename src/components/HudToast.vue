<template>
  <div
    v-if="visible"
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-zinc-900/90 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-medium backdrop-blur-md border border-white/10 hud-float pointer-events-none"
  >
    <span class="text-sm">{{ icon }}</span>
    <span class="tracking-wide">{{ message }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(false);
const icon = ref('✨');
const message = ref('');
let timer = null;

function show(ico, msg, duration = 2400) {
  icon.value = ico || '✨';
  message.value = msg;
  visible.value = true;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    visible.value = false;
  }, duration);
}

defineExpose({ show });
</script>
