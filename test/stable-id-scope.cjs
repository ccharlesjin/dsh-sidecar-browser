#!/usr/bin/env node
/**
 * BUG-01 regression: dsh-* ids must not depend on the observe scope.
 *
 * Requires a connected AI browser tab and the DSH bridge on 32002.
 * Run: node test/stable-id-scope.cjs
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const BRIDGE = 'http://127.0.0.1:32002';
const PORT = 31956;
const FIXTURE = path.join(__dirname, 'fixtures', 'stable-id-scope.html');

async function command(action, args = {}) {
  const response = await fetch(`${BRIDGE}/command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, args, sessionId: process.env.DSH_SESSION_ID || '' }),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(`${action}: ${data.error || response.status}`);
  return data;
}

function idMap(result) {
  return new Map((result.elements || []).map((element) => [element.text, element.id]));
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} - ${detail}`);
}

function startServer() {
  const html = fs.readFileSync(FIXTURE, 'utf8');
  const server = http.createServer((request, response) => {
    if (request.url === '/' || request.url === '/stable-id-scope.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    response.writeHead(404);
    response.end('not found');
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const server = await startServer();
  try {
    await command('navigate', { url: `http://127.0.0.1:${PORT}/stable-id-scope.html` });

    const full = await command('observe', { mode: 'standard', limit: 100 });
    const byLabel = await command('observe', { mode: 'standard', scope: 'label.met-form-check', limit: 100 });
    const byInput = await command('observe', { mode: 'standard', scope: "input[type='checkbox']", limit: 100 });

    const fullIds = idMap(full);
    const labelIds = idMap(byLabel);
    const inputIds = idMap(byInput);
    const names = [
      '成员需报名入会',
      '开启等候室',
      '允许成员在主持人进会前加入',
      '允许成员多端入会',
      '成员入会时静音',
      '开启文字水印',
      '自动云录制',
      '自动开启文字转写',
      '入会时开启摄像头',
      '入会时开启麦克风',
      '允许电话入会',
      '允许成员聊天',
      '允许成员共享屏幕',
    ];

    check('fixture-visible-rows', labelIds.size === names.length, `${labelIds.size} rows`);
    for (const name of names) {
      check(`id-stable:${name}`, fullIds.get(name) === labelIds.get(name) && labelIds.get(name) === inputIds.get(name),
        `${fullIds.get(name)} / ${labelIds.get(name)} / ${inputIds.get(name)}`);
    }

    const waiting = labelIds.get('开启等候室');
    const beforeHost = labelIds.get('允许成员在主持人进会前加入');
    await command('click', { target: waiting });
    const after = idMap(await command('observe', { mode: 'standard', scope: 'label.met-form-check', limit: 100 }));
    const afterElements = (await command('observe', { mode: 'standard', scope: 'label.met-form-check', limit: 100 })).elements || [];
    const checked = new Map(afterElements.map((element) => [element.text, element.checked === true]));
    check('click-hits-waiting', checked.get('开启等候室') === true, '开启等候室 checked');
    check('click-does-not-hit-neighbor', checked.get('允许成员在主持人进会前加入') === false,
      '允许成员在主持人进会前加入 remains unchecked');
    check('ids-unchanged-after-click', after.get('开启等候室') === waiting && after.get('允许成员在主持人进会前加入') === beforeHost,
      'ids stable after click');
  } finally {
    server.close();
  }

  const failed = checks.filter((item) => !item.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
