import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectDatabaseService } from './databaseHelper.js';

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

function getIndent(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0].length : 0;
}

function loadProjectEnvMap(dir) {
  const envMap = {};
  let combinedRaw = '';
  const candidates = ['.env', '.env.local', '.env.development'];
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        combinedRaw += '\n' + raw;
        raw.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              envMap[key] = val;
            }
          }
        });
      } catch {}
    }
  }
  return { envMap, combinedRaw };
}

function interpolateValue(val, envMap) {
  if (typeof val !== 'string') return val;
  return val.replace(/\$\{([A-Za-z0-9_]+)(?::-?([^}]*))?\}/g, (_, key, def) => {
    if (envMap[key] !== undefined && envMap[key] !== '') {
      return envMap[key];
    }
    return def !== undefined ? def : '';
  });
}

const composeCache = new Map();

/**
 * Parses docker-compose.yml to extract services, ports, environment variables, pre-parsed databases, and infer tech stack
 */
export function inspectComposeFile(composeFilePath) {
  if (!fs.existsSync(composeFilePath)) {
    return { services: [], serviceNames: [], hostPorts: [], tech: 'Docker', defaultUrl: 'http://localhost:3000', frontendPort: 3000, databases: [] };
  }

  try {
    const stats = fs.statSync(composeFilePath);
    const cached = composeCache.get(composeFilePath);
    if (cached && cached.mtime === stats.mtimeMs) {
      return cached.data;
    }

    const dir = path.dirname(composeFilePath);
    const { envMap, combinedRaw: rootEnvRaw } = loadProjectEnvMap(dir);
    const content = fs.readFileSync(composeFilePath, 'utf8');
    const lines = content.split('\n');

    const parsedServices = [];
    let currentService = null;
    let inServices = false;
    let servicesIndent = 0;
    let serviceIndent = -1;
    let currentSection = null;
    let sectionIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = getIndent(line);

      // Detect services: block
      if (/^services:[ \t]*$/.test(trimmed)) {
        inServices = true;
        servicesIndent = indent;
        currentService = null;
        currentSection = null;
        continue;
      }

      // Exit services if indentation returns to or below servicesIndent
      if (inServices && indent <= servicesIndent && /^[a-zA-Z0-9_-]+:[ \t]*/.test(trimmed)) {
        inServices = false;
        currentService = null;
        currentSection = null;
        continue;
      }

      if (!inServices) continue;

      // Determine the service indentation level dynamically
      if (serviceIndent === -1 && indent > servicesIndent && /^[a-zA-Z0-9_.-]+:[ \t]*$/.test(trimmed)) {
        serviceIndent = indent;
      }

      // Match a new service definition
      if (indent === serviceIndent && /^[a-zA-Z0-9_.-]+:[ \t]*$/.test(trimmed)) {
        const sMatch = trimmed.match(/^([a-zA-Z0-9_.-]+):/);
        if (sMatch) {
          currentService = {
            name: sMatch[1],
            ports: [],
            environment: [],
            image: ''
          };
          parsedServices.push(currentService);
          currentSection = null;
          sectionIndent = -1;
          continue;
        }
      }

      if (!currentService) continue;

      // Inside a service: detect sub-properties
      if (indent > serviceIndent) {
        if (/^ports:[ \t]*$/.test(trimmed)) {
          currentSection = 'ports';
          sectionIndent = indent;
          continue;
        } else if (/^environment:[ \t]*$/.test(trimmed)) {
          currentSection = 'environment';
          sectionIndent = indent;
          continue;
        } else if (/^image:[ \t]*/.test(trimmed)) {
          const imgMatch = trimmed.match(/^image:[ \t]*["']?([^"']+)["']?/);
          if (imgMatch) {
            currentService.image = imgMatch[1].trim();
          }
          currentSection = null;
          continue;
        } else if (indent <= sectionIndent && /^[a-zA-Z0-9_.-]+:[ \t]*/.test(trimmed)) {
          currentSection = null;
        }
      }

      // Parse ports
      if (currentSection === 'ports' && indent > sectionIndent) {
        const interpolated = interpolateValue(trimmed, envMap);
        const cleanPort = interpolated.replace(/^[-\s"']+|["'\s]+$/g, '').split('/')[0];
        const parts = cleanPort.split(':');
        let hostPort = null;
        let containerPort = null;

        if (parts.length === 3) {
          // IP:HOST:CONTAINER, e.g. 127.0.0.1:8081:80
          hostPort = parseInt(parts[1], 10);
          containerPort = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          // HOST:CONTAINER, e.g. 8081:80
          hostPort = parseInt(parts[0], 10);
          containerPort = parseInt(parts[1], 10);
        } else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
          // Single port
          hostPort = parseInt(parts[0], 10);
          containerPort = hostPort;
        } else {
          // Published/host keyword
          const pubMatch = interpolated.match(/(?:published|host):\s*["']?(\d+)["']?/);
          if (pubMatch) {
            hostPort = parseInt(pubMatch[1], 10);
            containerPort = hostPort;
          }
        }

        if (hostPort !== null && !isNaN(hostPort)) {
          currentService.ports.push({
            host: hostPort,
            container: isNaN(containerPort) ? hostPort : containerPort
          });
        }
      }

      // Parse environment entries
      if (currentSection === 'environment' && indent > sectionIndent) {
        const envLine = interpolateValue(trimmed, envMap);
        currentService.environment.push(envLine);
      }
    }

    const serviceNames = parsedServices.map((s) => s.name);
    const hostPorts = [];
    parsedServices.forEach((s) => {
      s.ports.forEach((p) => {
        if (!hostPorts.includes(p.host)) hostPorts.push(p.host);
      });
    });

    // Fallback regex if unusual yaml formatting
    if (serviceNames.length === 0) {
      const serviceBlockRegex = /^[ \t]{2,4}([a-zA-Z0-9_-]+):/gm;
      let m;
      while ((m = serviceBlockRegex.exec(content)) !== null) {
        if (m[1] !== 'version' && m[1] !== 'services' && m[1] !== 'networks' && m[1] !== 'volumes') {
          serviceNames.push(m[1]);
        }
      }
    }
    if (hostPorts.length === 0) {
      const portRegex = /-\s*["']?(?:[0-9.]+:)?(\d+)(?::\d+)?["']?/g;
      let pm;
      while ((pm = portRegex.exec(content)) !== null) {
        const interpolated = interpolateValue(pm[0], envMap);
        const numMatch = interpolated.match(/(\d+)/);
        if (numMatch) {
          const hp = parseInt(numMatch[1], 10);
          if (!hostPorts.includes(hp)) hostPorts.push(hp);
        }
      }
    }

    // Compute OrbStack native domain
    let composeProjectName = '';
    const nameMatch = content.match(/^name:\s*["']?([a-zA-Z0-9_-]+)["']?/m);
    if (nameMatch) {
      composeProjectName = nameMatch[1].toLowerCase();
    } else {
      composeProjectName = path.basename(dir).toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    }

    // Pre-parse databases with real user/password/port/uri
    const databases = [];
    for (const s of parsedServices) {
      const serviceEnv = s.environment.join('\n');
      const combinedEnvContent = `${serviceEnv}\n${rootEnvRaw}\n${content}`;
      const firstPort = s.ports[0]?.host || 0;
      const dbInfo = detectDatabaseService(s.name, firstPort, combinedEnvContent, composeProjectName, s.image);
      if (dbInfo && dbInfo.isDb) {
        databases.push({
          service: s.name,
          type: dbInfo.type,
          label: dbInfo.label,
          icon: dbInfo.icon,
          port: dbInfo.port || firstPort,
          user: dbInfo.user,
          password: dbInfo.password,
          database: dbInfo.database,
          uri: dbInfo.uri,
          jdbcUrl: dbInfo.jdbcUrl || '',
          isOrbDirect: dbInfo.isOrbDirect || false,
          defaultClient: dbInfo.defaultClient
        });
      }
    }


    // Infer tech stack
    const lowerContent = content.toLowerCase();
    const lowerPath = composeFilePath.toLowerCase();
    let tech = 'Docker';

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

    // Smart pick frontend port: prioritize frontend/web/ui over backend/server/adminer/db
    const frontendKeywords = ['front', 'web', 'ui', 'client', 'app', 'portal', 'dashboard'];
    const backendKeywords = ['backend', 'server', 'api', 'adminer', 'db', 'database', 'mysql', 'postgres', 'redis', 'gateway', 'auth'];

    let frontendPort = null;

    // 1. Check services with frontend keywords and valid host ports
    for (const s of parsedServices) {
      const sName = s.name.toLowerCase();
      const isFrontend = frontendKeywords.some((kw) => sName.includes(kw));
      const isBackend = backendKeywords.some((kw) => sName.includes(kw));
      if (isFrontend && !isBackend && s.ports.length > 0) {
        frontendPort = s.ports[0].host;
        break;
      }
    }

    // 2. Check services that are NOT backend/db
    if (!frontendPort) {
      for (const s of parsedServices) {
        const sName = s.name.toLowerCase();
        const isBackend = backendKeywords.some((kw) => sName.includes(kw));
        if (!isBackend && s.ports.length > 0) {
          frontendPort = s.ports[0].host;
          break;
        }
      }
    }

    // 3. Fallback: Preferred frontend web ports
    if (!frontendPort) {
      const preferredWebPorts = [80, 5173, 3000, 8081, 2025, 90, 8080, 8000];
      for (const pref of preferredWebPorts) {
        if (hostPorts.includes(pref)) {
          frontendPort = pref;
          break;
        }
      }
    }

    if (!frontendPort) {
      frontendPort = hostPorts[0] || 8080;
    }

    // Attach orbLocalUrl to each parsed service
    parsedServices.forEach((s) => {
      s.orbLocalUrl = `https://${s.name.toLowerCase()}.${composeProjectName}.orb.local`;
    });

    // Determine primary service for project orbLocalUrl
    let primaryServiceName = (parsedServices[0]?.name || 'app').toLowerCase();
    for (const s of parsedServices) {
      if (s.ports.some((p) => p.host === frontendPort)) {
        primaryServiceName = s.name.toLowerCase();
        break;
      }
    }
    const orbLocalUrl = `https://${primaryServiceName}.${composeProjectName}.orb.local`;

    const result = {
      services: serviceNames,
      serviceNames,
      parsedServices,
      hostPorts,
      tech,
      frontendPort,
      defaultUrl: `http://localhost:${frontendPort}`,
      orbProjectName: composeProjectName,
      orbLocalUrl,
      databases
    };
    composeCache.set(composeFilePath, { mtime: stats.mtimeMs, data: result });
    return result;
  } catch (err) {
    return {
      services: [],
      serviceNames: [],
      hostPorts: [],
      tech: 'Docker',
      frontendPort: 3000,
      defaultUrl: 'http://localhost:3000',
      orbProjectName: '',
      orbLocalUrl: '',
      databases: [],
      error: err.message
    };
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
 * Batch queries runtime status for multiple projects via a single `docker ps -a`
 * Eliminates N+1 subprocess storm during frequent status polling
 * @param {string[]} composeFilePaths
 * @returns {Promise<Record<string, { status: 'running'|'stopped', containers: Array<{ name: string, service: string, state: string, status: string, ports: string }> }>>}
 */
export async function getBatchProjectsRuntimeStatus(composeFilePaths = []) {
  if (!Array.isArray(composeFilePaths) || composeFilePaths.length === 0) {
    return {};
  }

  const result = {};
  for (const fp of composeFilePaths) {
    result[fp] = { status: 'stopped', containers: [] };
  }

  try {
    const { stdout, error } = await runCmd('docker ps -a --format json');
    if (error || !stdout) {
      // Fallback: query individually if global ps failed
      for (const fp of composeFilePaths) {
        result[fp] = await getProjectRuntimeStatus(fp);
      }
      return result;
    }

    let rawContainers = [];
    if (stdout.startsWith('[')) {
      rawContainers = JSON.parse(stdout);
    } else {
      rawContainers = stdout
        .split('\n')
        .map((line) => line.trim())
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

    // Index lookup maps
    const pathLookup = new Map();
    for (const fp of composeFilePaths) {
      if (fp) {
        const resolved = path.resolve(fp);
        pathLookup.set(resolved, fp);
        const folderName = path.basename(path.dirname(fp)).toLowerCase();
        pathLookup.set(`folder:${folderName}`, fp);
      }
    }

    for (const c of rawContainers) {
      let labelsObj = {};
      if (c.Labels) {
        if (typeof c.Labels === 'object' && !Array.isArray(c.Labels)) {
          labelsObj = c.Labels;
        } else if (typeof c.Labels === 'string') {
          c.Labels.split(',').forEach((pair) => {
            const idx = pair.indexOf('=');
            if (idx > 0) {
              labelsObj[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
            }
          });
        }
      }

      const configFiles = labelsObj['com.docker.compose.project.config_files'] || '';
      const composeProject = (labelsObj['com.docker.compose.project'] || '').toLowerCase();
      const composeService = labelsObj['com.docker.compose.service'] || '';

      let matchedFilePath = null;
      if (configFiles) {
        for (const fileCandidate of configFiles.split(',')) {
          const resolved = path.resolve(fileCandidate.trim());
          if (pathLookup.has(resolved)) {
            matchedFilePath = pathLookup.get(resolved);
            break;
          }
        }
      }

      if (!matchedFilePath && composeProject) {
        if (pathLookup.has(`folder:${composeProject}`)) {
          matchedFilePath = pathLookup.get(`folder:${composeProject}`);
        }
      }

      if (matchedFilePath && result[matchedFilePath]) {
        const stateStr = (c.State || c.Status || '').toLowerCase();
        const isRunning = stateStr.includes('running') || stateStr.startsWith('up');
        const containerInfo = {
          name: c.Names || c.Name || c.ID || 'container',
          service: composeService || c.Names || 'container',
          state: c.State || (isRunning ? 'running' : 'exited'),
          status: c.Status || '',
          ports: c.Ports || (c.Publishers ? c.Publishers.map((p) => `${p.PublishedPort}->${p.TargetPort}`).join(', ') : '')
        };
        result[matchedFilePath].containers.push(containerInfo);
        if (isRunning) {
          result[matchedFilePath].status = 'running';
        }
      }
    }

    return result;
  } catch {
    for (const fp of composeFilePaths) {
      result[fp] = await getProjectRuntimeStatus(fp);
    }
    return result;
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
 * Start a specific microservice inside a compose project
 */
export async function startService(composeFilePath, serviceName) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('服务名不能为空');
  }
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const cleanSvc = serviceName.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanSvc) {
    throw new Error('无效的服务名');
  }
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" up -d ${cleanSvc}`,
    { cwd: dir, timeout: 60000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, service: cleanSvc, stdout };
}

/**
 * Stop a specific microservice inside a compose project
 */
export async function stopService(composeFilePath, serviceName) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('服务名不能为空');
  }
  const dir = path.dirname(composeFilePath);
  const cleanSvc = serviceName.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanSvc) {
    throw new Error('无效的服务名');
  }
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" stop ${cleanSvc}`,
    { cwd: dir, timeout: 30000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, service: cleanSvc, stdout };
}

/**
 * Restart a specific microservice inside a compose project
 */
export async function restartService(composeFilePath, serviceName) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('服务名不能为空');
  }
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const cleanSvc = serviceName.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanSvc) {
    throw new Error('无效的服务名');
  }
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" restart ${cleanSvc}`,
    { cwd: dir, timeout: 45000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, service: cleanSvc, stdout };
}

/**
 * Start only middleware / database / cache services
 */
export async function startMiddlewareServices(composeFilePath, middlewareNames = []) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);

  let targetServices = [];
  if (Array.isArray(middlewareNames) && middlewareNames.length > 0) {
    targetServices = middlewareNames;
  } else {
    // Auto-detect middleware services from compose inspection
    const inspected = inspectComposeFile(composeFilePath);
    if (inspected.databases && inspected.databases.length > 0) {
      targetServices = inspected.databases.map((d) => d.service);
    } else {
      const mwKeywords = ['db', 'database', 'mysql', 'postgres', 'redis', 'mongo', 'mariadb', 'rabbitmq', 'kafka', 'minio'];
      targetServices = inspected.serviceNames.filter((name) =>
        mwKeywords.some((kw) => name.toLowerCase().includes(kw))
      );
    }
  }

  if (targetServices.length === 0) {
    throw new Error('未检测到可用的数据库或缓存等中间件微服务');
  }

  const cleanServices = targetServices
    .map((s) => s.trim().replace(/[^a-zA-Z0-9_.-]/g, ''))
    .filter(Boolean);

  if (cleanServices.length === 0) {
    throw new Error('未检测到有效的中间件微服务名');
  }

  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" up -d ${cleanServices.join(' ')}`,
    { cwd: dir, timeout: 60000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, startedServices: cleanServices, stdout };
}

/**
 * Rebuild and up compose project (docker compose up -d --build)
 */
export async function rebuildProject(composeFilePath) {
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" up -d --build`,
    { cwd: dir, timeout: 120000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, stdout };
}

/**
 * Pull latest images for compose project (docker compose pull)
 */
export async function pullProject(composeFilePath) {
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" pull`,
    { cwd: dir, timeout: 90000 }
  );

  if (error) {
    throw new Error(stderr || stdout || error.message);
  }

  return { success: true, stdout };
}

/**
 * Reset volumes and recreate containers (docker compose down -v && up -d)
 */
export async function resetProjectVolumes(composeFilePath) {
  await ensureOrbRunning();
  const dir = path.dirname(composeFilePath);
  const { stdout: downOut, stderr: downErr, error: downError } = await runCmd(
    `docker compose -f "${composeFilePath}" down -v`,
    { cwd: dir, timeout: 30000 }
  );

  if (downError) {
    throw new Error(downErr || downOut || downError.message);
  }

  const { stdout: upOut, stderr: upErr, error: upError } = await runCmd(
    `docker compose -f "${composeFilePath}" up -d`,
    { cwd: dir, timeout: 45000 }
  );

  if (upError) {
    throw new Error(upErr || upOut || upError.message);
  }

  return { success: true, stdout: `${downOut}\n${upOut}` };
}


/**
 * Fetch recent container stdout/stderr logs from docker compose
 */
export async function getProjectLogs(composeFilePath, tail = 120, serviceName = '') {
  if (!fs.existsSync(composeFilePath)) {
    return { success: false, logs: '未找到 docker-compose.yml 配置文件' };
  }

  const dir = path.dirname(composeFilePath);
  const cleanSvc = (serviceName || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  const svcArg = cleanSvc ? ` ${cleanSvc}` : '';
  const { stdout, stderr, error } = await runCmd(
    `docker compose -f "${composeFilePath}" logs --tail ${tail} --no-color${svcArg}`,
    { cwd: dir, timeout: 8000 }
  );

  if (error && !stdout && !stderr) {
    return { success: false, logs: `获取容器日志失败: ${error.message || stderr}` };
  }

  return {
    success: true,
    logs: stdout || stderr || '容器暂无控制台日志输出'
  };
}

/**
 * Read .env file from project directory with multi-file discovery
 */
export async function getProjectEnv(composeFilePath, requestedFileName) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    return { exists: false, content: '', availableFiles: [] };
  }
  const dir = path.dirname(composeFilePath);
  let availableFiles = [];
  try {
    const all = fs.readdirSync(dir);
    availableFiles = all.filter((f) => f === '.env' || f.startsWith('.env.'));
  } catch {
    availableFiles = [];
  }
  if (!availableFiles.includes('.env')) {
    availableFiles.unshift('.env');
  }

  const activeName = requestedFileName && availableFiles.includes(requestedFileName)
    ? requestedFileName
    : (availableFiles.find((f) => fs.existsSync(path.join(dir, f))) || '.env');

  const p = path.join(dir, activeName);
  const exists = fs.existsSync(p);
  let content = '';
  if (exists) {
    try {
      content = fs.readFileSync(p, 'utf8');
    } catch (err) {
      return { exists: false, error: err.message, availableFiles, fileName: activeName };
    }
  }
  return { exists, fileName: activeName, filePath: p, content, availableFiles, dir };
}

/**
 * Detect Git branch and uncommitted changes for a project directory
 */
export async function getProjectGitInfo(composeFilePath) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    return { branch: '', dirty: false };
  }
  const dir = path.dirname(composeFilePath);
  let gitDir = null;
  let curr = dir;
  for (let i = 0; i < 3; i++) {
    if (fs.existsSync(path.join(curr, '.git'))) {
      gitDir = curr;
      break;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  if (!gitDir) {
    return { branch: '', dirty: false };
  }

  try {
    const { stdout: branchOut, error: branchErr } = await runCmd('git rev-parse --abbrev-ref HEAD', {
      cwd: gitDir,
      timeout: 3000
    });
    if (branchErr || !branchOut) {
      return { branch: '', dirty: false };
    }
    const branch = branchOut.trim();

    const { stdout: statusOut } = await runCmd('git status --porcelain', {
      cwd: gitDir,
      timeout: 3000
    });
    const dirty = Boolean(statusOut && statusOut.trim().length > 0);

    return { branch, dirty };
  } catch {
    return { branch: '', dirty: false };
  }
}

/**
 * One-click database SQL dump backup via docker exec
 */
export async function dumpDatabase(composeFilePath, serviceName, dbType, dbConfig = {}) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  const cleanSvc = (serviceName || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanSvc) {
    throw new Error('服务名无效');
  }
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const dumpDir = path.join(downloadsDir, 'open-easy-dumps');
  if (!fs.existsSync(dumpDir)) {
    fs.mkdirSync(dumpDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dumpFileName = `backup_${cleanSvc}_${timestamp}.sql`;
  const targetFile = path.join(dumpDir, dumpFileName);

  const user = dbConfig.user || (dbType === 'mysql' ? 'root' : 'postgres');
  const db = dbConfig.db || '';
  const password = dbConfig.password || '';

  let dumpCmd = '';
  if (dbType === 'postgres' || dbType === 'postgresql') {
    const dbArg = db ? ` ${db}` : ' postgres';
    const envArg = password ? `-e PGPASSWORD="${password}" ` : '';
    dumpCmd = `docker compose -f "${composeFilePath}" exec -T ${envArg}${cleanSvc} pg_dump -U ${user}${dbArg} > "${targetFile}"`;
  } else if (dbType === 'mysql' || dbType === 'mariadb') {
    const passArg = password ? ` -p"${password}"` : '';
    const dbArg = db ? ` ${db}` : ' --all-databases';
    dumpCmd = `docker compose -f "${composeFilePath}" exec -T ${cleanSvc} mysqldump -u ${user}${passArg}${dbArg} > "${targetFile}"`;
  } else {
    throw new Error(`暂不支持导出 ${dbType} 类型的数据库`);
  }

  const { error, stderr } = await runCmd(dumpCmd, { timeout: 60000 });
  if (error) {
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size === 0) {
      try { fs.unlinkSync(targetFile); } catch {}
    }
    throw new Error(stderr || error.message);
  }

  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
    throw new Error('转储文件生成为空，请检查容器状态与数据库凭证');
  }

  return { success: true, filePath: targetFile, fileName: dumpFileName };
}

/**
 * Restore SQL script into database via docker compose exec -T
 */
export async function restoreDatabase(composeFilePath, serviceName, dbType, dbConfig = {}, sqlFilePath) {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  const cleanSvc = (serviceName || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!cleanSvc) {
    throw new Error('服务名无效');
  }
  if (!sqlFilePath || !fs.existsSync(sqlFilePath)) {
    throw new Error('SQL 脚本文件不存在');
  }

  const type = (dbType || '').toLowerCase();
  const user = dbConfig.user || (type === 'mysql' || type === 'mariadb' ? 'root' : 'postgres');
  const db = dbConfig.db || dbConfig.database || '';
  const password = dbConfig.password || '';

  let restoreCmd = '';
  if (type === 'postgres' || type === 'postgresql') {
    const dbArg = db ? ` ${db}` : ' postgres';
    const envArg = password ? `-e PGPASSWORD="${password}" ` : '';
    restoreCmd = `docker compose -f "${composeFilePath}" exec -T ${envArg}${cleanSvc} psql -U ${user}${dbArg} < "${sqlFilePath}"`;
  } else if (type === 'mysql' || type === 'mariadb') {
    const passArg = password ? ` -p"${password}"` : '';
    const dbArg = db ? ` ${db}` : '';
    restoreCmd = `docker compose -f "${composeFilePath}" exec -T ${cleanSvc} mysql -u ${user}${passArg}${dbArg} < "${sqlFilePath}"`;
  } else {
    throw new Error(`暂不支持还原 ${dbType} 类型的数据库`);
  }

  const { error, stderr } = await runCmd(restoreCmd, { timeout: 120000 });
  if (error) {
    throw new Error(stderr || error.message);
  }

  return { success: true, serviceName: cleanSvc, sqlFilePath, fileName: path.basename(sqlFilePath) };
}

/**
 * Save .env file in project directory with path traversal protection

 * @param {string} composeFilePath
 * @param {string} content
 * @param {string} [fileName='.env']
 */
export async function saveProjectEnv(composeFilePath, content, fileName = '.env') {
  if (!composeFilePath || !fs.existsSync(composeFilePath)) {
    throw new Error('未找到项目配置文件');
  }
  const safeName = path.basename(fileName || '.env');
  if (!safeName.startsWith('.env')) {
    throw new Error('配置文件名必须以 .env 开头');
  }
  const dir = path.dirname(composeFilePath);
  const target = path.join(dir, safeName);
  fs.writeFileSync(target, content, 'utf8');
  return { success: true, filePath: target, fileName: safeName };
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

/**
 * Get real-time CPU & memory consumption for a specific compose project
 */
export async function getProjectResourceUsage(composeFilePath) {
  if (!fs.existsSync(composeFilePath)) {
    return { running: false, totalCpu: '0%', totalMemMB: 0, containerStats: [] };
  }

  const runtime = await getProjectRuntimeStatus(composeFilePath);
  if (runtime.status !== 'running' || runtime.containers.length === 0) {
    return { running: false, totalCpu: '0%', totalMemMB: 0, containerStats: [] };
  }

  const containerNames = runtime.containers.map((c) => c.name);
  const { stdout } = await runCmd('docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"');
  if (!stdout) {
    return { running: true, totalCpu: '0%', totalMemMB: 0, containerStats: [] };
  }

  let totalCpu = 0;
  let totalMemMB = 0;
  const containerStats = [];

  const lines = stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const matched = containerNames.some((cName) => cName === name || name.includes(cName) || cName.includes(name));
      if (matched) {
        const cpuStr = parts[1].trim();
        const cpuNum = parseFloat(cpuStr.replace('%', '')) || 0;
        totalCpu += cpuNum;

        const memStr = parts[2].split('/')[0]?.trim() || '';
        let memMB = 0;
        if (memStr.endsWith('GiB') || memStr.endsWith('GB')) {
          memMB = parseFloat(memStr) * 1024;
        } else if (memStr.endsWith('MiB') || memStr.endsWith('MB')) {
          memMB = parseFloat(memStr);
        } else if (memStr.endsWith('kiB') || memStr.endsWith('kB')) {
          memMB = parseFloat(memStr) / 1024;
        }
        totalMemMB += memMB;

        containerStats.push({
          name,
          cpu: cpuStr,
          mem: memStr
        });
      }
    }
  }

  return {
    running: true,
    totalCpu: totalCpu.toFixed(1) + '%',
    totalMemMB: Math.round(totalMemMB),
    containerStats
  };
}

/**
 * Query OrbStack directly for all registered and deployed Compose projects
 */
export async function getOrbStackDeployedProjects() {
  await ensureOrbRunning();
  const { stdout, error } = await runCmd('docker compose ls --all --format json');
  if (error || !stdout) {
    return [];
  }

  try {
    let list = [];
    if (stdout.startsWith('[')) {
      list = JSON.parse(stdout);
    } else {
      list = stdout
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

    return list.map((item) => {
      const name = item.Name || 'Unnamed';
      let composePath = (item.ConfigFiles || '').split(',')[0].trim();
      const isRunning = (item.Status || '').toLowerCase().includes('running');
      const inspected = inspectComposeFile(composePath);

      return {
        id: name.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        name: name,
        composePath,
        status: isRunning ? 'running' : 'stopped',
        rawStatus: item.Status || 'exited',
        tech: inspected.tech,
        frontendPort: inspected.frontendPort || inspected.hostPorts[0] || 8080,
        frontendUrl: inspected.defaultUrl,
        services: inspected.serviceNames,
        description: `OrbStack 部署项目 (${inspected.tech})`
      };
    });
  } catch {
    return [];
  }
}
