import { copyFile } from 'node:fs/promises';

for (const name of ['youtube-stream.proto', 'LICENSE.youtube-proto']) {
  await copyFile(new URL(`../server/${name}`, import.meta.url), new URL(`../dist/server/${name}`, import.meta.url));
}
