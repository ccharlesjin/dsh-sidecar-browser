#!/usr/bin/env node
/**
 * Session isolation regression: a conversation must only see its own browser
 * tabs, and the bridge must never fall back to another session's active tab.
 *
 * Requires the native bridge on 32002. Run: node test/session-check.cjs
 */
'use strict';

const BRIDGE = 'http://127.0.0.1:32002';
const A = 'session-test-a';
const B = 'session-test-b';

async function post(path, body) {
  const response = await fetch(`${BRIDGE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(`${path}: ${data.error || response.status}`);
  return data;
}

async function get(path) {
  const response = await fetch(`${BRIDGE}${path}`);
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(`${path}: ${data.error || response.status}`);
  return data;
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} - ${detail}`);
}

async function main() {
  try {
    await post('/register', { clientId: 'session-test-client-a', sessionId: A, title: 'A' });
    await post('/register', { clientId: 'session-test-client-b', sessionId: B, title: 'B' });

    const onlyA = await get(`/tabs?sessionId=${encodeURIComponent(A)}`);
    const onlyB = await get(`/tabs?sessionId=${encodeURIComponent(B)}`);
    check('session-a-isolated', onlyA.tabs.length === 1 && onlyA.tabs[0].sessionId === A,
      onlyA.tabs.map((tab) => `${tab.id}:${tab.sessionId}`).join(','));
    check('session-b-isolated', onlyB.tabs.length === 1 && onlyB.tabs[0].sessionId === B,
      onlyB.tabs.map((tab) => `${tab.id}:${tab.sessionId}`).join(','));
    check('session-filter-no-leak', onlyA.tabs.every((tab) => tab.id !== 'session-test-client-b'),
      'no B client in A');
  } finally {
    await post('/unregister', { clientId: 'session-test-client-a' }).catch(() => {});
    await post('/unregister', { clientId: 'session-test-client-b' }).catch(() => {});
  }

  const failed = checks.filter((item) => !item.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
