import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.open-easy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default built-in projects initialized to empty array (clean onboarding experience)
const DEFAULT_PROJECTS = [];

export const DEFAULT_SETTINGS = {
  themeMode: 'system', // 'light' | 'dark' | 'system'
  defaultView: 'bento', // 'bento' | 'launchpad' | 'ports'
  preferredEditor: 'code',
  preferredTerminal: 'terminal',
  preferredShell: 'sh', // 'sh' | 'bash'
  autoLaunchBrowser: true,
  autoHealOrbStack: true,
  crashNotifications: true,
  pollInterval: 5000 // 3000 | 5000 | 10000
};

class ConfigStore {
  constructor(filePath = CONFIG_FILE) {
    this.filePath = filePath;
    this.data = {
      projects: [...DEFAULT_PROJECTS],
      settings: { ...DEFAULT_SETTINGS }
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.projects)) {
          this.data = parsed;
          this.data.settings = { ...DEFAULT_SETTINGS, ...(this.data.settings || {}) };
        }
      } else {
        this.save();
      }
    } catch {
      // Use defaults if parse fails
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {
      // silent
    }
  }

  getProjects() {
    return this.data.projects || [];
  }

  getSettings() {
    return { ...DEFAULT_SETTINGS, ...(this.data.settings || {}) };
  }

  updateSettings(updates) {
    if (!this.data.settings) {
      this.data.settings = { ...DEFAULT_SETTINGS };
    }
    Object.assign(this.data.settings, updates);
    this.save();
    return this.data.settings;
  }

  updateProject(id, updates) {
    const proj = this.data.projects.find((p) => p.id === id);
    if (proj) {
      Object.assign(proj, updates);
      this.save();
      return proj;
    }
    return null;
  }

  updateProjectTags(id, tags) {
    const proj = this.data.projects.find((p) => p.id === id);
    if (proj) {
      proj.tags = Array.isArray(tags) ? tags : [];
      this.save();
      return proj;
    }
    return null;
  }

  addProject(project) {
    const existingIndex = this.data.projects.findIndex(
      (p) => p.id === project.id || p.composePath === project.composePath
    );
    if (existingIndex >= 0) {
      this.data.projects[existingIndex] = { ...this.data.projects[existingIndex], ...project };
    } else {
      this.data.projects.push(project);
    }
    this.save();
    return project;
  }

  removeProject(id) {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.save();
    return true;
  }

  exportConfig() {
    return JSON.stringify(this.data, null, 2);
  }

  importConfig(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.projects)) {
        throw new Error('导入的配置文件格式不正确，缺少 projects 列表');
      }
      for (const p of parsed.projects) {
        if (p && p.composePath) {
          const idx = this.data.projects.findIndex((item) => item.id === p.id || item.composePath === p.composePath);
          if (idx >= 0) {
            this.data.projects[idx] = { ...this.data.projects[idx], ...p };
          } else {
            this.data.projects.push(p);
          }
        }
      }
      if (parsed.settings) {
        this.data.settings = { ...this.data.settings, ...parsed.settings };
      }
      this.save();
      return { success: true, count: this.data.projects.length };
    } catch (err) {
      throw new Error(`配置文件导入解析失败: ${err.message}`);
    }
  }
}

export const store = new ConfigStore();
export { ConfigStore };
