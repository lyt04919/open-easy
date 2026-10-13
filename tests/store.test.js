import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigStore } from '../electron/services/store.js';

test('ConfigStore initializes, saves and retrieves project settings', () => {
  const tmpFile = path.join(os.tmpdir(), `open-easy-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);

  const projects = store.getProjects();
  assert.ok(Array.isArray(projects));
  assert.ok(projects.length > 0);

  // Update URL
  store.updateProject('hometown_vue', { frontendUrl: 'http://localhost:8888' });
  const updated = store.getProjects().find((p) => p.id === 'hometown_vue');
  assert.strictEqual(updated.frontendUrl, 'http://localhost:8888');

  // Verify persistence
  const store2 = new ConfigStore(tmpFile);
  const reloaded = store2.getProjects().find((p) => p.id === 'hometown_vue');
  assert.strictEqual(reloaded.frontendUrl, 'http://localhost:8888');

  // Clean up
  try {
    fs.unlinkSync(tmpFile);
  } catch {}
});
