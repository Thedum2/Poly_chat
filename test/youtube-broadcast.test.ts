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
  const url = new URL(requestUrl);
  assert.equal(url.pathname, '/youtube/v3/liveBroadcasts');
  assert.equal(url.searchParams.get('mine'), 'true');
  assert.equal(
    url.searchParams.get('part'),
    'snippet',
    'YouTube requires part to return the chat ID'
  );
});
