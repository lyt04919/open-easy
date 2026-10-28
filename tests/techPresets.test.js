import test from 'node:test';
import assert from 'node:assert';
import { TECH_PRESETS, getTechGradient } from '../src/utils/techPresets.js';

test('TECH_PRESETS contains all 15 official tech stacks', () => {
  assert.strictEqual(TECH_PRESETS.length, 15);
  const names = TECH_PRESETS.map((p) => p.name);
  const expected = [
    'Vue', 'React', 'Next', 'Python', 'Java',
    'Spring', 'Node', 'Go', 'Rust', 'Docker',
    'Kubernetes', 'Redis', 'MySQL', 'Postgres', 'AI'
  ];
  for (const exp of expected) {
    assert.ok(names.includes(exp), `Preset list should contain ${exp}`);
  }
});

test('getTechGradient returns correct brand gradient for all tech stacks', () => {
  assert.ok(getTechGradient('Vue').includes('#42b883'));
  assert.ok(getTechGradient('React').includes('#20232a'));
  assert.ok(getTechGradient('Next').includes('#1f2937'));
  assert.ok(getTechGradient('Python').includes('#3776ab'));
  assert.ok(getTechGradient('Java').includes('#f59e0b'));
  assert.ok(getTechGradient('Spring Boot').includes('#15803d'));
  assert.ok(getTechGradient('Node.js').includes('#22c55e'));
  assert.ok(getTechGradient('Golang').includes('#0284c7'));
  assert.ok(getTechGradient('Rust').includes('#ea580c'));
  assert.ok(getTechGradient('Docker').includes('#0284c7'));
  assert.ok(getTechGradient('Kubernetes').includes('#2563eb'));
  assert.ok(getTechGradient('k8s').includes('#2563eb'));
  assert.ok(getTechGradient('Redis').includes('#dc2626'));
  assert.ok(getTechGradient('MySQL').includes('#0284c7'));
  assert.ok(getTechGradient('PostgreSQL').includes('#336791'));
  assert.ok(getTechGradient('AI').includes('#8b5cf6'));
});
