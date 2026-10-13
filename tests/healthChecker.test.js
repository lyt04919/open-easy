import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { waitForReady } from '../electron/services/healthChecker.js';

test('waitForReady successfully detects HTTP server ready', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await waitForReady(`http://127.0.0.1:${port}`, 3000, 100);
    assert.strictEqual(res.ready, true, 'Should detect server is ready');
    assert.ok(res.durationMs < 2000, 'Should detect quickly');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('waitForReady times out on dead address', async () => {
  const res = await waitForReady('http://127.0.0.1:49998', 800, 100);
  assert.strictEqual(res.ready, false);
});
