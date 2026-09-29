import assert from 'node:assert/strict';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { wrapSoopSdk } from '../server/soop-sdk';

// This fixture models the official UMD assignment and its closed-over fetch calls.
const fixture = `!function (root) {
  root.SOOP = { ChatSDK: function (clientId, clientSecret) {
    return { request: function (url, init) { return fetch(url, init); } };
  } };
}(globalThis);`;

function setup(scriptUrl = 'https://relay.example.test/api/soop/sdk.js') {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const nativeFetch = async (url: string | URL, init: RequestInit) => {
    requests.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ result: 1 }) };
  };
  const context = createContext({ URL, fetch: nativeFetch,
    document: { currentScript: { src: scriptUrl } } });
  runInContext(wrapSoopSdk(fixture), context);
  const sdk = new context.SOOP.ChatSDK('public-id', '');
  return { context, requests, sdk, nativeFetch };
}

test('SOOP wrapper relays hidden bootstrap fetch and preserves the global fetch', async () => {
  const { context, requests, sdk, nativeFetch } = setup();
  const response = await sdk.request('https://openapi.sooplive.co.kr/broad/access/chatinfo', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'access_token=user-token',
  });
  assert.equal(response.status, 200);
  assert.equal(context.fetch, nativeFetch);
  assert.deepEqual(requests, [{ url: 'https://relay.example.test/api/soop/broad/access/chatinfo', init: {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'access_token=user-token',
  } }]);
});

test('SOOP SDK wrappers retain their own configured relay base', async () => {
  const first = setup('https://first.example.test/custom/soop/sdk.js');
  const second = setup('https://second.example.test/another/soop/sdk.js?version=1');
  await first.sdk.request('https://openapi.sooplive.co.kr/broad/access/chatinfo', { method: 'POST' });
  await second.sdk.request('https://openapi.sooplive.co.kr/broad/access/chatinfo', { method: 'POST' });
  assert.equal(first.requests[0].url, 'https://first.example.test/custom/soop/broad/access/chatinfo');
  assert.equal(second.requests[0].url, 'https://second.example.test/another/soop/broad/access/chatinfo');
});

test('SOOP wrapper accepts the current official SDK .com API origin', async () => {
  const { sdk, requests } = setup();
  await sdk.request('https://openapi.sooplive.com/broad/access/chatinfo', { method: 'POST' });
  assert.equal(requests[0].url, 'https://relay.example.test/api/soop/broad/access/chatinfo');
});

test('SOOP wrapper rejects unknown SDK HTTP requests without sending them upstream', async () => {
  const { sdk, requests } = setup();
  for (const [url, method] of [
    ['https://evil.example.test/broad/access/chatinfo', 'POST'],
    ['http://openapi.sooplive.co.kr/broad/access/chatinfo', 'POST'],
    ['https://openapi.sooplive.co.kr/auth/token', 'POST'],
    ['https://openapi.sooplive.co.kr/broad/access/chatinfo', 'GET'],
    ['https://openapi.sooplive.co.kr/broad/access/chatinfo?access_token=token', 'POST'],
    ['https://user:secret@openapi.sooplive.co.kr/broad/access/chatinfo', 'POST'],
  ]) {
    await assert.rejects(async () => sdk.request(url, { method }), /Unsupported SOOP SDK HTTP request/);
  }
  assert.deepEqual(requests, []);
});
