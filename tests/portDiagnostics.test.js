import test from 'node:test';
import assert from 'node:assert';
import net from 'node:net';
import { checkPortConflict } from '../electron/services/portDiagnostics.js';

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
