<template>
  <div
    v-if="project"
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 select-none window-no-drag"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-[#18181b] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.8)] border border-zinc-200/90 dark:border-zinc-700/80 p-6 w-[560px] max-h-[88vh] flex flex-col overflow-hidden modal-animate text-zinc-800 dark:text-zinc-100 relative">
      <!-- Specular Top Rim Light -->
      <div class="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/20 to-transparent pointer-events-none rounded-t-3xl"></div>

      <!-- Close Button -->
      <button
        @click="$emit('close')"
        class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-10"
      >
        ✕
      </button>

      <!-- Fixed Header Area (Top Info + Conflicts + Primary Action + Two-Layer Toolbar) -->
      <div class="shrink-0 mb-3">
        <!-- Top info row (Icon + Meta on left, Primary Action Buttons on right) -->
        <div class="flex items-start justify-between mb-3 pr-8">
          <!-- Left: 64x64 Squircle Icon + Meta details -->
          <div class="flex items-center space-x-3.5 min-w-0 flex-1 mr-3">
            <!-- 64x64 Squircle Icon with click to change -->
            <div
              @click="showIconPicker = true"
              class="w-16 h-16 squircle icon-gloss-light flex items-center justify-center text-white shrink-0 relative overflow-hidden group cursor-pointer"
              :style="{ background: displayGradient }"
              title="点击自定义更换项目图标"
            >
              <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none"></div>
              
              <!-- 1. Custom Image (Fills squircle) -->
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

              <!-- 3. Logo -->
              <TechIcon
                v-else
                :name="effectiveTech"
                :size="30"
                class="drop-shadow-md"
              />

              <!-- Hover Camera Overlay -->
              <div class="absolute inset-0 bg-black/45 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-medium text-white space-y-0.5">
                <span>📷</span>
                <span>换图标</span>
              </div>
            </div>

            <!-- Meta info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <!-- Inline Editable Project Name -->
                <div v-if="isEditingName" class="flex-1 min-w-0">
                  <input
                    ref="nameInputRef"
                    type="text"
                    v-model="editedName"
                    @blur="saveProjectName"
                    @keydown.enter="saveProjectName"
                    @keydown.esc="isEditingName = false"
                    class="w-full text-base font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-emerald-500 outline-none"
                  />
                </div>
                <div v-else class="flex items-center space-x-1.5 min-w-0">
                  <h2
                    @click="startEditName"
                    class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                    title="点击修改项目名称"
                  >
                    {{ project.name }}
                  </h2>
                  <button
                    @click="startEditName"
                    class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer flex items-center space-x-0.5 shrink-0"
                    title="修改项目名称"
                  >
                    <span>✏️</span>
                    <span>改名</span>
                  </button>
                </div>

                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                  {{ effectiveTech }}
                </span>

                <!-- Git Branch Capsule -->
                <span
                  v-if="project.gitBranch"
                  class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0 flex items-center space-x-1"
                  :title="`Git 分支: ${project.gitBranch}${project.gitDirty ? ' (有未提交变更)' : ''}`"
                >
                  <span>🌿 {{ project.gitBranch }}</span>
                  <span
                    v-if="project.gitDirty"
                    class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                    title="存在未提交的代码修改"
                  ></span>
                </span>
              </div>

              <!-- Inline Editable Description -->
              <div v-if="isEditingDesc" class="mt-1">
                <input
                  ref="descInputRef"
                  type="text"
                  v-model="editedDesc"
                  @blur="saveProjectDesc"
                  @keydown.enter="saveProjectDesc"
                  @keydown.esc="isEditingDesc = false"
                  class="w-full text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-emerald-500 outline-none"
                  placeholder="在此输入项目说明..."
                />
              </div>
              <div
                v-else
                class="flex items-center space-x-1.5 mt-0.5 min-w-0"
              >
                <p
                  @click="startEditDesc"
                  class="text-xs text-zinc-500 dark:text-zinc-400 truncate hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  title="点击修改描述信息"
                >
                  {{ project.description || project.composePath }}
                </p>
                <button
                  @click="startEditDesc"
                  class="text-[9px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
                  title="修改项目说明"
                >
                  ✏️
                </button>
              </div>

              <!-- Status badge & Real-time resource breakdown -->
              <div class="mt-1.5 flex items-center space-x-2">
                <span
                  v-if="project.status === 'running'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 flex items-center space-x-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 led-green-light"></span>
                  <span>运行中</span>
                </span>
                <span
                  v-else-if="project.status === 'starting'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 flex items-center space-x-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span>{{ startingText }}</span>
                </span>
                <span
                  v-else
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  已休眠 / 停止
                </span>

                <!-- Real-time CPU & Memory Usage Button -->
                <button
                  v-if="project.status === 'running' && projectStats"
                  @click="activeTab = 'devops'"
                  class="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700/90 text-zinc-600 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/70 transition-colors cursor-pointer"
                  title="点击跳转到运维监控查看资源消耗明细"
                >
                  <span class="text-emerald-600 dark:text-emerald-400 font-semibold">⚡ CPU: {{ projectStats.totalCpu }}</span>
                  <span class="text-zinc-300 dark:text-zinc-600">·</span>
                  <span class="text-zinc-700 dark:text-zinc-300 font-medium">内存: {{ projectStats.totalMemMB }} MB</span>
                  <span class="text-[9px] text-zinc-400">📊</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Primary Action Button (Aligned with squircle icon and title) -->
          <div class="shrink-0 pt-1">
            <!-- Starting State -->
            <button
              v-if="project.status === 'starting'"
              disabled
              class="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium rounded-xl text-xs cursor-not-allowed flex items-center space-x-1.5 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs"
            >
              <svg class="animate-spin h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span>{{ startingText }}</span>
            </button>

            <!-- Running State -->
            <div v-else-if="project.status === 'running'" class="flex items-center space-x-1.5">
              <button
                @click="$emit('open-browser', project.frontendUrl)"
                class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title="在浏览器中直接打开前端网页"
              >
                <span>🌐</span>
                <span>打开网页</span>
              </button>
              <button
                @click="$emit('stop-project', project)"
                class="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 flex items-center justify-center text-xs transition-colors cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                title="停止项目并释放资源"
              >
                <span>⏹</span>
              </button>
              <button
                @click="$emit('restart-project', project)"
                class="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs transition-colors cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                title="重启项目"
              >
                <span>🔄</span>
              </button>
            </div>

            <!-- Stopped State: Prominent Launch Button -->
            <button
              v-else
              @click="$emit('start-project', project)"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="一键启动项目并进入前端网页"
            >
              <span>🚀</span>
              <span>一键启动</span>
            </button>
          </div>
        </div>

        <!-- Full Port Conflicts Banner (if any detected across all exposed host ports) -->
        <div v-if="effectiveConflicts.length > 0" class="mb-3 space-y-1.5">
          <div
            v-for="c in effectiveConflicts"
            :key="c.port"
            class="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 rounded-xl flex items-center justify-between text-xs shadow-2xs"
          >
            <div class="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
              <span class="text-base">⚠️</span>
              <div>
                <div class="font-semibold text-[11px]">端口 :{{ c.port }} 已被占用</div>
                <div class="text-[10px] text-amber-700 dark:text-amber-300">占用进程: {{ c.details || '未知进程' }} (PID: {{ c.pid || '?' }})</div>
              </div>
            </div>
            <button
              v-if="c.pid || c.port"
              @click="$emit('kill-conflict-process', { pid: c.pid, port: c.port })"
              class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-[10px] shadow-xs cursor-pointer transition-colors"
            >
              一键释放端口
            </button>
          </div>
        </div>

        <!-- Compact Lightweight Developer Toolbar (1 row of 5 neutral tools) -->
        <div class="grid grid-cols-5 gap-1.5 mb-2.5">
          <!-- 1. Default IDE (Dynamic preferred editor) -->
          <button
            @click="$emit('open-editor', project.composePath, preferredEditor)"
            class="py-1.5 px-2 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            :title="`在默认编辑器 (${currentEditorInfo.name}) 中打开项目目录`"
          >
            <span>{{ currentEditorInfo.icon }}</span>
            <span class="truncate">{{ currentEditorInfo.name }}</span>
          </button>

          <!-- 2. Cursor (or VS Code fallback) -->
          <button
            v-if="preferredEditor === 'cursor'"
            @click="$emit('open-editor', project.composePath, 'code')"
            class="py-1.5 px-2 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            title="在 VS Code 中打开项目目录"
          >
            <span>💻</span>
            <span class="truncate">VS Code</span>
          </button>
          <button
            v-else
            @click="$emit('open-editor', project.composePath, 'cursor')"
            class="py-1.5 px-2 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            title="在 Cursor 编辑器中打开项目目录"
          >
            <span>✨</span>
            <span class="truncate">Cursor</span>
          </button>

          <!-- 3. Terminal -->
          <button
            @click="$emit('open-terminal', project.composePath)"
            class="py-1.5 px-2 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            title="在终端中打开项目目录"
          >
            <span>⚡</span>
            <span>终端</span>
          </button>

          <!-- 4. Finder -->
          <button
            @click="$emit('show-finder', project.composePath)"
            class="py-1.5 px-2 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            title="在访达中显示项目目录"
          >
            <span>📁</span>
            <span>访达</span>
          </button>

          <!-- 5. Tags -->
          <button
            @click="showTagsPopover = !showTagsPopover"
            :class="showTagsPopover ? 'bg-zinc-200/90 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300'"
            class="py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center space-x-1 cursor-pointer border-none"
            title="管理工作区分类标签"
          >
            <span>🏷️</span>
            <span>标签<template v-if="currentTags.length > 0"> ({{ currentTags.length }})</template></span>
          </button>
        </div>

        <!-- Inline Tags Bar (Toggleable from 🏷️ 标签 button) -->
        <div v-if="showTagsPopover" class="mb-2.5 p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 text-xs animate-in fade-in duration-100">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">工作区分类标签:</span>
            <button @click="showTagsPopover = false" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer">✕</button>
          </div>
          <div class="flex flex-wrap gap-1.5 items-center">
            <span
              v-for="tag in currentTags"
              :key="tag"
              class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 shadow-2xs"
            >
              <span>#{{ tag }}</span>
              <button @click="removeTag(tag)" class="hover:text-rose-500 cursor-pointer ml-0.5">✕</button>
            </span>
            <div class="flex items-center space-x-1">
              <input
                v-model="newTagInput"
                @keydown.enter="addCustomTag"
                type="text"
                placeholder="+ 回车添加标签"
                class="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 outline-none focus:border-emerald-500 w-24"
              />
            </div>
          </div>
        </div>

        <!-- Segmented Control Bar (Flexible column distribution) -->
        <div class="flex items-center space-x-1 p-1 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl text-xs select-none">
          <button
            @click="activeTab = 'services'"
            :class="activeTab === 'services' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>🧩</span>
            <span>服务 ({{ serviceList.length }})</span>
          </button>

          <!-- 🗄️ 数据库 Tab (Only shown if dbServices.length > 0) -->
          <button
            v-if="dbServices.length > 0"
            @click="activeTab = 'database'"
            :class="activeTab === 'database' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>🗄️</span>
            <span>数据库 ({{ dbServices.length }})</span>
          </button>

          <button
            @click="activeTab = 'logs'"
            :class="activeTab === 'logs' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>📜</span>
            <span>日志</span>
          </button>

          <button
            @click="activeTab = 'env'"
            :class="activeTab === 'env' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>📝</span>
            <span>.env</span>
          </button>

          <button
            @click="activeTab = 'memo'"
            :class="activeTab === 'memo' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>📋</span>
            <span>便签</span>
          </button>

          <button
            @click="activeTab = 'devops'"
            :class="activeTab === 'devops' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'"
            class="flex-1 py-1 rounded-lg transition-all flex items-center justify-center space-x-1 text-[11px] cursor-pointer"
          >
            <span>🛠️</span>
            <span>运维</span>
          </button>
        </div>
      </div>

      <!-- Tab Content Body (Scrollable, single vertical scrollbar) -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-3.5">
        <!-- Tab 1: Services (Microservices List, Frontend URL & Ping) -->
        <template v-if="activeTab === 'services'">
          <!-- Microservices List & Independent Controls (Frameless clean layout) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 px-0.5">
              <div class="flex items-center space-x-1.5">
                <span>微服务列表</span>
                <span class="text-[10px] text-zinc-400 font-normal">({{ serviceList.length }})</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <button
                  v-if="hasMiddleware"
                  @click="handleStartMiddleware"
                  :disabled="startingMiddleware"
                  class="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-[10px] font-medium transition-all flex items-center space-x-1 cursor-pointer"
                  title="单独启动数据库与缓存中间件微服务 (可在宿主机本地独立运行前端/后端)"
                >
                  <span>{{ startingMiddleware ? '⏳' : '⚡' }}</span>
                  <span>仅启动中间件</span>
                </button>
              </div>
            </div>

            <!-- Naturally expanding list without inner scrollbar -->
            <div class="space-y-1.5">
              <div
                v-for="(svc, idx) in serviceList"
                :key="idx"
                class="group flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-zinc-50/80 hover:bg-zinc-100/90 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors shadow-2xs"
              >
                <!-- Left: Status dot + Service name + Tech badge -->
                <div class="flex items-center space-x-2 min-w-0">
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="svc.isRunning ? 'bg-emerald-500 led-green-light' : 'bg-zinc-300 dark:bg-zinc-600'"
                  ></span>
                  <span class="font-medium text-zinc-700 dark:text-zinc-200 truncate">{{ svc.name }}</span>
                  <span
                    v-if="svc.isCurrentFrontend"
                    class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-600 shrink-0"
                  >
                    当前前端
                  </span>
                  <span
                    v-else-if="svc.dbInfo?.isDb"
                    class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 shrink-0 flex items-center space-x-0.5"
                  >
                    <span>{{ svc.dbInfo.icon }}</span>
                    <span>{{ svc.dbInfo.label }}</span>
                  </span>
                </div>

                <!-- Right: Static Port Info + Hover-to-reveal Action Buttons -->
                <div class="flex items-center space-x-2 shrink-0 ml-2">
                  <!-- Port Info (Always visible) -->
                  <div class="flex items-center space-x-1">
                    <template v-if="svc.hostPort">
                      <button
                        v-if="svc.isRunning"
                        @click="$emit('open-browser', `http://localhost:${svc.hostPort}`)"
                        class="px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer"
                        :title="`在浏览器中直接打开 :${svc.hostPort}`"
                      >
                        :{{ svc.hostPort }} ↗
                      </button>
                      <span v-else class="font-mono text-[10px] text-zinc-400">
                        :{{ svc.hostPort }}
                      </span>
                    </template>
                    <span v-else class="font-mono text-[10px] text-zinc-400">内部通信</span>
                  </div>

                  <!-- Hover-to-reveal Actions -->
                  <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <!-- 设为默认前端 -->
                    <button
                      v-if="svc.hostPort && !svc.isCurrentFrontend"
                      @click="setAsFrontend(svc.hostPort)"
                      class="px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 rounded transition-colors cursor-pointer"
                      title="将此端口设为默认前端入口"
                    >
                      设为入口
                    </button>

                    <!-- OrbStack URL -->
                    <button
                      v-if="svc.orbLocalUrl && svc.isRunning"
                      @click="$emit('open-browser', svc.orbLocalUrl)"
                      class="px-1.5 py-0.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 rounded transition-colors cursor-pointer"
                      :title="`在浏览器中打开 OrbStack 专属域名 (${svc.orbLocalUrl})`"
                    >
                      orb ↗
                    </button>

                    <!-- 命令行 (Only when running) -->
                    <button
                      v-if="svc.isRunning"
                      @click="handleExecContainer(svc.name)"
                      class="px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer flex items-center space-x-0.5 font-mono"
                      title="进入该容器内部命令行环境 (docker exec -it)"
                    >
                      <span class="font-bold">&gt;_</span>
                      <span>终端</span>
                    </button>

                    <!-- Single Service Start / Stop / Restart -->
                    <button
                      v-if="!svc.isRunning"
                      @click="handleServiceAction(svc.name, 'start')"
                      :disabled="operatingServices[svc.name]"
                      class="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer flex items-center space-x-1"
                      title="单独启动此微服务容器"
                    >
                      <span v-if="operatingServices[svc.name] === 'start'">⏳</span>
                      <span v-else>▶</span>
                      <span>启动</span>
                    </button>

                    <template v-else>
                      <button
                        @click="handleServiceAction(svc.name, 'restart')"
                        :disabled="operatingServices[svc.name]"
                        class="w-6 h-6 rounded text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer flex items-center justify-center"
                        title="单独重启此微服务"
                      >
                        <span v-if="operatingServices[svc.name] === 'restart'">⏳</span>
                        <span v-else>🔄</span>
                      </button>
                      <button
                        @click="handleServiceAction(svc.name, 'stop')"
                        :disabled="operatingServices[svc.name]"
                        class="w-6 h-6 rounded text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer flex items-center justify-center"
                        title="单独停止此微服务"
                      >
                        <span v-if="operatingServices[svc.name] === 'stop'">⏳</span>
                        <span v-else>⏹</span>
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Custom Frontend URL Setting, OrbStack Native Domain & Live Health/Ping Diagnostics -->
          <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col space-y-2">
            <div class="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span class="font-semibold text-zinc-600 dark:text-zinc-300">前端服务入口与测速探活:</span>
              <!-- Live Ping Badge -->
              <div class="flex items-center space-x-1.5 font-mono text-[10px]">
                <span v-if="pinging" class="text-zinc-400 flex items-center space-x-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span>探活中...</span>
                </span>
                <span
                  v-else-if="pingResult"
                  class="px-2 py-0.5 rounded-full border flex items-center space-x-1"
                  :class="pingResult.ok ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="pingResult.ok ? 'bg-emerald-500 led-green-light' : 'bg-rose-500'"></span>
                  <span>{{ pingResult.statusCode ? `${pingResult.statusCode} ${pingResult.statusText}` : (pingResult.error || '未响应') }}</span>
                  <span v-if="pingResult.latencyMs" class="text-zinc-400">· {{ pingResult.latencyMs }}ms</span>
                </span>
                <button
                  v-if="project.status === 'running'"
                  @click="handlePingRoute()"
                  class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-sans transition-colors cursor-pointer flex items-center space-x-1"
                  title="即时发起 HTTP/TCP 请求测试服务连通性与毫秒延迟"
                >
                  <span>⚡</span>
                  <span>测速探活</span>
                </button>
              </div>
            </div>

            <!-- OrbStack Domain vs Localhost quick switcher -->
            <div v-if="project.orbLocalUrl" class="flex items-center space-x-2 text-[10px] text-zinc-500">
              <span>入口模式:</span>
              <button
                @click="switchUrlMode('localhost')"
                :class="!customUrl.includes('orb.local') ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-semibold shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
                class="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>💻</span>
                <span>localhost:{{ project.frontendPort || 8080 }}</span>
              </button>
              <button
                @click="switchUrlMode('orb')"
                :class="customUrl.includes('orb.local') ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-semibold shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
                class="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>🌐</span>
                <span>OrbStack 原生域名</span>
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <input
                type="text"
                v-model="customUrl"
                class="flex-1 bg-zinc-100 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-200 focus:outline-none transition-all"
                placeholder="http://localhost:8080"
              />
              <button
                @click="saveUrl"
                class="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                保存入口
              </button>
            </div>
          </div>
        </template>

        <!-- Tab: Database (Dedicated Tab) -->
        <template v-else-if="activeTab === 'database'">
          <div class="space-y-3">
            <div class="flex items-center justify-between px-0.5">
              <div class="flex items-center space-x-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                <span>🗄️</span>
                <span>已识别数据库微服务 ({{ dbServices.length }})</span>
              </div>
              <!-- Web Database Management UI link (e.g. Adminer / pgAdmin) if present -->
              <button
                v-if="detectedWebAdmin"
                @click="openWebAdmin(detectedWebAdmin.url)"
                class="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition-colors flex items-center space-x-1 cursor-pointer"
                :title="`在浏览器中打开 ${detectedWebAdmin.label} (${detectedWebAdmin.url})`"
              >
                <span>🌐</span>
                <span>打开 {{ detectedWebAdmin.label }}</span>
              </button>
              <span v-else class="text-[10px] text-zinc-400">一键调用客户端直连或复制 URI</span>
            </div>

            <div class="space-y-2">
              <div
                v-for="(db, i) in dbServices"
                :key="i"
                class="bg-white dark:bg-zinc-800/90 rounded-xl p-3 border border-zinc-200/80 dark:border-zinc-700 text-[11px] shadow-2xs space-y-2.5"
              >
                <!-- Upper Row: DB info & Main Action Buttons -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2 truncate mr-2">
                    <span class="text-base shrink-0">{{ db.icon }}</span>
                    <div class="flex items-center space-x-1.5 truncate">
                      <span class="font-semibold text-zinc-800 dark:text-zinc-100 truncate">{{ db.name }}</span>
                      <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono font-medium shrink-0">({{ db.label }})</span>
                      <span
                        v-if="db.isOrbDirect"
                        class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 shrink-0"
                        title="容器未暴露宿主机端口，已通过 OrbStack 容器专属域名原生直连"
                      >
                        OrbStack 内网直连
                      </span>
                    </div>
                  </div>

                  <!-- Right Action Buttons -->
                  <div class="flex items-center space-x-1 shrink-0">
                    <!-- 🔗 唤起客户端 -->
                    <button
                      @click="openDbClient(db)"
                      class="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
                      title="唤起本地客户端直连（若容器已休眠将自动按需唤醒）"
                    >
                      <span>🔗</span>
                      <span>唤起客户端</span>
                    </button>

                    <!-- >_ 数据库命令行 -->
                    <button
                      @click="handleOpenDbTerminal(db)"
                      :disabled="openingDbTerminal === db.name"
                      class="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-600 transition-colors cursor-pointer flex items-center space-x-1 font-mono shadow-2xs"
                      title="在原生终端中打开免密直连命令行 (psql / mysql / redis-cli / mongosh)"
                    >
                      <span>&gt;_</span>
                      <span>{{ openingDbTerminal === db.name ? '唤起中...' : '数据库命令行' }}</span>
                    </button>

                    <!-- 📥 恢复 SQL (Only Postgres / MySQL / MariaDB) -->
                    <button
                      v-if="db.type === 'postgres' || db.type === 'mysql' || db.type === 'mariadb'"
                      @click="handleRestoreDatabase(db)"
                      :disabled="restoringDb === db.name"
                      class="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700/60 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
                      title="选择本地 .sql 文件并恢复导入至数据库（若容器休眠将自动唤醒）"
                    >
                      <span>{{ restoringDb === db.name ? '⏳' : '📥' }}</span>
                      <span>{{ restoringDb === db.name ? '恢复中...' : '恢复 SQL' }}</span>
                    </button>

                    <!-- 📤 备份 SQL (Only Postgres / MySQL / MariaDB) -->
                    <button
                      v-if="db.type === 'postgres' || db.type === 'mysql' || db.type === 'mariadb'"
                      @click="handleDumpDatabase(db)"
                      :disabled="dumpingDb === db.name"
                      class="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700/60 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
                      title="一键将数据库备份导出为 SQL 脚本至 Downloads 目录"
                    >
                      <span>{{ dumpingDb === db.name ? '⏳' : '📤' }}</span>
                      <span>{{ dumpingDb === db.name ? '备份中...' : '备份 SQL' }}</span>
                    </button>
                  </div>
                </div>

                <!-- Lower Row: Masked URI with Eye Toggle + Segmented Copy Capsule -->
                <div class="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-700/50">
                  <div class="flex items-center space-x-1.5 truncate max-w-[62%]">
                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate select-all" :title="db.uri">
                      {{ getDisplayUri(db) }}
                    </span>
                    <button
                      @click="toggleDbPassword(db.name)"
                      class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer text-[11px] shrink-0"
                      :title="showDbPasswords[db.name] ? '点击隐藏明文密码' : '点击显示明文密码'"
                    >
                      <span>{{ showDbPasswords[db.name] ? '👁️' : '🙈' }}</span>
                    </button>
                  </div>

                  <!-- Compact Segmented Copy Group -->
                  <div class="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[9px] font-medium border border-zinc-200/80 dark:border-zinc-700 shrink-0">
                    <button
                      @click="copyText(db.uri, `uri_${db.name}`, '连接串')"
                      class="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {{ copiedField === `uri_${db.name}` ? '✓ 已复制' : '复制 URI' }}
                    </button>

                    <template v-if="db.jdbcUrl || db.type === 'postgres' || db.type === 'mysql' || db.type === 'mariadb'">
                      <span class="text-zinc-300 dark:text-zinc-500">|</span>
                      <button
                        @click="copyText(db.jdbcUrl || db.uri, `jdbc_${db.name}`, 'JDBC URL')"
                        class="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                        title="复制 Java 适用标准 JDBC 连接 URL"
                      >
                        {{ copiedField === `jdbc_${db.name}` ? '✓ 已复制' : '复制 JDBC' }}
                      </button>
                    </template>

                    <template v-if="db.password">
                      <span class="text-zinc-300 dark:text-zinc-500">|</span>
                      <button
                        @click="copyText(db.password, `pass_${db.name}`, '密码')"
                        class="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                        title="单独复制该数据库明文密码"
                      >
                        {{ copiedField === `pass_${db.name}` ? '✓ 已复制' : '复制密码' }}
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Tab 2: Logs -->
        <template v-else-if="activeTab === 'logs'">
          <LogsDrawer
            :show="true"
            :project="project"
            :service-list="serviceList"
            @close="activeTab = 'services'"
          />
        </template>

        <!-- Tab 3: .env Editor -->
        <template v-else-if="activeTab === 'env'">
          <EnvEditorDrawer
            :show="true"
            :project="project"
            @close="activeTab = 'services'"
            @toast="(icon, msg) => emit('notify', { icon, msg })"
            @restart-project="$emit('restart-project', project)"
          />
        </template>

        <!-- Tab 4: Memo -->
        <template v-else-if="activeTab === 'memo'">
          <div class="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 rounded-2xl p-4 text-xs shadow-sm flex flex-col space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/60 text-[11px]">
              <div class="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
                <span class="text-sm">📋</span>
                <span class="font-semibold">工程专属备忘录 (本地账号 / 提示 / 接口文档)</span>
              </div>
              <button
                @click="copyMemo"
                class="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 text-[10px] font-medium transition-colors cursor-pointer"
              >
                {{ copiedMemo ? '✓ 已复制' : '复制便签' }}
              </button>
            </div>
            <textarea
              v-model="memoText"
              @blur="saveMemo"
              rows="8"
              placeholder="在此随手记录本地登录账号密码、开发调试技巧或 Swagger 地址...&#10;如: 管理员 admin / 123456&#10;Swagger: /swagger-ui.html"
              class="w-full bg-white dark:bg-zinc-800/80 font-sans text-xs text-zinc-800 dark:text-zinc-100 p-3 rounded-xl border border-amber-200 dark:border-amber-800 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 leading-relaxed resize-y placeholder-zinc-400 dark:placeholder-zinc-500"
            ></textarea>
            <div class="flex items-center justify-between text-[10px] text-amber-800/70 dark:text-amber-300/70">
              <span>失去焦点自动持久化保存到项目配置中</span>
              <button @click="saveMemo" class="font-medium hover:text-amber-950 dark:hover:text-amber-100 underline cursor-pointer">立即保存</button>
            </div>
          </div>
        </template>

        <!-- Tab 5: DevOps & Resource Telemetry -->
        <template v-else-if="activeTab === 'devops'">
          <div class="space-y-3.5">
            <!-- Resource Metrics Breakdown -->
            <ResourceMetricsDrawer
              :show="true"
              :project-stats="projectStats"
              :loading="loadingStats"
              @close="activeTab = 'services'"
              @refresh="fetchProjectStats"
              @exec-container="handleExecContainer"
            />

            <!-- DevOps Rebuild, Pull & Reset Volumes -->
            <DevOpsDrawer
              :show="true"
              :operating="operating"
              @close="activeTab = 'services'"
              @rebuild="handleRebuild"
              @pull="handlePull"
              @reset-volumes="handleResetVolumes"
            />
          </div>
        </template>
      </div>

      <!-- Pinned Bottom Utility Bar: Close & Unregister Project -->
      <div class="shrink-0 pt-3 mt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
        <span>快捷提示: 按 ESC 键关闭</span>
        <button
          @click="$emit('remove-project', project.id)"
          class="text-zinc-400 hover:text-red-600 transition-colors flex items-center space-x-1 cursor-pointer"
          title="仅从工作台移除图标，不会删除本地任何源码"
        >
          <span>🗑️</span>
          <span>从工作台移除</span>
        </button>
      </div>
    </div>

    <!-- Custom Icon Picker Modal -->
    <IconPickerModal
      v-if="showIconPicker"
      :project="project"
      @close="showIconPicker = false"
      @save="handleSaveIcon"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import IconPickerModal from './IconPickerModal.vue';
import TechIcon from './TechIcon.vue';
import LogsDrawer from './detail/LogsDrawer.vue';
import EnvEditorDrawer from './detail/EnvEditorDrawer.vue';
import ResourceMetricsDrawer from './detail/ResourceMetricsDrawer.vue';
import DevOpsDrawer from './detail/DevOpsDrawer.vue';
import { getTechGradient } from '../utils/techPresets.js';
import { detectDatabaseService } from '../utils/databaseHelper.js';

const props = defineProps({
  project: {
    type: Object,
    default: null
  },
  conflictInfo: {
    type: Object,
    default: null
  },
  conflictsList: {
    type: Array,
    default: () => []
  },
  startingText: {
    type: String,
    default: '正在启动并探活中...'
  }
});

const preferredEditor = ref('code');
const editorMap = {
  code: { id: 'code', name: 'VS Code', icon: '💻' },
  cursor: { id: 'cursor', name: 'Cursor', icon: '✨' },
  idea: { id: 'idea', name: 'IntelliJ', icon: '💡' },
  webstorm: { id: 'webstorm', name: 'WebStorm', icon: '⚡' },
  zed: { id: 'zed', name: 'Zed', icon: '⚡' }
};

const currentEditorInfo = computed(() => {
  return editorMap[preferredEditor.value] || editorMap.code;
});

const effectiveConflicts = computed(() => {
  if (Array.isArray(props.conflictsList) && props.conflictsList.length > 0) {
    return props.conflictsList;
  }
  if (props.conflictInfo && props.conflictInfo.occupied) {
    return [{
      port: props.project?.frontendPort,
      pid: props.conflictInfo.pid,
      details: props.conflictInfo.details
    }];
  }
  return [];
});

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    try {
      const s = await window.electronAPI.getSettings();
      if (s?.preferredEditor) {
        preferredEditor.value = s.preferredEditor;
      }
    } catch {}
  }
});

const emit = defineEmits([
  'close',
  'start-project',
  'stop-project',
  'restart-project',
  'remove-project',
  'open-browser',
  'open-editor',
  'open-terminal',
  'show-finder',
  'kill-conflict-process',
  'update-url',
  'update-icon',
  'update-memo',
  'update-tags',
  'notify'
]);

// Segmented Navigation Tab: 'services' | 'logs' | 'env' | 'memo' | 'devops'
const activeTab = ref('services');

// Inline Name Editing
const isEditingName = ref(false);
const editedName = ref('');
const nameInputRef = ref(null);

function startEditName() {
  editedName.value = props.project?.name || '';
  isEditingName.value = true;
  nextTick(() => {
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  });
}

async function saveProjectName() {
  if (!isEditingName.value) return;
  const newName = editedName.value.trim();
  isEditingName.value = false;
  if (newName && newName !== props.project?.name) {
    props.project.name = newName;
    if (window.electronAPI?.updateProject) {
      await window.electronAPI.updateProject(props.project.id, { name: newName });
    }
    emit('notify', { icon: '✏️', msg: `项目名称已修改为: ${newName}` });
  }
}

// Inline Description Editing
const isEditingDesc = ref(false);
const editedDesc = ref('');
const descInputRef = ref(null);

function startEditDesc() {
  editedDesc.value = props.project?.description || '';
  isEditingDesc.value = true;
  nextTick(() => {
    descInputRef.value?.focus();
    descInputRef.value?.select();
  });
}

async function saveProjectDesc() {
  if (!isEditingDesc.value) return;
  const newDesc = editedDesc.value.trim();
  isEditingDesc.value = false;
  if (newDesc !== props.project?.description) {
    props.project.description = newDesc;
    if (window.electronAPI?.updateProject) {
      await window.electronAPI.updateProject(props.project.id, { description: newDesc });
    }
    emit('notify', { icon: '✏️', msg: '项目描述已更新' });
  }
}

// Tags Popover
const showTagsPopover = ref(false);
const newTagInput = ref('');
const currentTags = computed(() => props.project?.tags || []);

function updateProjectTags(tags) {
  if (!props.project) return;
  emit('update-tags', { id: props.project.id, tags });
}

function removeTag(tag) {
  const tags = currentTags.value.filter((t) => t !== tag);
  updateProjectTags(tags);
}

function addCustomTag() {
  const val = newTagInput.value.trim().replace(/^#+/, '');
  if (!val) return;
  if (!currentTags.value.includes(val)) {
    updateProjectTags([...currentTags.value, val]);
  }
  newTagInput.value = '';
}

const customUrl = ref('');
const memoText = ref('');
const copiedMemo = ref(false);
const operating = ref(false);
const startingMiddleware = ref(false);
const operatingServices = ref({});

const pinging = ref(false);
const pingResult = ref(null);
const servicePings = ref({});
const copiedUri = ref('');

const projectStats = ref(null);
const loadingStats = ref(false);

function switchUrlMode(mode) {
  if (!props.project) return;
  if (mode === 'orb' && props.project.orbLocalUrl) {
    customUrl.value = props.project.orbLocalUrl;
  } else {
    customUrl.value = `http://localhost:${props.project.frontendPort || 8080}`;
  }
  saveUrl();
}

async function handleServiceAction(serviceName, action) {
  if (!props.project?.composePath || operatingServices.value[serviceName] || !window.electronAPI) return;
  operatingServices.value = { ...operatingServices.value, [serviceName]: action };

  const actionMap = {
    start: { fn: window.electronAPI.startService, text: '启动' },
    stop: { fn: window.electronAPI.stopService, text: '停止' },
    restart: { fn: window.electronAPI.restartService, text: '重启' }
  };

  const target = actionMap[action];
  if (!target || !target.fn) {
    operatingServices.value = { ...operatingServices.value, [serviceName]: false };
    return;
  }

  emit('notify', { icon: '⚙️', msg: `正在${target.text}微服务 [${serviceName}]...` });
  try {
    const res = await target.fn(props.project.composePath, serviceName);
    if (res.success) {
      emit('notify', { icon: '✨', msg: `微服务 [${serviceName}] ${target.text}完成！` });
      fetchProjectStats();
    } else {
      emit('notify', { icon: '❌', msg: `${target.text}微服务 [${serviceName}] 失败: ${res.error}` });
    }
  } catch (err) {
    emit('notify', { icon: '❌', msg: `${target.text}微服务异常: ${err.message}` });
  } finally {
    operatingServices.value = { ...operatingServices.value, [serviceName]: false };
  }
}

async function handleStartMiddleware() {
  if (!props.project?.composePath || !window.electronAPI?.startMiddlewareServices || startingMiddleware.value) return;
  startingMiddleware.value = true;
  emit('notify', { icon: '⚡', msg: '正在单独拉起数据库与基础中间件...' });
  try {
    const res = await window.electronAPI.startMiddlewareServices(props.project.composePath);
    if (res.success) {
      emit('notify', { icon: '✨', msg: `基础中间件启动成功: ${res.startedServices?.join(', ') || '已启动'}` });
      fetchProjectStats();
    } else {
      emit('notify', { icon: '❌', msg: `启动基础中间件失败: ${res.error}` });
    }
  } catch (err) {
    emit('notify', { icon: '❌', msg: `启动中间件异常: ${err.message}` });
  } finally {
    startingMiddleware.value = false;
  }
}

function saveMemo() {
  if (!props.project) return;
  emit('update-memo', { id: props.project.id, memo: memoText.value });
}

function copyMemo() {
  if (!memoText.value) return;
  navigator.clipboard.writeText(memoText.value);
  copiedMemo.value = true;
  emit('notify', { icon: '📋', msg: '工程便签已复制到剪贴板' });
  setTimeout(() => {
    copiedMemo.value = false;
  }, 1800);
}

async function handlePingRoute(url = null) {
  const target = url || customUrl.value;
  if (!target || !window.electronAPI?.pingRoute) return;
  pinging.value = true;
  try {
    const res = await window.electronAPI.pingRoute(target);
    pingResult.value = res;
    if (res.ok) {
      emit('notify', { icon: '⚡', msg: `服务探活成功 (${res.statusCode || 'TCP Ready'}, 耗时 ${res.latencyMs}ms)` });
    } else {
      emit('notify', { icon: '⚠️', msg: `服务探活未就绪: ${res.error || '连接被拒绝'}` });
    }
  } catch (err) {
    pingResult.value = { ok: false, error: err.message, latencyMs: 0 };
  } finally {
    pinging.value = false;
  }
}

async function pingMicroservice(port) {
  if (!port || !window.electronAPI?.pingRoute) return;
  const target = `http://localhost:${port}`;
  try {
    const res = await window.electronAPI.pingRoute(target);
    servicePings.value = {
      ...servicePings.value,
      [port]: res
    };
    if (res.ok) {
      emit('notify', { icon: '⚡', msg: `微服务 :${port} 连通良好 (${res.latencyMs}ms)` });
    } else {
      emit('notify', { icon: '⚠️', msg: `微服务 :${port} 未连通: ${res.error}` });
    }
  } catch (err) {
    servicePings.value = {
      ...servicePings.value,
      [port]: { ok: false, error: err.message }
    };
  }
}

async function handleRebuild() {
  if (!props.project?.composePath || !window.electronAPI?.rebuildProject || operating.value) return;
  operating.value = true;
  emit('notify', { icon: '🔨', msg: '正在重新构建容器镜像 (up -d --build)...' });
  activeTab.value = 'logs';
  try {
    const res = await window.electronAPI.rebuildProject(props.project.composePath);
    if (res.success) {
      emit('notify', { icon: '✨', msg: '项目重新构建并启动成功！' });
      fetchProjectStats();
      handlePingRoute();
    } else {
      emit('notify', { icon: '❌', msg: `重新构建失败: ${res.error}` });
    }
  } catch (err) {
    emit('notify', { icon: '❌', msg: `重新构建异常: ${err.message}` });
  } finally {
    operating.value = false;
  }
}

async function handlePull() {
  if (!props.project?.composePath || !window.electronAPI?.pullProject || operating.value) return;
  operating.value = true;
  emit('notify', { icon: '⬇️', msg: '正在拉取微服务最新镜像 (pull)...' });
  activeTab.value = 'logs';
  try {
    const res = await window.electronAPI.pullProject(props.project.composePath);
    if (res.success) {
      emit('notify', { icon: '✨', msg: '微服务基础镜像已更新完成！' });
    } else {
      emit('notify', { icon: '❌', msg: `拉取镜像失败: ${res.error}` });
    }
  } catch (err) {
    emit('notify', { icon: '❌', msg: `拉取镜像异常: ${err.message}` });
  } finally {
    operating.value = false;
  }
}

async function handleResetVolumes() {
  if (!props.project?.composePath || !window.electronAPI?.resetProjectVolumes || operating.value) return;
  operating.value = true;
  emit('notify', { icon: '🧹', msg: '正在清理数据卷并重新初始化容器...' });
  activeTab.value = 'logs';
  try {
    const res = await window.electronAPI.resetProjectVolumes(props.project.composePath);
    if (res.success) {
      emit('notify', { icon: '✨', msg: '数据卷已重置，容器已全新就绪！' });
      fetchProjectStats();
      handlePingRoute();
    } else {
      emit('notify', { icon: '❌', msg: `重置数据卷失败: ${res.error}` });
    }
  } catch (err) {
    emit('notify', { icon: '❌', msg: `重置数据卷异常: ${err.message}` });
  } finally {
    operating.value = false;
  }
}

async function openDbClient(db) {
  if (!db || !window.electronAPI) return;
  const uri = db.uri;

  emit('notify', { icon: '🔗', msg: '正在唤起系统关联的数据库客户端 (如 TablePlus / Navicat / DBeaver)...' });

  // Auto wake database container if project is stopped
  if (props.project?.status !== 'running' && props.project?.composePath && window.electronAPI.startService) {
    emit('notify', { icon: '⏳', msg: `正在唤醒数据库微服务 [${db.name}]...` });
    try {
      await window.electronAPI.startService(props.project.composePath, db.name);
      await new Promise((r) => setTimeout(r, 1500));
      emit('notify', { icon: '⚡', msg: '已自动唤醒数据库容器并调起客户端' });
    } catch (err) {
      console.warn('Auto start db service error:', err);
    }
  }

  if (window.electronAPI.openDatabaseClient) {
    const res = await window.electronAPI.openDatabaseClient(uri);
    if (res.success) {
      emit('notify', { icon: '🔗', msg: `已唤起数据库客户端: ${uri}` });
    } else {
      copyDbUri(uri);
      emit('notify', { icon: '📋', msg: '未检测到关联客户端，已复制连接串至剪贴板' });
    }
  }
}

const dumpingDb = ref('');
const restoringDb = ref('');
const openingDbTerminal = ref('');
const showDbPasswords = ref({});
const copiedField = ref('');

function toggleDbPassword(dbName) {
  showDbPasswords.value[dbName] = !showDbPasswords.value[dbName];
}

function getDisplayUri(db) {
  if (!db?.uri) return '';
  if (showDbPasswords.value[db.name]) {
    return db.uri;
  }
  return db.uri.replace(/:([^@/:]+)@/, ':••••••@');
}

function copyText(text, fieldKey, label) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  copiedField.value = fieldKey;
  emit('notify', { icon: '📋', msg: `已复制${label}: ${text}` });
  setTimeout(() => {
    if (copiedField.value === fieldKey) {
      copiedField.value = '';
    }
  }, 2000);
}

async function handleDumpDatabase(db) {
  if (!db || !window.electronAPI?.dumpDatabase || !props.project?.composePath) return;
  dumpingDb.value = db.name;
  emit('notify', { icon: '⏳', msg: `正在转储数据库 [${db.name}] SQL 备份...` });
  try {
    const res = await window.electronAPI.dumpDatabase({
      composePath: props.project.composePath,
      serviceName: db.name,
      dbType: db.type || 'postgres',
      dbConfig: {
        user: db.user,
        password: db.password,
        db: db.database || db.db
      }
    });
    if (res && res.success) {
      emit('notify', { icon: '💾', msg: `已转储 SQL: ${res.fileName}，已在访达中定位` });
    } else {
      emit('notify', { icon: '⚠️', msg: `SQL 转储失败: ${res?.error || '未知错误'}` });
    }
  } catch (err) {
    emit('notify', { icon: '⚠️', msg: `转储异常: ${err.message}` });
  } finally {
    dumpingDb.value = '';
  }
}
const handleDumpDb = handleDumpDatabase;

async function handleRestoreDatabase(db) {
  if (!db || !window.electronAPI?.restoreDatabase || !props.project?.composePath) return;
  restoringDb.value = db.name;
  try {
    const res = await window.electronAPI.restoreDatabase({
      composePath: props.project.composePath,
      serviceName: db.name,
      dbType: db.type || 'postgres',
      dbConfig: {
        user: db.user,
        password: db.password,
        db: db.database || db.db
      }
    });
    if (res?.canceled) return;
    if (res && res.success) {
      emit('notify', { icon: '📥', msg: `已成功还原 SQL 脚本至 [${db.name}] (${res.fileName || ''})` });
    } else {
      emit('notify', { icon: '⚠️', msg: `SQL 还原导入失败: ${res?.error || '未知错误'}` });
    }
  } catch (err) {
    emit('notify', { icon: '⚠️', msg: `还原导入异常: ${err.message}` });
  } finally {
    restoringDb.value = '';
  }
}

async function handleOpenDbTerminal(db) {
  if (!db || !window.electronAPI?.execDbShell || !props.project?.composePath) return;
  openingDbTerminal.value = db.name;
  emit('notify', { icon: '⏳', msg: `正在连接数据库 [${db.name}] 交互终端...` });
  try {
    const res = await window.electronAPI.execDbShell({
      composePath: props.project.composePath,
      serviceName: db.name,
      dbInfo: {
        type: db.type,
        user: db.user,
        password: db.password,
        database: db.database || db.db
      }
    });
    if (res && res.success) {
      emit('notify', { icon: '⚡', msg: `已在 ${res.terminal || '终端'} 打开 [${db.name}] 交互式命令行` });
    } else {
      emit('notify', { icon: '⚠️', msg: `打开 SQL 终端失败: ${res?.error || '未知错误'}` });
    }
  } catch (err) {
    emit('notify', { icon: '⚠️', msg: `唤起终端异常: ${err.message}` });
  } finally {
    openingDbTerminal.value = '';
  }
}


async function fetchProjectStats() {
  if (!props.project?.composePath || props.project?.status !== 'running' || !window.electronAPI?.getProjectResourceUsage) {
    projectStats.value = null;
    return;
  }
  loadingStats.value = true;
  try {
    const res = await window.electronAPI.getProjectResourceUsage(props.project.composePath);
    if (res && res.running) {
      projectStats.value = res;
    } else {
      projectStats.value = null;
    }
  } catch {
    projectStats.value = null;
  } finally {
    loadingStats.value = false;
  }
}

async function handleExecContainer(containerName) {
  if (!containerName || !window.electronAPI?.execContainer) return;
  try {
    await window.electronAPI.execContainer(containerName);
    emit('notify', { icon: '⚡', msg: `已唤起终端并进入容器 [${containerName}]` });
  } catch (err) {
    emit('notify', { icon: '⚠️', msg: `打开容器终端失败: ${err.message}` });
  }
}

function copyDbUri(uri) {
  if (!uri) return;
  navigator.clipboard.writeText(uri);
  copiedUri.value = uri;
  emit('notify', { icon: '📋', msg: `已复制数据库连接串: ${uri}` });
  setTimeout(() => {
    if (copiedUri.value === uri) {
      copiedUri.value = '';
    }
  }, 2000);
}

watch(
  () => props.project,
  (newVal) => {
    if (newVal) {
      customUrl.value = newVal.frontendUrl || `http://localhost:${newVal.frontendPort || 8080}`;
      memoText.value = newVal.memo || '';
      pingResult.value = null;
      servicePings.value = {};
      if (newVal.status === 'running') {
        fetchProjectStats();
        handlePingRoute();
      } else {
        projectStats.value = null;
      }
    }
  },
  { immediate: true }
);

watch(
  () => props.project?.status,
  (status) => {
    if (status === 'running') {
      fetchProjectStats();
      handlePingRoute();
    } else {
      projectStats.value = null;
    }
  }
);

function saveUrl() {
  if (customUrl.value && props.project) {
    emit('update-url', { id: props.project.id, url: customUrl.value });
  }
}

const showIconPicker = ref(false);

const effectiveTech = computed(() => {
  return props.project?.customTech || props.project?.tech || 'Docker';
});

const displayGradient = computed(() => {
  if (props.project?.customBgGradient) {
    return props.project.customBgGradient;
  }
  return getTechGradient(effectiveTech.value);
});

function handleSaveIcon(updates) {
  emit('update-icon', { id: props.project.id, updates });
  showIconPicker.value = false;
}

function extractHostPort(portsStr) {
  if (!portsStr) return null;
  const match = portsStr.match(/:(\d+)(?:->|:|\/|$)/) || portsStr.match(/(\d+)->/) || portsStr.match(/(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

function setAsFrontend(port) {
  customUrl.value = `http://localhost:${port}`;
  saveUrl();
}

const serviceList = computed(() => {
  if (!props.project) return [];
  let raw = [];
  if (props.project.containers && props.project.containers.length > 0) {
    raw = props.project.containers.map((c) => ({
      name: c.service || c.name,
      ports: c.ports || '',
      state: c.state || c.status || ''
    }));
  } else if (props.project.services && props.project.services.length > 0) {
    const hasParsed = Array.isArray(props.project.parsedServices) && props.project.parsedServices.length > 0;
    raw = props.project.services.map((s, idx) => ({
      name: s,
      ports: (!hasParsed && idx === 0) ? `:${props.project.frontendPort}` : '',
      state: ''
    }));
  } else {
    raw = [
      { name: 'frontend', ports: `:${props.project.frontendPort}`, state: '' }
    ];
  }

  const preParsedDbs = props.project.databases || [];
  const orbProj = props.project.orbProjectName || '';

  return raw.map((item) => {
    const parsedMatch = (props.project.parsedServices || []).find((p) => p.name === item.name);
    const hostPort = extractHostPort(item.ports) || parsedMatch?.ports?.[0]?.host || null;
    const isCurrentFrontend = hostPort && (
      props.project.frontendPort === hostPort ||
      (props.project.frontendUrl && props.project.frontendUrl.includes(`:${hostPort}`))
    );
    const matchedDb = preParsedDbs.find((d) => d.service === item.name);
    const dbInfo = matchedDb || detectDatabaseService(item.name, hostPort || 0, '', orbProj);
    const orbLocalUrl = parsedMatch?.orbLocalUrl || (orbProj ? `https://${item.name.toLowerCase()}.${orbProj}.orb.local` : null);
    const isRunning = props.project.status === 'running' || (item.state && item.state.toLowerCase().includes('up'));

    return {
      ...item,
      hostPort,
      isCurrentFrontend,
      dbInfo,
      orbLocalUrl,
      isRunning
    };
  });
});

const detectedWebAdmin = computed(() => {
  const matchers = [
    { regex: /adminer/i, label: 'Adminer' },
    { regex: /pgadmin/i, label: 'pgAdmin' },
    { regex: /phpmyadmin/i, label: 'phpMyAdmin' },
    { regex: /redis-commander/i, label: 'Redis Commander' },
    { regex: /mongo-express/i, label: 'Mongo Express' }
  ];

  for (const svc of serviceList.value) {
    const sName = (svc.name || '').toLowerCase();
    for (const m of matchers) {
      if (m.regex.test(sName)) {
        let url = '';
        if (svc.hostPort) {
          url = `http://localhost:${svc.hostPort}`;
        } else if (svc.orbLocalUrl) {
          url = svc.orbLocalUrl;
        } else if (svc.ports) {
          const p = extractHostPort(svc.ports);
          if (p) url = `http://localhost:${p}`;
        }
        if (url) {
          return {
            name: svc.name,
            label: m.label,
            url
          };
        }
      }
    }
  }
  return null;
});

function openWebAdmin(url) {
  if (!url) return;
  if (window.electronAPI?.openUrl) {
    window.electronAPI.openUrl(url);
  } else {
    window.open(url, '_blank');
  }
}

const dbServices = computed(() => {
  const orbProj = props.project?.orbProjectName || '';
  if (props.project?.databases && props.project.databases.length > 0) {
    return props.project.databases.map((d) => {
      let uri = d.uri;
      let jdbcUrl = d.jdbcUrl || '';
      let isOrbDirect = d.isOrbDirect;
      if ((!d.port || d.isInternal) && orbProj && uri && uri.includes('localhost')) {
        const host = `${d.service.toLowerCase()}.${orbProj.toLowerCase()}.orb.local`;
        uri = uri.replace('localhost', host);
        if (jdbcUrl && jdbcUrl.includes('localhost')) {
          jdbcUrl = jdbcUrl.replace('localhost', host);
        }
        isOrbDirect = true;
      }
      return {
        name: d.service,
        ...d,
        uri,
        jdbcUrl,
        isOrbDirect
      };
    });
  }
  return serviceList.value
    .filter((s) => s.dbInfo && s.dbInfo.isDb)
    .map((s) => ({
      name: s.name,
      ...s.dbInfo
    }));
});


const hasMiddleware = computed(() => {
  if (dbServices.value.length > 0) return true;
  return serviceList.value.some((s) =>
    s.dbInfo?.isDb ||
    /db|redis|mysql|postgres|mongo|minio|cache/i.test(s.name)
  );
});

watch(dbServices, (newList) => {
  if (activeTab.value === 'database' && (!newList || newList.length === 0)) {
    activeTab.value = 'services';
  }
});
</script>
