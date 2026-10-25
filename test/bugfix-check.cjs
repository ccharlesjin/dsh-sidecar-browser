#!/usr/bin/env node
/**
 * BUG-02/BUG-03 regression:
 * - pointer-events:none is reported at observe time with a click target
 * - extract on a non-HTML document returns text instead of throwing
 *
 * Requires a connected AI browser tab and the DSH bridge on 32002.
 * Run: node test/bugfix-check.cjs
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const BRIDGE = 'http://127.0.0.1:32002';
const PORT = 31957;
const FIXTURES = path.join(__dirname, 'fixtures');

async function command(action, args = {}) {
  const response = await fetch(`${BRIDGE}/command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, args }),
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
    ['/pointer-none.html', ['text/html; charset=utf-8', fs.readFileSync(path.join(FIXTURES, 'pointer-none.html'), 'utf8')]],
    ['/orders.html', ['text/html; charset=utf-8', fs.readFileSync(path.join(FIXTURES, 'orders.html'), 'utf8')]],
    ['/plain-version.txt', ['text/plain; charset=utf-8', fs.readFileSync(path.join(FIXTURES, 'plain-version.txt'), 'utf8')]],
  ]);
  const server = http.createServer((request, response) => {
    const hit = files.get(request.url);
    if (!hit) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    const headers = { 'content-type': hit[0] };
    if (request.url.endsWith('.txt')) {
      headers['content-security-policy'] = 'sandbox';
      headers['access-control-allow-origin'] = '*';
    }
    response.writeHead(200, headers);
    response.end(hit[1]);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const server = await startServer();
  try {
    // BUG-02: visible warning before the first click.
    await command('navigate', { url: `http://127.0.0.1:${PORT}/pointer-none.html` });
    const scoped = await command('observe', { mode: 'standard', scope: "input[type='checkbox']" });
    const pe = (scoped.elements || []).find((element) => element.name === 'pe');
    const normal = (scoped.elements || []).find((element) => element.name === 'normal');
    check('pointer-none-observed', pe?.blocked === true, `blocked=${pe?.blocked}`);
    check('pointer-none-click-target', String(pe?.blockedBy || '').startsWith('label'), `blockedBy=${pe?.blockedBy}`);
    check('normal-not-blocked', normal?.blocked !== true, `blocked=${normal?.blocked}`);

    await command('click', { target: 'label:has(input[name="pe"])' });
    const after = await command('observe', { mode: 'standard', scope: "input[type='checkbox']" });
    const peAfter = (after.elements || []).find((element) => element.name === 'pe');
    check('label-click-works', peAfter?.checked === true, `checked=${peAfter?.checked}`);

    // BUG-03: non-HTML extract must return text, not throw.
    await command('navigate', { url: `http://127.0.0.1:${PORT}/plain-version.txt` });
    const extracted = await command('extract', {
      fields: [{ name: 'ver', selector: 'body', attr: 'text' }],
    });
    check('nonhtml-extract-ok', extracted.ok === true, `ok=${extracted.ok}`);
    check('nonhtml-marked', extracted.data?.nonHtml === true, `nonHtml=${extracted.data?.nonHtml}`);
    check('nonhtml-text-returned', String(extracted.data?.text || '').includes('2.34.2'), 'contains 2.34.2');

    // Semantic query fast path: no CSS selector needed for a row lookup.
    await command('navigate', { url: `http://127.0.0.1:${PORT}/orders.html` });
    const queried = await command('extract', { query: 'ORD-0173', limit: 5 });
    const queryMatches = queried.data?.query?.matches || [];
    check('semantic-query-hit', queryMatches.length === 1, `${queryMatches.length} matches`);
    check('semantic-query-row-text', String(queryMatches[0]?.text || '').includes('ORD-0173'), queryMatches[0]?.text || '');
    check('semantic-query-target', queryMatches[0]?.tag === 'tr', `tag=${queryMatches[0]?.tag}`);
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
