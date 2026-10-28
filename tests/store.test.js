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
  assert.strictEqual(projects.length, 0, 'Initial store should start empty without hardcoded projects');

  // Add test project
  store.addProject({
    id: 'hometown_vue',
    name: 'Hometown_vue',
    composePath: '/fake/path/docker-compose.yml',
    tech: 'Vue',
    frontendPort: 8081,
    frontendUrl: 'http://localhost:8081'
  });

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

test('ConfigStore exports valid JSON and imports with merging', () => {
  const tmpFile = path.join(os.tmpdir(), `open-easy-export-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);
  store.addProject({
    id: 'hometown_vue',
    name: 'Hometown_vue',
    composePath: '/fake/path/docker-compose.yml',
    tech: 'Vue',
    frontendPort: 8081,
    frontendUrl: 'http://localhost:8081'
  });

  // Set a memo and a custom URL
  store.updateProject('hometown_vue', { memo: 'Admin: root / 123456', frontendUrl: 'http://localhost:9999' });

  const exported = store.exportConfig();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.ok(Array.isArray(parsed.projects));
  const hometown = parsed.projects.find((p) => p.id === 'hometown_vue');
  assert.strictEqual(hometown.memo, 'Admin: root / 123456');

  // Test import into another fresh store
  const tmpFile2 = path.join(os.tmpdir(), `open-easy-import-test-${Date.now()}.json`);
  const store2 = new ConfigStore(tmpFile2);

  const res = store2.importConfig(exported);
  assert.strictEqual(res.success, true);
  const importedHometown = store2.getProjects().find((p) => p.id === 'hometown_vue');
  assert.strictEqual(importedHometown.memo, 'Admin: root / 123456');
  assert.strictEqual(importedHometown.frontendUrl, 'http://localhost:9999');

  try {
    fs.unlinkSync(tmpFile);
    fs.unlinkSync(tmpFile2);
  } catch {}
});

