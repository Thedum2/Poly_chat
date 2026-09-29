import assert from 'node:assert/strict';
import test from 'node:test';
import { httpClient } from '../src/api/httpClient';
import { youtubeLiveBroadcastApi } from '../src/api/modules/youtube/liveBroadcast';

test('broadcast lookup requests the snippet containing liveChatId', async (t) => {
  let requestUrl = '';
  const signal = new AbortController().signal;
  t.mock.method(httpClient, 'get', async (url: string, _map: unknown, config: { signal?: AbortSignal }) => {
    requestUrl = url;
    assert.equal(config.signal, signal);
    return { items: [] };
  });
  await youtubeLiveBroadcastApi.listLiveBroadcasts('test-token', { mine: true }, signal);
  const url = new URL(requestUrl, 'http://localhost');
  assert.equal(url.pathname, '/api/youtube/youtube/v3/liveBroadcasts');
  assert.equal(url.searchParams.get('mine'), 'true');
  assert.equal(
    url.searchParams.get('part'),
    'snippet',
    'YouTube requires part to return the chat ID'
  );
});

test('broadcast lookup can request only live broadcasts', async (t) => {
  let requestUrl = '';
  t.mock.method(httpClient, 'get', async (url: string) => {
    requestUrl = url;
    return { items: [] };
  });
  await youtubeLiveBroadcastApi.listLiveBroadcasts('test-token', { broadcastStatus: 'active' });
  const url = new URL(requestUrl, 'http://localhost');
  assert.equal(url.searchParams.get('broadcastStatus'), 'active');
  assert.equal(url.searchParams.has('mine'), false, 'YouTube rejects mine combined with broadcastStatus');
});
