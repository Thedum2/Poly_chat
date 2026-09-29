import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import axios, { AxiosError, CanceledError } from 'axios';
import { installRetryInterceptor } from '../src/api/interceptors/retryInterceptor';

for (const duringBackoff of [false, true]) {
  test(`HTTP cancellation settles without retries ${duringBackoff ? 'during backoff' : 'during request'}`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let attempts = 0;
    const controller = new AbortController();
    const client = axios.create({ adapter: async config => {
      attempts++;
      if (duringBackoff) throw new AxiosError('network', 'ERR_NETWORK', config);
      throw new CanceledError('cancelled', config);
    } });
    installRetryInterceptor(client);
    let settled = false;
    const pending = client.get('/test', { signal: controller.signal }).catch(error => {
      assert.ok(axios.isCancel(error));
      settled = true;
    });
    await setImmediate();
    controller.abort();
    await setImmediate();
    assert.equal(settled, true);
    await pending;
    t.mock.timers.tick(60000);
    await setImmediate();
    assert.equal(attempts, 1);
  });
}
