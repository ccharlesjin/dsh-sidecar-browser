window.__ModuleLoader__.load({
  id: 'dsh-sidecar-browser',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const BRIDGE_URL = 'http://127.0.0.1:32002';
    const NATIVE_KIND = 'native-browser';
    const NATIVE_ID = 'dsh-sidecar-browser/native';
    const MULTI_UPGRADE_KEY = 'dsh-sidecar-browser.upgrade.v1';

    function tabTitle(tab) {
      return String(tab?.title || tab?.record?.title || tab?.label || '');
    }

    function tabKind(tab) {
      return String(tab?.kind || tab?.record?.kind || '');
    }

    function tabId(tab) {
      return tab?.tabId || tab?.id || tab?.record?.id;
    }

    async function bridgePost(path, body, keepalive = false) {
      return fetch(`${BRIDGE_URL}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        keepalive,
      });
    }

    const tabTitles = new Map();
    const tabTitleListeners = new Set();

    function setTabTitle(tabId, title) {
      if (!tabId) return;
      const next = String(title || '').trim() || 'AI 浏览器';
      if (tabTitles.get(tabId) === next) return;
      tabTitles.set(tabId, next);
      for (const listener of tabTitleListeners) listener();
    }

    function subscribeTabTitles(listener) {
      tabTitleListeners.add(listener);
      return () => tabTitleListeners.delete(listener);
    }

    function getTabTitle(tabId) {
      return tabTitles.get(tabId) || 'AI 浏览器';
    }

    function AiStarIcon({ size = 14 }) {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      },
        h('path', {
          d: 'M8 1.5l1.5 4.2 4.2 1.5-4.2 1.5L8 13l-1.5-4.3L2.3 7.2l4.2-1.5z',
          fill: 'currentColor',
        }),
      );
    }

    function ChromeButton({ label, onClick, disabled = false, active = false, takeover = false, children }) {
      return h('button', {
        type: 'button',
        className: `dsh-ai-browser-tool${takeover ? ' dsh-ai-browser-takeover' : ''}${active ? ' is-active' : ''}`,
        title: label,
        'aria-label': label,
        'aria-pressed': active,
        disabled,
        onClick,
      }, children);
    }

    function IconBack() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': true,
      },
        h('path', {
          d: 'M10 4L6.70711 7.29289C6.31658 7.68342 6.31658 8.31658 6.70711 8.70711L10 12',
          stroke: 'currentColor',
        }),
      );
    }

    function IconForward() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': true,
      },
        h('path', {
          d: 'M6 12L9.29289 8.70711C9.68342 8.31658 9.68342 7.68342 9.29289 7.29289L6 4',
          stroke: 'currentColor',
        }),
      );
    }

    function IconReload() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': true,
      },
        h('path', {
          d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1',
          stroke: 'currentColor',
        }),
        h('path', {
          d: 'M14.4999 1.5V5.1H10.8999',
          stroke: 'currentColor',
        }),
      );
    }

    function IconGo() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': true,
      },
        h('path', {
          d: 'M11.7256 2.77441C12.5538 2.77469 13.2256 3.44616 13.2256 4.27441V10.1416H12.2256V4.27441C12.2256 3.99844 12.0015 3.77469 11.7256 3.77441H5.7207V2.77441H11.7256Z',
          fill: 'currentColor',
        }),
        h('path', {
          d: 'M2.77441 13.2255L12.3756 3.62427',
          stroke: 'currentColor',
        }),
      );
    }

    function IconUser() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
        h('circle', { cx: 8, cy: 5, r: 2.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M3.5 13c.55-2.35 2.1-3.55 4.5-3.55S12 10.65 12.5 13', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
      );
    }

    const CHROME_CSS = `
.dsh-ai-browser-root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;flex:auto;display:flex}
.dsh-ai-browser-toolbar{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:5px 6px;display:flex}
.dsh-ai-browser-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}
.dsh-ai-browser-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-ai-browser-tool:disabled{color:var(--dsw-alias-label-quaternary);cursor:default}
.dsh-ai-browser-takeover{width:auto;min-width:28px;padding:0 8px;gap:4px;white-space:nowrap;font:600 11px "Segoe UI","Microsoft YaHei",sans-serif}
.dsh-ai-browser-takeover.is-active{color:var(--dsw-alias-state-warning-primary,#f59e0b);background:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#f59e0b) 12%,transparent)}
.dsh-ai-browser-address-box{flex:auto;min-width:0;position:relative;display:flex}
.dsh-ai-browser-address{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-static-neutral-bluish-600,#81858c);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 34px 0 9px;outline:none}
.dsh-ai-browser-address:focus{color:var(--dsw-alias-label-primary)}
.dsh-ai-browser-address:placeholder-shown{color:var(--dsw-static-neutral-bluish-600,#81858c)}
.dsh-ai-browser-address::placeholder{color:var(--dsw-static-neutral-bluish-600,#81858c);opacity:1}
.dsh-ai-browser-address.is-error{border-color:var(--dsw-alias-state-error-primary,#ef4444)}
.dsh-ai-browser-go{visibility:hidden;opacity:0;position:absolute;top:0;right:0;width:28px;height:28px;border:0;background:0 0;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.dsh-ai-browser-address-box:focus-within .dsh-ai-browser-go{visibility:visible;opacity:1}
.dsh-ai-browser-go:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-ai-browser-viewport{position:relative;flex:auto;min-height:0;display:flex}
.dsh-ai-browser-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);background:var(--dsw-alias-bg-base);pointer-events:none}
.dsh-ai-browser-webview{flex:auto;width:100%;min-width:0;height:100%;min-height:0;display:flex}
`;

    // ------------------------------------------------------------------ native page scripts
    function pageRead(options) {
      const clean = (value) => String(value ?? '').replace(/[ \t]+/g, ' ').trim();
      const SENSITIVE_KEYS = 'access_token|refresh_token|id_token|token|jwt|jwt_token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|code';
      const redactText = (value) => String(value ?? '')
        .replace(new RegExp(`\\b(${SENSITIVE_KEYS})=([^&\\s"'<>]+)`, 'gi'), '$1=***')
        .replace(new RegExp(`((?:${SENSITIVE_KEYS})%3D)([^%&\\s"'<>]+)`, 'gi'), '$1***')
        .replace(new RegExp(`((?:${SENSITIVE_KEYS})%253D)([^%&\\s"'<>]+)`, 'gi'), '$1***')
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***')
        .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, '$1***');
      const redactUrl = (value) => {
        try {
          const url = new URL(String(value));
          for (const key of Array.from(url.searchParams.keys())) {
            if (new RegExp(`^(${SENSITIVE_KEYS})$`, 'i').test(key)) url.searchParams.set(key, '***');
          }
          return url.href;
        } catch {
          return String(value ?? '');
        }
      };
      const opts = options || {};
      const OFFSET = Math.min(10000, Math.max(0, Math.floor(Number(opts.offset) || 0)));
      const MODE = ['minimal', 'interactive', 'standard', 'full'].includes(opts.mode) ? opts.mode : 'standard';
      const DEFAULT_ELEMENTS = MODE === 'minimal' ? 20 : 200;
      const MAX_ELEMENTS = Math.min(500, Math.max(20, Math.floor(Number(opts.limit) || DEFAULT_ELEMENTS)));
      const TEXT_LIMIT = Math.min(
        60000,
        Math.max(500, Math.floor(Number(opts.textLimit) || (MODE === 'minimal' ? 600 : 24000))),
      );
      const SCOPE = typeof opts.scope === 'string' ? opts.scope.trim() : '';
      const INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]';
      const MAX_DEPTH = 3;
      const elements = [];
      const usedIds = new Set();
      const texts = [];
      const notes = [];
      const skippedFrames = new Set();
      let seen = 0;
      let roots = [document];
      let scopeNote = '';
      if (SCOPE) {
        try {
          const scoped = Array.from(document.querySelectorAll(SCOPE)).slice(0, 20);
          if (scoped.length > 0) roots = scoped;
          else scopeNote = `[scope 未匹配：${SCOPE}]`;
        } catch {
          scopeNote = `[scope 无效：${SCOPE}]`;
        }
      }

      const hash = (value) => {
        let h = 2166136261;
        for (let i = 0; i < value.length; i += 1) {
          h ^= value.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(36);
      };

      function elementPath(el) {
        // Structural path inside the current document. It does not depend on
        // traversal order, scope or offset, so the same element keeps the same
        // id whether the caller observes the whole page or a subtree.
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1) {
          const parent = node.parentElement;
          if (!parent) {
            parts.unshift(node.tagName.toLowerCase());
            break;
          }
          let index = 1;
          for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (sibling.tagName === node.tagName) index += 1;
          }
          parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${index})`);
          node = parent;
        }
        const root = el.getRootNode?.();
        if (root && root.host) return `${elementPath(root.host)}>>>${parts.join('>')}`;
        return parts.join('>');
      }

      function stableId(el, framePath) {
        // The signature deliberately never includes a live input value: restoring
        // form state, autofill or our own typing would otherwise re-key the element
        // and make a stale id point at a *different* field (which silently types
        // into the wrong place). A structural path replaces the old traversal
        // counter, so scope/offset cannot shift ids between observations. The path
        // also distinguishes duplicate fields in repeated rows via nth-of-type.
        const sig = [
          el.tagName,
          el.getAttribute('id') || '',
          el.getAttribute('name') || '',
          el.getAttribute('aria-label') || '',
          el.getAttribute('role') || '',
          el.getAttribute('type') || '',
          el.getAttribute('href') || '',
          el.getAttribute('placeholder') || '',
          elementPath(el),
        ].join('|');
        const prefix = framePath ? `f${framePath.replace(/\./g, '-')}-` : '';
        let id = `dsh-${prefix}${hash(sig)}`;
        let n = 2;
        while (usedIds.has(id)) {
          id = `dsh-${prefix}${hash(sig)}-${n}`;
          n += 1;
        }
        usedIds.add(id);
        return id;
      }

      // When an element cannot receive pointer events, find the element the page
      // actually expects to be clicked, so the snapshot can tell the model where
      // to aim. Two distinct cases matter:
      //   1. a sibling/associated <label for="..."> that the UA uses as the
      //      click proxy (el.labels covers both wrapping and explicit-for forms),
      //   2. a wrapping custom control (role=checkbox/switch/button).
      const isClickTarget = (node, el) => {
        if (!node) return false;
        const isLabel = node.tagName === 'LABEL';
        const wraps = isLabel && node.contains(el);
        const isControl = ['BUTTON', 'A'].includes(node.tagName)
          || node.getAttribute('role') === 'button'
          || node.getAttribute('role') === 'checkbox'
          || node.getAttribute('role') === 'switch';
        return wraps || isControl;
      };
      const isReachable = (view, node) => {
        try {
          const style = view.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (style.pointerEvents === 'none') return false;
          const rect = node.getBoundingClientRect();
          return !(rect.width < 2 || rect.height < 2);
        } catch {
          return false;
        }
      };
      const clickableAncestor = (el) => {
        const view = el.ownerDocument?.defaultView || window;
        // Case 1: the browser's own label association (covers <label for> siblings).
        try {
          for (const label of Array.from(el.labels || [])) {
            if (isReachable(view, label)) return label;
          }
        } catch {
          // el.labels is unavailable on non-form controls
        }
        // Case 2: a wrapping label/control, walking up a few levels.
        let node = el;
        for (let depth = 0; depth < 4 && node; depth += 1) {
          node = node.parentElement;
          if (!node || node === el.ownerDocument?.body) break;
          if (!isReachable(view, node)) continue;
          if (isClickTarget(node, el)) return node;
        }
        return null;
      };
      const describeElement = (el) => {
        const tag = el.tagName.toLowerCase();
        const id = el.getAttribute('id');
        return id ? `${tag}#${id}` : tag;
      };
      const interactiveContext = (el) => {
        const parts = [];
        let node = el.parentElement;
        for (let depth = 0; depth < 6 && node && node !== document.body; depth += 1, node = node.parentElement) {
          const role = node.getAttribute('role');
          if (!['SECTION', 'FORM', 'FIELDSET', 'ARTICLE', 'MAIN', 'NAV', 'DIALOG', 'TABLE'].includes(node.tagName)
            && !['group', 'region', 'form', 'navigation'].includes(role)) {
            continue;
          }
          const id = node.getAttribute('id');
          const label = node.getAttribute('aria-label') || '';
          let heading = '';
          try {
            heading = clean(node.querySelector('h1,h2,h3,h4,h5,h6,legend')?.innerText || '');
          } catch {
            heading = '';
          }
          const name = `${node.tagName.toLowerCase()}${id ? `#${id}` : ''}${label ? ` ${label}` : ''}${heading ? ` ${heading}` : ''}`;
          parts.unshift(name.slice(0, 80));
        }
        return clean(parts.join(' > ')).slice(0, 140);
      };

      function collect(doc, framePath, depth) {
        if (!doc) return;
        if (depth > MAX_DEPTH) {
          notes.push(`[iframe ${framePath} 层级超过 ${MAX_DEPTH}，未展开]`);
          return;
        }
        let nodes = [];
        try {
          nodes = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR));
          if (doc.nodeType === 1 && doc.matches(INTERACTIVE_SELECTOR)) nodes.unshift(doc);
        } catch {
          nodes = [];
        }
        for (const el of nodes) {
          try {
            const view = el.ownerDocument?.defaultView || window;
            const style = view.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || rect.width < 2 || rect.height < 2) {
              continue;
            }
            // Count every visible candidate before applying the cap so truncation
            // can be reported honestly instead of silently dropping page targets.
            seen += 1;
            if (seen <= OFFSET) continue;
            if (elements.length >= MAX_ELEMENTS) {
              if (framePath) skippedFrames.add(framePath);
              continue;
            }
            const id = stableId(el, framePath);
            el.setAttribute('data-dsh-id', id);
            el.setAttribute('data-dsh-rev', String(Number(window.__dshRevision) || 0));
            const labelText = clean(
              Array.from(el.labels || []).map((label) => label.innerText).join(' ')
              || el.getAttribute('aria-label')
              || String(el.getAttribute('aria-labelledby') || '')
                .split(/\s+/)
                .map((labelId) => el.ownerDocument?.getElementById(labelId)?.innerText || '')
                .join(' ')
              || el.closest('label')?.innerText
              || '',
            ).slice(0, 120);
            let checked;
            if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
              checked = Boolean(el.checked);
            } else if (el.hasAttribute('aria-checked')) {
              checked = el.getAttribute('aria-checked') === 'true';
            }
            const isSecretField = el.tagName === 'INPUT' && (el.type === 'password' || /pass(word)?|secret|token/i.test(el.getAttribute('name') || ''));
            const rawText = labelText
              || el.innerText
              || (isSecretField ? '' : el.value)
              || el.getAttribute('placeholder')
              || '';
            const entry = {
              id,
              tag: el.tagName.toLowerCase(),
              text: redactText(clean(rawText)).slice(0, 120),
              type: el.getAttribute('type') || '',
              name: el.getAttribute('name') || '',
              href: redactUrl(el.href || ''),
            };
            if (MODE === 'interactive') {
              const context = interactiveContext(el);
              if (context) entry.context = context;
            }
            if (typeof checked === 'boolean') entry.checked = checked;
            // Report pointer-events:none at observe time instead of letting the
            // model discover it through a failed click. Custom form components
            // (Tencent Meeting, Ant Design, Element UI) routinely hide the real
            // <input> this way and expect the wrapping <label> to be clicked, and
            // the two look identical in a snapshot otherwise.
            if (style.pointerEvents === 'none') {
              const target = clickableAncestor(el);
              entry.blocked = true;
              if (target) entry.blockedBy = describeElement(target);
            } else if (el.disabled === true || el.getAttribute('aria-disabled') === 'true') {
              entry.disabled = true;
            }
            elements.push(entry);
          } catch {
            // a detached or restricted node
          }
        }
        const main = MODE === 'minimal' ? doc.querySelector?.('main, [role="main"]') : null;
        const bodyText = MODE === 'minimal'
          ? (main?.innerText || doc.innerText || doc.body?.innerText || '')
          : (doc.innerText ?? doc.body?.innerText ?? '');
        if (MODE !== 'interactive' && bodyText.trim()) {
          texts.push(`${framePath ? `[iframe ${framePath}]\n` : ''}${redactText(bodyText)}`);
        }
        const frames = Array.from(doc.querySelectorAll('iframe, frame'));
        frames.forEach((frame, index) => {
          const src = frame.src || frame.getAttribute('src') || '';
          const path = framePath ? `${framePath}.${index}` : String(index);
          let sub = null;
          try {
            sub = frame.contentDocument || frame.contentWindow?.document || null;
          } catch {
            sub = null;
          }
          if (!sub) {
            notes.push(`[iframe ${path} 不可读: ${src || 'about:blank'}]`);
            return;
          }
          collect(sub, path, depth + 1);
        });
      }

      for (const root of roots) collect(root, '', 0);
      if (scopeNote) notes.push(scopeNote);
      if (MODE === 'minimal' && elements.length >= MAX_ELEMENTS) {
        notes.push(`[minimal: 元素列表限制为前 ${MAX_ELEMENTS} 个；需要更多请用 scope 或 limit]`);
      }
      if (seen > OFFSET + elements.length) {
        const where = skippedFrames.size > 0
          ? `（受影响 iframe: ${[...skippedFrames].join(', ')}）`
          : '';
        const listedEnd = OFFSET + elements.length;
        const nextOffset = listedEnd;
        notes.push(
          `[元素已截断：共 ${seen} 个可见元素，仅列出第 ${OFFSET + 1}-${listedEnd} 个；` +
          `其余元素没有 dsh-* id，可用 CSS 选择器点击，或用 offset=${nextOffset} 继续分页]${where}`,
        );
      } else if (OFFSET > 0 && elements.length === 0) {
        notes.push(`[元素已截断：offset=${OFFSET} 超出共 ${seen} 个可见元素]`);
      }
      try {
        const topText = document.body?.innerText || '';
        const codeViewer = document.querySelector('[data-testid="code-view"], [data-testid="code-viewer"]');
        const isCodePage = /\/blob\/|\/blame\//.test(location.pathname);
        const lineNumbers = [];
        for (const match of topText.matchAll(/^\s*(\d{1,6})\s*$/gm)) {
          lineNumbers.push(Number(match[1]));
          if (lineNumbers.length >= 300) break;
        }
        let lineGap = false;
        for (let i = 1; i < lineNumbers.length; i += 1) {
          if (lineNumbers[i] - lineNumbers[i - 1] > 1) {
            lineGap = true;
            break;
          }
        }
        if (codeViewer || (isCodePage && lineGap)) {
          notes.push('[页面可能使用虚拟滚动：PAGE TEXT 只包含可视区，代码/依赖列表可能不完整；建议打开 raw/blob 链接或分段读取]');
        }
      } catch {
        // detection is best-effort
      }
      const RAW_TEXT = texts.join('\n\n');
      const textTruncated = RAW_TEXT.length > TEXT_LIMIT;
      let text = (textTruncated ? RAW_TEXT.slice(0, TEXT_LIMIT) : RAW_TEXT)
        .replace(/\n{3,}/g, '\n\n');
      if (textTruncated) {
        notes.push(`[文本已截断：共 ${RAW_TEXT.length} 字符，仅保留前 ${TEXT_LIMIT} 个]`);
      }
      if (notes.length) {
        text += `\n\n${notes.join('\n')}`;
      }
      let dialogs = [];
      try {
        if (Array.isArray(window.__dshDialogs)) {
          dialogs = window.__dshDialogs.slice(-20);
          window.__dshDialogs.length = 0;
        }
      } catch {
        dialogs = [];
      }
      return {
        url: redactUrl(location.href),
        title: redactText(document.title),
        text,
        elements,
        dialogs: dialogs.map((dialog) => ({
          ...dialog,
          message: redactText(dialog.message),
          defaultValue: redactText(dialog.defaultValue),
        })),
        revision: Number(window.__dshRevision) || 0,
        mode: MODE,
      };
    }

    function pageExtract(spec) {
      const opts = spec || {};
      const clean = (value) => String(value ?? '').replace(/[ \t\r\n]+/g, ' ').trim();
      const redact = (value) => String(value ?? '')
        .replace(/\b(access_token|refresh_token|id_token|token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|jwt|jwt_token|code)=([^&\s"'<>]+)/gi, '$1=***')
        .replace(/\b(access_token|refresh_token|id_token|token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|jwt|jwt_token|code)%3D([^%&\s"'<>]+)/gi, '$1%3D***')
        .replace(/\b(access_token|refresh_token|id_token|token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|jwt|jwt_token|code)%253D([^%&\s"'<>]+)/gi, '$1%253D***')
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***')
        .replace(/\b(Bearer\s+)[^\s,;]+/gi, '$1***');
      const maxLength = Math.min(4000, Math.max(40, Math.floor(Number(opts.maxLength) || 600)));
      const data = { fields: {}, meta: {}, table: null, jsonld: [], ...(opts.debug === true ? { debug: { fields: {}, tables: [] } } : {}) };
      const errors = [];

      // Semantic fast path: find the elements a human would point at, without
      // making the caller guess a CSS selector. It promotes a matching cell to
      // its nearest row/card/control so the result carries useful context.
      const semanticQuery = typeof opts.query === 'string' ? clean(opts.query) : '';
      if (semanticQuery) {
        const queryLower = semanticQuery.toLowerCase();
        const tokens = queryLower.split(/[\s,]+/).filter(Boolean);
        const limit = Math.min(50, Math.max(1, Math.floor(Number(opts.limit) || 12)));
        const skipTags = new Set(['BODY', 'HTML', 'HEAD', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META']);
        const containerTags = new Set(['TR', 'LI', 'BUTTON', 'A', 'LABEL', 'ARTICLE', 'SECTION']);
        const pathOf = (el) => {
          const parts = [];
          let node = el;
          while (node && node.nodeType === 1) {
            const parent = node.parentElement;
            if (!parent) {
              parts.unshift(node.tagName.toLowerCase());
              break;
            }
            let index = 1;
            for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
              if (sibling.tagName === node.tagName) index += 1;
            }
            parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${index})`);
            node = parent;
          }
          return parts.join('>');
        };
        const seen = new Set();
        const candidates = [];
        const nodes = document.body ? Array.from(document.body.querySelectorAll('*')) : [];
        let visited = 0;
        for (const el of nodes) {
          if (visited++ > 15000) break;
          if (skipTags.has(el.tagName)) continue;
          const text = clean(el.innerText || el.textContent || '').slice(0, 2000);
          const attrs = ['aria-label', 'placeholder', 'title', 'name', 'id', 'data-testid']
            .map((name) => el.getAttribute(name) || '')
            .join(' ');
          const haystack = `${text} ${attrs}`.toLowerCase();
          const matches = haystack.includes(queryLower)
            || (tokens.length > 0 && tokens.every((token) => haystack.includes(token)));
          if (!matches) continue;
          // Promote a cell to its row/card/control; keep the result actionable.
          let target = el;
          let parent = el.parentElement;
          for (let depth = 0; depth < 4 && parent && parent !== document.body; depth += 1, parent = parent.parentElement) {
            if (containerTags.has(parent.tagName)) target = parent;
          }
          const targetText = clean(target.innerText || target.textContent || '').slice(0, 500);
          if (!targetText && !attrs) continue;
          const selector = pathOf(target);
          if (seen.has(selector)) continue;
          seen.add(selector);
          const context = [];
          let ancestor = target.parentElement;
          for (let depth = 0; depth < 3 && ancestor && ancestor !== document.body; depth += 1, ancestor = ancestor.parentElement) {
            context.unshift(ancestor.tagName.toLowerCase());
          }
          let score = targetText.toLowerCase().includes(queryLower) ? 1000 : 0;
          for (const token of tokens) if (haystack.includes(token)) score += 40;
          if (attrs.toLowerCase().includes(queryLower)) score += 100;
          score += Math.min(50, Math.max(0, 500 - targetText.length) / 20);
          const entry = {
            tag: target.tagName.toLowerCase(),
            text: targetText,
            selector,
            context: context.join('>'),
            score,
          };
          const dshId = target.getAttribute('data-dsh-id');
          if (dshId) entry.id = dshId;
          candidates.push(entry);
        }
        candidates.sort((left, right) => right.score - left.score || left.text.length - right.text.length);
        data.query = {
          query: semanticQuery,
          total: candidates.length,
          matches: candidates.slice(0, limit),
        };
        if (candidates.length === 0) errors.push(`query: 未找到匹配 "${semanticQuery}"`);
        return {
          url: location.href,
          title: document.title,
          revision: Number(window.__dshRevision) || 0,
          data,
          errors,
        };
      }

      function queryAll(selector) {
        const matches = [];
        function walk(doc, framePath, depth) {
          if (!doc || depth > 2) return;
          let nodes = [];
          try { nodes = Array.from(doc.querySelectorAll(selector)); } catch { nodes = []; }
          for (const el of nodes) matches.push({ el, frame: framePath });
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (sub) walk(sub, framePath ? `${framePath}.${Array.from(frames).indexOf(frame)}` : String(Array.from(frames).indexOf(frame)), depth + 1);
          }
        }
        walk(document, '', 0);
        return matches;
      }

      function fieldValue(el, attr) {
        const name = attr || 'text';
        let value;
        if (name === 'text') value = el.innerText ?? el.textContent ?? '';
        else if (name === 'html') value = el.innerHTML ?? '';
        else if (name === 'value') value = el.value ?? '';
        else if (name === 'href') value = el.href ?? '';
        else if (name === 'src') value = el.src ?? '';
        else if (name === 'checked') value = Boolean(el.checked);
        else value = el.getAttribute(name) ?? '';
        if (typeof value === 'boolean') return value;
        return redact(clean(value)).slice(0, maxLength);
      }

      function selectorDiagnostic(selector) {
        const tagNames = ['a', 'button', 'input', 'textarea', 'select', 'table', 'tr', 'li'];
        const counts = {};
        for (const tag of tagNames) counts[tag] = queryAll(tag).length;
        const samples = [];
        const classes = [];
        const seen = new Set();
        let visited = 0;
        for (const el of document.querySelectorAll('a,button,input,textarea,select,table,tr,li,[class],[data-testid]')) {
          if (visited++ > 400) break;
          const tag = String(el.tagName || '').toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).filter(Boolean) : [];
          const className = cls.length > 0 ? `.${cls.join('.')}` : '';
          const testId = el.getAttribute?.('data-testid');
          const sample = `${tag}${id}${className}${testId ? `[data-testid="${testId}"]` : ''}`;
          if (sample && !seen.has(sample) && samples.length < 12) {
            seen.add(sample);
            samples.push(sample);
          }
          for (const token of cls) {
            if (token.length >= 3 && classes.length < 16 && !classes.includes(token)) classes.push(token);
          }
        }
        const countText = tagNames.map((tag) => `${tag}=${counts[tag]}`).join(' ');
        return {
          selector,
          count: 0,
          page: counts,
          samples,
          classes,
          hint: `选择器匹配到 0 个元素；页面统计 ${countText}；元素示例：${samples.slice(0, 8).join(', ') || '(none)'}；类名示例：${classes.slice(0, 8).join(', ') || '(none)'}`,
        };
      }

      const fields = Array.isArray(opts.fields) ? opts.fields.slice(0, 50) : [];
      for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index] || {};
        const name = String(field.name || `field${index + 1}`);
        const selector = String(field.selector || '');
        if (!selector) {
          errors.push(`${name}: selector is required`);
          continue;
        }
        try {
          const matches = queryAll(selector);
          const limit = Math.min(50, Math.max(1, Math.floor(Number(field.limit) || 10)));
          if (matches.length === 0) {
            const diagnostic = selectorDiagnostic(selector);
            data.debug = data.debug || { fields: {}, tables: [] };
            data.debug.fields[name] = diagnostic;
            errors.push(`${name}: ${diagnostic.hint}`);
          } else if (opts.debug === true) {
            data.debug.fields[name] = {
              count: matches.length,
              tags: matches.slice(0, 5).map(({ el }) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className ? `.${String(el.className).split(/\s+/).slice(0, 2).join('.')}` : ''}`),
              sample: fieldValue(matches[0].el, field.attr).slice(0, 200),
            };
          }
          if (field.all === true) {
            data.fields[name] = matches.slice(0, limit).map(({ el }) => fieldValue(el, field.attr));
            data.fields[`${name}__count`] = matches.length;
          } else {
            data.fields[name] = matches.length > 0 ? fieldValue(matches[0].el, field.attr) : null;
            data.fields[`${name}__count`] = matches.length;
          }
          if (matches.length > limit && field.all === true) {
            errors.push(`${name}: truncated to ${limit} of ${matches.length}`);
          }
        } catch (error) {
          errors.push(`${name}: ${error.message || String(error)}`);
        }
      }

      const metaSpec = opts.meta === true ? [
        ['title', 'title'],
        ['description', 'meta[name="description"]', 'content'],
        ['canonical', 'link[rel="canonical"]', 'href'],
        ['ogTitle', 'meta[property="og:title"]', 'content'],
        ['ogDescription', 'meta[property="og:description"]', 'content'],
        ['ogImage', 'meta[property="og:image"]', 'content'],
        ['language', 'html', 'lang'],
      ] : [];
      for (const [name, selector, attr] of metaSpec) {
        try {
          const element = document.querySelector(selector);
          data.meta[name] = element ? fieldValue(element, attr || 'text') : null;
        } catch {
          data.meta[name] = null;
        }
      }

      if (opts.table && typeof opts.table === 'object') {
        try {
          const { selector, limit: tableLimit } = opts.table;
          const tableMatches = queryAll(String(selector || 'table'));
          const readHeaders = (table) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            const headerRow = rows.find((row) => row.querySelector('th'));
            return {
              rows,
              headerRow,
              headers: headerRow ? Array.from(headerRow.querySelectorAll('th,td')).map((cell) => fieldValue(cell, 'text')) : [],
            };
          };
          if (tableMatches.length === 0) {
            const diagnostic = selectorDiagnostic(String(selector || 'table'));
            data.debug = data.debug || { fields: {}, tables: [] };
            data.debug.tables = [];
            errors.push(`table: ${diagnostic.hint}`);
          } else if (opts.debug === true) {
            data.debug.tables = tableMatches.slice(0, 10).map(({ el, frame }, tableIndex) => {
              const info = readHeaders(el);
              return {
                index: tableIndex,
                frame: frame || 'main',
                headers: info.headers,
                rows: Math.max(0, info.rows.length - (info.headerRow ? 1 : 0)),
              };
            });
          }
          const requestedIndex = Math.max(0, Math.floor(Number(opts.table.index) || 0));
          const table = tableMatches[requestedIndex]?.el;
          if (table) {
            const { rows, headerRow, headers } = readHeaders(table);
            const maxRows = Math.min(100, Math.max(1, Math.floor(Number(tableLimit) || 20)));
            const bodyRows = rows.filter((row) => row !== headerRow).slice(0, maxRows).map((row) => Array.from(row.querySelectorAll('td,th')).slice(0, 30).map((cell) => fieldValue(cell, 'text')));
            data.table = { index: requestedIndex, headers, rows: bodyRows, truncated: Math.max(0, rows.length - bodyRows.length - (headerRow ? 1 : 0)) };
          } else if (tableMatches.length > 0) {
            errors.push(`table: index ${requestedIndex} 超出范围，共匹配到 ${tableMatches.length} 个 table`);
          }
        } catch (error) {
          errors.push(`table: ${error.message || String(error)}`);
        }
      }

      if (opts.jsonld === true) {
        try {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 10);
          for (const script of scripts) {
            try {
              data.jsonld.push(JSON.parse(script.textContent || 'null'));
            } catch (error) {
              errors.push(`jsonld: ${error.message || String(error)}`);
            }
          }
        } catch (error) {
          errors.push(`jsonld: ${error.message || String(error)}`);
        }
      }

      return {
        url: location.href,
        title: document.title,
        revision: Number(window.__dshRevision) || 0,
        data,
        errors,
      };
    }

    function extractScript(spec) {
      return `(${pageExtract.toString()})(${JSON.stringify(spec)})`;
    }

    function readScript(options = {}) {
      return `(${pageRead.toString()})(${JSON.stringify(options)})`;
    }

    function pageFallback() {
      let text = '';
      try {
        text = document.body?.innerText
          || document.body?.textContent
          || document.documentElement?.innerText
          || document.documentElement?.textContent
          || '';
      } catch {
        text = '';
      }
      return {
        url: location.href,
        title: document.title || '',
        text: String(text || '').slice(0, 24000),
        elements: [],
        dialogs: [],
      };
    }

    const FALLBACK_SCRIPT = `(${pageFallback.toString()})()`;

    function pageFingerprint() {
      const readText = (doc, depth) => {
        if (!doc || depth > 3) return '';
        let text = String(doc.body?.innerText || doc.innerText || '');
        let frames = [];
        try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
        for (const frame of frames) {
          let sub = null;
          try { sub = frame.contentDocument; } catch { sub = null; }
          if (sub) text += `\n${readText(sub, depth + 1)}`;
        }
        return text;
      };
      const text = readText(document, 0).replace(/\s+/g, ' ').trim().slice(0, 8000);
      let h = 2166136261;
      for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const formState = Array.from(document.querySelectorAll('input,textarea,select,[aria-checked]'))
        .slice(0, 300)
        .map((el) => [
          el.tagName,
          el.getAttribute('type') || '',
          el.checked ? '1' : '0',
          el.getAttribute('aria-checked') || '',
          String(el.value ?? ''),
        ].join(':'))
        .join('|');
      let fh = 2166136261;
      for (let i = 0; i < formState.length; i += 1) {
        fh ^= formState.charCodeAt(i);
        fh = Math.imul(fh, 16777619);
      }
      return [
        location.href,
        document.title,
        document.querySelectorAll('*').length,
        text.length,
        (h >>> 0).toString(36),
        (fh >>> 0).toString(36),
        String(window.__dshRevision || 0),
      ].join('|');
    }

    const FINGERPRINT_SCRIPT = `(${pageFingerprint.toString()})()`;

    const DIALOG_HOOK_SCRIPT = `(() => {
      if (window.__dshDialogHooked) return;
      window.__dshDialogHooked = true;
      window.__dshDialogs = [];
      const record = (type, message, defaultValue) => {
        try {
          window.__dshDialogs.push({
            type,
            message: String(message ?? '').slice(0, 500),
            defaultValue: String(defaultValue ?? '').slice(0, 200),
            accepted: false,
            time: new Date().toISOString(),
          });
        } catch {
          // recording must never break the page
        }
      };
      try {
        window.alert = function (message) {
          record('alert', message);
        };
      } catch {}
      try {
        window.confirm = function (message) {
          record('confirm', message);
          return false;
        };
      } catch {}
      try {
        window.prompt = function (message, defaultValue) {
          record('prompt', message, defaultValue);
          return null;
        };
      } catch {}
    })()`;

    function revisionHookScript(base) {
      return `(() => {
        if (window.__dshRevisionHooked) return;
        window.__dshRevisionHooked = true;
        window.__dshRevision = ${base};
        try {
          const observer = new MutationObserver(() => {
            window.__dshRevision += 1;
          });
          observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
          });
          window.__dshRevisionObserver = observer;
        } catch {
          // revision is best-effort
        }
      })()`;
    }

    const ACTIONABILITY_SCRIPT = `function checkActionable(el, kind) {
      if (!el || !el.isConnected) return { code: 'STALE_REF', error: '元素已从页面移除' };
      const view = el.ownerDocument?.defaultView || window;
      const style = view.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width < 2 || rect.height < 2) {
        return { code: 'NOT_VISIBLE', error: '元素当前不可见' };
      }
      if (style.pointerEvents === 'none') {
        return { code: 'NOT_ACTIONABLE', error: '元素当前不接收指针事件' };
      }
      if (el.disabled === true || el.getAttribute('aria-disabled') === 'true') {
        return { code: 'DISABLED', error: '元素当前被禁用' };
      }
      if (kind === 'type') {
        const tag = el.tagName;
        const inputType = String(el.type || '').toLowerCase();
        if (!(el.isContentEditable || tag === 'TEXTAREA' || (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(inputType)))) {
          return { code: 'NOT_EDITABLE', error: '目标不是可编辑文本控件' };
        }
        if (el.readOnly === true || el.hasAttribute('readonly')) {
          return { code: 'NOT_EDITABLE', error: '目标处于只读状态' };
        }
      }
      return null;
    }`;

    function clickScript(target) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const target = refMatch ? refMatch[1] : rawTarget;
        const expectedRevision = refMatch ? Number(refMatch[2]) : null;
        ${ACTIONABILITY_SCRIPT}
        function find(doc) {
          let el = null;
          try {
            el = target.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + target + '"]')
              : doc.querySelector(target);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            const found = find(sub);
            if (found) return found;
          }
          return null;
        }
        const el = find(document);
        if (!el) return target.startsWith('dsh-')
          ? { ok: false, code: 'STALE_REF', error: '目标不在当前页面，快照可能已过期' }
          : { ok: false, code: 'NOT_FOUND', error: '找不到目标：' + target };
        if (expectedRevision !== null) {
          const currentRevision = Number(window.__dshRevision) || 0;
          const observedRevision = Number(el.getAttribute('data-dsh-rev'));
          if (currentRevision !== expectedRevision || observedRevision !== expectedRevision) {
            return {
              ok: false,
              stale: true,
              code: 'STALE_REF',
              error: '快照已失效：目标 revision ' + observedRevision + '，当前 revision ' + currentRevision + '；请重新 observe/read',
            };
          }
        }
        const actionable = checkActionable(el, 'click');
        if (actionable) return { ok: false, ...actionable };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return { ok: true, href: el.href || '' };
      })()`;
    }

    function typeScript(target, text, submit) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const target = refMatch ? refMatch[1] : rawTarget;
        const expectedRevision = refMatch ? Number(refMatch[2]) : null;
        ${ACTIONABILITY_SCRIPT}
        const value = ${JSON.stringify(text)};
        const submit = ${submit ? 'true' : 'false'};
        function find(doc) {
          let el = null;
          try {
            el = target.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + target + '"]')
              : doc.querySelector(target);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            const found = find(sub);
            if (found) return found;
          }
          return null;
        }
        const el = find(document);
        if (!el) return target.startsWith('dsh-')
          ? { ok: false, code: 'STALE_REF', error: '目标不在当前页面，快照可能已过期' }
          : { ok: false, code: 'NOT_FOUND', error: '找不到目标：' + target };
        if (expectedRevision !== null) {
          const currentRevision = Number(window.__dshRevision) || 0;
          const observedRevision = Number(el.getAttribute('data-dsh-rev'));
          if (currentRevision !== expectedRevision || observedRevision !== expectedRevision) {
            return {
              ok: false,
              stale: true,
              code: 'STALE_REF',
              error: '快照已失效：目标 revision ' + observedRevision + '，当前 revision ' + currentRevision + '；请重新 observe/read',
            };
          }
        }
        const actionable = checkActionable(el, 'type');
        if (actionable) return { ok: false, ...actionable };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.focus();
        if (el.isContentEditable) {
          el.textContent = value;
        } else {
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(el, value); else el.value = value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (submit) {
          if (el.form && typeof el.form.requestSubmit === 'function') el.form.requestSubmit();
          else el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        }
        return { ok: true };
      })()`;
    }

    function selectScript(target, wanted) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const target = refMatch ? refMatch[1] : rawTarget;
        const expectedRevision = refMatch ? Number(refMatch[2]) : null;
        ${ACTIONABILITY_SCRIPT}
        const wanted = ${JSON.stringify(wanted)};
        const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
        function find(doc) {
          let el = null;
          try {
            el = target.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + target + '"]')
              : doc.querySelector(target);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            const found = find(sub);
            if (found) return found;
          }
          return null;
        }
        const el = find(document);
        if (!el) return target.startsWith('dsh-')
          ? { ok: false, code: 'STALE_REF', error: '目标不在当前页面，快照可能已过期' }
          : { ok: false, code: 'NOT_FOUND', error: '找不到目标：' + target };
        if (expectedRevision !== null) {
          const currentRevision = Number(window.__dshRevision) || 0;
          const observedRevision = Number(el.getAttribute('data-dsh-rev'));
          if (currentRevision !== expectedRevision || observedRevision !== expectedRevision) {
            return { ok: false, stale: true, code: 'STALE_REF', error: '快照已失效，请重新 observe/read' };
          }
        }
        if (el.tagName !== 'SELECT') {
          return { ok: false, code: 'NOT_SELECT', error: 'select 只能用于 <select>，目标是 ' + el.tagName.toLowerCase() };
        }
        const actionable = checkActionable(el, 'click');
        if (actionable) return { ok: false, ...actionable };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.focus();
        const options = Array.from(el.options || []);
        const needle = normalize(wanted);
        let option = options.find((item) => normalize(item.textContent) === needle)
          || options.find((item) => normalize(item.value) === needle)
          || options.find((item) => normalize(item.textContent).includes(needle) || normalize(item.value).includes(needle));
        if (!option) {
          return {
            ok: false,
            code: 'OPTION_NOT_FOUND',
            error: '找不到选项：' + wanted,
            options: options.slice(0, 20).map((item) => ({ text: item.textContent.trim(), value: item.value })),
          };
        }
        if (el.multiple) {
          for (const item of options) item.selected = item === option;
        } else {
          option.selected = true;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: el.value, text: option.textContent.trim() };
      })()`;
    }

    function hoverScript(target) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const target = refMatch ? refMatch[1] : rawTarget;
        const expectedRevision = refMatch ? Number(refMatch[2]) : null;
        ${ACTIONABILITY_SCRIPT}
        function find(doc) {
          let el = null;
          try {
            el = target.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + target + '"]')
              : doc.querySelector(target);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            const found = find(sub);
            if (found) return found;
          }
          return null;
        }
        const el = find(document);
        if (!el) return target.startsWith('dsh-')
          ? { ok: false, code: 'STALE_REF', error: '目标不在当前页面，快照可能已过期' }
          : { ok: false, code: 'NOT_FOUND', error: '找不到目标：' + target };
        if (expectedRevision !== null) {
          const currentRevision = Number(window.__dshRevision) || 0;
          const observedRevision = Number(el.getAttribute('data-dsh-rev'));
          if (currentRevision !== expectedRevision || observedRevision !== expectedRevision) {
            return {
              ok: false,
              stale: true,
              code: 'STALE_REF',
              error: '快照已失效：目标 revision ' + observedRevision + '，当前 revision ' + currentRevision + '；请重新 observe/read',
            };
          }
        }
        const actionable = checkActionable(el, 'hover');
        if (actionable) return { ok: false, ...actionable };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = el.getBoundingClientRect();
        const base = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        };
        for (const type of ['pointerover', 'pointermove', 'mouseover', 'mousemove']) {
          try {
            const Ctor = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
            el.dispatchEvent(new Ctor(type, base));
          } catch {}
        }
        for (const type of ['pointerenter', 'mouseenter']) {
          try {
            const Ctor = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
            el.dispatchEvent(new Ctor(type, { ...base, bubbles: false }));
          } catch {}
        }
        return { ok: true };
      })()`;
    }

    function hoverPointScript(target) {
      return `(() => {
        const target = ${JSON.stringify(target)};
        function find(doc, offsetX, offsetY, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = target.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + target + '"]')
              : doc.querySelector(target);
          } catch {
            el = null;
          }
          if (el) {
            el.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = el.getBoundingClientRect();
            return {
              ok: true,
              x: offsetX + rect.left + rect.width / 2,
              y: offsetY + rect.top + rect.height / 2,
            };
          }
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            frame.scrollIntoView({ block: 'center', inline: 'center' });
            const frameRect = frame.getBoundingClientRect();
            const found = find(sub, offsetX + frameRect.left, offsetY + frameRect.top, depth + 1);
            if (found) return found;
          }
          return null;
        }
        return find(document, 0, 0, 0) || { ok: false, error: '找不到目标：' + target };
      })()`;
    }

    function targetPointScript(target, kind) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const kind = ${JSON.stringify(kind)};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        const expectedRevision = refMatch ? Number(refMatch[2]) : null;
        ${ACTIONABILITY_SCRIPT}
        function find(doc, offsetX, offsetY, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = baseTarget.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + baseTarget + '"]')
              : doc.querySelector(baseTarget);
          } catch {
            el = null;
          }
          if (el) {
            if (expectedRevision !== null) {
              const currentRevision = Number(window.__dshRevision) || 0;
              const observedRevision = Number(el.getAttribute('data-dsh-rev'));
              if (currentRevision !== expectedRevision || observedRevision !== expectedRevision) {
                return {
                  ok: false,
                  code: 'STALE_REF',
                  error: '快照已失效：目标 revision ' + observedRevision + '，当前 revision ' + currentRevision + '；请重新 observe/read',
                };
              }
            }
            const actionable = checkActionable(el, kind);
            if (actionable) return { ok: false, ...actionable };
            el.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = el.getBoundingClientRect();
            return {
              ok: true,
              x: offsetX + rect.left + rect.width / 2,
              y: offsetY + rect.top + rect.height / 2,
              href: el.href || '',
            };
          }
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (!sub) continue;
            frame.scrollIntoView({ block: 'center', inline: 'center' });
            const frameRect = frame.getBoundingClientRect();
            const found = find(sub, offsetX + frameRect.left, offsetY + frameRect.top, depth + 1);
            if (found) return found;
          }
          return null;
        }
        const found = find(document, 0, 0, 0);
        if (found) return found;
        return baseTarget.startsWith('dsh-')
          ? { ok: false, code: 'STALE_REF', error: '目标不在当前页面，快照可能已过期' }
          : { ok: false, code: 'NOT_FOUND', error: '找不到目标：' + baseTarget };
      })()`;
    }

    function highlightScript(target, clear) {
      return `(() => {
        const clear = ${clear ? 'true' : 'false'};
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r\\d+$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        function cleanup() {
          for (const el of Array.from(document.querySelectorAll('[data-dsh-highlight="1"]'))) {
            try {
              el.style.outline = el.getAttribute('data-dsh-prev-outline') || '';
              el.style.outlineOffset = el.getAttribute('data-dsh-prev-outline-offset') || '';
              el.style.boxShadow = el.getAttribute('data-dsh-prev-box-shadow') || '';
              el.removeAttribute('data-dsh-highlight');
              el.removeAttribute('data-dsh-prev-outline');
              el.removeAttribute('data-dsh-prev-outline-offset');
              el.removeAttribute('data-dsh-prev-box-shadow');
            } catch {}
          }
        }
        cleanup();
        if (clear) return { ok: true, cleared: true };
        function find(doc, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = baseTarget.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + baseTarget + '"]')
              : doc.querySelector(baseTarget);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (sub) {
              const found = find(sub, depth + 1);
              if (found) return found;
            }
          }
          return null;
        }
        const el = find(document, 0);
        if (!el) return { ok: false, error: '找不到目标：' + baseTarget };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.setAttribute('data-dsh-highlight', '1');
        el.setAttribute('data-dsh-prev-outline', el.style.outline || '');
        el.setAttribute('data-dsh-prev-outline-offset', el.style.outlineOffset || '');
        el.setAttribute('data-dsh-prev-box-shadow', el.style.boxShadow || '');
        el.style.outline = '3px solid #ff6b35';
        el.style.outlineOffset = '2px';
        el.style.boxShadow = '0 0 0 6px rgba(255,107,53,0.25)';
        return { ok: true, cleared: false, text: (el.innerText || el.value || el.tagName || '').slice(0, 120) };
      })()`;
    }

    function uploadScript(target, files) {
      return `(async () => {
        const rawTarget = ${JSON.stringify(target)};
        const payload = ${JSON.stringify(files)};
        const refMatch = /^(.*)@r\\d+$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        function find(doc, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = baseTarget.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + baseTarget + '"]')
              : doc.querySelector(baseTarget);
          } catch { el = null; }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (sub) {
              const found = find(sub, depth + 1);
              if (found) return found;
            }
          }
          return null;
        }
        let input = find(document, 0);
        if (input && input.tagName !== 'INPUT') input = input.querySelector('input[type="file"]');
        if (!input || input.tagName !== 'INPUT' || input.type !== 'file') {
          return { ok: false, error: '目标不是 <input type="file">' };
        }
        if (payload.length > 1 && !input.multiple) {
          return { ok: false, error: '该 input 不支持多文件上传' };
        }
        const transfer = new DataTransfer();
        for (const file of payload) {
          const binary = atob(file.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          transfer.items.add(new File([bytes], file.name, { type: file.mime || 'application/octet-stream' }));
        }
        input.files = transfer.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, files: Array.from(input.files).map((file) => ({ name: file.name, size: file.size, type: file.type })) };
      })()`;
    }

    function dropScript(target, files, data) {
      return `(async () => {
        const rawTarget = ${JSON.stringify(target)};
        const payload = ${JSON.stringify(files)};
        const textData = ${JSON.stringify(data || {})};
        const refMatch = /^(.*)@r\\d+$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        function find(doc, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = baseTarget.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + baseTarget + '"]')
              : doc.querySelector(baseTarget);
          } catch { el = null; }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (sub) {
              const found = find(sub, depth + 1);
              if (found) return found;
            }
          }
          return null;
        }
        const el = find(document, 0);
        if (!el) return { ok: false, error: '找不到拖放目标：' + baseTarget };
        const transfer = new DataTransfer();
        for (const [mime, value] of Object.entries(textData)) {
          transfer.setData(String(mime), String(value));
        }
        for (const file of payload) {
          const binary = atob(file.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          transfer.items.add(new File([bytes], file.name, { type: file.mime || 'application/octet-stream' }));
        }
        const fire = (type) => {
          const event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer });
          el.dispatchEvent(event);
        };
        transfer.dropEffect = 'copy';
        fire('dragenter');
        fire('dragover');
        await new Promise((resolve) => setTimeout(resolve, 50));
        fire('drop');
        fire('dragleave');
        return {
          ok: true,
          files: payload.map((file) => ({ name: file.name, size: Math.floor(String(file.base64 || '').length * 3 / 4), type: file.mime || 'application/octet-stream' })),
          data: Object.keys(textData),
        };
      })()`;
    }

    function elementClipScript(target) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.*)@r\\d+$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        let el = null;
        try {
          el = baseTarget.startsWith('dsh-')
            ? document.querySelector('[data-dsh-id="' + baseTarget + '"]')
            : document.querySelector(baseTarget);
        } catch { el = null; }
        if (!el) return { ok: false, error: '找不到目标：' + baseTarget };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return { ok: false, error: '目标不可见或尺寸为 0' };
        return {
          ok: true,
          clip: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          },
          text: (el.innerText || el.tagName || '').slice(0, 120),
        };
      })()`;
    }

    function stitchScreenshotScript(segments, totalWidth, totalHeight) {
      return `(async () => {
        const segments = ${JSON.stringify(segments)};
        const width = ${JSON.stringify(totalWidth)};
        const height = ${JSON.stringify(totalHeight)};
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        for (const segment of segments) {
          const image = new Image();
          image.src = 'data:image/png;base64,' + segment.data;
          await image.decode();
          const targetY = Math.max(0, Math.min(height, segment.y));
          const copyHeight = Math.max(1, Math.min(image.height, height - targetY));
          context.drawImage(image, 0, 0, image.width, copyHeight, 0, targetY, width, copyHeight);
        }
        return canvas.toDataURL('image/png').split(',')[1] || '';
      })()`;
    }

    function notFoundScript(target) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const refMatch = /^(.+)@r(\\d+)$/.exec(rawTarget);
        const refRevision = refMatch ? Number(refMatch[2]) : null;
        const currentRevision = Number(window.__dshRevision) || 0;
        const visible = (el) => {
          try {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
          } catch { return false; }
        };
        const describe = (el) => {
          const tag = String(el.tagName || '').toLowerCase();
          const id = el.id ? '#' + el.id : '';
          const cls = typeof el.className === 'string'
            ? el.className.trim().split(/\\s+/).slice(0, 2).filter(Boolean).join('.')
            : '';
          const text = String(
            el.innerText || el.getAttribute('aria-label') || el.value || el.placeholder || el.getAttribute('title') || ''
          ).replace(/\\s+/g, ' ').trim().slice(0, 40);
          return tag + id + (cls ? '.' + cls : '') + (text ? ' "' + text + '"' : '');
        };
        const candidates = [];
        for (const el of document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]')) {
          if (!visible(el)) continue;
          candidates.push(describe(el));
          if (candidates.length >= 8) break;
        }
        const counts = {};
        for (const tag of ['a', 'button', 'input', 'textarea', 'select', 'table', 'tr', 'li']) {
          counts[tag] = document.querySelectorAll(tag).length;
        }
        const pageText = ['a','button','input','textarea','select','table','tr','li'].map((tag) => tag + '=' + counts[tag]).join(' ');
        const parts = [];
        if (refRevision !== null) {
          parts.push('目标 ref 属于 revision ' + refRevision + '，当前 revision ' + currentRevision + (refRevision === currentRevision ? '（同一页但仍未找到）' : '（很可能来自上一个页面）'));
        } else if (rawTarget.startsWith('dsh-')) {
          parts.push('这是 dsh-* 元素 id；如果是从上一个页面复制的，请重新 observe/read；当前 revision ' + currentRevision);
        }
        parts.push('当前页面：' + pageText);
        parts.push(candidates.length > 0 ? '可见操作元素：' + candidates.join(' | ') : '当前没有可见的 button/link/input 元素');
        return { summary: parts.join('；') };
      })()`;
    }

    function fieldStateScript(target, select) {
      return `(() => {
        const rawTarget = ${JSON.stringify(target)};
        const shouldSelect = ${select ? 'true' : 'false'};
        const refMatch = /^(.*)@r(\\d+)$/.exec(rawTarget);
        const baseTarget = refMatch ? refMatch[1] : rawTarget;
        function find(doc, depth) {
          if (!doc || depth > 3) return null;
          let el = null;
          try {
            el = baseTarget.startsWith('dsh-')
              ? doc.querySelector('[data-dsh-id="' + baseTarget + '"]')
              : doc.querySelector(baseTarget);
          } catch {
            el = null;
          }
          if (el) return el;
          let frames = [];
          try { frames = Array.from(doc.querySelectorAll('iframe, frame')); } catch { frames = []; }
          for (const frame of frames) {
            let sub = null;
            try { sub = frame.contentDocument; } catch { sub = null; }
            if (sub) {
              const found = find(sub, depth + 1);
              if (found) return found;
            }
          }
          return null;
        }
        const el = find(document, 0);
        if (!el) return { ok: false, error: '找不到目标：' + baseTarget };
        if (shouldSelect) {
          el.focus();
          if (el.isContentEditable) {
            const range = el.ownerDocument.createRange();
            range.selectNodeContents(el);
            const selection = el.ownerDocument.defaultView.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          } else if (typeof el.select === 'function') {
            el.select();
          }
        }
        const value = el.isContentEditable ? el.textContent : String(el.value ?? '');
        return { ok: true, value };
      })()`;
    }

    function waitForStop(element, timeoutMs) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          element.removeEventListener('did-stop-loading', finish);
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        element.addEventListener('did-stop-loading', finish);
      });
    }

    function normalizeAddress(input) {
      const value = String(input || '').trim();
      if (value === '') throw new Error('请输入地址');
      const candidate = /^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i.test(value) ? value : `https://${value}`;
      let url;
      try {
        url = new URL(candidate);
      } catch {
        throw new Error('地址无效');
      }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只允许 http/https');
      if (url.username || url.password) throw new Error('地址不能包含用户名或密码');
      return url.href;
    }

    function isAbortError(error) {
      return /ERR_ABORTED|\(-3\)|aborted/i.test(String(error?.message || error || ''));
    }

    function elementSignature(element) {
      return JSON.stringify([
        element.id,
        element.tag,
        element.text,
        element.type,
        element.name,
        element.href,
        typeof element.checked === 'boolean' ? element.checked : null,
      ]);
    }

    function buildDelta(previous, current) {
      const previousMap = new Map(previous.elements.map((element) => [element.id, element]));
      const currentMap = new Map(current.elements.map((element) => [element.id, element]));
      const added = [];
      const changed = [];
      for (const element of current.elements) {
        const old = previousMap.get(element.id);
        if (!old) added.push(element);
        else if (elementSignature(old) !== elementSignature(element)) changed.push(element);
      }
      const removed = previous.elements
        .filter((element) => !currentMap.has(element.id))
        .map((element) => element.id);
      const textChanged = previous.text !== current.text || previous.title !== current.title;
      return {
        added,
        removed,
        changed,
        textChanged,
        unchanged: added.length === 0 && removed.length === 0 && changed.length === 0 && !textChanged,
      };
    }

    function resolveTargetByDescriptor(snapshot, descriptor) {
      if (!descriptor) return null;
      let candidates = (snapshot.elements || []).filter((element) =>
        element.tag === descriptor.tag
        && element.text === descriptor.text
        && (!descriptor.name || element.name === descriptor.name));
      if (candidates.length === 1) return candidates[0].id;
      if (descriptor.name) {
        candidates = (snapshot.elements || []).filter((element) =>
          element.tag === descriptor.tag && element.name === descriptor.name);
        if (candidates.length === 1) return candidates[0].id;
      }
      return null;
    }

    // ------------------------------------------------------------------ native webview
    function NativePane({ onNewTab, useTabInfo }) {
      const tabInfo = typeof useTabInfo === 'function' ? useTabInfo() : undefined;
      const dshTabId = tabInfo?.tab?.id;
      const clientId = React.useMemo(
        () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        [],
      );
      const currentSessionId = () => {
        try {
          return hostRef.current?.closest?.('[data-sidebar-right-session]')
            ?.getAttribute('data-sidebar-right-session') || '';
        } catch {
          return '';
        }
      };
      const hostRef = React.useRef(null);
      const webviewRef = React.useRef(null);
      const consoleBufferRef = React.useRef([]);
      const consoleLastRef = React.useRef(null);
      const consoleSeenRef = React.useRef(0);
      const revisionBaseRef = React.useRef(0);
      const lastRevisionRef = React.useRef(0);
      const addressRef = React.useRef(null);
      const addressFocused = React.useRef(false);
      const [status, setStatus] = React.useState('启动 AI 浏览器…');
      const [title, setTitle] = React.useState('');
      const [address, setAddress] = React.useState('');
      const [currentUrl, setCurrentUrl] = React.useState('');
      const [addressError, setAddressError] = React.useState('');
      const [loading, setLoading] = React.useState(false);
      const [canGoBack, setCanGoBack] = React.useState(false);
      const [canGoForward, setCanGoForward] = React.useState(false);
      const [takeover, setTakeover] = React.useState(false);
      const takeoverRef = React.useRef(false);

      React.useEffect(() => {
        let disposed = false;
        let stopped = false;
        let bridge = null;
        let lease = '';
        let element = null;
        let detachOpenRequest = null;
        const observeBaselines = new Map();

        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function syncNavigation() {
          if (!element || element.isDestroyed?.()) return;
          try {
            const url = element.getURL();
            const blank = !url || url === 'about:blank' || url.startsWith('about:blank#');
            if (!addressFocused.current) setAddress(blank ? '' : url);
            setCurrentUrl(blank ? '' : url);
            setCanGoBack(Boolean(element.canGoBack()));
            setCanGoForward(Boolean(element.canGoForward()));
            setLoading(Boolean(element.isLoading()));
            const pageTitle = element.getTitle();
            if (pageTitle && !pageTitle.startsWith('about:blank')) {
              setTabTitle(dshTabId, pageTitle);
            }
          } catch {
            // guest is not ready
          }
        }

        function hookDialogs() {
          if (!element || element.isDestroyed?.()) return;
          element.executeJavaScript(DIALOG_HOOK_SCRIPT, true).catch(() => {});
        }

        function hookRevision() {
          if (!element || element.isDestroyed?.()) return;
          revisionBaseRef.current = Math.max(revisionBaseRef.current, lastRevisionRef.current) + 1;
          element.executeJavaScript(revisionHookScript(revisionBaseRef.current), true).catch(() => {});
        }

        async function report(id, payload) {
          try {
            await bridgePost('/result', { id, clientId, ...payload });
          } catch {
            // the host will time out
          }
        }

        function consoleLevelName(value) {
          const numeric = Number(value);
          if (Number.isFinite(numeric)) {
            return ['debug', 'info', 'warning', 'error'][Math.max(0, Math.min(3, numeric))] || 'info';
          }
          const text = String(value || '').toLowerCase();
          if (text.includes('error')) return 'error';
          if (text.includes('warn')) return 'warning';
          if (text.includes('debug')) return 'debug';
          return 'info';
        }

        function redactConsoleText(value) {
          const keys = 'access_token|refresh_token|id_token|token|password|passwd|secret|client_secret|api[_-]?key|key|session|auth|signature|sig|jwt|jwt_token|code';
          return String(value ?? '')
            .replace(new RegExp(`\\b(${keys})=([^&\\s"'<>)\\]]+)`, 'gi'), '$1=***')
            .replace(new RegExp(`((?:${keys})%3D)([^%&\\s"'<>)\\]]+)`, 'gi'), '$1***')
            .replace(new RegExp(`((?:${keys})%253D)([^%&\\s"'<>)\\]]+)`, 'gi'), '$1***')
            .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***')
            .replace(/\b(Bearer\s+)[^\s,;]+/gi, '$1***');
        }

        function pushConsole(level, message, line, source) {
          let text = String(message ?? '').replace(/\s+/g, ' ').trim();
          if (!text) return;
          text = redactConsoleText(text).slice(0, 1000);
          const cleanSource = redactConsoleText(source).slice(0, 300);
          const normalizedLevel = consoleLevelName(level);
          const now = Date.now();
          const duplicateWindow = normalizedLevel === 'error' ? 15000 : 5000;
          const duplicate = consoleBufferRef.current
            .slice()
            .reverse()
            .find((entry) => entry.level === normalizedLevel
              && entry.message === text
              && now - Date.parse(entry.time) < duplicateWindow);
          if (duplicate) return;
          consoleBufferRef.current.push({
            level: normalizedLevel,
            message: text,
            ...(Number.isFinite(Number(line)) && Number(line) > 0 ? { line: Number(line) } : {}),
            ...(cleanSource ? { source: cleanSource } : {}),
            time: new Date(now).toISOString(),
          });
          if (consoleBufferRef.current.length > 100) consoleBufferRef.current.splice(0, consoleBufferRef.current.length - 100);
        }

        function consoleSnapshot() {
          const entries = consoleBufferRef.current.slice(consoleSeenRef.current);
          consoleSeenRef.current = consoleBufferRef.current.length;
          return entries.slice(-20);
        }

        function clearConsoleBuffer() {
          consoleBufferRef.current = [];
          consoleSeenRef.current = 0;
          consoleLastRef.current = null;
        }

        function clearNavigationBuffers() {
          clearConsoleBuffer();
          if (typeof bridge?.network === 'function' && lease) {
            bridge.network(lease, { clear: true }).catch(() => {});
          }
        }

        async function hookPageErrors() {
          try {
            await element.executeJavaScript(`(() => {
              if (window.__dshPageErrorHook) return true;
              window.__dshPageErrorHook = true;
              window.__dshPageErrors = [];
              const push = (message, source, line) => {
                window.__dshPageErrors.push({
                  message: String(message || 'error').slice(0, 500),
                  source: String(source || '').slice(0, 300),
                  line: Number(line) || 0,
                });
                if (window.__dshPageErrors.length > 50) window.__dshPageErrors.shift();
              };
              window.addEventListener('error', (event) => push(event.message || 'error', event.filename, event.lineno));
              window.addEventListener('unhandledrejection', (event) => {
                const reason = event.reason;
                push(reason && (reason.message || reason.stack) || reason || 'unhandledrejection', 'unhandledrejection', 0);
              });
              return true;
            })()`, true);
          } catch {
            // page may be between documents
          }
        }

        async function collectPageErrors() {
          try {
            const errors = await element.executeJavaScript(`(() => {
              const items = Array.isArray(window.__dshPageErrors) ? window.__dshPageErrors.slice(-20) : [];
              if (Array.isArray(window.__dshPageErrors)) window.__dshPageErrors.length = 0;
              return items;
            })()`, true);
            for (const error of Array.isArray(errors) ? errors : []) {
              pushConsole('error', error?.message || 'page error', error?.line, error?.source);
            }
          } catch {
            // page may be between documents
          }
        }

        // Shared non-HTML fallback. Structured-DOM scripts cannot run on plain
        // text/JSON/PDF documents, so both observe and extract fall back to the
        // in-page text probe and then to an HTTP fetch of the same URL.
        async function readNonHtmlText() {
          let fallback = null;
          try {
            fallback = await element.executeJavaScript(FALLBACK_SCRIPT, true);
          } catch {
            fallback = null;
          }
          let url = '';
          let title = '';
          try {
            url = element.getURL();
            title = element.getTitle();
          } catch {
            // guest may be in a non-DOM document
          }
          if (fallback?.title) setTabTitle(dshTabId, fallback.title);
          let text = fallback?.text || '';
          let status = '当前页面类型不支持完整的结构化 DOM 读取（可能是纯文本/JSON/PDF）；已回退到纯文本读取';
          if (!text && /^https?:/i.test(url)) {
            try {
              const response = await fetch(url, { credentials: 'omit' });
              const contentType = String(response.headers.get('content-type') || '').toLowerCase();
              const textual = contentType.startsWith('text/')
                || contentType.includes('json')
                || contentType.includes('xml')
                || contentType.includes('javascript');
              if (response.ok && textual) {
                text = (await response.text()).slice(0, 24000);
                status = '当前页面不是 HTML；已通过 HTTP 读取纯文本/JSON 内容';
              }
            } catch {
              // CORS or network rejection; keep the warning only
            }
          }
          return {
            text,
            status,
            url: fallback?.url || url || '',
            title: fallback?.title || title || '',
          };
        }

        async function readSnapshot(options = {}) {
          try {
            const data = await element.executeJavaScript(readScript(options), true);
            const dataRevision = Number(data?.revision) || 0;
            if (dataRevision > lastRevisionRef.current) lastRevisionRef.current = dataRevision;
            let consoleEntries = [];
            if (options.includeConsole !== false) {
              await collectPageErrors();
              consoleEntries = consoleSnapshot();
            }
            if (data?.title) setTabTitle(dshTabId, data.title);
            return {
              ok: true,
              ...data,
              ...(consoleEntries.length > 0 ? { console: consoleEntries } : {}),
              takeover: takeoverRef.current,
            };
          } catch {
            const fallbackData = await readNonHtmlText();
            let consoleEntries = [];
            if (options.includeConsole !== false) {
              await collectPageErrors();
              consoleEntries = consoleSnapshot();
            }
            return {
              ok: true,
              url: fallbackData.url,
              title: fallbackData.title,
              text: fallbackData.text,
              elements: [],
              dialogs: [],
              status: fallbackData.status,
              ...(consoleEntries.length > 0 ? { console: consoleEntries } : {}),
              takeover: takeoverRef.current,
            };
          }
        }

        async function readAfterAction(args = {}) {
          const mode = ['none', 'minimal', 'interactive', 'standard', 'full'].includes(args.snapshot)
            ? args.snapshot
            : 'minimal';
          if (mode === 'none') {
            let info = { url: '', title: '', revision: 0, dialogs: [] };
            try {
              info = await element.executeJavaScript(`(() => {
                const dialogs = Array.isArray(window.__dshDialogs) ? window.__dshDialogs.slice(-20) : [];
                if (Array.isArray(window.__dshDialogs)) window.__dshDialogs.length = 0;
                return {
                  url: location.href,
                  title: document.title,
                  revision: Number(window.__dshRevision) || 0,
                  dialogs,
                };
              })()`, true);
            } catch {
              // guest may be between documents
            }
            let consoleEntries = [];
            if (args.includeConsole !== false) {
              await collectPageErrors();
              consoleEntries = consoleSnapshot();
            }
            return {
              ok: true,
              url: info.url || '',
              title: info.title || '',
              revision: Number(info.revision) || 0,
              status: '',
              text: '',
              elements: [],
              dialogs: Array.isArray(info.dialogs) ? info.dialogs : [],
              ...(consoleEntries.length > 0 ? { console: consoleEntries } : {}),
            };
          }
          return await readSnapshot({
            mode,
            ...(mode === 'minimal' ? { limit: 20 } : {}),
          });
        }

        async function waitForDomIdle(timeoutMs = 1200, quietMs = 250) {
          try {
            await element.executeJavaScript(`new Promise((resolve) => {
              let timer = null;
              const finish = () => {
                try { observer.disconnect(); } catch {}
                resolve(true);
              };
              const observer = new MutationObserver(() => {
                if (timer !== null) clearTimeout(timer);
                timer = setTimeout(finish, ${Math.max(50, Math.min(1000, quietMs))});
              });
              observer.observe(document.documentElement || document, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
              });
              timer = setTimeout(finish, ${Math.max(100, Math.min(5000, timeoutMs))});
            })`, true);
          } catch {
            await wait(300);
          }
        }

        function checkExpectSnapshot(snapshot, expect) {
          if (!expect || typeof expect !== 'object') return { ok: true };
          if (expect.urlIncludes !== undefined && !String(snapshot.url || '').includes(String(expect.urlIncludes))) {
            return { ok: false, reason: `url 不包含 ${expect.urlIncludes}` };
          }
          if (expect.titleIncludes !== undefined && !String(snapshot.title || '').includes(String(expect.titleIncludes))) {
            return { ok: false, reason: `title 不包含 ${expect.titleIncludes}` };
          }
          if (expect.textIncludes !== undefined && !String(snapshot.text || '').includes(String(expect.textIncludes))) {
            return { ok: false, reason: `正文不包含 ${expect.textIncludes}` };
          }
          if (expect.textExcludes !== undefined && String(snapshot.text || '').includes(String(expect.textExcludes))) {
            return { ok: false, reason: `正文仍包含 ${expect.textExcludes}` };
          }
          if (expect.element && typeof expect.element === 'object') {
            const wanted = String(expect.element.text || '');
            const elements = Array.isArray(snapshot.elements) ? snapshot.elements : [];
            const found = elements.find((entry) => entry.text === wanted)
              || elements.find((entry) => String(entry.text || '').includes(wanted));
            const shouldExist = expect.element.present !== false;
            if (shouldExist && !found) return { ok: false, reason: `元素不存在：${wanted}` };
            if (!shouldExist && found) return { ok: false, reason: `元素仍存在：${wanted}` };
            if (found && typeof expect.element.checked === 'boolean' && found.checked !== expect.element.checked) {
              return { ok: false, reason: `元素 ${wanted} 的 checked=${found.checked}` };
            }
          }
          return { ok: true };
        }

        async function waitForActExpect(expect, timeoutMs) {
          if (!expect || typeof expect !== 'object') return { ok: true };
          const started = Date.now();
          let last = { ok: false, reason: 'expect 未满足' };
          while (Date.now() - started <= Math.max(100, Math.min(10000, Number(timeoutMs) || 3000))) {
            try {
              const snapshot = await readSnapshot({ mode: 'standard', includeConsole: false });
              last = checkExpectSnapshot(snapshot, expect);
              if (last.ok) return last;
            } catch {
              last = { ok: false, reason: 'expect 读取页面失败' };
            }
            await wait(200);
          }
          return last;
        }

        async function observeSnapshot(options = {}) {
          const data = await readSnapshot(options);
          const revision = Number(data.revision) || 0;
          const current = {
            url: data.url || '',
            title: data.title || '',
            revision,
            text: data.text || '',
            elements: Array.isArray(data.elements) ? data.elements : [],
          };
          const effectiveMode = ['minimal', 'interactive', 'standard', 'full'].includes(options.mode)
            ? options.mode
            : 'standard';
          const params = {
            mode: effectiveMode,
            scope: typeof options.scope === 'string' ? options.scope.trim() : '',
            limit: Number(options.limit) || (effectiveMode === 'minimal' ? 20 : 200),
            offset: Number(options.offset) || 0,
            textLimit: Number(options.textLimit) || (effectiveMode === 'minimal' ? 600 : 24000),
          };
          current.params = params;
          const baselineKey = `${current.url}\n${JSON.stringify(params)}`;
          const previous = observeBaselines.get(baselineKey) || null;
          // Internal observers (approval checks, task verification, recipes) set
          // noBaseline so they never add or replace a caller baseline.
          if (options.noBaseline !== true) {
            if (observeBaselines.size >= 16) {
              const oldest = observeBaselines.keys().next().value;
              observeBaselines.delete(oldest);
            }
            observeBaselines.set(baselineKey, current);
          }
          const since = options.sinceRevision !== undefined && options.sinceRevision !== null
            ? Number(options.sinceRevision)
            : null;
          const revisionMatches = since !== null && Number.isFinite(since) && since > 0 && since === revision;
          const previousMatches = since !== null
            && previous !== null
            && Number.isFinite(since)
            && since > 0
            && since === previous.revision;
          const urlMatches = previous === null || previous.url === current.url;
          const describe = (value) => value
            ? `mode=${value.mode}, scope=${value.scope || '(none)'}, limit=${value.limit}, offset=${value.offset}, textLimit=${value.textLimit}`
            : '(none)';
          const noBaselineNote = since !== null && previous === null
            ? `没有匹配的 baseline（${describe(params)}）；已返回当前快照并重建 baseline`
            : null;
          const revisionMismatchNote = since !== null && previous !== null && !previousMatches
            ? `sinceRevision ${since} 与当前参数的 baseline revision ${previous.revision} 不匹配；已返回当前快照并重建 baseline`
            : null;
          const wantsDelta = previousMatches
            && !revisionMatches
            && urlMatches;
          if (!wantsDelta) {
            if (revisionMatches && urlMatches) {
              return {
                ok: true,
                url: current.url,
                title: current.title,
                status: data.status || '',
                revision,
                unchanged: true,
                full: false,
                delta: { added: [], removed: [], changed: [], textChanged: false },
                elements: [],
                text: '',
                dialogs: data.dialogs || [],
                ...(Array.isArray(data.console) && data.console.length > 0 ? { console: data.console } : {}),
                takeover: takeoverRef.current,
              };
            }
            const note = noBaselineNote || revisionMismatchNote;
            return {
              ...data,
              revision,
              full: true,
              unchanged: false,
              ...(note ? { status: [data.status, note].filter(Boolean).join('；') } : {}),
            };
          }
          const delta = buildDelta(previous, current);
          return {
            ok: true,
            url: current.url,
            title: current.title,
            status: data.status || '',
            revision,
            unchanged: delta.unchanged,
            full: false,
            delta: {
              added: delta.added,
              removed: delta.removed,
              changed: delta.changed,
              textChanged: delta.textChanged,
            },
            elements: [],
            text: '',
            dialogs: data.dialogs || [],
            ...(Array.isArray(data.console) && data.console.length > 0 ? { console: data.console } : {}),
            takeover: takeoverRef.current,
          };
        }

        async function waitForPageChange(before, timeoutMs = 2000) {          const started = Date.now();
          while (Date.now() - started < timeoutMs) {
            await wait(200);
            try {
              const after = await element.executeJavaScript(FINGERPRINT_SCRIPT, true);
              if (after !== before) return true;
            } catch {
              // the guest may be between documents during a navigation
            }
          }
          return false;
        }

        function actionError(result, fallback) {
          const error = new Error(result?.error || fallback);
          if (result?.code) error.code = result.code;
          return error;
        }

        function hrefAllowed(href, allowedDomains) {
          if (!href || !Array.isArray(allowedDomains) || allowedDomains.length === 0) return true;
          try {
            const host = new URL(href).hostname.toLowerCase();
            return allowedDomains.some((entry) => {
              const domain = String(entry).toLowerCase().replace(/^\*\./, '').replace(/^\./, '');
              return entry === '*' || host === domain || host.endsWith(`.${domain}`);
            });
          } catch {
            return true;
          }
        }

        async function execute(command) {
          const action = command.action;
          const args = command.args || {};
          try {
            if (!['read', 'observe', 'extract', 'console', 'network', 'downloads', 'screenshot'].includes(action) && takeoverRef.current) {
              return { ok: false, error: '用户已接管 AI 浏览器，AI 操作暂停', code: 'TAKEOVER' };
            }

            if (action === 'act') {
              const items = Array.isArray(args.actions) ? args.actions : [];
              if (items.length === 0) throw new Error('actions 不能为空');
              const stopOnError = args.stopOnError !== false;
              const selfHeal = args.selfHeal !== false;
              let deltaBaseline = null;
              if (args.snapshot === 'delta') {
                try {
                  deltaBaseline = await readSnapshot({ mode: 'standard', includeConsole: false });
                } catch {
                  deltaBaseline = null;
                }
              }
              const allowed = ['click', 'type', 'select', 'hover', 'navigate', 'back', 'reload', 'read', 'observe', 'extract'];
              const descriptors = new Map();
              if (selfHeal) {
                try {
                  const baseline = await readSnapshot({ mode: 'standard', includeConsole: false });
                  for (const item of items) {
                    const target = String(item?.target || '');
                    const base = target.replace(/@r\d+$/, '');
                    if (!base.startsWith('dsh-')) continue;
                    const element = (baseline.elements || []).find((entry) => entry.id === base);
                    if (element) {
                      const descriptor = {
                        tag: element.tag,
                        text: element.text,
                        name: element.name,
                        type: element.type,
                      };
                      descriptors.set(target, descriptor);
                      descriptors.set(base, descriptor);
                    }
                  }
                } catch {
                  // self-healing is best-effort
                }
              }
              const steps = [];
              let last = null;
              let failedStep = null;
              for (let index = 0; index < items.length; index += 1) {
                const item = items[index] || {};
                const subAction = String(item.action || '');
                if (!allowed.includes(subAction)) {
                  throw new Error(`批量动作不支持：${subAction || '(empty)'}`);
                }
                const subArgs = { ...item, snapshot: 'none', includeConsole: false };
                if (Array.isArray(args.allowedDomains)) subArgs.allowedDomains = args.allowedDomains;
                delete subArgs.action;
                const requestedTarget = String(subArgs.target || '');
                const descriptor = descriptors.get(requestedTarget)
                  || descriptors.get(requestedTarget.replace(/@r\d+$/, ''));
                let result;
                try {
                  result = await execute({ action: subAction, args: subArgs });
                } catch (error) {
                  result = { ok: false, error: error.message || String(error), code: error.code };
                }
                let stepOk = result?.ok !== false;
                let retried = false;
                let recovered = false;
                if (!stepOk && result?.code === 'STALE_REF' && descriptor) {
                  retried = true;
                  try {
                    const fresh = await readSnapshot({ mode: 'standard', includeConsole: false });
                    const resolved = resolveTargetByDescriptor(fresh, descriptor);
                    if (resolved) {
                      subArgs.target = resolved;
                      result = await execute({ action: subAction, args: subArgs });
                      stepOk = result?.ok !== false;
                      recovered = stepOk;
                    }
                  } catch {
                    // keep the original failure
                  }
                }
                let expectOk;
                let expectReason;
                if (stepOk && item.expect && typeof item.expect === 'object') {
                  const checked = await waitForActExpect(item.expect, item.timeoutMs);
                  expectOk = checked.ok;
                  expectReason = checked.reason;
                  if (!checked.ok) stepOk = false;
                }
                const step = {
                  index,
                  action: subAction,
                  ok: stepOk,
                  state: stepOk ? (recovered ? 'recovered' : 'done') : 'failed',
                  ...(retried ? { retried: true } : {}),
                  ...(recovered ? { recovered: true } : {}),
                  ...(typeof result?.changed === 'boolean' ? { changed: result.changed } : {}),
                  ...(typeof result?.revision === 'number' ? { revision: result.revision } : {}),
                  ...(result?.data && typeof result.data === 'object' ? { data: result.data } : {}),
                  ...(Array.isArray(result?.errors) && result.errors.length > 0 ? { errors: result.errors } : {}),
                  ...(expectOk !== undefined ? { expectOk } : {}),
                  ...(expectReason ? { expectReason } : {}),
                  ...(stepOk ? {} : {
                    ...(result?.code ? { code: result.code } : {}),
                    error: expectReason || result?.error || '动作失败',
                  }),
                };
                steps.push(step);
                if (stepOk) last = result;
                else {
                  failedStep = index;
                  if (stopOnError) break;
                }
              }
              let final = null;
              let deltaStatus = '';
              if (args.snapshot === 'delta') {
                if (!deltaBaseline) {
                  final = await readAfterAction({ snapshot: 'minimal' });
                  deltaStatus = 'delta baseline 建立失败；已返回 minimal';
                } else {
                  await waitForDomIdle();
                  try {
                    const current = await readSnapshot({ mode: 'standard' });
                    if (current.url !== deltaBaseline.url) {
                      final = await readAfterAction({ snapshot: 'minimal' });
                      deltaStatus = `页面已从 ${deltaBaseline.url} 跳转到 ${current.url}，delta 不跨页；返回新页面 minimal`;
                    } else {
                      const diff = buildDelta(deltaBaseline, current);
                      final = {
                        url: current.url,
                        title: current.title,
                        status: '',
                        revision: current.revision,
                        unchanged: diff.unchanged,
                        full: false,
                        delta: {
                          added: diff.added,
                          removed: diff.removed,
                          changed: diff.changed,
                          textChanged: diff.textChanged,
                        },
                        elements: [],
                        text: '',
                        dialogs: Array.isArray(current.dialogs) ? current.dialogs : [],
                        ...(Array.isArray(current.console) && current.console.length > 0 ? { console: current.console } : {}),
                        takeover: takeoverRef.current,
                      };
                    }
                  } catch {
                    final = await readAfterAction({ snapshot: 'minimal' });
                    deltaStatus = 'delta 计算失败；已返回 minimal';
                  }
                }
              } else {
                try {
                  final = await readAfterAction(args);
                } catch {
                  final = { url: '', title: '', status: '', text: '', elements: [] };
                }
              }
              const failed = steps.find((step) => step.ok === false);
              const status = [
                failed ? `批量动作第 ${failedStep + 1} 步失败：${failed.error || ''}` : '',
                deltaStatus,
              ].filter(Boolean).join('；');
              return {
                ...final,
                ok: true,
                batchOk: failedStep === null,
                ...(failedStep !== null ? { failedStep } : {}),
                steps,
                ...(status ? { status } : {}),
              };
            }

            if (action === 'new_tab') {
              onNewTab?.();
              return {
                ok: true,
                url: '',
                title: '',
                status: '已打开新的 AI 浏览器标签',
                text: '',
                elements: [],
              };
            }

            if (action === 'navigate') {
              const parsed = new URL(String(args.url || ''));
              if (!['http:', 'https:'].includes(parsed.protocol)) {
                throw new Error('只允许 http/https URL');
              }
              setStatus(`打开 ${parsed.href}`);
              let downloadFloor = 0;
              if (typeof bridge?.downloads === 'function' && lease) {
                try {
                  const before = await bridge.downloads(lease, {});
                  downloadFloor = Math.max(0, ...(before?.downloads || []).map((entry) => Number(entry.id) || 0));
                } catch {
                  downloadFloor = 0;
                }
              }
              const loaded = waitForStop(element, 15000);
              let abortWarning = false;
              try {
                clearNavigationBuffers();
                await element.loadURL(parsed.href);
              } catch (error) {
                if (!isAbortError(error)) {
                  await wait(500);
                  let download = null;
                  if (typeof bridge?.downloads === 'function' && lease) {
                    try {
                      const after = await bridge.downloads(lease, {});
                      download = (after?.downloads || []).find((entry) => Number(entry.id) > downloadFloor) || null;
                    } catch {
                      download = null;
                    }
                  }
                  if (download) {
                    const snapshot = await readAfterAction({ ...args, snapshot: 'none', includeConsole: false });
                    return {
                      ...snapshot,
                      status: `已触发下载：${download.filename}（${download.state}，${download.path}）`,
                    };
                  }
                  throw error;
                }
                abortWarning = true;
              }
              await loaded;
              await wait(400);
              const snapshot = await readAfterAction(args);
              return abortWarning
                ? { ...snapshot, status: '页面跳转被中止（ERR_ABORTED），但页面可能已加载' }
                : snapshot;
            }

            if (action === 'click') {
              let before = '';
              try {
                before = await element.executeJavaScript(FINGERPRINT_SCRIPT, true);
              } catch {
                before = '';
              }
              const target = String(args.target || '');
              const allowedDomains = Array.isArray(args.allowedDomains) ? args.allowedDomains : [];
              let result = null;
              let realClick = false;
              let point = null;
              if ((typeof bridge?.input === 'function' && lease) || allowedDomains.length > 0) {
                try {
                  point = await element.executeJavaScript(targetPointScript(target, 'click'), true);
                  if (!point || point.ok !== true) throw actionError(point, '点击失败');
                  if (!hrefAllowed(point.href, allowedDomains)) {
                    throw actionError({
                      code: 'DOMAIN_BLOCKED',
                      error: `[DOMAIN_BLOCKED] 目标域名不在允许列表：${point.href}`,
                    }, '点击失败');
                  }
                  if (typeof bridge?.input === 'function' && lease) {
                    const x = Math.round(point.x);
                    const y = Math.round(point.y);
                    try { element.focus(); } catch { /* best effort */ }
                    await bridge.input(lease, { type: 'mouseMove', x, y });
                    await wait(30);
                    await bridge.input(lease, { type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
                    await wait(20);
                    await bridge.input(lease, { type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
                    result = { ok: true, href: point.href || '' };
                    realClick = true;
                  }
                } catch (error) {
                  if (error?.code) throw error;
                  realClick = false;
                }
              }
              if (!realClick) {
                result = await element.executeJavaScript(clickScript(target), true);
                if (!result || result.ok !== true) throw actionError(result, '点击失败');
              }
              const changed = await waitForPageChange(before);
              if (changed && element.isLoading()) {
                await waitForStop(element, 5000);
              }
              if (changed) {
                // SPA routes often change the URL before React paints the new page.
                await wait(700);
              }
              const snapshot = await readAfterAction(args);
              if (allowedDomains.length > 0 && !hrefAllowed(snapshot.url, allowedDomains)) {
                try { element.goBack(); } catch { /* best effort */ }
                throw actionError({
                  code: 'DOMAIN_BLOCKED',
                  error: `[DOMAIN_BLOCKED] 导航被重定向到白名单外：${snapshot.url}；已尝试返回`,
                }, '点击失败');
              }
              const href = String(result.href || '');
              let status = '';
              if (!changed) {
                status = href
                  ? `点击后页面未发生变化；目标 href=${href}，可改用 native_browser_navigate`
                  : '点击后页面未发生变化（可能被页面拦截、打开了新窗口，或本来无需跳转）';
              }
              return { ...snapshot, changed, ...(status ? { status } : {}) };
            }

            if (action === 'type') {
              const submit = args.submit === true;
              const target = String(args.target || '');
              const text = String(args.text ?? '');
              let before = '';
              if (submit) {
                try {
                  before = await element.executeJavaScript(FINGERPRINT_SCRIPT, true);
                } catch {
                  before = '';
                }
              }
              const asciiTyping = text.length > 0 && /^[\x20-\x7E]+$/.test(text);
              let realTyped = false;
              if (!submit && asciiTyping && typeof bridge?.input === 'function' && lease) {
                try {
                  const point = await element.executeJavaScript(targetPointScript(target, 'type'), true);
                  if (!point || point.ok !== true) throw actionError(point, '输入失败');
                  const x = Math.round(point.x);
                  const y = Math.round(point.y);
                  try { element.focus(); } catch { /* best effort */ }
                  await bridge.input(lease, { type: 'mouseMove', x, y });
                  await wait(20);
                  await bridge.input(lease, { type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
                  await wait(20);
                  await bridge.input(lease, { type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
                  const prepared = await element.executeJavaScript(fieldStateScript(target, true), true);
                  if (!prepared || prepared.ok !== true) throw actionError(prepared, '输入失败');
                  for (const char of text) {
                    await bridge.input(lease, { type: 'keyDown', keyCode: char });
                    await bridge.input(lease, { type: 'char', keyCode: char });
                    await bridge.input(lease, { type: 'keyUp', keyCode: char });
                  }
                  await wait(120);
                  const state = await element.executeJavaScript(fieldStateScript(target, false), true);
                  realTyped = Boolean(state?.ok) && state.value === text;
                } catch (error) {
                  if (error?.code) throw error;
                  realTyped = false;
                }
              }
              if (!realTyped) {
                const result = await element.executeJavaScript(typeScript(target, text, submit), true);
                if (!result || result.ok !== true) throw actionError(result, '输入失败');
              }
              if (!submit) {
                await wait(500);
                return await readAfterAction(args);
              }
              const changed = await waitForPageChange(before);
              if (changed && element.isLoading()) {
                await waitForStop(element, 5000);
              }
              if (changed) {
                await wait(700);
              }
              const snapshot = await readAfterAction(args);
              return {
                ...snapshot,
                changed,
                ...(changed ? {} : { status: '输入并提交后页面未发生变化（可能提交被拦截，或本来无需跳转）' }),
              };
            }

            if (action === 'select') {
              const target = String(args.target || '');
              const wanted = String(args.text ?? args.value ?? args.option ?? '');
              if (!wanted) throw new Error('select 需要 text/value');
              const result = await element.executeJavaScript(selectScript(target, wanted), true);
              if (!result || result.ok !== true) throw actionError(result, '选择失败');
              const snapshot = await readAfterAction(args);
              return {
                ...snapshot,
                status: `已选择 ${result.text || result.value}`,
              };
            }

            if (action === 'hover') {
              let before = '';
              try {
                before = await element.executeJavaScript(FINGERPRINT_SCRIPT, true);
              } catch {
                before = '';
              }
              let realHover = false;
              if (typeof bridge?.input === 'function' && lease) {
                try {
                  const point = await element.executeJavaScript(
                    hoverPointScript(String(args.target || '')),
                    true,
                  );
                  if (point?.ok === true) {
                    try { element.focus(); } catch { /* best effort */ }
                    await bridge.input(lease, {
                      type: 'mouseMove',
                      x: Math.round(point.x),
                      y: Math.round(point.y),
                    });
                    realHover = true;
                  }
                } catch {
                  realHover = false;
                }
              }
              if (!realHover) {
                const result = await element.executeJavaScript(hoverScript(String(args.target || '')), true);
                if (!result || result.ok !== true) throw actionError(result, '悬停失败');
              }
              const changed = await waitForPageChange(before, 1800);
              const snapshot = await readAfterAction(args);
              return {
                ...snapshot,
                changed,
                ...(changed ? {} : {
                  status: realHover
                    ? '悬停后页面未发生变化'
                    : '悬停后页面未发生变化（当前没有主进程真实输入通道；纯 CSS :hover 可能无法展开）',
                }),
              };
            }

            if (action === 'drop') {
              if (!Array.isArray(args.files) || args.files.length === 0) {
                if (!args.data || typeof args.data !== 'object' || Object.keys(args.data).length === 0) {
                  throw new Error('drop 需要 files 或 data');
                }
              }
              const result = await element.executeJavaScript(
                dropScript(String(args.target || ''), Array.isArray(args.files) ? args.files : [], args.data || {}),
                true,
              );
              if (!result || result.ok !== true) throw actionError(result, '拖放失败');
              const snapshot = await readAfterAction({ snapshot: 'none', includeConsole: false });
              return {
                ...snapshot,
                ok: true,
                files: Array.isArray(result.files) ? result.files : [],
                data: Array.isArray(result.data) ? result.data : [],
                status: result.files?.length > 0 ? `已拖放 ${result.files.length} 个文件` : `已拖放数据：${(result.data || []).join(', ')}`,
              };
            }

            if (action === 'upload') {
              if (!Array.isArray(args.files) || args.files.length === 0) throw new Error('upload 需要 files');
              const result = await element.executeJavaScript(
                uploadScript(String(args.target || ''), args.files),
                true,
              );
              if (!result || result.ok !== true) throw actionError(result, '上传文件选择失败');
              const snapshot = await readAfterAction({ snapshot: 'none', includeConsole: false });
              return {
                ...snapshot,
                ok: true,
                files: Array.isArray(result.files) ? result.files : [],
                status: `已选择 ${result.files?.length || 0} 个文件`,
              };
            }

            if (action === 'screenshot') {
              if (typeof bridge?.screenshot !== 'function') {
                throw new Error('当前 core 未提供 screenshot 通道');
              }
              if (!lease) throw new Error('没有可用的浏览器 lease');
              let result;
              if (args.fullPage === true && !args.target) {
                await element.executeJavaScript(`(() => {
                  let style = document.getElementById('__dsh_fullpage_style');
                  if (!style) {
                    style = document.createElement('style');
                    style.id = '__dsh_fullpage_style';
                    style.textContent = '::-webkit-scrollbar{display:none!important}html{scrollbar-width:none!important}';
                    document.head.appendChild(style);
                  }
                  return true;
                })()`, true);
                const metrics = await element.executeJavaScript(`(() => ({
                  height: Math.max(
                    document.documentElement.scrollHeight || 0,
                    document.body?.scrollHeight || 0,
                    document.documentElement.clientHeight || 0
                  ),
                  width: Math.max(
                    document.documentElement.clientWidth || 0,
                    document.body?.clientWidth || 0,
                    window.innerWidth || 0
                  ),
                  viewportHeight: window.innerHeight || document.documentElement.clientHeight || 1,
                  scrollY: window.scrollY || 0
                }))()`, true);
                const totalHeight = Math.min(30000, Math.max(1, Math.ceil(Number(metrics?.height) || 0)));
                const totalWidth = Math.max(1, Math.ceil(Number(metrics?.width) || 0));
                const viewportHeight = Math.max(1, Math.ceil(Number(metrics?.viewportHeight) || 1));
                const segments = [];
                try {
                  for (let y = 0; y < totalHeight; y += viewportHeight) {
                    await element.executeJavaScript(`window.scrollTo(0, ${y}); true`, true);
                    await wait(140);
                    const segment = await Promise.race([
                      bridge.screenshot(lease, {}),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('截图超时')), 12000)),
                    ]);
                    if (!segment?.data) throw new Error('分段截图没有返回数据');
                    segments.push({ data: String(segment.data), y });
                    if (segments.length >= 40) break;
                  }
                  const stitched = await element.executeJavaScript(
                    stitchScreenshotScript(segments, totalWidth, totalHeight),
                    true,
                  );
                  if (!stitched) throw new Error('截图拼接失败');
                  result = {
                    mediaType: 'image/png',
                    width: totalWidth,
                    height: totalHeight,
                    data: stitched,
                  };
                } finally {
                  try { await element.executeJavaScript(`window.scrollTo(0, ${Number(metrics?.scrollY) || 0}); true`, true); } catch {}
                  try { await element.executeJavaScript(`document.getElementById('__dsh_fullpage_style')?.remove(); true`, true); } catch {}
                }
              } else {
                const screenshotOptions = { fullPage: false };
                if (args.target) {
                  const clipResult = await element.executeJavaScript(elementClipScript(String(args.target)), true);
                  if (!clipResult || clipResult.ok !== true) throw actionError(clipResult, '截图目标定位失败');
                  screenshotOptions.clip = clipResult.clip;
                  await wait(80);
                }
                result = await Promise.race([
                  bridge.screenshot(lease, screenshotOptions),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('截图超时')), 12000)),
                ]);
              }
              let url = '';
              let title = '';
              try {
                url = element.getURL();
                title = element.getTitle();
              } catch {
                // ignore
              }
              return {
                ok: true,
                url,
                title,
                screenshot: {
                  mediaType: String(result?.mediaType || 'image/png'),
                  width: Number(result?.width) || 0,
                  height: Number(result?.height) || 0,
                  data: String(result?.data || ''),
                },
              };
            }

            if (action === 'downloads') {
              if (typeof bridge?.downloads !== 'function') {
                throw new Error('当前 core 未提供 downloads 读取通道');
              }
              if (!lease) throw new Error('没有可用的浏览器 lease');
              const result = await bridge.downloads(lease, { clear: args.clear === true });
              let url = '';
              let title = '';
              try {
                url = element.getURL();
                title = element.getTitle();
              } catch {
                // ignore
              }
              return { ok: true, url, title, downloads: Array.isArray(result?.downloads) ? result.downloads : [] };
            }

            if (action === 'network') {
              if (typeof bridge?.network !== 'function') {
                throw new Error('当前 core 未提供 network 读取通道');
              }
              if (!lease) throw new Error('没有可用的浏览器 lease');
              const result = await bridge.network(lease, {
                clear: args.clear === true,
                type: args.type,
                status: args.status,
                limit: args.limit,
                includeNoise: args.includeNoise === true,
              });
              let url = '';
              let title = '';
              try {
                url = element.getURL();
                title = element.getTitle();
              } catch {
                // ignore
              }
              return {
                ok: true,
                url,
                title,
                requests: Array.isArray(result?.requests) ? result.requests : [],
                total: Number(result?.total) || 0,
              };
            }

            if (action === 'console') {
              await collectPageErrors();
              const entries = consoleBufferRef.current.slice();
              consoleSeenRef.current = consoleBufferRef.current.length;
              if (args.clear === true) {
                consoleBufferRef.current.length = 0;
                consoleSeenRef.current = 0;
                consoleLastRef.current = null;
              }
              let url = '';
              let title = '';
              try {
                url = element.getURL();
                title = element.getTitle();
              } catch {
                // ignore
              }
              return { ok: true, url, title, revision: 0, console: entries };
            }

            if (action === 'highlight') {
              const result = await element.executeJavaScript(
                highlightScript(String(args.target || ''), args.clear === true),
                true,
              );
              if (!result || result.ok !== true) throw actionError(result, '高亮失败');
              const snapshot = await readAfterAction({ snapshot: 'none' });
              return {
                ...snapshot,
                status: args.clear === true
                  ? '已清除页面高亮'
                  : `已高亮元素：${result.text || String(args.target || '')}`,
              };
            }

            if (action === 'observe') {
              return await observeSnapshot({
                limit: args.limit,
                offset: args.offset,
                mode: args.mode,
                scope: args.scope,
                textLimit: args.textLimit,
                sinceRevision: args.sinceRevision,
                noBaseline: args.noBaseline === true,
                includeConsole: args.includeConsole !== false,
              });
            }

            if (action === 'extract') {
              let result;
              try {
                result = await element.executeJavaScript(extractScript({
                  query: args.query,
                  limit: args.limit,
                  fields: args.fields,
                  table: args.table,
                  meta: args.meta,
                  jsonld: args.jsonld,
                  maxLength: args.maxLength,
                  debug: args.debug === true,
                }), true);
              } catch {
                // Structured extraction cannot run on a non-HTML document.
                // Fall back to the same plain-text path observe already uses,
                // and return the raw text so selectors are not silently empty.
                const fallbackData = await readNonHtmlText();
                return {
                  ok: true,
                  url: fallbackData.url,
                  title: fallbackData.title,
                  data: {
                    fields: {},
                    meta: {},
                    table: null,
                    jsonld: [],
                    text: fallbackData.text,
                    nonHtml: true,
                    status: `${fallbackData.status}；extract 无法在非 HTML 文档上执行结构化抽取，已返回纯文本`,
                  },
                };
              }
              return { ok: true, ...result };
            }

            if (action === 'read') {
              return await readSnapshot({ limit: args.limit, offset: args.offset });
            }

            if (action === 'reload') {
              const loaded = waitForStop(element, 12000);
              element.reload();
              await loaded;
              await wait(400);
              return await readAfterAction(args);
            }

            if (action === 'back') {
              if (!element.canGoBack()) throw new Error('没有可后退的历史');
              const loaded = waitForStop(element, 10000);
              element.goBack();
              await loaded;
              await wait(400);
              return await readAfterAction(args);
            }

            throw new Error(`未知 action：${action}`);
          } catch (error) {
            let message = error.message || String(error);
            if ((error?.code === 'NOT_FOUND' || error?.code === 'STALE_REF') && command.args?.target) {
              try {
                const diagnostic = await element.executeJavaScript(notFoundScript(String(command.args.target)), true);
                if (diagnostic?.summary) message += `\n诊断：${diagnostic.summary}`;
              } catch {
                // diagnostics are best-effort
              }
            }
            return {
              ok: false,
              error: message,
              ...(error?.code ? { code: error.code } : {}),
            };
          }
        }

        async function poll() {
          while (!stopped && !disposed) {
            try {
              const response = await fetch(`${BRIDGE_URL}/next?clientId=${encodeURIComponent(clientId)}&sessionId=${encodeURIComponent(currentSessionId())}`, { cache: 'no-store' });
              if (response.status === 204) continue;
              if (!response.ok) {
                await wait(700);
                continue;
              }
              const command = await response.json();
              const result = await execute(command);
              await report(command.id, result);
            } catch {
              await wait(700);
            }
          }
        }

        (async () => {
          bridge = globalThis.dshDesktop?.browser;
          if (!bridge) {
            setStatus('仅 Desktop 版支持 AI 浏览器');
            return;
          }
          try {
            const reservation = await bridge.acquire('dsh-native-browser');
            if (disposed) {
              await bridge.release(reservation.lease);
              return;
            }
            lease = reservation.lease;
            element = document.createElement('webview');
            element.setAttribute('name', lease);
            element.setAttribute('partition', reservation.partition);
            element.setAttribute('allowpopups', '');
            element.setAttribute('src', `about:blank#${lease}`);
            element.style.cssText = '-webkit-app-region:no-drag;border:0;flex:auto;width:100%;min-width:0;height:100%;min-height:0;display:flex';
            element.className = 'dsh-ai-browser-webview';
            hostRef.current.appendChild(element);
            webviewRef.current = element;

            const openInCurrentTab = (url) => {
              if (disposed) return;
              try {
                const href = new URL(String(url), element.getURL()).href;
                if (!/^https?:/i.test(href)) return;
                setAddress(href);
                element.loadURL(href).catch(() => {});
              } catch {
                // ignore malformed popup targets
              }
            };
            // Prefer the core's browserOpenRequested channel; it covers
            // target="_blank", window.open and form submissions with a target.
            if (typeof bridge.onOpenRequested === 'function') {
              detachOpenRequest = bridge.onOpenRequested(lease, openInCurrentTab);
            } else {
              // Fallback for a core build without the open-request channel.
              element.addEventListener('did-create-window', (event) => {
                const url = event?.url || event?.target?.url;
                if (url) openInCurrentTab(url);
              });
            }

            element.addEventListener('dom-ready', () => {
              if (disposed) return;
              setStatus('就绪');
              syncNavigation();
              hookDialogs();
              hookRevision();
              void hookPageErrors();
              void (async () => {
                try {
                  await bridgePost('/register', { clientId, title: 'AI 浏览器', sessionId: currentSessionId() });
                } catch {
                  // poll will retry; bridge may still be starting
                }
                if (!disposed) void poll();
              })();
            }, { once: true });
            element.addEventListener('did-start-loading', () => {
              if (!disposed) {
                setStatus('加载中…');
                syncNavigation();
              }
            });
            element.addEventListener('did-stop-loading', () => {
              if (!disposed) {
                setStatus('就绪');
                syncNavigation();
              }
            });
            element.addEventListener('will-navigate', () => {
              if (!disposed) clearNavigationBuffers();
            });
            element.addEventListener('did-navigate', () => {
              if (!disposed) {
                clearConsoleBuffer();
                syncNavigation();
                hookDialogs();
                hookRevision();
                void hookPageErrors();
              }
            });
            element.addEventListener('did-navigate-in-page', () => {
              if (!disposed) {
                clearNavigationBuffers();
                syncNavigation();
              }
            });
            element.addEventListener('page-title-updated', (event) => {
              if (!disposed) {
                setTitle(event.title || '');
                if (event.title && !event.title.startsWith('about:blank')) {
                  setTabTitle(dshTabId, event.title);
                }
              }
            });
            element.addEventListener('console-message', (event, level, message, line, sourceId) => {
              if (disposed) return;
              const detail = event && typeof event === 'object' ? event : {};
              pushConsole(
                detail.level ?? level,
                detail.message ?? message ?? '',
                detail.line ?? line,
                detail.sourceId ?? sourceId,
              );
            });
            element.addEventListener('did-fail-load', (event) => {
              if (!disposed && event.isMainFrame) {
                setStatus(`加载失败：${event.errorDescription || event.errorCode}`);
                pushConsole('error', `加载失败：${event.errorDescription || event.errorCode} (${event.validatedURL || ''})`, 0, event.validatedURL || '');
                syncNavigation();
              }
            });
            element.addEventListener('render-process-gone', (event) => {
              if (!disposed) {
                pushConsole('error', `渲染进程退出：${event?.details?.reason || 'unknown'}`, 0, 'render-process-gone');
                setStatus('渲染进程退出');
              }
            });
            element.addEventListener('crashed', () => {
              if (!disposed) pushConsole('error', '页面崩溃', 0, 'crashed');
            });
          } catch (error) {
            setStatus(`启动失败：${error.message || error}`);
          }
        })();

        return () => {
          disposed = true;
          stopped = true;
          bridgePost('/unregister', { clientId }, true).catch(() => {});
          try { detachOpenRequest?.(); } catch { /* already gone */ }
          webviewRef.current = null;
          element?.remove();
          if (bridge && lease) bridge.release(lease).catch(() => {});
        };
      }, []);

      const toggleTakeover = async () => {
        const next = !takeover;
        setTakeover(next);
        takeoverRef.current = next;
        try {
          await fetch(`${BRIDGE_URL}/takeover`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ clientId, enabled: next }),
          });
        } catch {
          // keep local state; host will refuse AI actions once connected
        }
      };

      const goBack = () => {
        const el = webviewRef.current;
        if (el?.canGoBack()) el.goBack();
      };

      const goForward = () => {
        const el = webviewRef.current;
        if (el?.canGoForward()) el.goForward();
      };

      const reload = () => {
        webviewRef.current?.reload();
      };

      const submitAddress = (event) => {
        event?.preventDefault();
        try {
          const href = normalizeAddress(address);
          setAddressError('');
          setAddress(href);
          const el = webviewRef.current;
          if (el) {
            el.loadURL(href).catch((error) => {
              if (!isAbortError(error)) setAddressError(error.message || String(error));
            });
          }
        } catch (error) {
          setAddressError(error.message || String(error));
        }
      };

      return h('div', {
        className: 'dsh-ai-browser-root',
        onPointerDown: () => {
          bridgePost('/activate', { clientId }).catch(() => {});
        },
      },
        h('style', null, CHROME_CSS),
        h('div', { className: 'dsh-ai-browser-toolbar' },
          h(ChromeButton, { label: '后退', onClick: goBack, disabled: !canGoBack }, h(IconBack)),
          h(ChromeButton, { label: '前进', onClick: goForward, disabled: !canGoForward }, h(IconForward)),
          h(ChromeButton, { label: loading ? '刷新中' : '刷新', onClick: reload }, h(IconReload)),
          h('form', {
            className: 'dsh-ai-browser-address-box',
            onSubmit: submitAddress,
          },
            h('input', {
              ref: addressRef,
              className: `dsh-ai-browser-address${addressError ? ' is-error' : ''}`,
              value: address,
              onChange: (event) => {
                setAddress(event.target.value);
                setAddressError('');
              },
              onFocus: () => {
                addressFocused.current = true;
                addressRef.current?.select();
              },
              onBlur: () => {
                addressFocused.current = false;
              },
              placeholder: '输入 HTTP(S) 地址',
              spellCheck: false,
              title: addressError || '地址栏',
              style: address.length > 0
                ? {
                    color: 'var(--dsw-alias-label-primary)',
                    WebkitTextFillColor: 'var(--dsw-alias-label-primary)',
                  }
                : {
                    color: 'var(--dsw-static-neutral-bluish-600, #81858c)',
                    WebkitTextFillColor: 'var(--dsw-static-neutral-bluish-600, #81858c)',
                  },
            }),
            h('button', {
              type: 'submit',
              className: 'dsh-ai-browser-go',
              title: '前往',
              'aria-label': '前往',
            }, h(IconGo)),
          ),
          h(ChromeButton, {
            label: takeover ? '交回 AI' : '用户接管',
            onClick: toggleTakeover,
            active: takeover,
            takeover: true,
          }, h(IconUser), h('span', null, takeover ? '交回 AI' : '用户接管')),
        ),
        h('div', { className: 'dsh-ai-browser-viewport' },
          h('div', { ref: hostRef, className: 'dsh-ai-browser-webview' }),
          !currentUrl && h('div', {
            className: 'dsh-ai-browser-empty',
          }, '输入 HTTP(S) 地址开始浏览'),
        ),
      );
    }

    return {
      inject: ['sidebarRight', 'sidebarRightTabs', 'slots'],
      apply(ctx) {
        // Native tab type and body.
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: NATIVE_ID,
          kind: NATIVE_KIND,
          priority: 'extension',
          multiple: true,
          keepMounted: true,
          title: () => 'AI 浏览器',
          guide: [{
            id: 'native',
            order: 28,
            title: () => 'AI 浏览器',
            description: () => '模型操作，用户可随时接管',
            icon: AiStarIcon,
          }],
        }), 'sidecar-browser.native-type');

        const NativeHost = (props) => h(NativePane, {
          ...props,
          onNewTab: () => {
            try {
              ctx.sidebarRight.openTab(NATIVE_KIND);
            } catch {
              // no session on screen
            }
          },
        });

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: NATIVE_ID,
        }, NativeHost)), 'sidecar-browser.native-body');

        const NativeTitle = ({ useTabInfo }) => {
          const tab = typeof useTabInfo === 'function' ? useTabInfo()?.tab : undefined;
          const title = React.useSyncExternalStore(
            subscribeTabTitles,
            () => getTabTitle(tab?.id),
          );
          return h('span', {
            title,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
              maxWidth: '100%',
            },
          },
            h(AiStarIcon),
            h('span', {
              style: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }, title),
          );
        };

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: NATIVE_ID,
        }, NativeTitle)), 'sidecar-browser.native-title');

        // One-time multi-tab upgrade: old single-instance tabs may not have a
        // body under the new multiple registration. Close them once and open
        // one fresh AI tab.
        ctx.effect(() => {
          try {
            if (localStorage.getItem(MULTI_UPGRADE_KEY) === '1') return;
          } catch {
            return;
          }
          const timer = setInterval(() => {
            try {
              if (!ctx.sidebarRight.isExpanded()) ctx.sidebarRight.toggleExpanded();
              const tabs = ctx.sidebarRight.openTabs?.getSnapshot?.() || [];
              for (const tab of tabs.filter((item) => tabKind(item) === NATIVE_KIND)) {
                const id = tabId(tab);
                if (id) {
                  try {
                    ctx.sidebarRight.close(id);
                  } catch {
                    // already gone
                  }
                }
              }
              ctx.sidebarRight.openTab(NATIVE_KIND);
              localStorage.setItem(MULTI_UPGRADE_KEY, '1');
              clearInterval(timer);
            } catch {
              // sidebar not ready
            }
          }, 1000);
          return () => clearInterval(timer);
        }, 'sidecar-browser.multi-upgrade');

        // Ensure at least one AI tab; migrate the old "原生浏览器" title once.
        // Never open a second tab on load: multiple tabs are user-created.
        ctx.effect(() => {
          try {
            if (localStorage.getItem(MULTI_UPGRADE_KEY) !== '1') return;
          } catch {
            return;
          }
          let done = false;
          const timer = setInterval(() => {
            if (done) return;
            try {
              if (!ctx.sidebarRight.isExpanded()) ctx.sidebarRight.toggleExpanded();
              const tabs = ctx.sidebarRight.openTabs?.getSnapshot?.() || [];
              const natives = tabs.filter((tab) => tabKind(tab) === NATIVE_KIND);
              const stale = natives.filter((tab) => tabTitle(tab) === '原生浏览器');
              if (stale.length > 0) {
                done = true;
                for (const tab of stale) {
                  const id = tabId(tab);
                  if (id) {
                    try {
                      ctx.sidebarRight.close(id);
                    } catch {
                      // already gone
                    }
                  }
                }
                setTimeout(() => {
                  try {
                    ctx.sidebarRight.openTab(NATIVE_KIND);
                  } catch {
                    // no session
                  }
                }, 300);
                clearInterval(timer);
                return;
              }
              if (natives.length > 0) {
                done = true;
                const id = tabId(natives[natives.length - 1]);
                if (id) {
                  try {
                    ctx.sidebarRight.focus(id);
                  } catch {
                    // focus is best-effort
                  }
                }
                clearInterval(timer);
                return;
              }
              ctx.sidebarRight.openTab(NATIVE_KIND);
              done = true;
              clearInterval(timer);
            } catch {
              // sidebar not ready
            }
          }, 1000);
          return () => clearInterval(timer);
        }, 'sidecar-browser.ensure-tab');

        ctx.inject(['shortcuts'], (ctx) => {
          ctx.effect(() => ctx.shortcuts.register({
            id: 'sidecar-browser.open',
            label: () => 'AI 浏览器',
            aliases: ['browser live', 'native browser', 'AI 浏览器', '原生浏览器'],
            defaults: {
              'desktop:windows': { code: 'KeyL', modifiers: ['primary', 'alt'] },
              'desktop:macos': { code: 'KeyL', modifiers: ['primary', 'alt'] },
              'desktop:linux': { code: 'KeyL', modifiers: ['primary', 'alt'] },
              'web:windows': { code: 'KeyL', modifiers: ['primary', 'alt'] },
              'web:macos': { code: 'KeyL', modifiers: ['primary', 'alt'] },
              'web:linux': { code: 'KeyL', modifiers: ['primary', 'alt'] },
            },
            regions: ['page', 'editable', 'terminal'],
            modals: [],
            resolve: () => {
              try {
                ctx.sidebarRight.openTab(NATIVE_KIND);
                return { status: 'handled', run: () => ctx.sidebarRight.openTab(NATIVE_KIND) };
              } catch {
                return { status: 'blocked', reason: '请先打开一个会话' };
              }
            },
          }), 'sidecar-browser.shortcut');
        });
      },
    };
  },
});
