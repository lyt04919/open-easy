import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';

const execAsync = promisify(exec);
const HOME_DIR = os.homedir();
const EXEC_ENV = {
  ...process.env,
  PATH: `/usr/sbin:/sbin:/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`
};

/**
 * Checks whether a given TCP port is currently occupied by any process
 * @param {number} port
 * @returns {Promise<{ occupied: boolean, pid?: number, pids?: number[], command?: string, details?: string }>}
 */
export async function checkPortConflict(port) {
  if (!port || isNaN(port)) {
    return { occupied: false };
  }
  const conflicts = await checkPortsConflict([port]);
  return conflicts[port] || { occupied: false };
}

/**
 * Checks multiple TCP ports at once using a single lsof invocation to prevent process storm
 * @param {number[]} portsArray
 * @returns {Promise<Record<number, { occupied: boolean, pid?: number, pids?: number[], command?: string, details?: string }>>}
 */
export async function checkPortsConflict(portsArray = []) {
  if (!Array.isArray(portsArray) || portsArray.length === 0) {
    return {};
  }

  const validPorts = Array.from(
    new Set(portsArray.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p) && p > 0))
  );

  const result = {};
  for (const p of validPorts) {
    result[p] = { occupied: false };
  }

  if (validPorts.length === 0) {
    return result;
  }

  try {
    const { stdout } = await execAsync('lsof -nP -iTCP -sTCP:LISTEN', {
      timeout: 3500,
      env: EXEC_ENV
    });

    const lines = stdout.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const command = parts[0] || 'Unknown';
      const pid = parseInt(parts[1], 10);

      // Match port at the end of the address, e.g. *:8080, 127.0.0.1:8080, [::1]:8080 (LISTEN)
      const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/) || line.match(/:(\d+)$/);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        if (result[port] !== undefined) {
          if (!result[port].occupied) {
            result[port] = {
              occupied: true,
              pid,
              pids: [pid],
              command,
              details: `${command} (PID: ${pid})`
            };
          } else {
            // Already recorded one process on this port (e.g. master process); append child/worker
            if (Array.isArray(result[port].pids) && !result[port].pids.includes(pid)) {
              result[port].pids.push(pid);
              result[port].details = `${result[port].command} (PID: ${result[port].pids.join(', ')})`;
            }
          }
        }
      }
    }
  } catch {
    // lsof returns 1 if no process found, or command fails -> fallback to empty occupied
  }

  return result;
}

/**
 * Scans all TCP ports currently in LISTEN state on macOS,
 * enriches them with full command line, working directory (cwd), and project conflict mapping.
 * @param {Array} projects - List of workspace projects with runtime status
 * @returns {Promise<Array<{ port: number, pid: number, pids: number[], command: string, fullCommand: string, cwd: string, user: string, category: 'conflict'|'project'|'dev'|'system', isConflict: boolean, projectName: string }>>}
 */
export async function listAllOccupiedPorts(projects = []) {
  try {
    const { stdout } = await execAsync('lsof -nP -iTCP -sTCP:LISTEN', {
      timeout: 5000,
      env: EXEC_ENV
    });

    if (!stdout || !stdout.trim()) {
      return [];
    }

    const lines = stdout.trim().split('\n');
    const portMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const command = parts[0] || 'Unknown';
      const pid = parseInt(parts[1], 10);
      const user = parts[2] || '';

      const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/) || line.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port <= 0) continue;

      if (!portMap.has(port)) {
        portMap.set(port, {
          port,
          pid,
          pids: [pid],
          command,
          user
        });
      } else {
        const existing = portMap.get(port);
        if (!existing.pids.includes(pid)) {
          existing.pids.push(pid);
        }
      }
    }

    const uniquePids = Array.from(
      new Set(
        Array.from(portMap.values())
          .map((item) => item.pid)
          .filter((p) => !isNaN(p) && p > 0)
      )
    );

    // Batch retrieve command lines via ps
    const cmdMap = new Map();
    if (uniquePids.length > 0) {
      try {
        const { stdout: psOut } = await execAsync(`ps -o pid=,command= -p ${uniquePids.join(',')}`, {
          timeout: 4000,
          env: EXEC_ENV
        });
        psOut.trim().split('\n').forEach((l) => {
          const trimmed = l.trim();
          if (!trimmed) return;
          const match = trimmed.match(/^(\d+)\s+(.*)$/);
          if (match) {
            cmdMap.set(parseInt(match[1], 10), match[2]);
          }
        });
      } catch {}
    }

    // Batch retrieve cwd via lsof
    const cwdMap = new Map();
    if (uniquePids.length > 0) {
      try {
        const { stdout: cwdOut } = await execAsync(`lsof -a -p ${uniquePids.join(',')} -d cwd -Fn`, {
          timeout: 4000,
          env: EXEC_ENV
        });
        let curPid = null;
        cwdOut.trim().split('\n').forEach((l) => {
          if (l.startsWith('p')) {
            curPid = parseInt(l.slice(1), 10);
          } else if (l.startsWith('n') && curPid) {
            cwdMap.set(curPid, l.slice(1));
          }
        });
      } catch {}
    }

    // Batch retrieve active Docker container port mappings so OrbStack ports are mapped to real containers
    const dockerPortMap = new Map();
    try {
      const { stdout: dockerOut } = await execAsync('docker ps --format "{{.Names}}\\t{{.Image}}\\t{{.Ports}}"', {
        timeout: 2000,
        env: EXEC_ENV
      });
      dockerOut.trim().split('\n').forEach((line) => {
        if (!line.trim()) return;
        const [cName, cImage, cPorts = ''] = line.split('\t');
        const matches = cPorts.matchAll(/(?:0\.0\.0\.0|\[::\]|127\.0\.0\.1):(\d+)->/g);
        for (const m of matches) {
          const hp = parseInt(m[1], 10);
          if (!isNaN(hp)) {
            dockerPortMap.set(hp, { containerName: cName, image: cImage });
          }
        }
      });
    } catch {}

    // Map projects hostPorts
    const projectPortMap = new Map();
    if (Array.isArray(projects)) {
      for (const p of projects) {
        const ports = [];
        if (Array.isArray(p.hostPorts) && p.hostPorts.length > 0) {
          ports.push(...p.hostPorts);
        }
        if (p.frontendPort && !ports.includes(p.frontendPort)) {
          ports.push(p.frontendPort);
        }
        if (Array.isArray(p.parsedServices)) {
          for (const s of p.parsedServices) {
            if (Array.isArray(s.ports)) {
              for (const portObj of s.ports) {
                if (portObj.host && !ports.includes(portObj.host)) {
                  ports.push(portObj.host);
                }
              }
            }
          }
        }
        const isRunning = p.status === 'running';
        for (const portNum of ports) {
          if (!projectPortMap.has(portNum)) {
            projectPortMap.set(portNum, []);
          }
          projectPortMap.get(portNum).push({
            project: p,
            isRunning
          });
        }
      }
    }

    const results = [];
    for (const [port, item] of portMap.entries()) {
      const fullCmd = cmdMap.get(item.pid) || item.command;
      const rawCwd = cwdMap.get(item.pid) || '';
      const matchedProjects = projectPortMap.get(port) || [];

      const meta = parseProcessMetadata(item.command, fullCmd, rawCwd, port, dockerPortMap);

      let category = meta.isDev ? 'dev' : 'system';
      let matchedProjectName = '';
      let isConflict = false;

      if (matchedProjects.length > 0) {
        const runningProj = matchedProjects.find((mp) => mp.isRunning);
        const stoppedProj = matchedProjects.find((mp) => !mp.isRunning);

        if (runningProj) {
          category = 'project';
          matchedProjectName = runningProj.project.name || runningProj.project.id;
        } else if (stoppedProj) {
          category = 'conflict';
          isConflict = true;
          matchedProjectName = stoppedProj.project.name || stoppedProj.project.id;
        }
      }

      results.push({
        port,
        pid: item.pid,
        pids: item.pids,
        command: meta.displayName || item.command,
        rawCommand: item.command,
        subtitle: meta.subtitle || '',
        serviceType: meta.serviceType || '',
        protocol: meta.protocol || 'other',
        isProtected: Boolean(meta.isProtected),
        fullCommand: fullCmd,
        cwd: meta.cwd,
        displayCwd: meta.displayCwd,
        user: item.user,
        category,
        isConflict,
        projectName: matchedProjectName
      });
    }

    const order = { conflict: 0, project: 1, dev: 2, system: 3 };
    results.sort((a, b) => {
      if (order[a.category] !== order[b.category]) {
        return order[a.category] - order[b.category];
      }
      return a.port - b.port;
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * Parses process full command, raw lsof command, and cwd into human-friendly metadata,
 * accurately distinguishing real developer services/databases from macOS system daemons and desktop apps.
 */
function parseProcessMetadata(rawCommand, fullCmd = '', rawCwd = '', port = 0, dockerPortMap = new Map()) {
  let effectiveCwd = rawCwd === '/' ? '' : rawCwd;
  const formatCwd = (c) => {
    if (!c || c === '/') return '';
    return HOME_DIR && c.startsWith(HOME_DIR) ? `~${c.slice(HOME_DIR.length)}` : c;
  };

  // 1. Active Docker container mapped on this port
  if (dockerPortMap.has(port)) {
    const dInfo = dockerPortMap.get(port);
    const isDbPort = [3306, 33060, 5432, 6379, 27017].includes(port) || /(mysql|postgres|redis|valkey|mongo|mariadb)/i.test(dInfo.image);
    return {
      displayName: dInfo.containerName,
      subtitle: dInfo.image,
      serviceType: 'Docker 容器',
      protocol: isDbPort ? 'db' : 'http',
      isDev: true,
      isProtected: false,
      cwd: effectiveCwd,
      displayCwd: formatCwd(effectiveCwd)
    };
  }

  // 2. Internal OrbStack VM daemon ports (when not mapped to an active container)
  if (/OrbStack/i.test(fullCmd) || /OrbStack/i.test(rawCommand)) {
    return {
      displayName: 'OrbStack Engine',
      subtitle: '容器引擎内部通信',
      serviceType: '容器引擎',
      protocol: 'system',
      isDev: false,
      isProtected: true,
      cwd: '',
      displayCwd: ''
    };
  }

  // 3. macOS Core System Daemons (/System/Library, /usr/libexec, /usr/sbin)
  if (
    fullCmd.startsWith('/System/') ||
    fullCmd.startsWith('/usr/libexec/') ||
    fullCmd.startsWith('/usr/sbin/')
  ) {
    let displayName = rawCommand;
    let subtitle = 'macOS 系统服务';
    if (fullCmd.includes('ControlCenter.app')) {
      displayName = 'macOS 控制中心';
      subtitle = port === 5000 || port === 7000 ? 'AirPlay 隔空播放接收' : 'ControlCenter';
    } else if (fullCmd.includes('rapportd')) {
      displayName = 'macOS 隔空投送与接力';
      subtitle = 'rapportd';
    } else if (fullCmd.includes('sharingd')) {
      displayName = 'macOS 共享服务';
      subtitle = 'sharingd';
    } else {
      const firstToken = fullCmd.trim().split(/\s+/)[0];
      displayName = path.basename(firstToken) || rawCommand;
    }
    return {
      displayName,
      subtitle,
      serviceType: '系统守护',
      protocol: 'system',
      isDev: false,
      isProtected: true,
      cwd: '',
      displayCwd: ''
    };
  }

  // 4. macOS Desktop Applications (/Applications/*.app)
  const appMatch = fullCmd.match(/\/Applications\/([^/]+)\.app\//);
  if (appMatch) {
    const appName = appMatch[1];
    let displayName = appName;
    let subtitle = '';
    let serviceType = '桌面应用';

    if (/WeChat/i.test(appName)) {
      displayName = '微信 (WeChat)';
    } else if (/Clash/i.test(appName)) {
      serviceType = '代理工具';
    } else if (/Chrome|Safari|Firefox|Arc|Edge/i.test(appName)) {
      serviceType = '浏览器';
      if (port === 9222) subtitle = '远程调试端口';
    } else if (/Antigravity|Cursor|Visual Studio Code|Code|Windsurf/i.test(appName)) {
      serviceType = 'IDE 工具';
      if (fullCmd.includes('language_server')) {
        subtitle = 'Language Server';
      }
    }

    return {
      displayName,
      subtitle,
      serviceType,
      protocol: 'system',
      isDev: false,
      isProtected: false,
      cwd: '',
      displayCwd: ''
    };
  }

  // 5. Developer Runtimes, Databases & Middleware
  const tokens = fullCmd.trim().split(/\s+/);
  const execPath = tokens[0] || rawCommand;
  const binName = path.basename(execPath).toLowerCase();

  // 5a. Databases
  if (/^(mysqld|mariadbd|postgres|redis-server|valkey-server|mongod)$/.test(binName)) {
    let displayName = binName;
    let subtitle = binName;
    if (binName === 'mysqld') {
      displayName = port === 33060 ? 'MySQL X-Protocol' : 'MySQL';
    } else if (binName === 'mariadbd') {
      displayName = 'MariaDB';
    } else if (binName === 'postgres') {
      displayName = 'PostgreSQL';
    } else if (binName.startsWith('redis')) {
      displayName = 'Redis';
    } else if (binName.startsWith('valkey')) {
      displayName = 'Valkey';
    } else if (binName === 'mongod') {
      displayName = 'MongoDB';
    }
    return {
      displayName,
      subtitle,
      serviceType: '数据库',
      protocol: 'db',
      isDev: true,
      isProtected: false,
      cwd: effectiveCwd,
      displayCwd: formatCwd(effectiveCwd)
    };
  }

  // 5b. Node.js / Bun / Deno
  if (/^(node|nodejs|bun|deno)$/.test(binName) || /^node$/i.test(rawCommand)) {
    const runtimeLabel = binName === 'bun' ? 'Bun' : binName === 'deno' ? 'Deno' : 'Node.js';
    let subtitle = '';
    const scriptToken = tokens.slice(1).find((t) => !t.startsWith('-') && (t.includes('/') || /\.(m?js|cjs|ts)$/i.test(t)));
    if (/vite/i.test(fullCmd)) {
      subtitle = 'Vite Dev Server';
    } else if (/next/i.test(fullCmd)) {
      subtitle = 'Next.js';
    } else if (/nuxt/i.test(fullCmd)) {
      subtitle = 'Nuxt';
    } else if (scriptToken) {
      subtitle = path.basename(scriptToken);
      if (!effectiveCwd && scriptToken.startsWith('/')) {
        effectiveCwd = path.dirname(scriptToken);
      }
    }
    if (effectiveCwd && !subtitle) {
      subtitle = path.basename(effectiveCwd);
    }
    return {
      displayName: runtimeLabel,
      subtitle,
      serviceType: 'Node 服务',
      protocol: 'http',
      isDev: true,
      isProtected: false,
      cwd: effectiveCwd,
      displayCwd: formatCwd(effectiveCwd)
    };
  }

  // 5c. Python / Uvicorn / Gunicorn / Flask
  if (/^(python[0-9.]*|uvicorn|gunicorn|flask|celery)$/i.test(binName) || /^python/i.test(rawCommand)) {
    let subtitle = '';
    if (fullCmd.includes('http.server')) {
      subtitle = 'http.server';
    } else if (fullCmd.includes('uvicorn')) {
      subtitle = 'Uvicorn';
    } else if (fullCmd.includes('gunicorn')) {
      subtitle = 'Gunicorn';
    } else if (fullCmd.includes('manage.py')) {
      subtitle = 'Django';
    } else {
      const pyScript = tokens.slice(1).find((t) => !t.startsWith('-') && /\.py$/i.test(t));
      if (pyScript) {
        subtitle = path.basename(pyScript);
        if (!effectiveCwd && pyScript.startsWith('/')) {
          effectiveCwd = path.dirname(pyScript);
        }
      }
    }
    if (effectiveCwd) {
      const folderName = path.basename(effectiveCwd);
      subtitle = subtitle ? `${subtitle} · ${folderName}` : folderName;
    }
    return {
      displayName: 'Python',
      subtitle,
      serviceType: 'Python 服务',
      protocol: 'http',
      isDev: true,
      isProtected: false,
      cwd: effectiveCwd,
      displayCwd: formatCwd(effectiveCwd)
    };
  }

  // 5d. Java / Go / Rust / PHP / Ruby / Web Servers
  if (/^(java|go|cargo|php|php-fpm|ruby|nginx|caddy|httpd|apache2)$/.test(binName)) {
    const typeMap = {
      java: ['Java', 'Java 服务'],
      go: ['Go', 'Go 服务'],
      cargo: ['Rust (Cargo)', 'Rust 服务'],
      php: ['PHP', 'PHP 服务'],
      'php-fpm': ['PHP-FPM', 'PHP 服务'],
      ruby: ['Ruby', 'Ruby 服务'],
      nginx: ['Nginx', 'Web 服务器'],
      caddy: ['Caddy', 'Web 服务器'],
      httpd: ['Apache', 'Web 服务器'],
      apache2: ['Apache', 'Web 服务器']
    };
    const [displayName, serviceType] = typeMap[binName] || [binName, '开发服务'];
    let subtitle = effectiveCwd ? path.basename(effectiveCwd) : '';
    if (binName === 'java') {
      const jarToken = tokens.find((t) => /\.jar$/i.test(t));
      if (jarToken) subtitle = path.basename(jarToken);
    }
    return {
      displayName,
      subtitle,
      serviceType,
      protocol: 'http',
      isDev: true,
      isProtected: false,
      cwd: effectiveCwd,
      displayCwd: formatCwd(effectiveCwd)
    };
  }

  // 6. Fallback for other binaries
  const cleanBin = path.basename(execPath) || rawCommand;
  const isWellKnownDevPort = [80, 443, 3000, 3001, 4000, 5173, 5174, 8000, 8080, 8081, 8888, 9000].includes(port);
  return {
    displayName: cleanBin,
    subtitle: effectiveCwd ? path.basename(effectiveCwd) : '',
    serviceType: isWellKnownDevPort ? '开发服务' : '系统进程',
    protocol: isWellKnownDevPort ? 'http' : 'other',
    isDev: isWellKnownDevPort,
    isProtected: false,
    cwd: effectiveCwd,
    displayCwd: formatCwd(effectiveCwd)
  };
}

/**
 * Thoroughly kills processes occupying a port, including all parent/master processes and child workers.
 * Can be called with a single PID number, or an object { pid, port }, or (pid, port).
 * @param {number|object} target - PID or { pid, port }
 * @param {number} [portHint] - Optional port number
 * @returns {Promise<{ success: boolean, message?: string, killedPids?: number[] }>}
 */
export async function killProcess(target, portHint) {
  let pid = null;
  let port = null;

  if (typeof target === 'object' && target !== null) {
    pid = parseInt(target.pid, 10);
    port = parseInt(target.port, 10);
  } else {
    pid = parseInt(target, 10);
    if (portHint) {
      port = parseInt(portHint, 10);
    }
  }

  // If port wasn't explicitly passed, try to infer it from the given PID via lsof
  if ((!port || isNaN(port) || port <= 0) && pid && !isNaN(pid) && pid > 1) {
    try {
      const { stdout } = await execAsync(`lsof -a -p ${pid} -nP -iTCP -sTCP:LISTEN`, { timeout: 3000, env: EXEC_ENV });
      const m = stdout.match(/:(\d+)\s+\(LISTEN\)/) || stdout.match(/:(\d+)$/m);
      if (m && m[1]) {
        port = parseInt(m[1], 10);
      }
    } catch {}
  }

  const pidsToKill = new Set();
  if (pid && !isNaN(pid) && pid > 1) {
    pidsToKill.add(pid);
  }

  // 1. If port is known, query ALL PIDs directly holding a LISTEN socket on this port
  if (port && !isNaN(port) && port > 0) {
    try {
      const { stdout } = await execAsync(`lsof -t -nP -iTCP:${port} -sTCP:LISTEN`, { timeout: 3000, env: EXEC_ENV });
      const foundPids = stdout
        .trim()
        .split('\n')
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 1);
      foundPids.forEach((p) => pidsToKill.add(p));
    } catch {}
  }

  if (pidsToKill.size === 0) {
    return { success: false, message: '未找到占用该端口的有效进程 PID' };
  }

  // 2. Multi-process server defense:
  // For every PID to kill (e.g. nginx worker, node cluster worker), find its parent PID (PPID).
  // If the parent is a master process (like nginx: master), kill it too so it won't respawn workers!
  const additionalPids = new Set();
  for (const p of pidsToKill) {
    try {
      const { stdout: ppidOut } = await execAsync(`ps -o ppid= -p ${p}`, { timeout: 2000, env: EXEC_ENV });
      const ppid = parseInt(ppidOut.trim(), 10);
      // Ensure we don't kill launchd (PID 1) or root kernel (PID 0)
      if (ppid > 1) {
        // Inspect the command of the parent process
        const { stdout: pcmd } = await execAsync(`ps -o comm= -p ${ppid}`, { timeout: 2000, env: EXEC_ENV });
        const comm = pcmd.trim().toLowerCase();
        // If parent is not a general system daemon
        if (!comm.includes('launchd') && !comm.includes('login') && !comm.includes('systemd') && !comm.includes('init')) {
          additionalPids.add(ppid);
          // Also find all sibling child processes under this same parent!
          try {
            const { stdout: siblings } = await execAsync(`pgrep -P ${ppid}`, { timeout: 2000, env: EXEC_ENV });
            siblings
              .trim()
              .split('\n')
              .map((s) => parseInt(s.trim(), 10))
              .filter((s) => !isNaN(s) && s > 1)
              .forEach((s) => additionalPids.add(s));
          } catch {}
        }
      }
    } catch {}
  }

  additionalPids.forEach((p) => pidsToKill.add(p));
  const finalPidList = Array.from(pidsToKill);

  // 3. Graceful termination (SIGTERM)
  try {
    await execAsync(`kill -15 ${finalPidList.join(' ')}`, { env: EXEC_ENV });
  } catch {}

  // Short pause to let processes exit cleanly
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 4. Forceful termination (SIGKILL) for any stubborn processes
  try {
    await execAsync(`kill -9 ${finalPidList.join(' ')}`, { env: EXEC_ENV });
  } catch {}

  // 5. Verification: Check if port is truly free now
  await new Promise((resolve) => setTimeout(resolve, 300));
  let stillListening = false;
  if (port && !isNaN(port) && port > 0) {
    try {
      const { stdout } = await execAsync(`lsof -t -nP -iTCP:${port} -sTCP:LISTEN`, { timeout: 2500, env: EXEC_ENV });
      if (stdout && stdout.trim().length > 0) {
        stillListening = true;
      }
    } catch {
      stillListening = false;
    }
  }

  if (stillListening) {
    return {
      success: false,
      message: `端口 :${port} 上的进程未能成功释放（可能属于系统保护进程或需管理员权限）`
    };
  }

  return {
    success: true,
    killedPids: finalPidList,
    message: `端口 :${port || ''} 已彻底释放 (终止进程: ${finalPidList.join(', ')})`
  };
}
