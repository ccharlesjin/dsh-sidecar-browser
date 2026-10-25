/**
 * Multi-tab command bridge between DSH Host tools and native sidebar webviews.
 *
 * Each AI browser tab registers a clientId and owns an independent Electron
 * webview lease. The bridge routes page-level commands to one client at a time.
 * No CDP, no host API, no scripts injected by the host.
 */
const http = require('node:http');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.NATIVE_BRIDGE_PORT || 32002);
const CLIENT_TIMEOUT_MS = 25_000;
const COMMAND_TIMEOUT_MS = 35_000;

const clients = new Map();
const pending = new Map();
let activeClientId = null;

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  };
}

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...corsHeaders() });
  res.end(body);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

function isConnected(client) {
  return Boolean(client) && (client.waiter !== null || Date.now() - client.lastSeen < 15_000);
}

function connectedClients() {
  return [...clients.values()].filter(isConnected);
}

function pickActiveId() {
  if (activeClientId !== null && isConnected(clients.get(activeClientId))) return activeClientId;
  const first = connectedClients()[0];
  activeClientId = first ? first.id : null;
  return activeClientId;
}

function pickSessionId(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null;
  const matches = connectedClients().filter((client) => client.sessionId === sessionId);
  if (matches.length === 0) return null;
  const active = matches.find((client) => client.id === activeClientId);
  return (active || matches[matches.length - 1]).id;
}

function flush(client) {
  if (!client || client.queue.length === 0 || client.waiter === null) return;
  const command = client.queue.shift();
  const waiter = client.waiter;
  client.waiter = null;
  clearTimeout(waiter.timer);
  sendJson(waiter.res, 200, command);
  waiter.resolve?.();
}

function clientState(client) {
  return {
    id: client.id,
    title: client.title || 'AI 浏览器',
    url: client.url || '',
    sessionId: client.sessionId || '',
    active: client.id === activeClientId,
    takeover: client.takeover === true,
    connected: isConnected(client),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      connected: connectedClients().length,
      active: pickActiveId(),
      clients: connectedClients().map(clientState),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/tabs') {
    const sessionId = String(url.searchParams.get('sessionId') || '');
    const visible = sessionId
      ? [...clients.values()].filter((client) => client.sessionId === sessionId)
      : [...clients.values()];
    sendJson(res, 200, {
      ok: true,
      tabs: visible.map(clientState),
      active: sessionId ? pickSessionId(sessionId) : pickActiveId(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/register') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const id = String(body.clientId || '');
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'clientId is required' });
        return;
      }
      let client = clients.get(id);
      if (!client) {
        client = {
          id,
          title: 'AI 浏览器',
          url: '',
          sessionId: '',
          takeover: false,
          lastSeen: Date.now(),
          waiter: null,
          queue: [],
        };
        clients.set(id, client);
      }
      client.lastSeen = Date.now();
      if (typeof body.title === 'string' && body.title.length > 0) client.title = body.title;
      if (typeof body.sessionId === 'string') client.sessionId = body.sessionId;
      activeClientId = id;
      sendJson(res, 200, { ok: true, active: activeClientId });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/unregister') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const id = String(body.clientId || '');
      clients.delete(id);
      if (activeClientId === id) {
        activeClientId = null;
        pickActiveId();
      }
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/activate') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const id = String(body.clientId || '');
      if (!isConnected(clients.get(id))) {
        sendJson(res, 404, { ok: false, error: 'client is not connected' });
        return;
      }
      activeClientId = id;
      sendJson(res, 200, { ok: true, active: activeClientId });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/next') {
    const id = String(url.searchParams.get('clientId') || '');
    const sessionId = String(url.searchParams.get('sessionId') || '');
    let client = clients.get(id);
    if (!client) {
      // A bridge restart drops the HTTP long-poll; the tab keeps polling with
      // the same clientId, so re-adopt it instead of making the tab disappear.
      client = {
        id,
        title: 'AI 浏览器',
        url: '',
        sessionId: '',
        takeover: false,
        lastSeen: Date.now(),
        waiter: null,
        queue: [],
      };
      clients.set(id, client);
    }
    client.lastSeen = Date.now();
    if (sessionId) client.sessionId = sessionId;
    if (client.queue.length > 0) {
      sendJson(res, 200, client.queue.shift());
      return;
    }
    await new Promise((resolve) => {
      const waiter = { res, timer: null, resolve };
      client.waiter = waiter;
      const timer = setTimeout(() => {
        if (client.waiter === waiter) client.waiter = null;
        if (!res.writableEnded) {
          res.writeHead(204, corsHeaders());
          res.end();
        }
        resolve();
      }, CLIENT_TIMEOUT_MS);
      waiter.timer = timer;
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/result') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const entry = pending.get(body.id);
      if (!entry) {
        sendJson(res, 404, { ok: false, error: 'unknown command id' });
        return;
      }
      pending.delete(body.id);
      clearTimeout(entry.timer);
      const client = clients.get(entry.clientId);
      if (client) {
        client.lastSeen = Date.now();
        if (typeof body.url === 'string') client.url = body.url;
        if (typeof body.title === 'string' && body.title.length > 0) client.title = body.title;
      }
      entry.resolve(body);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/takeover') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const id = String(body.clientId || activeClientId || '');
      const client = clients.get(id);
      if (!client) {
        sendJson(res, 404, { ok: false, error: 'client is not connected' });
        return;
      }
      client.takeover = body.enabled === true;
      sendJson(res, 200, { ok: true, takeover: client.takeover, clientId: id });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/command') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const action = String(body.action || '');
      if (!['navigate', 'click', 'type', 'hover', 'highlight', 'observe', 'extract', 'console', 'network', 'downloads', 'upload', 'drop', 'screenshot', 'act', 'read', 'back', 'reload', 'new_tab'].includes(action)) {
        sendJson(res, 400, { ok: false, error: `unsupported action: ${action}` });
        return;
      }

      const requested = String(body.clientId || body.args?.tab || '');
      const sessionId = String(body.sessionId || '');
      let targetId;
      if (requested) {
        targetId = requested;
      } else if (sessionId) {
        targetId = pickSessionId(sessionId);
        if (!targetId) {
          sendJson(res, 503, {
            ok: false,
            code: 'NO_SESSION_TAB',
            error: '当前会话还没有已连接的 AI 浏览器标签；请先在这个对话里打开右侧 AI 浏览器',
          });
          return;
        }
      } else {
        targetId = pickActiveId();
      }
      const client = clients.get(targetId);
      if (!isConnected(client)) {
        sendJson(res, 503, { ok: false, error: requested ? `AI 浏览器标签 ${requested} 未连接` : '没有已连接的 AI 浏览器标签' });
        return;
      }
      if (client.takeover && !['read', 'observe', 'extract', 'console', 'network', 'downloads', 'screenshot'].includes(action)) {
        sendJson(res, 409, { ok: false, error: '用户已接管 AI 浏览器，AI 操作暂停', clientId: targetId });
        return;
      }

      const id = randomUUID();
      const command = { id, clientId: targetId, action, args: body.args || {} };
      const result = new Promise((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          resolve({ ok: false, error: 'AI 浏览器操作超时', clientId: targetId });
        }, COMMAND_TIMEOUT_MS);
        pending.set(id, { resolve, timer, clientId: targetId });
      });
      client.queue.push(command);
      flush(client);
      const outcome = await result;
      if (!outcome.ok) {
        sendJson(res, 500, outcome);
        return;
      }
      sendJson(res, 200, { ...outcome, clientId: targetId, takeover: client.takeover === true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI browser bridge: http://127.0.0.1:${PORT}`);
});
