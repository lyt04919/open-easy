import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigStore } from '../electron/services/store.js';

test('ConfigStore updates and persists custom icon properties', () => {
  const tmpFile = path.join(os.tmpdir(), `open-easy-icon-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);

  const testProject = {
    id: 'icon_test_project',
    name: 'icon-test-project',
    composePath: '/tmp/test/docker-compose.yml',
    tech: 'Docker',
    frontendPort: 3000,
    frontendUrl: 'http://localhost:3000'
  };

  store.addProject(testProject);

  // 1. Update with custom emoji & gradient
  const updated1 = store.updateProject('icon_test_project', {
    customEmoji: '🚀',
    customBgGradient: 'linear-gradient(135deg, #10b981, #064e3b)'
  });

  assert.strictEqual(updated1.customEmoji, '🚀');
  assert.strictEqual(updated1.customBgGradient, 'linear-gradient(135deg, #10b981, #064e3b)');

  // 2. Verify persistence across new store instance
  const reloadedStore1 = new ConfigStore(tmpFile);
  const p1 = reloadedStore1.getProjects().find((p) => p.id === 'icon_test_project');
  assert.strictEqual(p1.customEmoji, '🚀');
  assert.strictEqual(p1.customBgGradient, 'linear-gradient(135deg, #10b981, #064e3b)');

  // 3. Update with custom image data URL
  const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  store.updateProject('icon_test_project', {
    customIcon: mockDataUrl,
    customEmoji: null
  });

  const reloadedStore2 = new ConfigStore(tmpFile);
  const p2 = reloadedStore2.getProjects().find((p) => p.id === 'icon_test_project');
  assert.strictEqual(p2.customIcon, mockDataUrl);
  assert.strictEqual(p2.customEmoji, null);

  // 4. Reset custom icon
  store.updateProject('icon_test_project', {
    customIcon: null,
    customEmoji: null,
    customBgGradient: null,
    customTech: null
  });

  const reloadedStore3 = new ConfigStore(tmpFile);
  const p3 = reloadedStore3.getProjects().find((p) => p.id === 'icon_test_project');
  assert.strictEqual(p3.customIcon, null);
  assert.strictEqual(p3.customEmoji, null);

  try {
    fs.unlinkSync(tmpFile);
  } catch {}
});
