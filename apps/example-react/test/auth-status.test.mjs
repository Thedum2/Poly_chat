import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const sourceFile = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let authHandler;
function findAuthHandler(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'handleAuth') {
    authHandler = node.initializer;
  }
  ts.forEachChild(node, findAuthHandler);
}
findAuthHandler(sourceFile);
assert.ok(authHandler, 'The demo must subscribe to authentication events');
const handlerCode = ts.transpileModule(`(${authHandler.getText(sourceFile)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function emitAuth(platform, isAuthenticated, broadcasterInfo) {
  const updates = [];
  const messages = [];
  const handleAuth = runInNewContext(handlerCode, {
    console: { log() {} },
    polyChat: { getAdapter: (name) => name === platform ? { isAuthenticated } : undefined },
    updateAdapterState: (name, update) => updates.push({ platform: name, ...update }),
    addSystemMessage: (name, content) => messages.push({ platform: name, content }),
  });
  handleAuth({ platform, broadcasterInfo });
  return { updates, messages };
}

for (const platform of ['chzzk', 'youtube']) {
  test(`${platform}: authentication remains successful when channel information is unavailable`, () => {
    const { updates, messages } = emitAuth(platform, true, null);
    assert.equal(updates.at(-1).status, 'authenticated');
    assert.equal(updates.at(-1).broadcasterInfo, null);
    assert.equal(updates.at(-1).error, '');
    assert.ok(messages.some(({ content }) => content.includes('인증 성공')));
    assert.ok(messages.every(({ content }) => !content.includes('인증에 실패')));
  });

  test(`${platform}: successful authentication includes the available channel name`, () => {
    const profile = { nickname: 'Test channel', profileImageUrl: '' };
    const { updates, messages } = emitAuth(platform, true, profile);
    assert.equal(updates.at(-1).status, 'authenticated');
    assert.equal(updates.at(-1).broadcasterInfo, profile);
    assert.ok(messages.some(({ content }) => content.includes(profile.nickname)));
  });

  test(`${platform}: an unauthenticated adapter still reports authentication failure`, () => {
    const { updates, messages } = emitAuth(platform, false, null);
    assert.equal(updates.at(-1).status, 'disconnected');
    assert.equal(updates.at(-1).broadcasterInfo, null);
    assert.ok(messages.some(({ content }) => content.includes('인증에 실패')));
    assert.ok(messages.every(({ content }) => !content.includes('인증 성공')));
  });
}
