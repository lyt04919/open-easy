import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Helper to safely execute command with timeout
async function runCmd(cmd, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 15000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`
      },
      ...options
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), error: null };
  } catch (error) {
    return { stdout: error.stdout?.trim() || '', stderr: error.stderr?.trim() || '', error };
  }
}

/**
 * Check if OrbStack engine is currently running and Docker socket is responsive
 */
export async function checkOrbStatus() {
  const { stdout, error } = await runCmd('docker info --format "{{.ServerVersion}}"');
  if (!error && stdout) {
    return { running: true, version: stdout };
  }

  // Check if OrbStack process exists even if daemon is initializing
  const { stdout: pgrepOut } = await runCmd('pgrep -x OrbStack');
  if (pgrepOut) {
    return { running: false, initializing: true };
  }

  return { running: false, initializing: false };
}

/**
 * Auto-healing: Silently wakes OrbStack if not running and waits for Docker socket
 */
export async function ensureOrbRunning() {
  const initial = await checkOrbStatus();
  if (initial.running) {
    return { autoStarted: false, alreadyRunning: true };
  }

  // Try orb CLI first if present, otherwise launch OrbStack.app silently
  try {
    if (fs.existsSync('/opt/homebrew/bin/orb')) {
      await runCmd('/opt/homebrew/bin/orb start');
    } else {
      await runCmd('open -g -a OrbStack');
    }
  } catch {
    await runCmd('open -g -a OrbStack');
  }

  // Wait for Docker socket up to 20 seconds (OrbStack starts in ~2-4s)
  const startTime = Date.now();
  while (Date.now() - startTime < 20000) {
    await new Promise((res) => setTimeout(res, 800));
    const status = await checkOrbStatus();
    if (status.running) {
      return { autoStarted: true, elapsedMs: Date.now() - startTime };
    }
  }

  throw new Error('OrbStack 引擎静默启动超时 (超过 20 秒)，请检查 OrbStack 状态');
}

/**
 * Parses docker-compose.yml to extract services, ports, and infer tech stack
 */
export function inspectComposeFile(composeFilePath) {
  if (!fs.existsSync(composeFilePath)) {
    return { services: [], defaultUrl: 'http://localhost:3000', tech: 'Docker' };
  }

  try {
    const content = fs.readFileSync(composeFilePath, 'utf8');
    const services = [];
    const portRegex = /-\s*["']?(\d+):(\d+)["']?/g;
    const serviceBlockRegex = /^[ \t]{2}([a-zA-Z0-9_-]+):/gm;

    // Fast parse service names
    let match;
    const serviceNames = [];
    while ((match = serviceBlockRegex.exec(content)) !== null) {
      if (match[1] !== 'version' && match[1] !== 'services') {
        serviceNames.push(match[1]);
      }
    }

    // Extract all host ports
    const hostPorts = [];
    let pMatch;
    while ((pMatch = portRegex.exec(content)) !== null) {
      hostPorts.push(parseInt(pMatch[1], 10));
    }

    // Infer tech stack
    const lowerContent = content.toLowerCase();
    const lowerPath = composeFilePath.toLowerCase();
    let tech = 'Docker';
    let frontendPort = hostPorts[0] || 8080;

    if (lowerContent.includes('vue') || lowerPath.includes('vue')) {
      tech = 'Vue';
    } else if (lowerContent.includes('react') || lowerPath.includes('react')) {
      tech = 'React';
    } else if (lowerContent.includes('next') || lowerPath.includes('next')) {
      tech = 'Next';
    } else if (lowerContent.includes('java') || lowerContent.includes('spring') || lowerContent.includes('maven') || lowerContent.includes('tlias')) {
      tech = 'Java';
    } else if (lowerContent.includes('python') || lowerContent.includes('flask') || lowerContent.includes('fastapi') || lowerContent.includes('django')) {
      tech = 'Python';
    }

    // Prioritize standard web ports for defaultUrl
    const preferredWebPorts = [80, 8080, 8081, 3000, 5173, 2025, 90, 8000];
    for (const pref of preferredWebPorts) {
      if (hostPorts.includes(pref)) {
        frontendPort = pref;
        break;
      }
    }

    return {
      serviceNames,
      hostPorts,
      tech,
      defaultUrl: `http://localhost:${frontendPort}`
    };
  } catch (err) {
    return { serviceNames: [], hostPorts: [], tech: 'Docker', defaultUrl: 'http://localhost:3000', error: err.message };
  }
}

/**
 * List compose projects with container details and live running state
 */
export async function getProjectRuntimeStatus(composeFilePath) {
  if (!fs.existsSync(composeFilePath)) {
    return { status: 'stopped', containers: [] };
  }

  const { stdout, error } = await runCmd(
    `docker compose -f "${composeFilePath}" ps --format json`
  );

  if (error || !stdout) {
    return { status: 'stopped', containers: [] };
  }

  try {
    // docker compose ps returns either a JSON array or newline-delimited JSON objects
    let containers = [];
    if (stdout.startsWith('[')) {
      containers = JSON.parse(stdout);
    } else {
      containers = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }

    const isRunning = containers.some((c) => (c.State || c.Status || '').toLowerCase().includes('running'));
    return {
      status: isRunning ? 'running' : 'stopped',
      containers: containers.map((c) => ({
        name: c.Name || c.Service || 'container',
        service: c.Service || c.Name,
        state: c.State || 'unknown',
        status: c.Status || '',
        ports: c.Publishers ? c.Publishers.map((p) => `${p.PublishedPort}->${p.TargetPort}`).join(', ') : ''
      }))
    };
  } catch {
    return { status: 'stopped', containers: [] };
  }
}

/**
 * Start a compose project (auto-heals OrbStack first)
 */
export async function startProject(composeFilePath) {
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" up -d`,
    { cwd: dir }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, stdout };
}

/**
 * Stop a compose project
 */
export async function stopProject(composeFilePath) {
  const dir = path.dirname(composeFilePath);
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" stop`,
    { cwd: dir }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, stdout };
}

/**
 * Restart a compose project
 */
export async function restartProject(composeFilePath) {
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" restart`,
    { cwd: dir }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, stdout };
}

/**
 * Stop all running containers to sleep and release memory
 */
export async function sleepAllProjects(projectPaths = []) {
  let stoppedCount = 0;
  for (const p of projectPaths) {
    try {
      const status = await getProjectRuntimeStatus(p);
      if (status.status === 'running') {
        await stopProject(p);
        stoppedCount++;
      }
    } catch {
      // continue
    }
  }
  return { stoppedCount };
}

/**
 * One-click prune of unused images and build caches
 */
export async function pruneSystem() {
  await ensureOrbRunning();
  const { stdout, error } = await runCmd('docker system prune -f');
  if (error) {
    throw new Error('清理未用缓存失败: ' + error.message);
  }
  return { success: true, output: stdout };
}

/**
 * Get total container count and memory consumption
 */
export async function getStats() {
  const orb = await checkOrbStatus();
  if (!orb.running) {
    return { running: false, containerCount: 0, memoryMB: 0 };
  }

  const { stdout } = await runCmd('docker stats --no-stream --format "{{.MemUsage}}"');
  if (!stdout) {
    return { running: true, containerCount: 0, memoryMB: 0 };
  }

  const lines = stdout.split('\n').filter(Boolean);
  let totalMB = 0;
  for (const line of lines) {
    const memPart = line.split('/')[0]?.trim();
    if (memPart) {
      if (memPart.endsWith('MiB') || memPart.endsWith('MB')) {
        totalMB += parseFloat(memPart);
      } else if (memPart.endsWith('GiB') || memPart.endsWith('GB')) {
        totalMB += parseFloat(memPart) * 1024;
      }
    }
  }

  return {
    running: true,
    containerCount: lines.length,
    memoryMB: Math.round(totalMB)
  };
}
