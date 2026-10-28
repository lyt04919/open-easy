import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execAsync = promisify(exec);

/**
 * Open project folder in specified editor (VS Code, Cursor, IntelliJ IDEA, WebStorm, Zed)
 */
export async function openInEditor(projectPath, editor = 'code') {
  if (!projectPath || !fs.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  const ed = (editor || 'code').toLowerCase();
  try {
    if (ed === 'cursor') {
      try {
        await execAsync(`cursor "${projectPath}"`);
      } catch {
        await execAsync(`open -a "Cursor" "${projectPath}"`);
      }
    } else if (ed === 'idea') {
      try {
        await execAsync(`idea "${projectPath}"`);
      } catch {
        try {
          await execAsync(`open -a "IntelliJ IDEA" "${projectPath}"`);
        } catch {
          await execAsync(`open -a "IntelliJ IDEA Ultimate" "${projectPath}"`);
        }
      }
    } else if (ed === 'webstorm') {
      try {
        await execAsync(`webstorm "${projectPath}"`);
      } catch {
        await execAsync(`open -a "WebStorm" "${projectPath}"`);
      }
    } else if (ed === 'zed') {
      try {
        await execAsync(`zed "${projectPath}"`);
      } catch {
        await execAsync(`open -a "Zed" "${projectPath}"`);
      }
    } else {
      // Default to VS Code
      try {
        await execAsync(`code "${projectPath}"`);
      } catch {
        await execAsync(`open -a "Visual Studio Code" "${projectPath}"`);
      }
    }
    return { success: true, editor: ed };
  } catch (err) {
    throw new Error(`无法打开编辑器: ${err.message}`);
  }
}

/**
 * Open project folder in specified macOS Terminal (Terminal.app, iTerm2, Warp, Ghostty)
 */
export async function openInTerminal(projectPath, terminal = 'terminal') {
  if (!projectPath || !fs.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  const term = (terminal || 'terminal').toLowerCase();
  try {
    if (term === 'iterm' || term === 'iterm2') {
      try {
        await execAsync(`open -a "iTerm" "${projectPath}"`);
      } catch {
        await execAsync(`open -a "iTerm2" "${projectPath}"`);
      }
    } else if (term === 'warp') {
      await execAsync(`open -a "Warp" "${projectPath}"`);
    } else if (term === 'ghostty') {
      await execAsync(`open -a "Ghostty" "${projectPath}"`);
    } else {
      await execAsync(`open -a Terminal "${projectPath}"`);
    }
    return { success: true, terminal: term };
  } catch (err) {
    // Fallback to native Terminal.app
    try {
      await execAsync(`open -a Terminal "${projectPath}"`);
      return { success: true, terminal: 'terminal', fallback: true };
    } catch {
      throw new Error(`无法打开终端: ${err.message}`);
    }
  }
}

/**
 * Reveal project folder in macOS Finder
 */
export async function showInFinder(projectPath) {
  if (!projectPath || !fs.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  try {
    await execAsync(`open "${projectPath}"`);
    return { success: true };
  } catch (err) {
    throw new Error(`无法在访达中打开: ${err.message}`);
  }
}

async function runCommandInTerminal(command, terminal = 'terminal') {
  const term = (terminal || 'terminal').toLowerCase();

  if (term === 'iterm' || term === 'iterm2') {
    const itermScript = `tell application "iTerm"
      activate
      try
        tell current window
          create tab with default profile
          tell current session
            write text "${command.replace(/"/g, '\\"')}"
          end tell
        end tell
      on error
        create window with default profile
        tell current session of current window
          write text "${command.replace(/"/g, '\\"')}"
        end tell
      end try
    end tell`;
    try {
      await execAsync(`osascript -e '${itermScript.replace(/'/g, "'\\''")}'`);
      return { success: true, terminal: 'iterm' };
    } catch {
      // Fallback below
    }
  } else if (term === 'warp') {
    try {
      const warpScript = `tell application "Warp" to activate
      delay 0.2
      tell application "System Events"
        keystroke "${command.replace(/"/g, '\\"')}"
        key code 36
      end tell`;
      await execAsync(`osascript -e '${warpScript.replace(/'/g, "'\\''")}'`);
      return { success: true, terminal: 'warp' };
    } catch {
      // Fallback below
    }
  } else if (term === 'ghostty') {
    try {
      try {
        await execAsync(`ghostty -e "${command.replace(/"/g, '\\"')}"`);
        return { success: true, terminal: 'ghostty' };
      } catch {
        const ghosttyScript = `tell application "Ghostty" to activate
        delay 0.2
        tell application "System Events"
          keystroke "${command.replace(/"/g, '\\"')}"
          key code 36
        end tell`;
        await execAsync(`osascript -e '${ghosttyScript.replace(/'/g, "'\\''")}'`);
        return { success: true, terminal: 'ghostty' };
      }
    } catch {
      // Fallback below
    }
  }

  const appleScript = `tell application "Terminal"
    activate
    do script "${command.replace(/"/g, '\\"')}"
  end tell`;

  try {
    await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
    return { success: true, terminal: 'terminal' };
  } catch (err) {
    throw new Error(`无法进入容器终端: ${err.message}`);
  }
}

/**
 * Open macOS Terminal and attach to running Docker container shell
 */
export async function execInTerminal(containerName, preferredShell = 'sh', terminal = 'terminal') {
  if (!containerName) {
    throw new Error('容器名称不能为空');
  }

  const cleanName = containerName.replace(/[^a-zA-Z0-9_.-]/g, '');
  const command = `docker exec -it ${cleanName} ${preferredShell} || docker exec -it ${cleanName} sh`;
  return await runCommandInTerminal(command, terminal);
}

/**
 * Build database interactive CLI command string
 */
export function buildDbShellCommand(containerName, dbInfo = {}) {
  if (!containerName) {
    throw new Error('容器名称不能为空');
  }

  const cleanName = containerName.replace(/[^a-zA-Z0-9_.-]/g, '');
  const type = (dbInfo.type || '').toLowerCase();
  const user = dbInfo.user || (type === 'mysql' || type === 'mariadb' ? 'root' : 'postgres');
  const password = dbInfo.password || '';
  const database = dbInfo.database || dbInfo.db || (type === 'postgres' ? 'postgres' : '');

  if (type === 'postgres' || type === 'postgresql') {
    const envArg = password ? `-e PGPASSWORD='${password}' ` : '';
    const dbArg = database ? ` -d ${database}` : '';
    return `docker exec -it ${envArg}${cleanName} psql -U ${user}${dbArg}`;
  } else if (type === 'mysql' || type === 'mariadb') {
    const passArg = password ? ` -p'${password}'` : '';
    const dbArg = database ? ` ${database}` : '';
    return `docker exec -it ${cleanName} mysql -u ${user}${passArg}${dbArg}`;
  } else if (type === 'redis') {
    const authArg = password ? ` -a '${password}'` : '';
    return `docker exec -it ${cleanName} redis-cli${authArg}`;
  } else if (type === 'mongo' || type === 'mongodb') {
    return `docker exec -it ${cleanName} mongosh`;
  }
  return `docker exec -it ${cleanName} sh`;
}

/**
 * Open database interactive CLI in terminal (psql, mysql, redis-cli, mongosh)
 */
export async function execDbShellInTerminal(containerName, dbInfo = {}, terminal = 'terminal') {
  const command = buildDbShellCommand(containerName, dbInfo);
  return await runCommandInTerminal(command, terminal);
}

