import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('official bootstrap command creates the first owner and its audit event', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'backend/cli.ts', 'bootstrap'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', LOCAL_DATABASE_PATH: ':memory:', BOOTSTRAP_EMAIL: 'bootstrap-test@example.test', BOOTSTRAP_PASSWORD: 'Bootstrap-Test-Only-2026!' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Super Admin created/);
});
