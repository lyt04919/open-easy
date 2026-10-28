import test from 'node:test';
import assert from 'node:assert';
import { execInTerminal, execDbShellInTerminal, buildDbShellCommand } from '../electron/services/editorOpener.js';
import { getProjectResourceUsage } from '../electron/services/orbManager.js';

test('execInTerminal throws when containerName is empty', async () => {
  await assert.rejects(
    async () => {
      await execInTerminal('');
    },
    {
      message: /容器名称不能为空/
    }
  );
});

test('execDbShellInTerminal throws when containerName is empty', async () => {
  await assert.rejects(
    async () => {
      await execDbShellInTerminal('');
    },
    {
      message: /容器名称不能为空/
    }
  );
});

test('buildDbShellCommand generates passwordless CLI commands for postgres, mysql, redis, mongo', () => {
  // Postgres
  const pgCmd = buildDbShellCommand('myapp_db_1', {
    type: 'postgres',
    user: 'appuser',
    password: 'secretpassword',
    database: 'production_db'
  });
  assert.strictEqual(
    pgCmd,
    "docker exec -it -e PGPASSWORD='secretpassword' myapp_db_1 psql -U appuser -d production_db"
  );

  // MySQL
  const mysqlCmd = buildDbShellCommand('myapp_mysql_1', {
    type: 'mysql',
    user: 'root',
    password: 'myrootpassword',
    database: 'shop'
  });
  assert.strictEqual(
    mysqlCmd,
    "docker exec -it myapp_mysql_1 mysql -u root -p'myrootpassword' shop"
  );

  // Redis with password
  const redisCmd = buildDbShellCommand('myapp_redis_1', {
    type: 'redis',
    password: 'redisauthpass'
  });
  assert.strictEqual(
    redisCmd,
    "docker exec -it myapp_redis_1 redis-cli -a 'redisauthpass'"
  );

  // Redis without password
  const redisNoAuthCmd = buildDbShellCommand('myapp_redis_1', {
    type: 'redis'
  });
  assert.strictEqual(
    redisNoAuthCmd,
    'docker exec -it myapp_redis_1 redis-cli'
  );

  // MongoDB
  const mongoCmd = buildDbShellCommand('myapp_mongo_1', {
    type: 'mongo'
  });
  assert.strictEqual(
    mongoCmd,
    'docker exec -it myapp_mongo_1 mongosh'
  );
});


test('getProjectResourceUsage returns zero stats for non-existent file', async () => {
  const res = await getProjectResourceUsage('/non/existent/docker-compose.yml');
  assert.strictEqual(res.running, false);
  assert.strictEqual(res.totalCpu, '0%');
  assert.strictEqual(res.totalMemMB, 0);
  assert.deepStrictEqual(res.containerStats, []);
});

test('ConfigStore updates and persists pinned property on projects', async () => {
  const { ConfigStore } = await import('../electron/services/store.js');
  const tempPath = `/tmp/test-config-pinned-${Date.now()}.json`;
  const tempStore = new ConfigStore(tempPath);

  tempStore.addProject({
    id: 'test_pinned_project',
    name: 'Test Pinned',
    composePath: '/fake/docker-compose.yml',
    tech: 'Docker',
    frontendPort: 3000
  });

  const targetId = 'test_pinned_project';
  tempStore.updateProject(targetId, { pinned: true });
  const updatedStore = new ConfigStore(tempPath);
  const reloaded = updatedStore.getProjects().find((p) => p.id === targetId);

  assert.strictEqual(reloaded.pinned, true, 'reloaded project should have pinned: true');

  // Clean up
  const fs = await import('node:fs');
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
});
