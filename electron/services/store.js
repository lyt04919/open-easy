import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.open-easy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default built-in projects discovered on user system
const DEFAULT_PROJECTS = [
  {
    id: 'hometown_vue',
    name: 'Hometown_vue',
    composePath: '/Users/liyuteng/Documents/IT/Project/Hometown/Hometown_vue/docker-compose.yml',
    tech: 'Vue',
    frontendPort: 8081,
    frontendUrl: 'http://localhost:8081',
    description: '前后端分离家乡旅游文化平台 (Vue + Spring Boot)'
  },
  {
    id: 'web-ai-project02',
    name: 'web-ai-project02',
    composePath: '/Users/liyuteng/Documents/IT/Learning/AI+JavaWeb/web-ai-project02/docker-compose.yml',
    tech: 'Java',
    frontendPort: 90,
    frontendUrl: 'http://localhost:90',
    description: 'TLIAS 智能教学管理平台'
  },
  {
    id: '2025-blog-public',
    name: '2025-blog-public',
    composePath: '/Users/liyuteng/Documents/IT/Project/2025-blog-public/docker-compose.yml',
    tech: 'Next',
    frontendPort: 2025,
    frontendUrl: 'http://localhost:2025',
    description: '个人技术博客与知识库 (Next.js 14)'
  },
  {
    id: 'infs605-assignment2',
    name: 'INFS605-Ass2',
    composePath: '/Users/liyuteng/Downloads/INFS605-assignment2-main/docker-compose.yml',
    tech: 'Python',
    frontendPort: 9090,
    frontendUrl: 'http://localhost:9090',
    description: '企业微服务数据分析平台 (Adminer & Microservices)'
  }
];

class ConfigStore {
  constructor(filePath = CONFIG_FILE) {
    this.filePath = filePath;
    this.data = {
      projects: [...DEFAULT_PROJECTS],
      settings: {
        preferredEditor: 'code',
        autoLaunchBrowser: true
      }
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.projects && Array.isArray(parsed.projects)) {
          // Merge default projects if missing
          const existingIds = new Set(parsed.projects.map((p) => p.id));
          for (const def of DEFAULT_PROJECTS) {
            if (!existingIds.has(def.id) && fs.existsSync(def.composePath)) {
              parsed.projects.push(def);
            }
          }
          this.data = parsed;
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
    return this.data.settings || { preferredEditor: 'code', autoLaunchBrowser: true };
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

  addProject(project) {
    const existing = this.data.projects.find((p) => p.id === project.id || p.composePath === project.composePath);
    if (!existing) {
      this.data.projects.push(project);
      this.save();
    }
    return project;
  }

  removeProject(id) {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.save();
    return true;
  }
}

export const store = new ConfigStore();
export { ConfigStore };
