import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { installLoggingInterceptor } from '../src/api/interceptors/loggingInterceptor';

for (const scenario of [
  { name: 'YouTube', body: { error: { message: 'API is disabled.', errors: [{ reason: 'accessNotConfigured' }] } }, expected: ['API is disabled.', 'accessNotConfigured'] },
  { name: 'CHZZK', body: { code: 403, message: 'FORBIDDEN' }, expected: ['FORBIDDEN'] },
]) {
  test(`${scenario.name} HTTP errors log the provider reason as visible text`, async (t) => {
    const logs: unknown[][] = [];
    t.mock.method(console, 'debug', () => {});
    t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args));
    const client = axios.create({
      adapter: async (config) => {
        throw new AxiosError('Request failed with status code 403', 'ERR_BAD_REQUEST', config,
          { privateRequest: 'not-for-logs' },
          { status: 403, statusText: 'Forbidden', headers: {}, config, data: scenario.body });
      },
    });
    installLoggingInterceptor(client);
    await assert.rejects(client.get('https://example.invalid/channel', {
      headers: { Authorization: 'Bearer test-private-token', 'Client-Secret': 'test-private-secret' },
    }));
    const visibleText = logs.flat().filter((entry) => typeof entry === 'string').join(' ');
    for (const expected of scenario.expected) assert.ok(visibleText.includes(expected), `Missing visible error detail: ${expected}`);
    assert.ok(!JSON.stringify(logs).includes('test-private-token'));
    assert.ok(!JSON.stringify(logs).includes('test-private-secret'));
    assert.ok(!JSON.stringify(logs).includes('not-for-logs'));
  });
}
