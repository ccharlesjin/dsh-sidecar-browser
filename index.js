/**
 * Host half of the DSH side-panel browser.
 *
 * The model drives the native Electron webview in the right sidebar through
 * the narrow bridge on port 32002. No Playwright fallback remains.
 */
import { appendFile, readFile, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { get } from 'node:http';
import { mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const NATIVE_PORT = 32002;
const NATIVE_URL = `http://127.0.0.1:${NATIVE_PORT}`;
const LOG = join(HERE, 'host.log');
const RECIPES_FILE = join(HERE, 'recipes.json');
const POLICY_FILE = join(HERE, 'policy.json');
let recipes = null;
const browserWorkspace = new Map();

const DEFAULT_POLICY = {
  allowedDomains: [],
  confirmKeywords: ['delete', 'remove', 'pay', 'purchase', '删除', '支付', '购买'],
  confirmTools: [],
  uploadRoots: [],
};

async function loadPolicy() {
  try {
    const data = JSON.parse(await readFile(POLICY_FILE, 'utf8'));
    return {
      allowedDomains: Array.isArray(data.allowedDomains)
        ? data.allowedDomains.map((value) => String(value).toLowerCase()).filter(Boolean)
        : [],
      confirmKeywords: Array.isArray(data.confirmKeywords)
        ? data.confirmKeywords.map((value) => String(value)).filter(Boolean)
        : DEFAULT_POLICY.confirmKeywords.slice(),
      confirmTools: Array.isArray(data.confirmTools)
        ? data.confirmTools.map((value) => String(value)).filter(Boolean)
        : [],
      uploadRoots: Array.isArray(data.uploadRoots)
        ? data.uploadRoots.map((value) => String(value)).filter(Boolean)
        : [],
    };
  } catch {
    return {
      allowedDomains: [],
      confirmKeywords: DEFAULT_POLICY.confirmKeywords.slice(),
      confirmTools: [],
      uploadRoots: [],
    };
  }
}

function redactUrlForOutput(value) {
  const keys = 'access_token|refresh_token|id_token|token|jwt|jwt_token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|code';
  try {
    const url = new URL(String(value));
    for (const key of Array.from(url.searchParams.keys())) {
      if (new RegExp(`^(${keys})$`, 'i').test(key)) {
        url.searchParams.set(key, '***');
      }
    }
    return url.href
      .replace(new RegExp(`((?:${keys})%3D)([^%&\\s"'<>]+)`, 'gi'), '$1***')
      .replace(new RegExp(`((?:${keys})%253D)([^%&\\s"'<>]+)`, 'gi'), '$1***');
  } catch {
    return String(value || '');
  }
}

function uploadRootsForPolicy(policy) {
  const configured = Array.isArray(policy?.uploadRoots) ? policy.uploadRoots : [];
  const roots = configured.length > 0
    ? configured
    : [process.env.DSH_WORKSPACE, process.cwd()].filter(Boolean);
  return [...new Set(roots.map((value) => resolve(String(value))))];
}

function isInsideUploadRoot(filePath, roots) {
  const absolute = resolve(filePath);
  return roots.some((root) => absolute === root || absolute.startsWith(`${root}${sep}`));
}

const UPLOAD_MIME = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};

function uploadMime(filename) {
  return UPLOAD_MIME[extname(filename).toLowerCase()] || 'application/octet-stream';
}

function domainAllowed(hostname, allowedDomains) {
  if (allowedDomains.length === 0) return true;
  const host = String(hostname || '').toLowerCase();
  return allowedDomains.some((entry) => {
    const domain = entry.replace(/^\*\./, '').replace(/^\./, '');
    return entry === '*' || host === domain || host.endsWith(`.${domain}`);
  });
}

async function assertDomainAllowed(value) {
  if (!value) return;
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw new Error(`[DOMAIN_BLOCKED] 无效 URL：${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`[DOMAIN_BLOCKED] 只允许 http/https：${url.href}`);
  }
  const policy = await loadPolicy();
  if (!domainAllowed(url.hostname, policy.allowedDomains)) {
    throw new Error(`[DOMAIN_BLOCKED] 域名不在允许列表：${url.hostname}`);
  }
}

function policyView(policy) {
  return {
    allowedDomains: policy.allowedDomains,
    confirmKeywords: policy.confirmKeywords,
    confirmTools: policy.confirmTools,
    downloads: 'blocked by main process',
    popups: 'blocked by main process',
    dialogs: 'recorded and cancelled',
  };
}

const APPROVAL_TOOLS = new Set([
  'native_browser_click',
  'native_browser_type',
  'native_browser_hover',
  'native_browser_act',
  'native_browser_task',
  'native_browser_recipe',
]);

function targetText(target, snapshot) {
  const value = String(target || '');
  const base = value.replace(/@r\d+$/, '');
  if (!base.startsWith('dsh-') || !snapshot) return '';
  const element = (snapshot.elements || []).find((entry) => entry.id === base);
  return element ? element.text : '';
}

function collectSensitiveStrings(exec, snapshot, out = []) {
  const args = exec.arguments || {};
  const push = (value) => {
    if (typeof value === 'string' && value.length > 0) out.push(value);
  };
  push(args.target);
  push(args.text);
  push(args.url);
  push(args.name);
  const targetValue = targetText(args.target, snapshot);
  if (targetValue) out.push(targetValue);
  for (const key of ['actions', 'steps']) {
    const list = Array.isArray(args[key]) ? args[key] : [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      push(item.target);
      push(item.text);
      push(item.url);
      push(item.name);
      const text = targetText(item.target, snapshot);
      if (text) out.push(text);
      if (Array.isArray(item.actions)) collectSensitiveStrings({ arguments: item }, snapshot, out);
    }
  }
  return out;
}

async function sensitiveApprovalReason(exec) {
  const policy = await loadPolicy();
  if (policy.confirmTools.includes(exec.name)) {
    return `工具 ${exec.name} 被策略列为需要确认`;
  }
  if (policy.confirmKeywords.length === 0) return null;
  let snapshot = null;
  try {
    snapshot = await nativeCall('observe', { mode: 'minimal', noBaseline: true, includeConsole: false });
  } catch {
    snapshot = null;
  }
  const strings = collectSensitiveStrings(exec, snapshot);
  const haystack = strings.join('\n').toLowerCase();
  const keyword = policy.confirmKeywords.find((value) => haystack.includes(String(value).toLowerCase()));
  return keyword ? `命中敏感关键词“${keyword}”` : null;
}

export const inject = ['tools'];

function log(line) {
  appendFile(LOG, `[${new Date().toISOString()}] ${line}\n`).catch(() => {});
}

async function loadRecipes() {
  if (recipes) return recipes;
  try {
    const data = JSON.parse(await readFile(RECIPES_FILE, 'utf8'));
    recipes = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    recipes = {};
  }
  return recipes;
}

async function persistRecipes() {
  await writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2), 'utf8');
}

function recipeActionTarget(action) {
  return String(action?.target || '');
}

function describeRecipeAction(action, snapshot) {
  const target = recipeActionTarget(action);
  if (!target.startsWith('dsh-')) return { ...action };
  const element = (snapshot.elements || []).find((item) => item.id === target);
  if (!element) {
    throw new Error(`[RECIPE_TARGET_NOT_FOUND] 保存时找不到目标：${target}`);
  }
  return {
    ...action,
    descriptor: {
      tag: element.tag,
      text: element.text,
      name: element.name,
      type: element.type,
    },
  };
}

function resolveRecipeAction(action, snapshot) {
  const target = recipeActionTarget(action);
  if (!target.startsWith('dsh-')) return { ...action };
  if ((snapshot.elements || []).some((element) => element.id === target)) {
    return { ...action };
  }
  const descriptor = action.descriptor;
  if (!descriptor) {
    throw new Error(`[RECIPE_TARGET_NOT_FOUND] 目标已消失且没有语义描述：${target}`);
  }
  let candidates = (snapshot.elements || []).filter((element) =>
    element.tag === descriptor.tag
    && element.text === descriptor.text
    && (!descriptor.name || element.name === descriptor.name));
  if (candidates.length === 1) return { ...action, target: candidates[0].id };
  if (descriptor.name) {
    candidates = (snapshot.elements || []).filter((element) =>
      element.tag === descriptor.tag && element.name === descriptor.name);
    if (candidates.length === 1) return { ...action, target: candidates[0].id };
  }
  throw new Error(`[RECIPE_TARGET_AMBIGUOUS] 无法唯一解析 recipe 目标：${descriptor.text || target}`);
}

function nativePing() {
  return new Promise((resolve) => {
    const req = get({ host: '127.0.0.1', port: NATIVE_PORT, path: '/health', timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startNativeBridge() {
  const child = spawn(process.execPath, [join(HERE, 'native-bridge.cjs')], {
    cwd: HERE,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  });
  child.unref();
}

async function ensureNativeBridge() {
  if (await nativePing()) return;
  log('starting native browser bridge');
  startNativeBridge();
  for (let i = 0; i < 40; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (await nativePing()) {
      log('native browser bridge ready');
      return;
    }
  }
  throw new Error('native browser bridge failed to start on port 32002');
}

async function nativeCall(action, payload = {}) {
  if (action === 'navigate') {
    await assertDomainAllowed(payload.url);
  }
  if (action === 'act' && Array.isArray(payload.actions)) {
    for (const item of payload.actions) {
      if (item?.action === 'navigate') await assertDomainAllowed(item.url);
    }
  }
  if (action === 'click' || action === 'act') {
    const policy = await loadPolicy();
    if (policy.allowedDomains.length > 0) payload.allowedDomains = policy.allowedDomains;
  }
  await ensureNativeBridge();
  const response = await fetch(`${NATIVE_URL}/command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, args: payload }),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    const code = typeof data.code === 'string' ? `[${data.code}] ` : '';
    throw new Error(`${code}${data.error || `native browser action failed: ${action}`}`);
  }
  return {
    url: redactUrlForOutput(data.url ?? ''),
    title: data.title ?? '',
    status: data.status ?? '',
    text: data.text ?? '',
    elements: Array.isArray(data.elements) ? data.elements : [],
    ...data.clientId ? { tab: data.clientId } : {},
    ...data.takeover === true ? { takeover: true } : {},
    ...typeof data.changed === 'boolean' ? { changed: data.changed } : {},
    ...typeof data.revision === 'number' ? { revision: data.revision } : {},
    ...typeof data.unchanged === 'boolean' ? { unchanged: data.unchanged } : {},
    ...data.full === true ? { full: true } : {},
    ...data.delta && typeof data.delta === 'object' ? { delta: data.delta } : {},
    ...typeof data.mode === 'string' ? { mode: data.mode } : {},
    ...typeof data.batchOk === 'boolean' ? { batchOk: data.batchOk } : {},
    ...typeof data.failedStep === 'number' ? { failedStep: data.failedStep } : {},
    ...Array.isArray(data.steps) ? { steps: data.steps } : {},
    ...typeof data.recipe === 'string' ? { recipe: data.recipe } : {},
    ...Array.isArray(data.dialogs) && data.dialogs.length > 0 ? { dialogs: data.dialogs } : {},
    ...Array.isArray(data.console) && data.console.length > 0 ? { console: data.console } : {},
    ...Array.isArray(data.requests) ? {
      requests: data.requests,
      total: Number(data.total) || 0,
      ...(typeof data.ignored === 'number' ? { ignored: data.ignored } : {}),
    } : {},
    ...Array.isArray(data.downloads) ? { downloads: data.downloads } : {},
    ...Array.isArray(data.files) ? { files: data.files } : {},
    ...Array.isArray(data.data) ? { data: data.data } : {},
    ...data.screenshot && typeof data.screenshot === 'object' ? { screenshot: data.screenshot } : {},
    ...data.data && typeof data.data === 'object' ? { data: data.data } : {},
    ...Array.isArray(data.errors) && data.errors.length > 0 ? { errors: data.errors } : {},
  };
}

async function nativeTabs() {
  await ensureNativeBridge();
  const response = await fetch(`${NATIVE_URL}/tabs`);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'failed to list AI browser tabs');
  }
  return {
    tabs: Array.isArray(data.tabs) ? data.tabs.map((tab) => ({
      id: String(tab.id ?? ''),
      title: String(tab.title ?? ''),
      url: redactUrlForOutput(String(tab.url ?? '')),
      active: tab.active === true,
      takeover: tab.takeover === true,
      connected: tab.connected === true,
    })) : [],
  };
}

async function saveRecipe(args) {
  const name = String(args.name || '').trim();
  if (!name) throw new Error('recipe name is required');
  const actions = Array.isArray(args.actions) ? args.actions : [];
  if (actions.length === 0) throw new Error('recipe actions are required');
  if (actions.some((action) => action.action === 'type')) {
    throw new Error('[RECIPE_UNSAFE] 不持久化带文本的 type 动作；把输入留到运行时 batch 执行');
  }
  const snapshot = await nativeCall('observe', { mode: 'standard', noBaseline: true, includeConsole: false });
  const url = String(args.url || snapshot.url || '');
  if (!url) throw new Error('recipe URL is required');
  const stored = actions.map((action) => describeRecipeAction(action, snapshot));
  const store = await loadRecipes();
  const updatedAt = new Date().toISOString();
  store[name] = { name, url, actions: stored, updatedAt };
  await persistRecipes();
  return {
    ok: true,
    status: `已保存 recipe：${name}`,
    recipe: { name, url, actions: stored.length, updatedAt },
  };
}

async function listRecipes() {
  const store = await loadRecipes();
  return {
    recipes: Object.values(store).map((recipe) => ({
      name: recipe.name,
      url: recipe.url,
      actions: Array.isArray(recipe.actions) ? recipe.actions.length : 0,
      updatedAt: recipe.updatedAt || '',
    })),
  };
}

async function deleteRecipe(args) {
  const name = String(args.name || '').trim();
  const store = await loadRecipes();
  if (!store[name]) throw new Error(`[RECIPE_NOT_FOUND] 找不到 recipe：${name}`);
  delete store[name];
  await persistRecipes();
  return { ok: true, status: `已删除 recipe：${name}`, recipe: { name, url: '', actions: 0, updatedAt: '' } };
}

async function runRecipe(args) {
  const name = String(args.name || '').trim();
  const store = await loadRecipes();
  const recipe = store[name];
  if (!recipe) throw new Error(`[RECIPE_NOT_FOUND] 找不到 recipe：${name}`);
  await assertDomainAllowed(recipe.url);
  const snapshot = await nativeCall('observe', { mode: 'standard', noBaseline: true, includeConsole: false });
  if (snapshot.url !== recipe.url) {
    throw new Error(`[RECIPE_URL_MISMATCH] recipe 属于 ${recipe.url}，当前是 ${snapshot.url}`);
  }
  const actions = (recipe.actions || []).map((action) => resolveRecipeAction(action, snapshot));
  const result = await nativeCall('act', {
    actions,
    stopOnError: true,
    ...typeof args.tab === 'string' ? { tab: args.tab } : {},
  });
  return { ...result, recipe: name };
}

const taskStates = new Map();
let activeTaskId = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function transitionTask(record, state, step) {
  record.state = state;
  record.history.push({ state, ...(typeof step === 'number' ? { step } : {}), at: new Date().toISOString() });
  if (record.history.length > 100) record.history.shift();
}

function checkTaskExpect(snapshot, expect) {
  if (!expect) return { ok: true, reason: '' };
  const url = String(snapshot.url || '');
  const title = String(snapshot.title || '');
  const text = String(snapshot.text || '');
  if (expect.urlIncludes && !url.includes(expect.urlIncludes)) {
    return { ok: false, reason: `URL 不包含 ${expect.urlIncludes}` };
  }
  if (expect.titleIncludes && !title.includes(expect.titleIncludes)) {
    return { ok: false, reason: `标题不包含 ${expect.titleIncludes}` };
  }
  if (expect.textIncludes && !text.includes(expect.textIncludes)) {
    return { ok: false, reason: `正文不包含 ${expect.textIncludes}` };
  }
  if (expect.textExcludes && text.includes(expect.textExcludes)) {
    return { ok: false, reason: `正文仍包含 ${expect.textExcludes}` };
  }
  if (expect.element) {
    const element = (snapshot.elements || []).find((entry) => entry.text === expect.element.text);
    const present = expect.element.present !== false;
    if (present !== Boolean(element)) {
      return { ok: false, reason: `元素 ${expect.element.text} ${present ? '不存在' : '仍然存在'}` };
    }
    if (element && typeof expect.element.checked === 'boolean' && element.checked !== expect.element.checked) {
      return { ok: false, reason: `元素 ${expect.element.text} 的 checked=${element.checked}` };
    }
  }
  return { ok: true, reason: '' };
}

function taskView(record) {
  return {
    id: record.id,
    name: record.name,
    state: record.state,
    startedAt: record.startedAt,
    ...(record.endedAt ? { endedAt: record.endedAt } : {}),
    steps: record.steps.length,
    ...(record.error ? { error: record.error } : {}),
  };
}

function taskResult(record, snapshot) {
  const base = snapshot || { url: '', title: '', status: '', text: '', elements: [] };
  return {
    ...base,
    taskId: record.id,
    taskState: record.state,
    taskSteps: record.steps,
    stateHistory: record.history,
    ...(record.error ? { taskError: record.error } : {}),
    ...(record.state === 'failed' ? { status: `任务失败：${record.error || '未知错误'}` } : {}),
  };
}

async function runTask(args) {
  if (activeTaskId !== null) throw new Error(`[TASK_BUSY] 已有任务在运行：${activeTaskId}`);
  const steps = Array.isArray(args.steps) ? args.steps : [];
  if (steps.length === 0) throw new Error('task steps are required');
  const id = randomUUID();
  const record = {
    id,
    name: String(args.name || `task-${id.slice(0, 8)}`),
    state: 'starting',
    startedAt: new Date().toISOString(),
    steps: [],
    history: [],
  };
  taskStates.set(id, record);
  if (taskStates.size > 20) {
    taskStates.delete(taskStates.keys().next().value);
  }
  activeTaskId = id;
  let snapshot = null;
  try {
    transitionTask(record, 'starting');
    if (typeof args.url === 'string' && args.url.length > 0) {
      transitionTask(record, 'navigating');
      const current = await nativeCall('observe', { mode: 'minimal', noBaseline: true, includeConsole: false });
      if (current.url !== args.url) {
        await nativeCall('navigate', { url: args.url });
      }
    }
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index] || {};
      const stepName = String(step.name || `step ${index + 1}`);
      transitionTask(record, 'acting', index);
      let batch = null;
      if (Array.isArray(step.actions) && step.actions.length > 0) {
        batch = await nativeCall('act', {
          actions: step.actions,
          stopOnError: true,
          selfHeal: true,
        });
        snapshot = batch;
        if (batch.batchOk === false) {
          record.steps.push({
            index,
            name: stepName,
            state: 'failed',
            batchOk: false,
            verifyOk: false,
            verifyReason: '',
            error: batch.status || '批量动作失败',
          });
          record.error = batch.status || '批量动作失败';
          transitionTask(record, 'failed', index);
          return taskResult(record, snapshot);
        }
      }
      if (typeof step.waitMs === 'number' && step.waitMs > 0) {
        await sleep(Math.min(10000, Math.max(0, step.waitMs)));
      }
      transitionTask(record, 'verifying', index);
      const retries = Math.max(0, Math.min(3, Number(step.verifyRetries) || 0));
      let verify = { ok: true, reason: '' };
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        snapshot = await nativeCall('observe', { mode: 'standard', noBaseline: true, includeConsole: false });
        verify = checkTaskExpect(snapshot, step.expect);
        if (verify.ok) break;
        if (attempt < retries) {
          transitionTask(record, 'recovering', index);
          await sleep(400);
          transitionTask(record, 'verifying', index);
        }
      }
      record.steps.push({
        index,
        name: stepName,
        state: verify.ok ? 'done' : 'failed',
        batchOk: true,
        verifyOk: verify.ok,
        verifyReason: verify.reason,
      });
      if (!verify.ok) {
        record.error = verify.reason;
        transitionTask(record, 'failed', index);
        return taskResult(record, snapshot);
      }
    }
    transitionTask(record, 'done');
    snapshot = await nativeCall('observe', { mode: 'standard', noBaseline: true, includeConsole: false });
    record.endedAt = new Date().toISOString();
    return taskResult(record, snapshot);
  } catch (error) {
    record.error = error.message || String(error);
    transitionTask(record, 'failed', record.steps.length);
    try {
      if (!snapshot) snapshot = await nativeCall('observe', { mode: 'standard', noBaseline: true, includeConsole: false });
    } catch {
      snapshot = null;
    }
    return taskResult(record, snapshot);
  } finally {
    activeTaskId = null;
    if (!record.endedAt) record.endedAt = new Date().toISOString();
  }
}

function listTaskStates(args) {
  const all = [...taskStates.values()];
  const selected = args.taskId
    ? all.filter((task) => task.id === args.taskId)
    : all;
  return { tasks: selected.map(taskView) };
}

const elementSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    tag: { type: 'string' },
    text: { type: 'string' },
    type: { type: 'string' },
    name: { type: 'string' },
    href: { type: 'string' },
    checked: { type: 'boolean' },
  },
  required: ['id', 'tag', 'text', 'type', 'name', 'href'],
};

const dialogSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string' },
    message: { type: 'string' },
    defaultValue: { type: 'string' },
    accepted: { type: 'boolean' },
    time: { type: 'string' },
  },
  required: ['type', 'message', 'defaultValue', 'accepted', 'time'],
};

const deltaSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    added: { type: 'array', items: elementSchema },
    removed: { type: 'array', items: { type: 'string' } },
    changed: { type: 'array', items: elementSchema },
    textChanged: { type: 'boolean' },
  },
  required: ['added', 'removed', 'changed', 'textChanged'],
};

const stepSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    index: { type: 'number' },
    action: { type: 'string' },
    ok: { type: 'boolean' },
    changed: { type: 'boolean' },
    revision: { type: 'number' },
    code: { type: 'string' },
    error: { type: 'string' },
    state: { type: 'string' },
    retried: { type: 'boolean' },
    recovered: { type: 'boolean' },
    expectOk: { type: 'boolean' },
    expectReason: { type: 'string' },
    data: { type: 'object', additionalProperties: true },
    errors: { type: 'array', items: { type: 'string' } },
  },
  required: ['index', 'action', 'ok'],
};

const taskStepResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    index: { type: 'number' },
    name: { type: 'string' },
    state: { type: 'string' },
    batchOk: { type: 'boolean' },
    verifyOk: { type: 'boolean' },
    verifyReason: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['index', 'name', 'state'],
};

const taskHistorySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    state: { type: 'string' },
    step: { type: 'number' },
    at: { type: 'string' },
  },
  required: ['state', 'at'],
};

const consoleEntrySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    level: { type: 'string' },
    message: { type: 'string' },
    line: { type: 'number' },
    source: { type: 'string' },
    time: { type: 'string' },
  },
  required: ['level', 'message'],
};

const consoleArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    clear: { type: 'boolean', description: 'Clear the console buffer after reading.' },
    level: { type: 'string', enum: ['debug', 'info', 'warning', 'error'] },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  },
};

const screenshotArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    fullPage: { type: 'boolean', description: 'Capture the whole scrollable page instead of the viewport.' },
    target: { type: 'string', description: 'Capture one element (dsh-* id or CSS selector) instead of the viewport.' },
  },
};

const screenshotResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    path: { type: 'string' },
    width: { type: 'number' },
    height: { type: 'number' },
    attachment: { type: 'object', additionalProperties: true },
  },
  required: ['url', 'title', 'path', 'width', 'height'],
};

const uploadFileResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    size: { type: 'number' },
    type: { type: 'string' },
  },
  required: ['name', 'size', 'type'],
};

const uploadArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    target: { type: 'string', description: 'A dsh-* id or CSS selector for an <input type="file"> or its label/wrapper.' },
    paths: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5, description: 'Absolute local file paths. Restricted to policy uploadRoots (or the workspace).' },
  },
  required: ['target', 'paths'],
};

const uploadResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
    files: { type: 'array', items: uploadFileResultSchema },
  },
  required: ['url', 'title', 'status', 'files'],
};

const dropArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    target: { type: 'string', description: 'Drop zone element (dsh-* id or CSS selector).' },
    paths: { type: 'array', items: { type: 'string' }, maxItems: 5, description: 'Absolute local file paths, restricted to policy uploadRoots.' },
    data: { type: 'object', additionalProperties: { type: 'string' }, description: 'MIME type to string data, e.g. text/plain or text/uri-list.' },
  },
  required: ['target'],
};

const dropResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
    files: { type: 'array', items: uploadFileResultSchema },
  },
  required: ['url', 'title', 'status', 'files'],
};

const downloadEntrySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'number' },
    filename: { type: 'string' },
    path: { type: 'string' },
    url: { type: 'string' },
    mime: { type: 'string' },
    state: { type: 'string' },
    receivedBytes: { type: 'number' },
    totalBytes: { type: 'number' },
    startedAt: { type: 'string' },
    completedAt: { type: 'string' },
  },
  required: ['id', 'filename', 'path', 'url', 'mime', 'state', 'receivedBytes', 'totalBytes', 'startedAt'],
};

const downloadsArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    clear: { type: 'boolean', description: 'Clear the download history after reading.' },
  },
};

const downloadsResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    downloads: { type: 'array', items: downloadEntrySchema },
  },
  required: ['url', 'title', 'downloads'],
};

const networkRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'number' },
    method: { type: 'string' },
    url: { type: 'string' },
    type: { type: 'string' },
    time: { type: 'string' },
    status: { type: 'number' },
    ok: { type: 'boolean' },
    fromCache: { type: 'boolean' },
    error: { type: 'string' },
  },
  required: ['id', 'method', 'url', 'type', 'time', 'status', 'ok'],
};

const networkArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    type: { type: 'string', description: 'Comma-separated resource types, e.g. xhr,fetch,script,image.' },
    status: { type: 'string', enum: ['failed', '4xx', '5xx'], description: 'Filter by failure or HTTP status class.' },
    limit: { type: 'integer', minimum: 1, maximum: 200 },
    clear: { type: 'boolean', description: 'Clear the network buffer after reading.' },
    includeNoise: { type: 'boolean', description: 'Include ERR_CACHE_MISS / ERR_ABORTED entries (hidden by default).' },
  },
};

const networkResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    total: { type: 'number' },
    ignored: { type: 'number' },
    requests: { type: 'array', items: networkRequestSchema },
  },
  required: ['url', 'title', 'total', 'requests'],
};

const highlightArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: { type: 'string', description: 'AI browser tab id; omit for the active tab.' },
    target: { type: 'string', description: 'A dsh-* element id or CSS selector to outline.' },
    clear: { type: 'boolean', description: 'Remove all current highlights instead.' },
  },
};

const highlightResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['url', 'title', 'status'],
};

const consoleResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    console: { type: 'array', items: consoleEntrySchema },
  },
  required: ['console'],
};

const snapshotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
    text: { type: 'string' },
    elements: { type: 'array', items: elementSchema },
    tab: { type: 'string' },
    takeover: { type: 'boolean' },
    changed: { type: 'boolean' },
    dialogs: { type: 'array', items: dialogSchema },
    console: { type: 'array', items: consoleEntrySchema },
    revision: { type: 'number' },
    unchanged: { type: 'boolean' },
    full: { type: 'boolean' },
    mode: { type: 'string' },
    delta: deltaSchema,
    batchOk: { type: 'boolean' },
    failedStep: { type: 'number' },
    steps: { type: 'array', items: stepSchema },
    recipe: { type: 'string' },
    taskId: { type: 'string' },
    taskState: { type: 'string' },
    taskError: { type: 'string' },
    taskSteps: { type: 'array', items: taskStepResultSchema },
    stateHistory: { type: 'array', items: taskHistorySchema },
  },
  required: ['url', 'title', 'status', 'text', 'elements'],
};

function renderExtract(value) {
  const lines = [
    `URL: ${value.url}`,
    `TITLE: ${value.title}`,
    ...(value.tab ? [`TAB: ${value.tab}`] : []),
    `REVISION: ${value.revision}`,
  ];
  lines.push('');
  lines.push(`DATA: ${JSON.stringify(value.data)}`);
  if (Array.isArray(value.errors) && value.errors.length > 0) {
    lines.push(`ERRORS: ${value.errors.join('; ')}`);
  }
  return lines.join('\n');
}

function renderConsole(value) {
  const entries = Array.isArray(value.console) ? value.console : [];
  if (entries.length === 0) return `URL: ${value.url || ''}\nCONSOLE: (empty)`;
  const lines = entries.map((entry) => {
    const location = entry.source ? ` (${entry.source}${entry.line ? `:${entry.line}` : ''})` : '';
    return `[${entry.level}] ${entry.message}${location}`;
  });
  return `URL: ${value.url || ''}\nCONSOLE:\n${lines.join('\n')}`;
}

function renderNetwork(value) {
  const requests = Array.isArray(value.requests) ? value.requests : [];
  if (requests.length === 0) return `URL: ${value.url || ''}\nNETWORK: (empty)`;
  const lines = requests.map((entry) => {
    const status = entry.error ? `ERR ${entry.error}` : String(entry.status || '');
    return `${entry.method} ${entry.url} -> ${status} [${entry.type}]${entry.fromCache ? ' cache' : ''}`;
  });
  return `URL: ${value.url || ''}\nNETWORK: ${requests.length}/${value.total || requests.length}${typeof value.ignored === 'number' && value.ignored > 0 ? ` (ignored ${value.ignored} noise)` : ''}\n${lines.join('\n')}`;
}

function renderDownloads(value) {
  const downloads = Array.isArray(value.downloads) ? value.downloads : [];
  if (downloads.length === 0) return `URL: ${value.url || ''}\nDOWNLOADS: (empty)`;
  const lines = downloads.map((entry) => {
    const size = entry.totalBytes > 0 ? `${entry.receivedBytes}/${entry.totalBytes}` : String(entry.receivedBytes || 0);
    const url = redactUrlForOutput(entry.url || '');
    return `#${entry.id} ${entry.state} ${entry.filename} (${size} bytes) ${entry.path}${url ? ` <- ${url}` : ''}`;
  });
  return `URL: ${value.url || ''}\nDOWNLOADS: ${downloads.length}\n${lines.join('\n')}`;
}

function renderWorkspace(value) {
  if (Array.isArray(value.keys)) return `KEYS: ${value.keys.length > 0 ? value.keys.join(', ') : '(empty)'}`;
  if (value.cleared) return 'WORKSPACE: cleared';
  if (value.key && value.value) return `WORKSPACE ${value.key}: ${JSON.stringify(value.value)}`;
  return 'WORKSPACE: not found';
}

function renderSnapshot(value) {
  const formatElement = (element) => {
    const href = element.href ? ` -> ${element.href}` : '';
    const checked = typeof element.checked === 'boolean'
      ? ` [${element.checked ? 'checked' : 'unchecked'}]`
      : '';
    return `[${element.id}] <${element.tag}>${checked} ${element.text}${href}`;
  };
  const elements = value.elements && value.elements.length > 0
    ? value.elements.map(formatElement).join('\n')
    : '(none)';
  const takeover = value.takeover ? '\nUSER TAKEOVER: yes (AI actions are paused)' : '';
  const tab = value.tab ? `\nTAB: ${value.tab}` : '';
  const revision = typeof value.revision === 'number' ? `\nREVISION: ${value.revision}` : '';
  const changed = typeof value.changed === 'boolean'
    ? `\nCHANGED: ${value.changed ? 'yes' : 'no'}`
    : '';
  const dialogs = Array.isArray(value.dialogs) && value.dialogs.length > 0
    ? `\nDIALOGS:\n${value.dialogs.map((dialog) => {
        const defaultValue = dialog.defaultValue ? ` (default: ${dialog.defaultValue})` : '';
        return `- ${dialog.type}${defaultValue}: ${dialog.message} -> ${dialog.accepted ? 'accepted' : 'cancelled'}`;
      }).join('\n')}`
    : '';
  const batch = Array.isArray(value.steps)
    ? `\nBATCH: ${value.batchOk ? 'ok' : 'failed'}${typeof value.failedStep === 'number' ? ` at step ${value.failedStep + 1}` : ''}\n${value.steps.map((step) => `- #${step.index + 1} ${step.action}: ${step.ok ? 'ok' : `failed${step.code ? ` [${step.code}]` : ''}${step.error ? ` ${step.error}` : ''}`}${step.state && step.state !== 'done' ? ` state=${step.state}` : ''}${typeof step.changed === 'boolean' ? ` changed=${step.changed ? 'yes' : 'no'}` : ''}${step.expectOk !== undefined ? ` expect=${step.expectOk ? 'pass' : 'fail'}${step.expectReason ? ` ${step.expectReason}` : ''}` : ''}${step.data ? ` data=${JSON.stringify(step.data)}` : ''}${Array.isArray(step.errors) && step.errors.length ? ` errors=${step.errors.join('; ')}` : ''}`).join('\n')}`
    : '';
  const recipe = typeof value.recipe === 'string' && value.recipe.length > 0 ? `\nRECIPE: ${value.recipe}` : '';
  const consoleBlock = Array.isArray(value.console) && value.console.length > 0
    ? `\nCONSOLE:\n${value.console.map((entry) => `- [${entry.level}] ${entry.message}${entry.source ? ` (${entry.source}${entry.line ? `:${entry.line}` : ''})` : ''}`).join('\n')}`
    : '';
  const task = typeof value.taskId === 'string'
    ? `\nTASK: ${value.taskId} (${value.taskState || 'unknown'})${value.taskError ? ` error=${value.taskError}` : ''}${Array.isArray(value.stateHistory) && value.stateHistory.length > 0 ? ` history=${value.stateHistory.map((entry) => entry.state).join('>')}` : ''}\n${(value.taskSteps || []).map((step) => `- step ${step.index + 1} ${step.name}: ${step.state}${step.verifyOk === false ? ` verify=${step.verifyReason || 'failed'}` : ''}${step.error ? ` error=${step.error}` : ''}`).join('\n')}`
    : '';
  if (value.delta) {
    if (value.unchanged) {
      return `URL: ${value.url}\nTITLE: ${value.title}\nSTATUS: ${value.status}${tab}${revision}${takeover}${dialogs}${consoleBlock}${batch}${recipe}${task}\n\nUNCHANGED: yes`;
    }
    const lines = [];
    for (const element of value.delta.added || []) lines.push(`+ ${formatElement(element)}`);
    for (const id of value.delta.removed || []) lines.push(`- ${id}`);
    for (const element of value.delta.changed || []) lines.push(`~ ${formatElement(element)}`);
    if (value.delta.textChanged) lines.push('~ PAGE TEXT changed');
    const summary = `DELTA: +${(value.delta.added || []).length} -${(value.delta.removed || []).length} ~${(value.delta.changed || []).length}${value.delta.textChanged ? ' textChanged' : ''}`;
    return `URL: ${value.url}\nTITLE: ${value.title}\nSTATUS: ${value.status}${tab}${revision}${takeover}${dialogs}${consoleBlock}${batch}${recipe}${task}\n\n${summary}\nCHANGED: yes\n${lines.join('\n') || '(no element delta)'}`;
  }
  return `URL: ${value.url}\nTITLE: ${value.title}\nSTATUS: ${value.status}${tab}${revision}${changed}${takeover}${dialogs}${consoleBlock}${batch}${recipe}${task}\n\nINTERACTIVE ELEMENTS:\n${elements}\n\nPAGE TEXT:\n${value.text}`;
}

function tool(name, description, parameters, action, extra = {}, caller = nativeCall) {
  return {
    name,
    description,
    parameters,
    isConcurrencySafe: () => false,
    output: {
      schema: snapshotSchema,
      render: (_args, value) => [{ type: 'text', text: renderSnapshot(value) }],
    },
    async execute(args) {
      return caller(action, { ...args, ...extra });
    },
  };
}

const noArgs = { type: 'object', additionalProperties: false, properties: {} };

const tabParameter = {
  type: 'string',
  description: 'AI browser tab id from native_browser_tabs. Omit to use the active tab.',
};

const tabArgs = {
  type: 'object',
  additionalProperties: false,
  properties: { tab: tabParameter },
};

const snapshotParameter = {
  type: 'string',
  enum: ['none', 'minimal', 'standard', 'full'],
  description: 'Post-action snapshot size. Default minimal (20 elements, short text); none returns only URL/title/revision/dialogs; standard/full return larger snapshots.',
};

const actionArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: tabParameter,
    snapshot: snapshotParameter,
  },
};

const actSnapshotParameter = {
  type: 'string',
  enum: ['none', 'delta', 'minimal', 'standard', 'full'],
  description: 'Final batch snapshot. delta returns only DOM/text changes against an automatic pre-batch baseline (same-URL only); none returns metadata only; minimal is the default.',
};

const actExpectSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    urlIncludes: { type: 'string' },
    titleIncludes: { type: 'string' },
    textIncludes: { type: 'string' },
    textExcludes: { type: 'string' },
    element: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        present: { type: 'boolean' },
        checked: { type: 'boolean' },
      },
      required: ['text'],
    },
  },
};

const observeArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: tabParameter,
    mode: {
      type: 'string',
      enum: ['minimal', 'standard', 'full'],
      description: 'Observation depth. minimal keeps only a short text excerpt plus actionable elements; standard is the default; full keeps the complete current snapshot.',
    },
    scope: {
      type: 'string',
      description: 'Optional CSS selector limiting elements and text to that subtree.',
    },
    sinceRevision: {
      type: 'integer',
      minimum: 0,
      description: 'Revision returned by a previous observe. When it matches the current page revision, only added/removed/changed elements are returned.',
    },
    limit: {
      type: 'integer',
      minimum: 20,
      maximum: 500,
      description: 'Maximum number of interactive elements to list. Default 200.',
    },
    offset: {
      type: 'integer',
      minimum: 0,
      maximum: 10000,
      description: 'Number of visible interactive elements to skip before listing.',
    },
    textLimit: {
      type: 'integer',
      minimum: 500,
      maximum: 60000,
      description: 'Maximum page text characters. Default 24000 (600 in minimal mode).',
    },
  },
};

const actArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: tabParameter,
    snapshot: actSnapshotParameter,
    stopOnError: {
      type: 'boolean',
      description: 'Stop after the first failed action. Default true.',
    },
    selfHeal: {
      type: 'boolean',
      description: 'On STALE_REF, re-observe and retry the step once by semantic target descriptor. Default true.',
    },
    actions: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['click', 'type', 'hover', 'navigate', 'back', 'reload', 'read', 'observe', 'extract'] },
          target: { type: 'string' },
          text: { type: 'string' },
          submit: { type: 'boolean' },
          url: { type: 'string' },
          fields: { type: 'array', items: { type: 'object', additionalProperties: true }, maxItems: 50 },
          table: { type: 'object', additionalProperties: true },
          meta: { type: 'boolean' },
          jsonld: { type: 'boolean' },
          debug: { type: 'boolean' },
          maxLength: { type: 'integer', minimum: 40, maximum: 4000 },
          expect: actExpectSchema,
          timeoutMs: { type: 'integer', minimum: 100, maximum: 10000, description: 'How long to wait for expect. Default 3000.' },
        },
        required: ['action'],
      },
    },
  },
  required: ['actions'],
};

const extractFieldSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Output key for this field.' },
    selector: { type: 'string', description: 'CSS selector. Use [data-dsh-id="dsh-..."] for snapshot ids.' },
    attr: {
      type: 'string',
      description: 'text (default), html, value, href, src, checked, or any attribute name.',
    },
    all: { type: 'boolean', description: 'Return all matches instead of the first.' },
    limit: { type: 'integer', minimum: 1, maximum: 50 },
  },
  required: ['name', 'selector'],
};

const extractTableSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    selector: { type: 'string', description: 'CSS selector for the table.' },
    index: { type: 'integer', minimum: 0, description: 'Zero-based table index when the selector matches several tables.' },
    limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum body rows. Default 20.' },
  },
  required: ['selector'],
};

const extractArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tab: tabParameter,
    fields: {
      type: 'array',
      maxItems: 50,
      items: extractFieldSchema,
      description: 'Structured fields to extract. Each field returns a value plus name__count.',
    },
    table: extractTableSchema,
    meta: { type: 'boolean', description: 'Extract title/description/canonical/OG metadata.' },
    jsonld: { type: 'boolean', description: 'Extract application/ld+json blocks.' },
    debug: { type: 'boolean', description: 'Include selector match counts, tags and all matching tables for tuning.' },
    maxLength: {
      type: 'integer',
      minimum: 40,
      maximum: 4000,
      description: 'Maximum characters per extracted string. Default 600.',
    },
    saveAs: {
      type: 'string',
      description: 'Optional workspace key. Stores the extracted data for later cross-tab reads.',
    },
  },
};

const extractResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    url: { type: 'string' },
    title: { type: 'string' },
    revision: { type: 'integer' },
    tab: { type: 'string' },
    data: { type: 'object', additionalProperties: true },
    errors: { type: 'array', items: { type: 'string' } },
  },
  required: ['url', 'title', 'revision', 'data'],
};

const workspaceArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['list', 'get', 'delete', 'clear'] },
    key: { type: 'string' },
  },
  required: ['action'],
};

const workspaceResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    keys: { type: 'array', items: { type: 'string' } },
    key: { type: 'string' },
    value: { type: 'object', additionalProperties: true },
    cleared: { type: 'boolean' },
  },
};

const taskExpectSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    urlIncludes: { type: 'string' },
    titleIncludes: { type: 'string' },
    textIncludes: { type: 'string' },
    textExcludes: { type: 'string' },
    element: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        present: { type: 'boolean' },
        checked: { type: 'boolean' },
      },
      required: ['text'],
    },
  },
};

const taskStepSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    actions: {
      type: 'array',
      maxItems: 20,
      items: actArgs.properties.actions.items,
    },
    expect: taskExpectSchema,
    waitMs: { type: 'integer', minimum: 0, maximum: 10000 },
    verifyRetries: { type: 'integer', minimum: 0, maximum: 3 },
  },
  required: ['actions'],
};

const taskRunArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    steps: { type: 'array', minItems: 1, maxItems: 20, items: taskStepSchema },
  },
  required: ['steps'],
};

const taskStatusArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: { type: 'string' },
  },
};

const taskArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['run', 'status'], description: 'run a task or list recent task states.' },
    name: { type: 'string' },
    url: { type: 'string' },
    steps: { type: 'array', minItems: 1, maxItems: 20, items: taskStepSchema },
    taskId: { type: 'string' },
  },
  required: ['action'],
};

const taskToolResultSchema = { type: 'object', additionalProperties: true };

const taskStatusSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          state: { type: 'string' },
          startedAt: { type: 'string' },
          endedAt: { type: 'string' },
          steps: { type: 'number' },
          error: { type: 'string' },
        },
        required: ['id', 'name', 'state', 'startedAt', 'steps'],
      },
    },
  },
  required: ['tasks'],
};

const policySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allowedDomains: { type: 'array', items: { type: 'string' } },
    confirmKeywords: { type: 'array', items: { type: 'string' } },
    confirmTools: { type: 'array', items: { type: 'string' } },
    downloads: { type: 'string' },
    popups: { type: 'string' },
    dialogs: { type: 'string' },
  },
  required: ['allowedDomains', 'confirmKeywords', 'confirmTools', 'downloads', 'popups', 'dialogs'],
};

const recipeActionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['click', 'hover', 'type', 'navigate', 'back', 'reload', 'read', 'observe'] },
    target: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['action'],
};

const recipeSaveArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Unique recipe name.' },
    url: { type: 'string', description: 'Optional page URL override; defaults to the current page URL.' },
    actions: { type: 'array', minItems: 1, maxItems: 20, items: recipeActionSchema },
  },
  required: ['name', 'actions'],
};

const recipeRunArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    tab: tabParameter,
  },
  required: ['name'],
};

const recipeArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['list', 'save', 'run', 'delete'], description: 'Recipe operation.' },
    name: { type: 'string', description: 'Unique recipe name.' },
    url: { type: 'string', description: 'Optional page URL override for save.' },
    actions: { type: 'array', minItems: 1, maxItems: 20, items: recipeActionSchema },
    tab: tabParameter,
  },
  required: ['action'],
};

const recipeToolResultSchema = { type: 'object', additionalProperties: true };

const recipeSummarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    actions: { type: 'number' },
    updatedAt: { type: 'string' },
  },
  required: ['name', 'url', 'actions', 'updatedAt'],
};

const recipeSaveResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    status: { type: 'string' },
    recipe: recipeSummarySchema,
  },
  required: ['ok', 'status', 'recipe'],
};

const recipeListSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recipes: { type: 'array', items: recipeSummarySchema },
  },
  required: ['recipes'],
};

const tabsArgs = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['list', 'new'], description: 'list tabs (default) or open a new tab.' },
    tab: tabParameter,
  },
};

const tabsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tabs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          url: { type: 'string' },
          active: { type: 'boolean' },
          takeover: { type: 'boolean' },
          connected: { type: 'boolean' },
        },
        required: ['id', 'title', 'url', 'active', 'takeover', 'connected'],
      },
    },
  },
  required: ['tabs'],
};

function renderTabs(value) {
  if (!value.tabs || value.tabs.length === 0) return 'No AI browser tabs are connected.';
  return value.tabs.map((tab) => {
    const flags = [
      tab.active ? 'active' : '',
      tab.connected ? 'connected' : 'offline',
      tab.takeover ? 'user-takeover' : '',
    ].filter(Boolean).join(', ');
    return `[${tab.id}] ${tab.title || 'AI 浏览器'}${flags ? ` (${flags})` : ''}${tab.url ? `\n    ${tab.url}` : ''}`;
  }).join('\n');
}

function renderRecipeSave(value) {
  return `${value.status}\nRECIPE: ${value.recipe.name}\nURL: ${value.recipe.url}\nACTIONS: ${value.recipe.actions}`;
}

function renderRecipeList(value) {
  if (!value.recipes || value.recipes.length === 0) return 'No recipes saved.';
  return value.recipes.map((recipe) => `[${recipe.name}] ${recipe.actions} actions · ${recipe.url}`).join('\n');
}

function renderRecipeTool(value) {
  if (value.action === 'list') return renderRecipeList({ recipes: value.recipes || [] });
  if (value.action === 'run') {
    const snapshot = value.snapshot || {};
    return `${renderSnapshot(snapshot)}\nRECIPE: ${value.recipe || ''}`;
  }
  return renderRecipeSave(value);
}

function renderTaskTool(value) {
  if (value.action === 'status') return renderTaskStatus({ tasks: value.tasks || [] });
  return renderSnapshot(value);
}

function renderTaskStatus(value) {
  if (!value.tasks || value.tasks.length === 0) return 'No tasks.';
  return value.tasks.map((task) => `[${task.id}] ${task.name} — ${task.state} · ${task.steps} steps${task.error ? ` · ${task.error}` : ''}`).join('\n');
}

function renderPolicy(value) {
  return [
    `ALLOWED DOMAINS: ${value.allowedDomains.length > 0 ? value.allowedDomains.join(', ') : '(all)'}`,
    `CONFIRM TOOLS: ${value.confirmTools.length > 0 ? value.confirmTools.join(', ') : '(none)'}`,
    `CONFIRM KEYWORDS: ${value.confirmKeywords.length > 0 ? value.confirmKeywords.join(', ') : '(none)'}`,
    `DOWNLOADS: ${value.downloads}`,
    `POPUPS: ${value.popups}`,
    `DIALOGS: ${value.dialogs}`,
  ].join('\n');
}

export function apply(ctx) {
  ctx.effect(() => {
    log('host loaded');
    ensureNativeBridge().catch((error) => log(`native bridge error: ${error.message || error}`));
  }, 'sidecar-browser.service');

  ctx.tools.register({
    name: 'native_browser_tabs',
    description: 'Manage AI browser tabs in the DSH right sidebar. action="list" (default) returns every tab with id, URL, active/takeover state. action="new" opens a new about:blank tab and returns the updated list. Pass a tab id to actions that support the optional tab argument; omit it to use the active tab.',
    parameters: tabsArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: tabsSchema,
      render: (_args, value) => [{ type: 'text', text: renderTabs(value) }],
    },
    async execute(args) {
      if (args.action === 'new') {
        await nativeCall('new_tab', { tab: args.tab });
      }
      return nativeTabs();
    },
  });

  ctx.tools.register(tool(
    'native_browser_navigate',
    'Open an http/https URL in the native DSH sidebar browser (the actual Electron webview, not a screenshot). The user can take over this browser at any time; if they have, navigation is refused until they hand control back. Snapshot defaults to minimal; set snapshot=none for metadata only or standard/full when you need the page structure. For history back or reload use act([{action:"back"}]) / act([{action:"reload"}]).',
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: { type: 'string', description: 'Absolute http/https URL to open.' },
        tab: tabParameter,
        snapshot: snapshotParameter,
      },
      required: ['url'],
    },
    'navigate',
    {},
    nativeCall,
  ));

  ctx.tools.register(tool(
    'native_browser_click',
    'Click a page element in the native DSH sidebar webview. Prefer a dsh-* id returned by native_browser_observe; a CSS selector is also accepted. Elements inside accessible iframes are found recursively. Only a page-level click is performed. Returns CHANGED: yes/no after comparing URL, title, and DOM before/after; CHANGED: no means the click was accepted but the page did not visibly change. Snapshot defaults to minimal; set snapshot=none for metadata only. If the user has taken over, the action is refused.',
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        target: { type: 'string', description: 'A dsh-* element id (preferred) or a CSS selector.' },
        tab: tabParameter,
        snapshot: snapshotParameter,
      },
      required: ['target'],
    },
    'click',
    {},
    nativeCall,
  ));

  ctx.tools.register(tool(
    'native_browser_hover',
    'Hover a page element in the native DSH sidebar webview to open hover-driven menus, tooltips, or secondary navigation. Prefer a dsh-* id returned by native_browser_observe; a CSS selector is also accepted. Uses real mouse input when the core bridge exposes it, with synthetic mouseenter/mouseover fallback. Returns CHANGED: yes/no and a snapshot (default minimal).',
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        target: { type: 'string', description: 'A dsh-* element id (preferred) or a CSS selector.' },
        tab: tabParameter,
        snapshot: snapshotParameter,
      },
      required: ['target'],
    },
    'hover',
    {},
    nativeCall,
  ));

  ctx.tools.register({
    name: 'native_browser_highlight',
    description: 'Draw a visible orange outline around a page element so the user can audit what the AI is about to act on. Accepts a dsh-* id or CSS selector. clear=true removes all highlights. This is visual only; it does not click or modify page data.',
    parameters: highlightArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: highlightResultSchema,
      render: (_args, value) => [{ type: 'text', text: `URL: ${value.url}\nSTATUS: ${value.status}` }],
    },
    async execute(args) {
      const raw = await nativeCall('highlight', { tab: args.tab, target: args.target, clear: args.clear === true });
      return { url: redactUrlForOutput(raw.url), title: raw.title, status: raw.status };
    },
  });

  ctx.tools.register(tool(
    'native_browser_type',
    'Type into an input, textarea, or contenteditable element in the native DSH sidebar webview. Prefer a dsh-* id returned by native_browser_observe. Elements inside accessible iframes are found recursively. Set submit=true to submit the form or press Enter; submitted actions report CHANGED: yes/no. Snapshot defaults to minimal; set snapshot=none for metadata only. If the user has taken over, the action is refused.',
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        target: { type: 'string', description: 'A dsh-* element id (preferred) or a CSS selector.' },
        text: { type: 'string', description: 'Text to fill into the element.' },
        submit: { type: 'boolean', description: 'Submit the form or press Enter after filling.' },
        tab: tabParameter,
        snapshot: snapshotParameter,
      },
      required: ['target', 'text'],
    },
    'type',
    {},
    nativeCall,
  ));

  ctx.tools.register(tool(
    'native_browser_observe',
    'Read or diff the native DSH sidebar webview. This is the full-snapshot and delta interface. Use when: you need the complete current structure, are watching a page change, confirming UNCHANGED cheaply, or paging through structure. Do not use for one or two fields (use extract) or multi-step actions (use act+expect). Every observe stores a baseline keyed by URL + mode/scope/limit/offset/textLimit; passing sinceRevision from the matching baseline returns only added/removed/changed elements, or UNCHANGED. Supports mode=minimal/standard/full, scope=<CSS selector>, limit/offset, textLimit. mode="standard" is the full read; mode="minimal" is the token-efficient default for repeated checks.',
    observeArgs,
    'observe',
    {},
    nativeCall,
  ));

  ctx.tools.register({
    name: 'native_browser_extract',
    description: 'Structured, token-efficient extraction from the current page. Returns only requested CSS-selector fields, one table, metadata, or JSON-LD instead of a full page dump. Use this for repetitive business data (prices, order ids, counts, rows) and cross-tab information gathering. Each field returns value plus name__count. Zero-match selectors automatically include page tag counts, element samples and class samples in ERRORS/data.debug. Optional saveAs stores the result in the in-memory workspace for later tabs.',
    parameters: extractArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: extractResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderExtract(value) }],
    },
    async execute(args) {
      const { tab, saveAs, ...spec } = args;
      const raw = await nativeCall('extract', { ...spec, tab });
      const value = {
        url: raw.url,
        title: raw.title,
        revision: raw.revision,
        ...(raw.tab ? { tab: raw.tab } : {}),
        data: raw.data && typeof raw.data === 'object' ? raw.data : {},
        ...(Array.isArray(raw.errors) && raw.errors.length > 0 ? { errors: raw.errors } : {}),
      };
      if (typeof saveAs === 'string' && saveAs.length > 0) {
        browserWorkspace.set(saveAs, { ...value, savedAt: new Date().toISOString() });
      }
      return value;
    },
  });

  ctx.tools.register({
    name: 'native_browser_console',
    description: 'Read recent page console messages and JavaScript errors captured from the native webview. Use this when an action reports CHANGED: no, a page stays blank, or a submit fails silently. Optional clear empties the buffer; level filters debug/info/warning/error; limit keeps the newest entries.',
    parameters: consoleArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: consoleResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderConsole(value) }],
    },
    async execute(args) {
      const raw = await nativeCall('console', { tab: args.tab, clear: args.clear === true });
      let entries = Array.isArray(raw.console) ? raw.console : [];
      if (args.level) entries = entries.filter((entry) => entry.level === args.level);
      if (args.limit) entries = entries.slice(-args.limit);
      return { url: redactUrlForOutput(raw.url || ''), title: raw.title || '', console: entries };
    },
  });

  ctx.tools.register({
    name: 'native_browser_network',
    description: 'Read the bounded, read-only network buffer captured by the native browser guest: method, redacted URL, resource type, HTTP status or error, cache flag and time. Headers, bodies and credentials are never stored. Use this to diagnose blank pages, failed API calls and 4xx/5xx responses. Optional type/status filters, limit and clear.',
    parameters: networkArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: networkResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderNetwork(value) }],
    },
    async execute(args) {
      const raw = await nativeCall('network', {
        tab: args.tab,
        type: args.type,
        status: args.status,
        limit: args.limit,
        clear: args.clear === true,
        includeNoise: args.includeNoise === true,
      });
      let requests = Array.isArray(raw.requests) ? raw.requests.map((entry) => ({
        ...entry,
        url: redactUrlForOutput(entry.url),
      })) : [];
      const noisy = (entry) => entry.ok === false && /ERR_CACHE_MISS|ERR_ABORTED/.test(String(entry.error || ''));
      const ignored = args.includeNoise === true ? 0 : requests.filter(noisy).length;
      if (args.includeNoise !== true) requests = requests.filter((entry) => !noisy(entry));
      if (args.status === 'failed') requests = requests.filter((entry) => entry.ok === false);
      else if (args.status === '4xx') requests = requests.filter((entry) => entry.status >= 400 && entry.status < 500);
      else if (args.status === '5xx') requests = requests.filter((entry) => entry.status >= 500);
      if (args.limit) requests = requests.slice(-args.limit);
      return {
        url: redactUrlForOutput(raw.url || ''),
        title: raw.title || '',
        total: Number(raw.total) || 0,
        ignored,
        requests,
      };
    },
  });

  ctx.tools.register({
    name: 'native_browser_screenshot',
    description: 'Capture the native browser guest as a PNG: viewport by default, fullPage=true for the whole scrollable page, or target to crop one element. Saves the file locally and attaches it when the active model route declares image input; otherwise returns the path as text.',
    parameters: screenshotArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: screenshotResultSchema,
      render: (_args, value) => [
        { type: 'text', text: `URL: ${value.url}\nSCREENSHOT: ${value.path} (${value.width}x${value.height})` },
        ...(value.attachment ? [{ type: 'image', attachment: value.attachment }] : []),
      ],
    },
    async execute(args, exec) {
      const raw = await nativeCall('screenshot', { tab: args.tab, fullPage: args.fullPage === true, target: args.target });
      const shot = raw.screenshot;
      if (!shot || typeof shot.data !== 'string' || !shot.data) throw new Error('截图通道没有返回图片数据');
      const bytes = Buffer.from(shot.data, 'base64');
      const directory = join(HERE, 'screenshots');
      mkdirSync(directory, { recursive: true });
      const filename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.png`;
      const path = join(directory, filename);
      await writeFile(path, bytes);
      let attachment;
      try {
        const attachments = ctx.get('attachments');
        const llm = ctx.get('llm');
        const routed = exec?.agent?.session?.requestHeader?.()?.config;
        const provider = routed?.provider ?? exec?.agent?.options?.provider;
        const model = routed?.model ?? exec?.agent?.options?.model;
        let imageCapable = false;
        if (llm && provider && model) {
          const info = await llm.resolveModelInfo(provider, model, exec?.signal);
          imageCapable = Array.isArray(info?.inputModalities) && info.inputModalities.includes('image');
        }
        if (attachments && imageCapable) {
          attachment = await attachments.saveImage({ data: bytes, mediaType: 'image/png', name: filename });
        }
      } catch {
        attachment = void 0;
      }
      return {
        url: redactUrlForOutput(raw.url || ''),
        title: raw.title || '',
        path,
        width: Number(shot.width) || 0,
        height: Number(shot.height) || 0,
        ...(attachment ? { attachment } : {}),
      };
    },
  });

  ctx.tools.register({
    name: 'native_browser_upload',
    description: 'Select local files for an <input type="file"> by reading them in the Host and assigning File objects in the page. Paths are restricted to policy uploadRoots (or the workspace). Max 5 files / 5 MB total. This does not click the final submit button.',
    parameters: uploadArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: uploadResultSchema,
      render: (_args, value) => [{
        type: 'text',
        text: `URL: ${value.url}\nSTATUS: ${value.status}\nFILES: ${value.files.map((file) => `${file.name} (${file.size} B, ${file.type})`).join(', ')}`,
      }],
    },
    async execute(args) {
      const paths = Array.isArray(args.paths) ? args.paths.slice(0, 5) : [];
      if (paths.length === 0) throw new Error('至少需要一个文件路径');
      const policy = await loadPolicy();
      const roots = uploadRootsForPolicy(policy);
      let total = 0;
      const files = [];
      for (const value of paths) {
        const absolute = resolve(String(value));
        if (!isInsideUploadRoot(absolute, roots)) {
          throw new Error(`文件不在允许的上传目录：${absolute}（允许：${roots.join(', ')}）`);
        }
        const info = await stat(absolute);
        if (!info.isFile()) throw new Error(`不是文件：${absolute}`);
        total += info.size;
        if (total > 5 * 1024 * 1024) throw new Error('上传文件总大小超过 5 MB');
        const name = basename(absolute);
        files.push({
          name,
          mime: uploadMime(name),
          base64: (await readFile(absolute)).toString('base64'),
        });
      }
      const raw = await nativeCall('upload', { tab: args.tab, target: args.target, files });
      return {
        url: redactUrlForOutput(raw.url || ''),
        title: raw.title || '',
        status: raw.status || `已选择 ${raw.files?.length || 0} 个文件`,
        files: Array.isArray(raw.files) ? raw.files : [],
      };
    },
  });

  ctx.tools.register({
    name: 'native_browser_drop',
    description: 'Dispatch dragenter/dragover/drop with files or MIME-typed data onto a drop zone. Use this for upload areas that never open a file chooser. Paths are restricted to policy uploadRoots; max 5 files / 5 MB.',
    parameters: dropArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: dropResultSchema,
      render: (_args, value) => [{
        type: 'text',
        text: `URL: ${value.url}\nSTATUS: ${value.status}\nFILES: ${value.files.map((file) => `${file.name} (${file.size} B)`).join(', ') || '(none)'}`,
      }],
    },
    async execute(args) {
      const paths = Array.isArray(args.paths) ? args.paths.slice(0, 5) : [];
      const data = {};
      if (args.data && typeof args.data === 'object') {
        for (const [mime, value] of Object.entries(args.data).slice(0, 20)) {
          data[String(mime).slice(0, 100)] = String(value).slice(0, 10000);
        }
      }
      if (paths.length === 0 && Object.keys(data).length === 0) {
        throw new Error('drop 需要 paths 或 data');
      }
      const policy = await loadPolicy();
      const roots = uploadRootsForPolicy(policy);
      let total = 0;
      const files = [];
      for (const value of paths) {
        const absolute = resolve(String(value));
        if (!isInsideUploadRoot(absolute, roots)) {
          throw new Error(`文件不在允许的上传目录：${absolute}（允许：${roots.join(', ')}）`);
        }
        const info = await stat(absolute);
        if (!info.isFile()) throw new Error(`不是文件：${absolute}`);
        total += info.size;
        if (total > 5 * 1024 * 1024) throw new Error('拖放文件总大小超过 5 MB');
        const name = basename(absolute);
        files.push({
          name,
          mime: uploadMime(name),
          base64: (await readFile(absolute)).toString('base64'),
        });
      }
      const raw = await nativeCall('drop', { tab: args.tab, target: args.target, files, data });
      return {
        url: redactUrlForOutput(raw.url || ''),
        title: raw.title || '',
        status: raw.status || (files.length > 0 ? `已拖放 ${files.length} 个文件` : '已拖放数据'),
        files: Array.isArray(raw.files) ? raw.files : [],
      };
    },
  });

  ctx.tools.register({
    name: 'native_browser_downloads',
    description: 'List files downloaded by the native browser guest. Files are saved under the OS Downloads/DSH Browser directory with sanitized names and no overwrite. Returns filename, path, state, size, mime and source URL. clear=true clears the history but never deletes files.',
    parameters: downloadsArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: downloadsResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderDownloads(value) }],
    },
    async execute(args) {
      const raw = await nativeCall('downloads', { tab: args.tab, clear: args.clear === true });
      const downloads = (Array.isArray(raw.downloads) ? raw.downloads : []).map((entry) => ({
        id: Number(entry.id) || 0,
        filename: String(entry.filename || ''),
        path: String(entry.path || ''),
        url: redactUrlForOutput(entry.url || ''),
        mime: String(entry.mime || ''),
        state: String(entry.state || ''),
        receivedBytes: Number(entry.receivedBytes) || 0,
        totalBytes: Number(entry.totalBytes) || 0,
        startedAt: String(entry.startedAt || ''),
        ...(typeof entry.completedAt === 'string' ? { completedAt: entry.completedAt } : {}),
      }));
      return { url: redactUrlForOutput(raw.url || ''), title: raw.title || '', downloads };
    },
  });

  ctx.tools.register({
    name: 'native_browser_workspace',
    description: 'In-memory cross-tab workspace. native_browser_extract can saveAs a result, then another tab can retrieve it by key without re-reading the source page. Supports list, get, delete, clear. State is lost when the Host reloads.',
    parameters: workspaceArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: workspaceResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderWorkspace(value) }],
    },
    async execute(args) {
      const action = String(args.action || '');
      const key = typeof args.key === 'string' ? args.key : '';
      if (action === 'list') {
        return { keys: Array.from(browserWorkspace.keys()).sort() };
      }
      if (action === 'get') {
        const value = browserWorkspace.get(key);
        return value ? { key, value } : { key };
      }
      if (action === 'delete') {
        browserWorkspace.delete(key);
        return { key };
      }
      if (action === 'clear') {
        browserWorkspace.clear();
        return { cleared: true };
      }
      throw new Error(`[WORKSPACE] unsupported action: ${action}`);
    },
  });

  ctx.tools.register(tool(
    'native_browser_act',
    'Preferred entry point for multi-step work: run page actions sequentially in one call, then return one final snapshot plus per-step status. Recipes: query a value -> act([navigate, extract], snapshot=none); submit a form -> act([type, click], expect); history -> act([back]) or act([reload]); confirm a change -> observe(sinceRevision) or act expect; visually verify -> screenshot(target). Supported actions: click, type, hover, navigate, back, reload, read, observe, extract. snapshot defaults to minimal: pass snapshot=none for pure navigate/extract recipes and delta for same-URL diffs. Sub-actions use snapshot=none internally; stopOnError defaults true. Each action can set expect (url/title/text/element) and timeoutMs. extract supports fields/table/index/meta/jsonld/debug. Failed steps report code and revision diagnostics.',
    actArgs,
    'act',
    {},
    nativeCall,
  ));

  ctx.tools.register({
    name: 'native_browser_recipe',
    description: 'Manage one saved deterministic recipe. action="list" (default) lists recipes; "save" stores click/hover/navigate/back/reload steps (type-with-text is rejected); "run" checks the URL and executes as one act batch; "delete" removes a name. Prefer act for one-off work and recipes only for repeatable flows.',
    parameters: recipeArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: recipeToolResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderRecipeTool(value) }],
    },
    async execute(args) {
      if (args.action === 'save') {
        const saved = await saveRecipe(args);
        return { action: 'save', ...saved };
      }
      if (args.action === 'run') {
        const snapshot = await runRecipe(args);
        return { action: 'run', recipe: args.name, snapshot };
      }
      if (args.action === 'delete') {
        const deleted = await deleteRecipe(args);
        return { action: 'delete', ...deleted };
      }
      const listed = await listRecipes();
      return { action: 'list', ...listed };
    },
  });

  ctx.tools.register({
    name: 'native_browser_task',
    description: 'Declarative task runner. action="run" performs optional navigation then sequential steps, each with actions plus an optional expect block; verification retries without repeating actions. action="status" lists recent tasks or one taskId. Prefer act for small one-off batches; use task for repeatable multi-step verification.',
    parameters: taskArgs,
    isConcurrencySafe: () => false,
    output: {
      schema: taskToolResultSchema,
      render: (_args, value) => [{ type: 'text', text: renderTaskTool(value) }],
    },
    async execute(args) {
      if (args.action === 'status') return { action: 'status', ...listTaskStates(args) };
      const result = await runTask(args);
      return { action: 'run', ...result };
    },
  });

  ctx.tools.register({
    name: 'native_browser_policy',
    description: 'Show the effective AI browser safety policy: allowed domains, tools/keywords that require user approval, and the fixed download/popup/dialog behavior. Edit policy.json in the plugin directory to change it.',
    parameters: noArgs,
    isConcurrencySafe: () => true,
    output: {
      schema: policySchema,
      render: (_args, value) => [{ type: 'text', text: renderPolicy(value) }],
    },
    async execute() {
      return policyView(await loadPolicy());
    },
  });

  ctx.effect(() => ctx.on('tools/pre-execute', async (exec, next) => {
    if (!APPROVAL_TOOLS.has(exec.name)) return next();
    if (ctx.get('approval') === undefined) return next();
    const reason = await sensitiveApprovalReason(exec);
    if (!reason) return next();
    return {
      kind: 'ask',
      reason: `AI browser sensitive action: ${reason}`,
      displayReason: `AI 浏览器请求执行敏感操作：${reason}。允许本次操作吗？`,
    };
  }), 'sidecar-browser.approval');

  log('native browser tools registered');
}
