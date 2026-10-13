import http from 'node:http';
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
 * Checks if HTTP responds (status code < 500)
 */
function probeHttp(targetUrl, timeout = 1500) {
  return new Promise((resolve) => {
    try {
      const url = new URL(targetUrl);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname || '/',
          method: 'GET',
          timeout
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
