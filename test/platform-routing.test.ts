import assert from 'node:assert/strict';
import test from 'node:test';
import { platformApiUrl } from '../src/api/relay';
import { axiosInstance } from '../src/api/axiosInstance';
import { youtubeChannelApi } from '../src/api/modules/youtube/channel';
import { youtubeLiveBroadcastApi } from '../src/api/modules/youtube/liveBroadcast';
import { youtubeLiveChatApi } from '../src/api/modules/youtube/liveChat';

test('platform relay bases remain independent and reject non-HTTP destinations', () => {
  assert.equal(platformApiUrl('chzzk', '/open/v1/users/me'), '/api/chzzk/open/v1/users/me');
  assert.equal(platformApiUrl('youtube', '/chat/stream', ' https://relay.example/youtube/// '), 'https://relay.example/youtube/chat/stream');
  for (const base of ['//attacker.example', 'javascript:alert(1)', 'https://user:pass@relay.example', 'https://relay.example/?token=x']) {
    assert.throws(() => platformApiUrl('soop', '/auth/token', base));
  }
});

test('every YouTube REST operation uses its supplied relay and preserves cancellation', async (t) => {
  const requests: any[] = [];
  const original = axiosInstance.defaults.adapter;
  t.after(() => { axiosInstance.defaults.adapter = original; });
  axiosInstance.defaults.adapter = async config => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config, data: { items: [] } };
  };
  const signal = new AbortController().signal;
  await youtubeChannelApi.getChannelInfo('https://first.example/youtube');
  await youtubeLiveBroadcastApi.listLiveBroadcasts('token', { mine: true }, signal, 'https://second.example/youtube');
  await youtubeLiveChatApi.listLiveChatMessages('token', { liveChatId: 'chat', part: 'snippet' }, 'https://first.example/youtube');
  assert.deepEqual(requests.map(item => new URL(item.url).origin), ['https://first.example', 'https://second.example', 'https://first.example']);
  assert.equal(requests[1].signal, signal);
  assert.equal(requests[1].headers.get('Authorization'), 'Bearer token');
});
