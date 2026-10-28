import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { inspectComposeFile, getProjectLogs } from '../electron/services/orbManager.js';

test('inspectComposeFile correctly parses hometown_vue compose file and uses mtime cache', () => {
  const filePath = '/Users/liyuteng/Documents/IT/Project/Hometown/Hometown_vue/docker-compose.yml';
  if (fs.existsSync(filePath)) {
    const res1 = inspectComposeFile(filePath);
    const res2 = inspectComposeFile(filePath);
    assert.strictEqual(res1, res2, 'consecutive calls should return cached object reference');
    assert.ok(res1.hostPorts.includes(8081), 'should include frontend port 8081');
    assert.strictEqual(res1.tech, 'Vue', 'should identify Vue');
    assert.strictEqual(res1.frontendPort, 8081);
    assert.strictEqual(res1.defaultUrl, 'http://localhost:8081');
  }
});

test('getProjectLogs handles non-existent file gracefully', async () => {
  const res = await getProjectLogs('/non/existent/path/docker-compose.yml');
  assert.strictEqual(res.success, false);
});

test('inspectComposeFile prioritizes frontend over backend/adminer in multi-service projects', () => {
  const tliasPath = '/Users/liyuteng/Documents/IT/Learning/AI+JavaWeb/web-ai-project02/docker-compose.yml';
  if (fs.existsSync(tliasPath)) {
    const res = inspectComposeFile(tliasPath);
    assert.strictEqual(res.frontendPort, 90, 'should pick frontend port 90 instead of backend 8080');
    assert.strictEqual(res.defaultUrl, 'http://localhost:90');
  }

  const infsPath = '/Users/liyuteng/Downloads/INFS605-assignment2-main/docker-compose.yml';
  if (fs.existsSync(infsPath)) {
    const res = inspectComposeFile(infsPath);
    assert.strictEqual(res.frontendPort, 3000, 'should pick frontend port 3000 instead of adminer 9090');
    assert.strictEqual(res.defaultUrl, 'http://localhost:3000');
  }
});

test('inspectComposeFile handles non-existent file gracefully', () => {
  const res = inspectComposeFile('/non/existent/path/docker-compose.yml');
  assert.strictEqual(res.services.length, 0);
  assert.strictEqual(res.defaultUrl, 'http://localhost:3000');
});
