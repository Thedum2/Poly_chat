/** Wrap the official browser SDK so its private HTTP bootstrap uses our relay. */
export function wrapSoopSdk(source: string): string {
    // The SDK keeps its HTTP helper in a closure and has no transport option.
    // A lexical fetch binding preserves its WebSocket implementation without
    // modifying window.fetch or requiring eval/unsafe-eval in the browser.
    return `(function () {
  var scriptUrl = new URL(document.currentScript.src);
  if (!scriptUrl.pathname.endsWith('/sdk.js')) throw new Error('Invalid SOOP SDK relay URL');
  var relayBase = scriptUrl.origin + scriptUrl.pathname.slice(0, -'/sdk.js'.length);
  var nativeFetch = globalThis.fetch.bind(globalThis);
  async function relayFetch(input, init) {
    var url = new URL(typeof input === 'string' ? input : input.url || input.href);
    var method = String(init && init.method || 'GET').toUpperCase();
    if (!['https://openapi.sooplive.co.kr', 'https://openapi.sooplive.com'].includes(url.origin) || url.username || url.password ||
        url.search || url.hash || method !== 'POST' || url.pathname !== '/broad/access/chatinfo') {
      throw new Error('Unsupported SOOP SDK HTTP request');
    }
    return nativeFetch(relayBase + url.pathname, init);
  }
  (function (fetch) {
${source}
  })(relayFetch);
})();\n`;
}
