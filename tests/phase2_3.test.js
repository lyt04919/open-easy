import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigStore } from '../electron/services/store.js';
import { ansiToHtml } from '../src/utils/ansiFormatter.js';
import {
  startService,
  stopService,
  restartService,
  startMiddlewareServices,
  inspectComposeFile
} from '../electron/services/orbManager.js';

test('ansiToHtml sanitizes HTML and parses ANSI color codes', () => {
  // Test safety against XSS
  const rawHtml = '<script>alert("xss")</script> & "hello"';
  const sanitized = ansiToHtml(rawHtml);
  assert.ok(!sanitized.includes('<script>'), 'Raw script tags must be escaped');
  assert.ok(sanitized.includes('&lt;script&gt;'));
  assert.ok(sanitized.includes('&amp;'));

  // Test standard ANSI color translation
  const redText = '\u001b[31mError message\u001b[0m normal';
  const htmlRed = ansiToHtml(redText);
  assert.ok(htmlRed.includes('color:#f87171'), 'ANSI 31 must map to red color');
  assert.ok(htmlRed.includes('Error message'));
  assert.ok(htmlRed.includes('</span> normal'));

  // Test compound styles (bold + blue)
  const boldBlue = '\u001b[1;34m[INFO]\u001b[0m';
  const htmlBoldBlue = ansiToHtml(boldBlue);
  assert.ok(htmlBoldBlue.includes('font-weight:600'));
  assert.ok(htmlBoldBlue.includes('color:#60a5fa'));

  // Test edge cases
  assert.strictEqual(ansiToHtml(''), '');
  assert.strictEqual(ansiToHtml(null), '');
  assert.strictEqual(ansiToHtml(undefined), '');
});

test('startService, stopService, restartService validate parameters and file existence', async () => {
  // Non-existent file
  await assert.rejects(
    async () => {
      await startService('/non/existent/docker-compose.yml', 'web');
    },
    /未找到项目配置文件/
  );

  // Empty service name
  const tmpCompose = path.join(os.tmpdir(), `compose-${Date.now()}.yml`);
  fs.writeFileSync(tmpCompose, 'services:\n  app:\n    image: nginx\n');

  try {
    await assert.rejects(
      async () => {
        await startService(tmpCompose, '');
      },
      /服务名不能为空/
    );

    await assert.rejects(
      async () => {
        await stopService(tmpCompose, null);
      },
      /服务名不能为空/
    );

    await assert.rejects(
      async () => {
        await restartService(tmpCompose, '   ');
      },
      /无效的服务名/
    );

    // startMiddlewareServices with no middleware
    await assert.rejects(
      async () => {
        await startMiddlewareServices(tmpCompose);
      },
      /未检测到可用的数据库或缓存等中间件微服务/
    );
  } finally {
    try {
      fs.unlinkSync(tmpCompose);
    } catch {}
  }
});

test('ConfigStore updates and persists terminal/IDE settings and project tags', () => {
  const tmpFile = path.join(os.tmpdir(), `store-phase23-test-${Date.now()}.json`);
  const store = new ConfigStore(tmpFile);

  // Verify initial settings defaults
  const settings = store.getSettings();
  assert.strictEqual(settings.preferredEditor, 'code');
  assert.strictEqual(settings.preferredTerminal, 'terminal');
  assert.strictEqual(settings.preferredShell, 'sh');
  assert.strictEqual(settings.themeMode, 'system');
  assert.strictEqual(settings.defaultView, 'bento');
  assert.strictEqual(settings.autoLaunchBrowser, true);
  assert.strictEqual(settings.autoHealOrbStack, true);
  assert.strictEqual(settings.crashNotifications, true);
  assert.strictEqual(settings.pollInterval, 5000);

  // Update settings to Ghostty, Cursor, bash shell, dark theme, launchpad view
  store.updateSettings({
    preferredEditor: 'cursor',
    preferredTerminal: 'ghostty',
    preferredShell: 'bash',
    themeMode: 'dark',
    defaultView: 'launchpad',
    autoLaunchBrowser: false,
    autoHealOrbStack: false,
    crashNotifications: false,
    pollInterval: 3000
  });

  // Verify settings persisted
  const store2 = new ConfigStore(tmpFile);
  const updatedSettings = store2.getSettings();
  assert.strictEqual(updatedSettings.preferredEditor, 'cursor');
  assert.strictEqual(updatedSettings.preferredTerminal, 'ghostty');
  assert.strictEqual(updatedSettings.preferredShell, 'bash');
  assert.strictEqual(updatedSettings.themeMode, 'dark');
  assert.strictEqual(updatedSettings.defaultView, 'launchpad');
  assert.strictEqual(updatedSettings.autoLaunchBrowser, false);
  assert.strictEqual(updatedSettings.autoHealOrbStack, false);
  assert.strictEqual(updatedSettings.crashNotifications, false);
  assert.strictEqual(updatedSettings.pollInterval, 3000);

  // Add project and update tags
  store2.addProject({
    id: 'proj-tags-test',
    name: 'Tag Project',
    composePath: '/tmp/docker-compose.yml',
    tech: 'React'
  });

  store2.updateProjectTags('proj-tags-test', ['工作', '微服务', '核心']);

  const store3 = new ConfigStore(tmpFile);
  const proj = store3.getProjects().find((p) => p.id === 'proj-tags-test');
  assert.ok(proj);
  assert.deepStrictEqual(proj.tags, ['工作', '微服务', '核心']);

  try {
    fs.unlinkSync(tmpFile);
  } catch {}
});

test('inspectComposeFile derives orbProjectName and orbLocalUrl for services', () => {
  const testDir = path.join(os.tmpdir(), `my-backend-app-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const composePath = path.join(testDir, 'docker-compose.yml');

  const content = `
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  db:
    image: postgres:15
    ports:
      - "5432:5432"
`;
  fs.writeFileSync(composePath, content, 'utf8');

  try {
    const inspected = inspectComposeFile(composePath);
    assert.ok(inspected.serviceNames.length > 0);
    assert.ok(inspected.orbProjectName.startsWith('my-backend-app-'));
    assert.strictEqual(
      inspected.orbLocalUrl,
      `https://web.${inspected.orbProjectName}.orb.local`
    );

    const webSvc = inspected.parsedServices.find((s) => s.name === 'web');
    assert.ok(webSvc);
    assert.strictEqual(
      webSvc.orbLocalUrl,
      `https://web.${inspected.orbProjectName}.orb.local`
    );

    const dbSvc = inspected.parsedServices.find((s) => s.name === 'db');
    assert.ok(dbSvc);
    assert.strictEqual(
      dbSvc.orbLocalUrl,
      `https://db.${inspected.orbProjectName}.orb.local`
    );
  } finally {
    try {
      fs.unlinkSync(composePath);
      fs.rmdirSync(testDir);
    } catch {}
  }
});
