import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execAsync = promisify(exec);

/**
 * Open project folder in specified editor (VS Code, Cursor, IntelliJ IDEA, WebStorm)
 */
export async function openInEditor(projectPath, editor = 'code') {
  if (!projectPath || !fs.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  try {
    if (editor === 'cursor') {
      try {
        await execAsync(`cursor "${projectPath}"`);
      } catch {
        await execAsync(`open -a "Cursor" "${projectPath}"`);
      }
    } else if (editor === 'idea') {
      try {
        await execAsync(`idea "${projectPath}"`);
      } catch {
        await execAsync(`open -a "IntelliJ IDEA" "${projectPath}"`);
      }
    } else {
      // Default to VS Code
      try {
        await execAsync(`code "${projectPath}"`);
      } catch {
        await execAsync(`open -a "Visual Studio Code" "${projectPath}"`);
      }
    }
    return { success: true };
  } catch (err) {
    throw new Error(`无法打开编辑器: ${err.message}`);
  }
}

/**
 * Open project folder in macOS Terminal
 */
export async function openInTerminal(projectPath) {
  if (!projectPath || !fs.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  try {
    await execAsync(`open -a Terminal "${projectPath}"`);
    return { success: true };
  } catch (err) {
    throw new Error(`无法打开终端: ${err.message}`);
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
