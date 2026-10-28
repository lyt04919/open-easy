import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigStore } from '../electron/services/store.js';
import { getOrbStackDeployedProjects } from '../electron/services/orbManager.js';

test('getOrbStackDeployedProjects queries OrbStack CLI and returns structured project list', async () => {
  const projects = await getOrbStackDeployedProjects();
  assert.ok(Array.isArray(projects), 'projects should be an array');

  // If OrbStack has projects deployed on this machine, test their schema
  if (projects.length > 0) {
    const first = projects[0];
    assert.ok(first.id, 'Project must have an id');
    assert.ok(first.name, 'Project must have a name');
    assert.ok(first.composePath, 'Project must have a composePath');
    assert.ok(['running', 'stopped'].includes(first.status), 'Project status should be running or stopped');
    assert.strictEqual(typeof first.frontendPort, 'number');
    assert.ok(first.frontendUrl.startsWith('http://localhost:'), 'Project frontendUrl should be valid URL');
  }
});

test('ConfigStore seamlessly batch adds deployed projects without duplicates', () => {
  const tmpFile = path.join(os.tmpdir(), `open-easy-sync-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);
  const initialCount = store.getProjects().length;

  const mockDeployed = [
    {
      id: 'custom_ai_service_01',
      name: 'custom-ai-service-01',
      composePath: '/Users/liyuteng/Documents/AI/custom-01/docker-compose.yml',
      tech: 'Python',
      frontendPort: 8000,
      frontendUrl: 'http://localhost:8000'
    },
    {
      id: 'custom_vue_app_02',
      name: 'custom-vue-app-02',
      composePath: '/Users/liyuteng/Documents/IT/Project/custom-02/docker-compose.yml',
      tech: 'Vue',
      frontendPort: 8081,
      frontendUrl: 'http://localhost:8081'
    }
  ];

  for (const p of mockDeployed) {
    store.addProject(p);
  }

  let projects = store.getProjects();
  assert.strictEqual(projects.length, initialCount + 2, 'Should have added 2 new projects');

  // Attempt duplicate addition
  store.addProject(mockDeployed[0]);
  projects = store.getProjects();
  assert.strictEqual(projects.length, initialCount + 2, 'Should not duplicate already existing project id');

  try {
    fs.unlinkSync(tmpFile);
  } catch {}
});
