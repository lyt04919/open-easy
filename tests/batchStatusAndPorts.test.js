import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { checkPortsConflict } from '../electron/services/portDiagnostics.js';
import {
  getBatchProjectsRuntimeStatus,
  inspectComposeFile,
  saveProjectEnv,
  getProjectEnv
} from '../electron/services/orbManager.js';

test('checkPortsConflict detects listening server in batch mode', async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const livePort = server.address().port;
  const deadPort = 49997;

  try {
    const results = await checkPortsConflict([livePort, deadPort]);
    assert.ok(typeof results === 'object');
    assert.strictEqual(results[livePort]?.occupied, true, 'Live port should be detected as occupied');
    assert.strictEqual(results[deadPort]?.occupied, false, 'Dead port should be unoccupied');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('checkPortsConflict handles empty and invalid inputs gracefully', async () => {
  const emptyRes = await checkPortsConflict([]);
  assert.deepStrictEqual(emptyRes, {});

  const invalidRes = await checkPortsConflict(['invalid', null, 0]);
  assert.deepStrictEqual(invalidRes, {});
});

test('getBatchProjectsRuntimeStatus handles empty array and non-existent files', async () => {
  const emptyRes = await getBatchProjectsRuntimeStatus([]);
  assert.deepStrictEqual(emptyRes, {});

  const missingRes = await getBatchProjectsRuntimeStatus(['/non/existent/compose.yml']);
  assert.strictEqual(missingRes['/non/existent/compose.yml']?.status, 'stopped');
  assert.deepStrictEqual(missingRes['/non/existent/compose.yml']?.containers, []);
});

test('inspectComposeFile parses custom indentations, env placeholders, and pre-parses databases', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-easy-compose-test-'));
  const envFile = path.join(tmpDir, '.env');
  fs.writeFileSync(envFile, 'DB_PASS=supersecret\nWEB_PORT=8099\n');

  const composeFile = path.join(tmpDir, 'docker-compose.yml');
  const yamlContent = `
services:
    database:
        image: postgres:15
        ports:
            - "5432:5432"
        environment:
            POSTGRES_USER: custom_user
            POSTGRES_PASSWORD: \${DB_PASS:-defaultpass}
            POSTGRES_DB: analytics
    frontend:
        image: nginx:alpine
        ports:
            - "127.0.0.1:\${WEB_PORT:-3000}:80"
`;
  fs.writeFileSync(composeFile, yamlContent);

  const inspected = inspectComposeFile(composeFile);
  assert.ok(inspected.hostPorts.includes(8099), 'Should resolve WEB_PORT placeholder to 8099');
  assert.ok(inspected.hostPorts.includes(5432), 'Should include postgres 5432');
  assert.strictEqual(inspected.frontendPort, 8099);

  // Check pre-parsed database info
  assert.ok(Array.isArray(inspected.databases));
  assert.strictEqual(inspected.databases.length, 1);
  const db = inspected.databases[0];
  assert.strictEqual(db.service, 'database');
  assert.strictEqual(db.type, 'postgres');
  assert.strictEqual(db.port, 5432);
  assert.strictEqual(db.user, 'custom_user');
  assert.strictEqual(db.database, 'analytics');
  assert.ok(db.uri.includes('supersecret'), 'Database URI should contain resolved DB_PASS environment value');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('saveProjectEnv sanitizes custom file names and blocks path traversal', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-easy-save-env-'));
  const composeFile = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(composeFile, 'services:\n  app:\n    image: node\n');

  // 1. Save with custom .env.local
  const res1 = await saveProjectEnv(composeFile, 'ENV_TYPE=local\n', '.env.local');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.fileName, '.env.local');
  assert.ok(fs.existsSync(path.join(tmpDir, '.env.local')));

  // 2. Reject path traversal
  await assert.rejects(
    async () => {
      await saveProjectEnv(composeFile, 'EVIL=true\n', '../../etc/passwd');
    },
    {
      message: /配置文件名必须以 .env 开头/
    }
  );

  // 3. Reject non-.env names
  await assert.rejects(
    async () => {
      await saveProjectEnv(composeFile, 'EVIL=true\n', 'config.json');
    },
    {
      message: /配置文件名必须以 .env 开头/
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
