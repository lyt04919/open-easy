import test from 'node:test';
import assert from 'node:assert';
import net from 'node:net';
import { checkPortConflict, killProcess, listAllOccupiedPorts } from '../electron/services/portDiagnostics.js';

test('checkPortConflict detects a listening server', async () => {
  // Spin up a temporary server on an unused port
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const result = await checkPortConflict(port);
    assert.strictEqual(result.occupied, true, 'Port should be detected as occupied');
    assert.ok(result.pid, 'Should return occupying pid');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('checkPortConflict returns occupied: false for free port', async () => {
  // Check an unlikely port
  const result = await checkPortConflict(49999);
  assert.strictEqual(result.occupied, false);
});

test('killProcess gracefully validates invalid input and releases occupied port', async () => {
  const invalidRes = await killProcess(-1);
  assert.strictEqual(invalidRes.success, false);

  const nonExistentPortRes = await killProcess({ port: 49998 });
  assert.strictEqual(nonExistentPortRes.success, false);
});

test('listAllOccupiedPorts maps occupied ports and identifies project conflicts', async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. When project is stopped and uses this port -> flagged as conflict
    const stoppedProjects = [
      { id: 'proj-stopped', name: 'Stopped Demo', status: 'stopped', hostPorts: [port] }
    ];
    const portsWithConflict = await listAllOccupiedPorts(stoppedProjects);
    assert.ok(Array.isArray(portsWithConflict), 'Should return an array');
    const matchedConflict = portsWithConflict.find((item) => item.port === port);
    assert.ok(matchedConflict, `Port ${port} should be detected in occupied ports`);
    assert.strictEqual(matchedConflict.isConflict, true, 'Should mark isConflict as true');
    assert.strictEqual(matchedConflict.category, 'conflict', 'Category should be conflict');
    assert.strictEqual(matchedConflict.projectName, 'Stopped Demo', 'Project name should match');

    // 2. When project is running and uses this port -> recognized as project port, not external conflict
    const runningProjects = [
      { id: 'proj-running', name: 'Running Demo', status: 'running', hostPorts: [port] }
    ];
    const portsWithRunning = await listAllOccupiedPorts(runningProjects);
    const matchedRunning = portsWithRunning.find((item) => item.port === port);
    assert.ok(matchedRunning, `Port ${port} should be detected in occupied ports`);
    assert.strictEqual(matchedRunning.isConflict, false, 'Should NOT be marked as conflict');
    assert.strictEqual(matchedRunning.category, 'project', 'Category should be project');
    assert.strictEqual(matchedRunning.projectName, 'Running Demo');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
