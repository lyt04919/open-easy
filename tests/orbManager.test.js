import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { inspectComposeFile } from '../electron/services/orbManager.js';

test('inspectComposeFile correctly parses hometown_vue compose file', () => {
  const filePath = '/Users/liyuteng/Documents/IT/Project/Hometown/Hometown_vue/docker-compose.yml';
  if (fs.existsSync(filePath)) {
    const res = inspectComposeFile(filePath);
    assert.ok(res.hostPorts.includes(8081), 'should include frontend port 8081');
    assert.strictEqual(res.tech, 'Vue', 'should identify Vue');
    assert.strictEqual(res.defaultUrl, 'http://localhost:8081');
  }
});

test('inspectComposeFile handles non-existent file gracefully', () => {
  const res = inspectComposeFile('/non/existent/path/docker-compose.yml');
  assert.strictEqual(res.services.length, 0);
  assert.strictEqual(res.defaultUrl, 'http://localhost:3000');
});
