import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigStore } from '../electron/services/store.js';
import { inspectComposeFile } from '../electron/services/orbManager.js';

test('ConfigStore dynamically adds and removes imported projects', () => {
  const tmpFile = path.join(os.tmpdir(), `open-easy-import-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);

  const newProject = {
    id: 'demo_microservices',
    name: 'demo-microservices',
    composePath: '/tmp/demo/docker-compose.yml',
    tech: 'Java',
    frontendPort: 8080,
    frontendUrl: 'http://localhost:8080'
  };

  // Add project
  store.addProject(newProject);
  let projects = store.getProjects();
  assert.ok(projects.some((p) => p.id === 'demo_microservices'), 'Project should be added');

  // Verify persistence
  const reloadedStore = new ConfigStore(tmpFile);
  projects = reloadedStore.getProjects();
  assert.ok(projects.some((p) => p.id === 'demo_microservices'), 'Project should persist across instances');

  // Remove project
  store.removeProject('demo_microservices');
  projects = store.getProjects();
  assert.strictEqual(projects.some((p) => p.id === 'demo_microservices'), false, 'Project should be removed');

  // Verify persistence after removal
  const reloadedStore2 = new ConfigStore(tmpFile);
  assert.strictEqual(reloadedStore2.getProjects().some((p) => p.id === 'demo_microservices'), false, 'Removed project should not reappear');

  // Clean up
  try {
    fs.unlinkSync(tmpFile);
  } catch {}
});
