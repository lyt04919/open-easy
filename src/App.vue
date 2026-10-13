<template>
  <div class="h-screen w-screen flex flex-col bg-[#fbfbfd] text-zinc-800 overflow-hidden font-sans select-none">
    <!-- Top Native Header -->
    <Header
      v-model:searchQuery="searchQuery"
      :orb-running="orbRunning"
      @sleep-all="handleSleepAll"
      @toggle-orb="checkOrb"
    />

    <!-- Main Content Area: Launchpad App Grid -->
    <div class="flex-1 p-7 overflow-y-auto">
      <!-- Section Title & Status Legend -->
      <div class="mb-5 px-2 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
        <div class="flex items-center space-x-2">
          <span class="uppercase tracking-wider text-[10px] font-semibold text-zinc-400">已接入的 Compose 项目</span>
          <span class="text-zinc-300">|</span>
          <span class="text-zinc-500 text-[11px] font-normal">点击任意图标呼出项目详情面板 · 支持引擎自愈与浏览器联动</span>
        </div>
        <div class="flex items-center space-x-3 text-zinc-400 text-[10px]">
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>运行中</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>端口占用</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
            <span>已休眠</span>
          </span>
        </div>
      </div>

      <!-- App Grid (4 Columns) -->
      <div class="grid grid-cols-4 gap-y-7 gap-x-4 px-2">
        <AppIcon
          v-for="proj in filteredProjects"
          :key="proj.id"
          :project="proj"
          :has-conflict="Boolean(conflicts[proj.frontendPort]?.occupied)"
          @open-detail="openDetail"
        />
      </div>

      <!-- Empty Filter State -->
      <div
        v-if="filteredProjects.length === 0"
        class="h-48 flex flex-col items-center justify-center text-zinc-400 text-xs"
      >
        <span class="text-2xl mb-1">🔍</span>
        <span>未搜索到匹配的项目</span>
      </div>
    </div>

    <!-- Bottom Status & Actions Bar -->
    <FooterBar
      :active-count="runningCount"
      :memory-m-b="stats.memoryMB"
      @clean-cache="handleCleanCache"
      @import-project="handleImportProject"
    />

    <!-- Centered Project Detail Modal -->
    <ProjectDetailModal
      v-if="selectedProject"
      :project="selectedProject"
      :conflict-info="conflicts[selectedProject.frontendPort]"
      :starting-text="startingText"
      @close="selectedProject = null"
      @start-project="handleStartProject"
      @stop-project="handleStopProject"
      @restart-project="handleRestartProject"
      @open-browser="handleOpenBrowser"
      @open-editor="handleOpenEditor"
      @open-terminal="handleOpenTerminal"
      @show-finder="handleShowFinder"
      @kill-conflict-process="handleKillConflict"
      @update-url="handleUpdateUrl"
    />

    <!-- Non-intrusive Floating HUD Toast -->
    <HudToast ref="hudRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Header from './components/Header.vue';
import AppIcon from './components/AppIcon.vue';
import ProjectDetailModal from './components/ProjectDetailModal.vue';
import FooterBar from './components/FooterBar.vue';
import HudToast from './components/HudToast.vue';

const hudRef = ref(null);
const searchQuery = ref('');
const orbRunning = ref(true);
const projects = ref([]);
const selectedProject = ref(null);
const conflicts = ref({});
const startingText = ref('正在启动并探活中...');
const stats = ref({ running: true, containerCount: 0, memoryMB: 0 });

// Filtered project list by search keyword
const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return projects.value;
  return projects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.tech.toLowerCase().includes(q) ||
      String(p.frontendPort).includes(q)
  );
});

const runningCount = computed(() => {
  return projects.value.filter((p) => p.status === 'running').length;
});

// Toast Helper
function toast(icon, msg, duration = 2400) {
  if (hudRef.value) {
    hudRef.value.show(icon, msg, duration);
  }
}

// Initial Data Load
async function checkOrb() {
  if (window.electronAPI) {
    const res = await window.electronAPI.checkOrbStatus();
    orbRunning.value = res.running;
    if (res.running) {
      toast('🟢', 'OrbStack 引擎运行中');
    } else {
      toast('⚪', 'OrbStack 已待机 (点击项目将自动自愈唤醒)');
    }
  }
}

async function refreshProjects() {
  if (window.electronAPI) {
    const list = await window.electronAPI.listProjects();
    projects.value = list;

    // Check port conflicts for each project
    for (const p of list) {
      if (p.frontendPort && p.status !== 'running') {
        const c = await window.electronAPI.checkPortConflict(p.frontendPort);
        if (c.occupied) {
          conflicts.value[p.frontendPort] = c;
        } else {
          delete conflicts.value[p.frontendPort];
        }
      }
    }

    // Refresh stats
    const s = await window.electronAPI.getStats();
    stats.value = s;
  }
}

function openDetail(project) {
  selectedProject.value = project;
}

// Start Project with Auto-Healing & Browser Launch
async function handleStartProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  p.status = 'starting';
  if (!orbRunning.value) {
    startingText.value = '⚡ 正在自愈唤醒 OrbStack 引擎...';
    toast('⚡', '检测到 OrbStack 未启动，正在静默自愈唤醒中...', 3000);
  } else {
    startingText.value = '正在启动容器并探活中...';
    toast('🚀', `正在启动 [${p.name}] 容器服务...`, 2000);
  }

  try {
    const result = await window.electronAPI.startProject(p.id, p.composePath, p.frontendUrl);
    if (result.success) {
      p.status = 'running';
      orbRunning.value = true;
      if (result.autoHealed) {
        toast('✨', `OrbStack 已自愈！服务就绪，已直达前端网页`);
      } else {
        toast('🌐', `服务探活就绪 (${result.durationMs}ms)，已自动进入前端网页`);
      }
    } else {
      p.status = 'stopped';
      toast('❌', `启动失败: ${result.error || '未知错误'}`);
    }
  } catch (err) {
    p.status = 'stopped';
    toast('❌', `启动发生异常: ${err.message}`);
  } finally {
    await refreshProjects();
    if (selectedProject.value && selectedProject.value.id === p.id) {
      selectedProject.value = { ...p };
    }
  }
}

// Stop Project
async function handleStopProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  toast('⏳', `正在停止 [${p.name}] 容器...`);
  await window.electronAPI.stopProject(p.id, p.composePath);
  p.status = 'stopped';
  toast('⏹', `[${p.name}] 容器已停止并释放系统资源`);
  await refreshProjects();
  if (selectedProject.value && selectedProject.value.id === p.id) {
    selectedProject.value = { ...p };
  }
}

// Restart Project
async function handleRestartProject(project) {
  const p = projects.value.find((item) => item.id === project.id);
  if (!p) return;

  p.status = 'starting';
  startingText.value = '正在重启容器并探活...';
  toast('🔄', `正在重启 [${p.name}]...`);
  await window.electronAPI.restartProject(p.id, p.composePath);
  await refreshProjects();
  toast('✨', `[${p.name}] 重启成功`);
  if (selectedProject.value && selectedProject.value.id === p.id) {
    selectedProject.value = { ...p };
  }
}

// Sleep All Projects
async function handleSleepAll() {
  const running = projects.value.filter((p) => p.status === 'running');
  if (running.length === 0) {
    toast('💤', '当前没有运行中的容器需要休眠');
    return;
  }
  toast('🌙', '正在一键休眠所有运行容器...');
  const res = await window.electronAPI.sleepAll();
  await refreshProjects();
  toast('✨', `已休眠 ${res.stoppedCount || running.length} 个项目，已释放 OrbStack 内存与 CPU`);
  if (selectedProject.value) {
    const updated = projects.value.find((p) => p.id === selectedProject.value.id);
    if (updated) selectedProject.value = { ...updated };
  }
}

// Clean Cache & Prune
async function handleCleanCache() {
  toast('🧹', '正在清理未引用镜像与缓存...');
  try {
    await window.electronAPI.pruneSystem();
    toast('✨', 'OrbStack 缓存清理完成，已回收磁盘空间');
    await refreshProjects();
  } catch (err) {
    toast('⚠️', '清理失败: ' + err.message);
  }
}

function handleOpenBrowser(url) {
  if (window.electronAPI) {
    window.electronAPI.openUrl(url);
    toast('🌐', `已在默认浏览器中打开: ${url}`);
  }
}

function handleOpenEditor(composePath, editor = 'code') {
  if (window.electronAPI) {
    window.electronAPI.openInEditor(composePath, editor);
    toast('💻', '已在代码编辑器中打开项目目录');
  }
}

function handleOpenTerminal(composePath) {
  if (window.electronAPI) {
    window.electronAPI.openInTerminal(composePath);
    toast('⚡', '已在 macOS 终端中打开项目目录');
  }
}

function handleShowFinder(composePath) {
  if (window.electronAPI) {
    window.electronAPI.showInFinder(composePath);
    toast('📁', '已在访达中显示项目目录');
  }
}

async function handleKillConflict(pid) {
  if (window.electronAPI) {
    const res = await window.electronAPI.killPortProcess(pid);
    if (res.success) {
      toast('✨', '占用进程已终止，端口已成功释放！');
      await refreshProjects();
    } else {
      toast('⚠️', '释放端口失败: ' + res.message);
    }
  }
}

async function handleUpdateUrl({ id, url }) {
  if (window.electronAPI) {
    await window.electronAPI.updateProject(id, { frontendUrl: url });
    const p = projects.value.find((item) => item.id === id);
    if (p) p.frontendUrl = url;
    toast('✏️', `前端打开地址已更新为: ${url}`);
  }
}

function handleImportProject() {
  toast('📁', '选择本地含 docker-compose.yml 的目录即可导入');
}

onMounted(async () => {
  await checkOrb();
  await refreshProjects();
});
</script>
