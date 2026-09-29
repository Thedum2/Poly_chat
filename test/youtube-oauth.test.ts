import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { YouTubeAdapter } from '../src/adapters/youtube/YouTubeAdapter';
import { youtubeAuthStore } from '../src/store/youtubeAuthStore';

test('YouTube OAuth callback handling', async (suite) => {
  const cases = [
    { name: 'accepts a matching token callback', response: 'success', expected: 'resolved' },
    { name: 'rejects consent denial immediately', response: 'denied', expected: 'access_denied' },
    {
      name: 'handles a consent error in the query string',
      response: 'query-denied',
      expected: 'access_denied',
    },
    {
      name: 'ignores a token on the wrong path until the callback arrives',
      response: 'wrong-path',
      expected: 'resolved',
    },
    { name: 'rejects a token with missing state', response: 'missing-state', expected: 'state' },
    { name: 'rejects a token with mismatched state', response: 'wrong-state', expected: 'state' },
    {
      name: 'rejects a callback on a different origin before opening a popup',
      response: 'different-origin',
      expected: '콜백',
    },
    { name: 'reports a blocked popup', response: 'blocked', expected: '팝업' },
  ];

  for (const scenario of cases) {
    await suite.test(scenario.name, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
      t.mock.method(console, 'error', () => {});
      t.mock.method(console, 'log', () => {});
      t.mock.method(console, 'debug', () => {});
      const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
      const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
      const popup = {
        closed: false,
        location: { href: 'about:blank' },
        close() {
          this.closed = true;
        },
      };
      let openCount = 0;
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          location: { origin: 'http://localhost:3000' },
          open(url: string) {
            openCount++;
            if (scenario.response === 'blocked') return null;
            const request = new URL(url);
            const callback = new URL(request.searchParams.get('redirect_uri')!);
            const params = new URLSearchParams({ state: request.searchParams.get('state')! });
            if (scenario.response === 'denied' || scenario.response === 'query-denied')
              params.set('error', 'access_denied');
            else params.set('access_token', 'test-access-token');
            if (scenario.response === 'missing-state') params.delete('state');
            if (scenario.response === 'wrong-state') params.set('state', 'unrelated-request');
            if (scenario.response === 'query-denied') callback.search = params.toString();
            else callback.hash = params.toString();
            if (scenario.response === 'wrong-path') callback.pathname = '/unrelated';
            popup.location.href = callback.href;
            return popup;
          },
        },
      });
      Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
      youtubeAuthStore.getState().clearTokens();
      t.after(() => {
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else Reflect.deleteProperty(globalThis, 'window');
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        youtubeAuthStore.getState().clearTokens();
      });

      const adapter = new YouTubeAdapter();
      adapter.on('error', () => {});
      let result = 'pending';
      const completed = adapter
        .init({
          clientId: 'test-client-id',
          redirectUri:
            scenario.response === 'different-origin'
              ? 'http://localhost:3001/callback'
              : 'http://localhost:3000/callback',
        })
        .then(
          () => {
            result = 'resolved';
          },
          (error: Error) => {
            result = error.message;
          }
        );
      t.mock.timers.tick(500);
      await setImmediate();
      if (scenario.response === 'wrong-path') {
        assert.equal(result, 'pending');
        assert.equal(youtubeAuthStore.getState().accessToken, null);
        popup.location.href = popup.location.href.replace('/unrelated', '/callback');
        t.mock.timers.tick(500);
        await setImmediate();
      }
      assert.notEqual(result, 'pending', 'The OAuth result must settle when the callback arrives');
      assert.ok(result.includes(scenario.expected), `Unexpected OAuth result: ${result}`);
      await completed;
      if (scenario.response === 'different-origin') assert.equal(openCount, 0);
      else if (scenario.response !== 'blocked') assert.equal(popup.closed, true);
      assert.equal(
        youtubeAuthStore.getState().accessToken,
        scenario.expected === 'resolved' ? 'test-access-token' : null
      );
      t.mock.timers.tick(5 * 60 * 1000);
    });
  }
});
