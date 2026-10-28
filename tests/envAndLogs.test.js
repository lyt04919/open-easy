import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getProjectEnv, saveProjectEnv, getProjectLogs } from '../electron/services/orbManager.js';

test('getProjectEnv gracefully handles missing compose file', async () => {
  const res = await getProjectEnv('/non/existent/path/docker-compose.yml');
  assert.strictEqual(res.exists, false);
});

test('saveProjectEnv creates .env file and getProjectEnv reads it back', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-env-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\nservices:\n  app:\n    image: nginx\n');

  // Save .env
  const testEnvContent = 'PORT=8888\nDATABASE_URL=postgresql://localhost:5432/test\n';
  const saveRes = await saveProjectEnv(fakeCompose, testEnvContent);
  assert.strictEqual(saveRes.success, true);
  assert.ok(fs.existsSync(saveRes.filePath));

  // Read back
  const readRes = await getProjectEnv(fakeCompose);
  assert.strictEqual(readRes.exists, true);
  assert.strictEqual(readRes.fileName, '.env');
  assert.strictEqual(readRes.content, testEnvContent);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getProjectLogs supports optional serviceName parameter without crashing', async () => {
  const res = await getProjectLogs('/non/existent/path/docker-compose.yml', 50, 'frontend');
  assert.strictEqual(res.success, false);
});
