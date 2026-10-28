import test from 'node:test';
import assert from 'node:assert';
import { detectDatabaseService, extractPort } from '../src/utils/databaseHelper.js';

test('extractPort extracts valid host ports correctly', () => {
  assert.strictEqual(extractPort('5432:5432', 0), 5432);
  assert.strictEqual(extractPort(':3306', 0), 3306);
  assert.strictEqual(extractPort('0.0.0.0:6379->6379/tcp', 0), 6379);
  assert.strictEqual(extractPort('', 27017), 27017);
});

test('detectDatabaseService identifies PostgreSQL and parses env variables', () => {
  const composeContent = `
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=student
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=university
  `;
  const db = detectDatabaseService('student-db', '5432:5432', composeContent);
  assert.strictEqual(db.isDb, true);
  assert.strictEqual(db.type, 'postgres');
  assert.strictEqual(db.port, 5432);
  assert.strictEqual(db.user, 'student');
  assert.strictEqual(db.database, 'university');
  assert.strictEqual(db.uri, 'postgresql://student:secret@localhost:5432/university');
});

test('detectDatabaseService identifies MySQL and generates standard connection URI', () => {
  const composeContent = `
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: myrootpassword
      MYSQL_DATABASE: shop
  `;
  const db = detectDatabaseService('mysql-service', '3306:3306', composeContent);
  assert.strictEqual(db.isDb, true);
  assert.strictEqual(db.type, 'mysql');
  assert.strictEqual(db.port, 3306);
  assert.strictEqual(db.uri, 'mysql://root:myrootpassword@localhost:3306/shop');
});

test('detectDatabaseService identifies Redis with optional auth', () => {
  const composeContent = `
    image: redis:alpine
    environment:
      - REDIS_PASSWORD=redispass
  `;
  const dbWithAuth = detectDatabaseService('redis-cache', '6379:6379', composeContent);
  assert.strictEqual(dbWithAuth.isDb, true);
  assert.strictEqual(dbWithAuth.type, 'redis');
  assert.strictEqual(dbWithAuth.uri, 'redis://:redispass@localhost:6379');

  const dbWithoutAuth = detectDatabaseService('redis', '6379');
  assert.strictEqual(dbWithoutAuth.uri, 'redis://localhost:6379');
});

test('detectDatabaseService identifies MongoDB', () => {
  const db = detectDatabaseService('mongo-db', '27017:27017');
  assert.strictEqual(db.isDb, true);
  assert.strictEqual(db.type, 'mongo');
  assert.strictEqual(db.uri, 'mongodb://localhost:27017');
});

test('detectDatabaseService returns isDb: false for regular services', () => {
  const res = detectDatabaseService('frontend', '3000:3000');
  assert.strictEqual(res.isDb, false);
});

test('detectDatabaseService uses OrbStack domain when host port is 0 or internal', () => {
  const composeContent = `
    image: postgres:15
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppwd
      - POSTGRES_DB=appdb
  `;
  const db = detectDatabaseService('student-db', '', composeContent, 'open-easy-proj');
  assert.strictEqual(db.isDb, true);
  assert.strictEqual(db.isOrbDirect, true);
  assert.strictEqual(db.uri, 'postgresql://appuser:apppwd@student-db.open-easy-proj.orb.local:5432/appdb');
  assert.strictEqual(db.password, 'apppwd');
  assert.strictEqual(db.jdbcUrl, 'jdbc:postgresql://student-db.open-easy-proj.orb.local:5432/appdb');
});

test('detectDatabaseService identifies database via imageName when service name is generic', () => {
  // 1. service is 'db' but image is postgres:15-alpine
  const pgDb = detectDatabaseService('db', '', '', '', 'postgres:15-alpine');
  assert.strictEqual(pgDb.isDb, true);
  assert.strictEqual(pgDb.type, 'postgres');
  assert.strictEqual(pgDb.password, 'postgres');
  assert.strictEqual(pgDb.jdbcUrl, 'jdbc:postgresql://localhost:5432/postgres');

  // 2. service is 'cache' but image is redis:7-alpine
  const redisDb = detectDatabaseService('cache', '', '', '', 'redis:7-alpine');
  assert.strictEqual(redisDb.isDb, true);
  assert.strictEqual(redisDb.type, 'redis');

  // 3. service is 'valkey-cache' but image is valkey/valkey:latest
  const valkeyDb = detectDatabaseService('cache-svc', '', '', '', 'valkey/valkey:latest');
  assert.strictEqual(valkeyDb.isDb, true);
  assert.strictEqual(valkeyDb.type, 'redis');

  // 4. service is 'backend-db' but image is mysql:8.0
  const mysqlDb = detectDatabaseService('backend-db', '3306:3306', 'MYSQL_DATABASE: testdb\nMYSQL_PASSWORD: secretpass', '', 'mysql:8.0');
  assert.strictEqual(mysqlDb.isDb, true);
  assert.strictEqual(mysqlDb.type, 'mysql');
  assert.strictEqual(mysqlDb.password, 'secretpass');
  assert.strictEqual(mysqlDb.jdbcUrl, 'jdbc:mysql://localhost:3306/testdb');

  // 5. service is 'app-data' but image is mongo:6
  const mongoDb = detectDatabaseService('app-data', '27017', '', '', 'mongo:6.0');
  assert.strictEqual(mongoDb.isDb, true);
  assert.strictEqual(mongoDb.type, 'mongo');
});

