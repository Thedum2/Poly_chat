import { readFileSync } from 'node:fs';

const { name, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
  signal: AbortSignal.timeout(15_000),
});
if (response.ok) {
  throw new Error(`${name}@${version} is already published. Bump package.json and package-lock.json before releasing.`);
}
if (response.status !== 404) {
  throw new Error(`Cannot verify npm version availability (HTTP ${response.status}). Publishing is stopped.`);
}
console.log(`${name}@${version} is available for release.`);
