import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getProjectEnv,
  saveProjectEnv,
  getProjectGitInfo,
  dumpDatabase,
  restoreDatabase,
  inspectComposeFile
} from '../electron/services/orbManager.js';


test('getProjectEnv discovers multiple .env files and loads requested file', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-multienv-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\n');

  // Create .env and .env.local
  fs.writeFileSync(path.join(tmpDir, '.env'), 'MODE=base\n');
  fs.writeFileSync(path.join(tmpDir, '.env.local'), 'MODE=local\n');

  // Default read
  const resDefault = await getProjectEnv(fakeCompose);
  assert.strictEqual(resDefault.exists, true);
  assert.ok(resDefault.availableFiles.includes('.env'));
  assert.ok(resDefault.availableFiles.includes('.env.local'));

  // Specific read
  const resLocal = await getProjectEnv(fakeCompose, '.env.local');
  assert.strictEqual(resLocal.exists, true);
  assert.strictEqual(resLocal.fileName, '.env.local');
  assert.strictEqual(resLocal.content, 'MODE=local\n');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getProjectGitInfo retrieves git branch and dirty status from repository', async () => {
  // Test current open-easy workspace repo
  const currentCompose = path.resolve('docker-compose.yml');
  // Even if docker-compose.yml doesn't exist, pass a path in this git repo
  const fakePath = path.resolve('test-compose.yml');
  const gitInfo = await getProjectGitInfo(fakePath);
  assert.ok(typeof gitInfo.branch === 'string');
  assert.ok(typeof gitInfo.dirty === 'boolean');

  // Test non-git directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-nogit-'));
  const noGitInfo = await getProjectGitInfo(path.join(tmpDir, 'docker-compose.yml'));
  assert.strictEqual(noGitInfo.branch, '');
  assert.strictEqual(noGitInfo.dirty, false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('dumpDatabase rejects non-existent compose file and unsupported database type', async () => {
  await assert.rejects(
    async () => {
      await dumpDatabase('/non/existent/docker-compose.yml', 'db', 'postgres');
    },
    /未找到项目配置文件/
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-dump-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\n');

  await assert.rejects(
    async () => {
      await dumpDatabase(fakeCompose, 'db', 'sqlite');
    },
    /暂不支持导出 sqlite 类型的数据库/
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('restoreDatabase validates input and rejects missing files or unsupported types', async () => {
  await assert.rejects(
    async () => {
      await restoreDatabase('/non/existent/docker-compose.yml', 'db', 'postgres', {}, '/fake/path.sql');
    },
    /未找到项目配置文件/
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-restore-test-'));
  const fakeCompose = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(fakeCompose, 'version: "3"\n');

  // Missing SQL file
  await assert.rejects(
    async () => {
      await restoreDatabase(fakeCompose, 'db', 'postgres', {}, '/fake/nonexistent.sql');
    },
    /SQL.*文件不存在/
  );

  // Unsupported db type
  const fakeSql = path.join(tmpDir, 'dump.sql');
  fs.writeFileSync(fakeSql, 'SELECT 1;\n');

  await assert.rejects(
    async () => {
      await restoreDatabase(fakeCompose, 'db', 'redis', {}, fakeSql);
    },
    /暂不支持还原 redis 类型的数据库/
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('inspectComposeFile prioritizes service environment over root env and includes password and jdbcUrl', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openeasy-inspectdb-test-'));
  const composePath = path.join(tmpDir, 'docker-compose.yml');
  const envPath = path.join(tmpDir, '.env');

  // Root .env has default password
  fs.writeFileSync(envPath, 'POSTGRES_PASSWORD=root_default_pass\n');

  // docker-compose.yml defines specific service environment and image
  const composeContent = `
services:
  custom-db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=service_specific_pass
      - POSTGRES_USER=myuser
      - POSTGRES_DB=testdb
`;
  fs.writeFileSync(composePath, composeContent);

  const inspected = inspectComposeFile(composePath);
  assert.ok(inspected.databases && inspected.databases.length > 0);
  const db = inspected.databases[0];
  assert.strictEqual(db.service, 'custom-db');
  assert.strictEqual(db.type, 'postgres');
  assert.strictEqual(db.user, 'myuser');
  // Service-specific env must take precedence over root .env!
  assert.strictEqual(db.password, 'service_specific_pass');
  assert.strictEqual(db.database, 'testdb');
  assert.strictEqual(db.jdbcUrl, 'jdbc:postgresql://localhost:5432/testdb');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

