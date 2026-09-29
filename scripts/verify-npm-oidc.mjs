import { pathToFileURL } from 'node:url';

export async function verifyNpmOidc({ env = process.env, request = fetch, log = console.log } = {}) {
  const requestUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error('GitHub OIDC is unavailable. This job requires id-token: write.');
  }

  const githubUrl = new URL(requestUrl);
  if (githubUrl.protocol !== 'https:' || !githubUrl.hostname.endsWith('.actions.githubusercontent.com')) {
    throw new Error('Unexpected GitHub OIDC request URL.');
  }
  githubUrl.searchParams.set('audience', 'npm:registry.npmjs.org');

  const options = { redirect: 'error', signal: AbortSignal.timeout(10_000) };
  const githubResponse = await request(githubUrl, {
    ...options,
    headers: { Authorization: `Bearer ${requestToken}`, Accept: 'application/json' },
  });
  if (!githubResponse.ok) {
    throw new Error(`GitHub OIDC request failed (HTTP ${githubResponse.status}).`);
  }
  const { value: identityToken } = await githubResponse.json();
  if (typeof identityToken !== 'string' || !identityToken) {
    throw new Error('GitHub did not return an OIDC identity token.');
  }

  const npmResponse = await request('https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/polychat-bridge', {
    ...options,
    method: 'POST',
    headers: { Authorization: `Bearer ${identityToken}`, Accept: 'application/json' },
  });
  if (npmResponse.status !== 201) {
    throw new Error(`npm trusted publisher exchange failed (HTTP ${npmResponse.status}).`);
  }
  const { token_type: tokenType, token } = await npmResponse.json();
  if (tokenType !== 'oidc' || typeof token !== 'string' || !token) {
    throw new Error('npm returned an invalid OIDC exchange response.');
  }
  log('npm trusted publisher exchange succeeded (HTTP 201).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyNpmOidc();
}
