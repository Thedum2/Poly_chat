import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyNpmOidc } from '../scripts/verify-npm-oidc.mjs';

const env = {
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://pipelines.actions.githubusercontent.com/oidc?job=123',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'github-secret',
};

test('verifies npm trust and never logs either token', async () => {
  const calls = [];
  const messages = [];
  const request = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? Response.json({ value: 'identity-secret' })
      : Response.json({ token_type: 'oidc', token: 'npm-secret' }, { status: 201 });
  };

  await verifyNpmOidc({ env, request, log: message => messages.push(message) });

  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[0].url).searchParams.get('audience'), 'npm:registry.npmjs.org');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer github-secret');
  assert.equal(calls[1].url, 'https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/polychat-bridge');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer identity-secret');
  assert.deepEqual(messages, ['npm trusted publisher exchange succeeded (HTTP 201).']);
});

test('rejects an untrusted GitHub request URL before sending credentials', async () => {
  let requests = 0;
  await assert.rejects(
    verifyNpmOidc({
      env: { ...env, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://attacker.example/oidc' },
      request: async () => { requests++; },
    }),
    /Unexpected GitHub OIDC request URL/,
  );
  assert.equal(requests, 0);
});

test('reports only npm exchange status on trust failure', async () => {
  let requests = 0;
  await assert.rejects(
    verifyNpmOidc({
      env,
      request: async () => ++requests === 1
        ? Response.json({ value: 'identity-secret' })
        : Response.json({ error: 'sensitive-error-body' }, { status: 401 }),
    }),
    error => error.message === 'npm trusted publisher exchange failed (HTTP 401).',
  );
});
