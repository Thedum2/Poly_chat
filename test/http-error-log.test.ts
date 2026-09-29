import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { installLoggingInterceptor } from '../src/api/interceptors/loggingInterceptor';

for (const scenario of [
  { name: 'YouTube', url: 'https://example.invalid/channel', body: { error: { message: 'API is disabled.', errors: [{ reason: 'accessNotConfigured' }] } }, expected: ['API is disabled.', 'accessNotConfigured'] },
  { name: 'CHZZK', url: 'https://openapi.chzzk.naver.com/open/v1/channels?sessionKey=test-private-session', body: { code: 403, message: 'test-private-token' }, expected: ['403'] },
  { name: 'relay', url: 'https://my-relay.example/chzzk/open/v1/sessions?sessionKey=test-private-session', body: { code: 403, message: 'test-private-token' }, expected: ['403'] },
]) {
  test(`${scenario.name} HTTP errors log safe diagnostic text`, async (t) => {
    const logs: unknown[][] = [];
    t.mock.method(console, 'debug', (...args: unknown[]) => logs.push(args));
    t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args));
    const client = axios.create({
      adapter: async (config) => {
        throw new AxiosError('Request failed with status code 403', 'ERR_BAD_REQUEST', config,
          { privateRequest: 'not-for-logs' },
          { status: 403, statusText: 'Forbidden', headers: {}, config, data: scenario.body });
      },
    });
    installLoggingInterceptor(client);
    await assert.rejects(client.get(scenario.url, {
      headers: { Authorization: 'Bearer test-private-token', 'Client-Secret': 'test-private-secret' },
    }));
    const visibleText = logs.flat().filter((entry) => typeof entry === 'string').join(' ');
    for (const expected of scenario.expected) assert.ok(visibleText.includes(expected), `Missing visible error detail: ${expected}`);
    assert.ok(!JSON.stringify(logs).includes('test-private-token'));
    assert.ok(!JSON.stringify(logs).includes('test-private-secret'));
    assert.ok(!JSON.stringify(logs).includes('not-for-logs'));
    assert.ok(!JSON.stringify(logs).includes('test-private-session'));
    if (scenario.name === 'CHZZK') assert.ok(!JSON.stringify(logs).includes('test-private-token'));
  });
}
