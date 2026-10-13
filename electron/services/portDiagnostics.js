import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Checks whether a given TCP port is currently occupied by any process
 * @param {number} port
 * @returns {Promise<{ occupied: boolean, pid?: number, command?: string, details?: string }>}
 */
export async function checkPortConflict(port) {
  if (!port || isNaN(port)) {
    return { occupied: false };
  }

  try {
    const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      timeout: 3000
    });

    const lines = stdout.trim().split('\n');
    if (lines.length > 1) {
      // First line is header: COMMAND PID USER FD TYPE ...
      const dataLine = lines[1].trim();
      const parts = dataLine.split(/\s+/);
      const command = parts[0] || 'Unknown';
      const pid = parseInt(parts[1], 10);

      return {
        occupied: true,
        pid,
        command,
        details: `${command} (PID: ${pid})`
      };
    }

    return { occupied: false };
  } catch (err) {
    // lsof returns exit code 1 if no matching process is found
    return { occupied: false };
  }
}

/**
 * Kills a rogue process occupying a port
 * @param {number} pid
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function killProcess(pid) {
  if (!pid || isNaN(pid) || pid <= 1) {
    return { success: false, message: '无效的进程 PID' };
  }

  try {
    // Try graceful SIGTERM first
    await execAsync(`kill -15 ${pid}`);
    return { success: true };
  } catch (err) {
    // Fallback to SIGKILL
    try {
      await execAsync(`kill -9 ${pid}`);
      return { success: true };
    } catch (kErr) {
      return { success: false, message: kErr.message };
    }
  }
}
