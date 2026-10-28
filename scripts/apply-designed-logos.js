import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_FILE = path.join(os.homedir(), '.open-easy', 'config.json');
const LOGO_DIR = path.join(process.cwd(), 'public', 'project-logos');

const LOGO_MAP = {
  'hometown_vue': 'hometown_vue.jpg',
  'web-ai-project02': 'web-ai-project02.jpg',
  '2025-blog-public': '2025-blog-public.jpg',
  'infs605-assignment2': 'infs605-assignment2.jpg'
};

if (!fs.existsSync(CONFIG_FILE)) {
  console.error('Config file not found:', CONFIG_FILE);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

config.projects.forEach(project => {
  const fileName = LOGO_MAP[project.id];
  if (fileName) {
    const filePath = path.join(LOGO_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      project.customIcon = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      console.log(`✓ Applied custom logo for: ${project.name} (${project.id})`);
    }
  }
});

fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
console.log('✨ All project logos have been saved to ~/.open-easy/config.json!');
