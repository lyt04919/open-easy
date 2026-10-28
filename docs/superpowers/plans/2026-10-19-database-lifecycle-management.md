# 数据库识别与全生命周期管理专项修复与升级计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复数据库识别盲区与账密丢失缺陷，新增 SQL 脚本导入还原、一键免密进入数据库交互式 CLI，升级数据库卡片 UI（密码掩码、分项复制、Web 管理端联动）与首页数据库雷达（运行状态指示、全量滚动）。

**Architecture:** 
1. 扩展 `databaseHelper.js`（保持 `src/utils` 与 `electron/services` 统一），增加 `imageName` 镜像与容器内部端口识别、`password` 与 `jdbcUrl` 输出。
2. 在 `orbManager.js` 中优先提取 service 局部 environment 并补充 `restoreDatabase` 执行还原命令；在 `editorOpener.js` 中新增 `execDbShellInTerminal` 构建直连终端命令。
3. 在 Electron 主进程（`main.js`）与预加载层（`preload.cjs`）增加 `db:restore`（文件选择 + 自动唤醒 + 还原）与 `terminal:execDbShell`（自动唤醒 + CLI 直达）IPC 通道。
4. 在 `ProjectDetailModal.vue` 实现密码掩码切换、分项复制胶囊、Web 管理端（Adminer/pgAdmin 等）自动检测入口、导入 SQL 与 SQL 终端按钮；在 `BentoHeroStats.vue` 移除 3 条限制并展示实时运行状态指示灯。

**Tech Stack:** Node.js, Electron IPC, Vue 3, Tailwind CSS, Docker Compose CLI, AppleScript.

## Global Constraints
- 所有修改必须确保 `npm test` 与 `npm run build:vue` 全部通过。
- 保证 `src/utils/databaseHelper.js` 与 `electron/services/databaseHelper.js` 行为一致，避免主进程与渲染进程分歧。
- 遵循 macOS 原生设计规范与 Tailwind CSS 样式一致性。

---

### Task 1: 扩展 `databaseHelper.js` 镜像识别与密码/JDBC 字段输出
**Files:**
- Modify: `src/utils/databaseHelper.js`
- Modify: `electron/services/databaseHelper.js`
- Test: `tests/databaseHelper.test.js`

**Interfaces:**
- `detectDatabaseService(serviceName, portsStr, composeContent, orbProjectName, imageName = '')`:
  - 检查 `serviceName` 与 `imageName`（支持 postgres, mysql, mariadb, redis, valkey, mongo）
  - 返回对象中包含 `password`、`user`、`database`
  - 对 postgres 生成 `jdbcUrl: jdbc:postgresql://${host}:${port}/${db}`
  - 对 mysql 生成 `jdbcUrl: jdbc:mysql://${host}:${port}/${db}`

- [ ] **Step 1: 在 `tests/databaseHelper.test.js` 中添加针对 `imageName` 识别与 `password`、`jdbcUrl` 的测试用例**
- [ ] **Step 2: 运行测试验证新测试用例失败**
- [ ] **Step 3: 更新 `src/utils/databaseHelper.js` 与 `electron/services/databaseHelper.js`**
- [ ] **Step 4: 运行 `npm test` 验证测试通过**

---

### Task 2: 修复 `orbManager.js` 数据库参数提取与新增 `restoreDatabase`
**Files:**
- Modify: `electron/services/orbManager.js`
- Modify: `tests/orbManager.test.js`

**Interfaces:**
- `inspectComposeFile(composeFilePath)`:
  - 传递 `s.image` 到 `detectDatabaseService`
  - 在 `databases.push` 中保留 `password` 和 `jdbcUrl`
  - 环境变量拼接中 `serviceEnv` 优先于 `rootEnvRaw`
- `restoreDatabase(composeFilePath, serviceName, dbType, dbConfig = {}, sqlFilePath)`:
  - 校验 `sqlFilePath` 存在
  - postgres: `docker compose -f "${composeFilePath}" exec -T ${envArg}${cleanSvc} psql -U ${user}${dbArg} < "${sqlFilePath}"`
  - mysql/mariadb: `docker compose -f "${composeFilePath}" exec -T ${cleanSvc} mysql -u ${user}${passArg}${dbArg} < "${sqlFilePath}"`

- [ ] **Step 1: 在 `tests/orbManager.test.js` 中添加针对 `restoreDatabase` 与 `inspectComposeFile` 保留 password/jdbcUrl 的测试**
- [ ] **Step 2: 运行测试验证失败**
- [ ] **Step 3: 在 `electron/services/orbManager.js` 中实现优先环境变量匹配、传递 `image`、保留 `password`/`jdbcUrl`，并实现 `restoreDatabase`**
- [ ] **Step 4: 运行 `npm test` 验证测试通过**

---

### Task 3: 在 `editorOpener.js` 中新增 `execDbShellInTerminal`
**Files:**
- Modify: `electron/services/editorOpener.js`
- Modify: `tests/projectStatsAndExec.test.js`

**Interfaces:**
- `execDbShellInTerminal(containerName, dbInfo, terminal = 'terminal')`:
  - Postgres: `docker exec -it -e PGPASSWORD='${password}' ${cleanName} psql -U ${user} -d ${database}`
  - MySQL: `docker exec -it ${cleanName} mysql -u ${user} -p'${password}' ${database}`
  - Redis: `docker exec -it ${cleanName} redis-cli${password ? ` -a '${password}'` : ''}`
  - Mongo: `docker exec -it ${cleanName} mongosh`

- [ ] **Step 1: 在 `tests/projectStatsAndExec.test.js` 中添加针对 `execDbShellInTerminal` 的参数与空值校验测试**
- [ ] **Step 2: 在 `electron/services/editorOpener.js` 中提取公共终端激活方法并实现 `execDbShellInTerminal`**
- [ ] **Step 3: 运行 `npm test` 验证测试通过**

---

### Task 4: 在 `electron/main.js` 与 `electron/preload.cjs` 中注册 IPC 通道
**Files:**
- Modify: `electron/preload.cjs`
- Modify: `electron/main.js`

**Interfaces:**
- `db:restore`: 打开 `.sql` 选择框，检查容器运行状态（若未运行先 `startService`），再调用 `restoreDatabase`
- `terminal:execDbShell`: 检查容器运行状态（若未运行先 `startService`），再调用 `execDbShellInTerminal`

- [ ] **Step 1: 在 `electron/preload.cjs` 暴露 `restoreDatabase` 与 `execDbShell`**
- [ ] **Step 2: 在 `electron/main.js` 注册 `db:restore` 与 `terminal:execDbShell` 处理函数**
- [ ] **Step 3: 运行 `npm test` 确保无主进程语法或运行时中断**

---

### Task 5: 升级 `ProjectDetailModal.vue` 数据库卡片 UI 与功能
**Files:**
- Modify: `src/components/ProjectDetailModal.vue`

**Interfaces & UI:**
- 修复 `handleDumpDatabase(db)` 传递 `{ user: db.user, password: db.password, db: db.database || db.db }`
- 增加密码掩码展示与眼睛图标切换功能
- 增加复制胶囊：`[复制 URI]`、`[复制 JDBC]`、`[复制密码]`
- 自动检测 `serviceList` 中 `adminer` / `pgadmin` / `phpmyadmin` / `redis-commander` / `mongo-express` 并在卡片右上角显示快捷入口
- 增加「📥 导入 SQL」按钮（调用 `handleRestoreDatabase`）
- 增加「`>_` SQL 终端」按钮（调用 `handleOpenDbTerminal`）

- [ ] **Step 1: 在 `ProjectDetailModal.vue` 中修复 `handleDumpDatabase` 参数传递**
- [ ] **Step 2: 实现 `detectedWebAdmin` 计算属性并在右上角增加入口**
- [ ] **Step 3: 实现密码脱敏与明密文切换、一键复制小标签**
- [ ] **Step 4: 增加「📥 导入 SQL」与「`>_` SQL 终端」按钮及其处理函数**
- [ ] **Step 5: 运行 `npm run build:vue` 验证前端编译无误**

---

### Task 6: 升级 `BentoHeroStats.vue`「数据库雷达」卡片
**Files:**
- Modify: `src/components/BentoHeroStats.vue`

**Interfaces & UI:**
- 移除 `.slice(0, 3)` 限制，支持容器内平滑滚动
- 每一行展示：数据库图标、服务名、所属项目简称、实时运行状态指示圆点（绿灯 / 灰点）、快捷复制按钮

- [ ] **Step 1: 更新 `detectedDatabases` 计算属性以包含项目名称简称与运行状态**
- [ ] **Step 2: 更新模板布局，加入状态圆点并调整滚动容器高度**
- [ ] **Step 3: 运行 `npm test` 与 `npm run build:vue` 全面验证**

---

### Task 7: 完整回归测试与最终验证
**Files:**
- Verification only

- [ ] **Step 1: 运行 `npm test` 确认全套测试通过**
- [ ] **Step 2: 运行 `npm run build:vue` 确认前端打包无错误**
- [ ] **Step 3: 检查 git diff 确保修改精准无冗余**
