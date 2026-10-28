import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

/**
 * Checks if a port is accepting TCP connections
 */
function probeTcp(port, host = '127.0.0.1', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Checks if HTTP/HTTPS responds (status code < 500)
 */
function probeHttp(targetUrl, timeout = 1500) {
  return new Promise((resolve) => {
    try {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname || '/',
          method: 'GET',
          timeout,
          rejectUnauthorized: false
        },
        (res) => {
          // Any response < 500 means server is awake and responding
          resolve(res.statusCode < 500);
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Continuously polls target URL until healthy or timeout
 * @param {string} targetUrl - e.g. "http://localhost:8081"
 * @param {number} timeoutMs - max time to wait in ms (default 25000)
 * @param {number} intervalMs - interval between probes in ms (default 500)
 * @returns {Promise<{ ready: boolean, durationMs: number, error?: string }>}
 */
export async function waitForReady(targetUrl, timeoutMs = 25000, intervalMs = 500) {
  const start = Date.now();
  let port = 80;
  let host = '127.0.0.1';

  try {
    const parsed = new URL(targetUrl);
    port = parseInt(parsed.port, 10) || 80;
    host = parsed.hostname || '127.0.0.1';
    if (host === 'localhost') host = '127.0.0.1';
  } catch {
    // default
  }

  while (Date.now() - start < timeoutMs) {
    // Try HTTP probe first
    const httpOk = await probeHttp(targetUrl, Math.min(intervalMs, 1200));
    if (httpOk) {
      return { ready: true, durationMs: Date.now() - start };
    }

    // Try TCP probe as fallback
    const tcpOk = await probeTcp(port, host, Math.min(intervalMs, 800));
    if (tcpOk) {
      return { ready: true, durationMs: Date.now() - start };
    }

    await new Promise((res) => setTimeout(res, intervalMs));
  }

  return { ready: false, durationMs: Date.now() - start, error: '服务探活超时' };
}

/**
 * Pings target URL and returns live response status and latency in ms
 * Supports both HTTP web services and TCP raw services (like databases)
 * @param {string} targetUrl - e.g. "http://localhost:8080"
 * @param {number} timeoutMs - max time to wait (default 3000ms)
 * @returns {Promise<{ ok: boolean, statusCode: number|null, statusText: string, latencyMs: number, error?: string }>}
 */
export async function pingRoute(targetUrl, timeoutMs = 3000) {
  const start = Date.now();
  let port = 80;
  let host = '127.0.0.1';
  let isHttps = false;

  try {
    const parsed = new URL(targetUrl);
    isHttps = parsed.protocol === 'https:';
    port = parseInt(parsed.port, 10) || (isHttps ? 443 : 80);
    host = parsed.hostname || '127.0.0.1';
    if (host === 'localhost') host = '127.0.0.1';
  } catch {
    return { ok: false, statusCode: null, statusText: 'Invalid URL', latencyMs: 0, error: '无效的目标地址' };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const client = isHttps ? https : http;
    const req = client.request(
      {
        hostname: host,
        port,
        path: '/',
        method: 'GET',
        timeout: timeoutMs,
        rejectUnauthorized: false
      },
      (res) => {
        const latencyMs = Math.max(1, Date.now() - start);
        finish({
          ok: res.statusCode < 500,
          statusCode: res.statusCode,
          statusText: res.statusMessage || (res.statusCode < 400 ? 'OK' : 'Notice'),
          latencyMs
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const latencyMs = Date.now() - start;
      finish({
        ok: false,
        statusCode: null,
        statusText: 'Timeout',
        latencyMs,
        error: '连接超时 (>3s)'
      });
    });

    req.on('error', async (err) => {
      // If HTTP rejected (e.g. database or non-HTTP protocol), probe TCP port
      const tcpOk = await probeTcp(port, host, 1000);
      const latencyMs = Math.max(1, Date.now() - start);
      if (tcpOk) {
        finish({
          ok: true,
          statusCode: 200,
          statusText: 'TCP Ready',
          latencyMs
        });
      } else {
        finish({
          ok: false,
          statusCode: null,
          statusText: 'Unreachable',
          latencyMs,
          error: err.code === 'ECONNREFUSED' ? '端口未监听' : err.message
        });
      }
    });

    req.end();
  });
}

