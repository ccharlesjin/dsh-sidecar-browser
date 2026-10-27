#!/usr/bin/env node
/** target="_blank" / window.open regression: open in the current browser tab. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const BRIDGE = 'http://127.0.0.1:32002';
const PORT = 31958;
const FIXTURES = path.join(__dirname, 'fixtures');

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

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} - ${detail}`);
}

function startServer() {
  const files = new Map([
    ['/target-source.html', fs.readFileSync(path.join(FIXTURES, 'target-source.html'))],
    ['/target-dest.html', fs.readFileSync(path.join(FIXTURES, 'target-dest.html'))],
  ]);
  const server = http.createServer((request, response) => {
    const body = files.get(request.url);
    if (!body) { response.writeHead(404); response.end('not found'); return; }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function waitForUrl(needle) {
  const deadline = Date.now() + 5000;
  let last;
  while (Date.now() < deadline) {
    last = await command('observe', { mode: 'minimal' });
    if (String(last.url || '').includes(needle)) return last;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return last;
}

async function main() {
  const server = await startServer();
  try {
    await command('navigate', { url: `http://127.0.0.1:${PORT}/target-source.html` });
    await command('click', { target: '#blank-link' });
    const afterLink = await waitForUrl('target-dest.html');
    check('blank-link-same-tab', String(afterLink.url || '').includes('target-dest.html'), afterLink.url || '');

    await command('navigate', { url: `http://127.0.0.1:${PORT}/target-source.html` });
    await command('click', { target: '#blank-submit' });
    const afterForm = await waitForUrl('target-dest.html');
    check('blank-form-same-tab', String(afterForm.url || '').includes('target-dest.html'), afterForm.url || '');
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
