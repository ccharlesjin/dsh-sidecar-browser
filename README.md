# DSH Sidecar Browser

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ccharlesjin/dsh-sidecar-browser)](https://github.com/ccharlesjin/dsh-sidecar-browser/releases)
[![npm](https://img.shields.io/npm/v/dsh-sidecar-browser)](https://www.npmjs.com/package/dsh-sidecar-browser)
[![GitHub stars](https://img.shields.io/github/stars/ccharlesjin/dsh-sidecar-browser?style=social)](https://github.com/ccharlesjin/dsh-sidecar-browser)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6)](https://github.com/ccharlesjin/dsh-sidecar-browser)

**A real browser, on the side of your agent.**

> The model can read the web. Now it can actually use it.

DSH Sidecar Browser puts a real Electron browser in the **DeepSeek Harness (DSH)**
right sidebar. It is not a screenshot robot and not another DOM scraper. The
agent gets a browser it can navigate, inspect, click, type into, upload files to
and assert against — while you keep it visible, take over when you want, and
hand control back when you are done.

No Playwright. No separate browser process. No cloud relay. Just a native
sidebar webview, a narrow local bridge and a very opinionated toolset.

[English](#english) | [简体中文](#简体中文)

---

<a id="english"></a>
## English

### Why another browser tool?

Most agent browsers are either:

- **screenshot-first**: expensive, slow, and hard to assert against
- **scraper-first**: great at reading HTML, useless when a real click is needed
- **remote-first**: your browsing session leaves your machine

DSH Sidecar Browser is built the other way around: **actions first, observations
on a diet, everything visible and local**.

### What makes it different

- **A real browser, not a simulation.** Native Electron `<webview>` with real
  navigation, downloads, file inputs, dialogs and tabs.
- **Token-efficient by design.** Snapshot budgets from `none` to `full`, revision
  deltas, and a 12-character `UNCHANGED` response when a page did not move.
- **Built for actions, not just reads.** Batched `act` steps, per-step `expect`
  assertions, structured `extract`, and failure diagnostics that tell you *why*
  an element was not clickable.
- **Human in the loop.** Take over the browser at any time; the agent waits.
- **Local-first.** The bridge binds to `127.0.0.1:32002`; page data stays on your
  machine.
- **Safety rails included.** Upload roots, token redaction, controlled download
  directory, no auto-open, no arbitrary file writes.

### Install in 10 seconds

Open DSH:

```text
Plugins → Add plugin
```

Paste:

```text
https://github.com/ccharlesjin/dsh-sidecar-browser
```

Or use the published npm package:

```text
dsh-sidecar-browser
```

After install, enable the `dsh-sidecar-browser` bundle and restart DSH if the
right-sidebar browser does not appear.

From a local checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

> Already using the old `@local/dsh-browser-live` plugin? Do **not** install both
> side by side. Run `migrate-from-local.ps1` first; it backs up your config and
> removes the old profile registration.

### A tiny taste

```js
// Open a page, then let the model decide what matters.
await native_browser_navigate({ url: "https://example.com" });

// Cheap structural view with stable dsh-* references.
await native_browser_observe({ mode: "minimal" });

// Actions + assertions + extraction in one round trip.
await native_browser_act({
  actions: [
    { action: "click", target: "dsh-…" },
    { action: "type", target: "dsh-…", text: "hello" }
  ],
  expect: { textIncludes: "Saved" },
  snapshot: "none"
});
```

### Feature tour

| Area | What you get |
|---|---|
| Navigation | tabs, history, back/reload, popup policy, user takeover |
| Observation | budgets, deltas, scoped reads, text limits, revisions |
| Actions | click, type, hover, batched act, assertions, retries |
| Extraction | CSS fields, tables, meta, JSON-LD, debug hints |
| Diagnostics | not-found candidates, actionability reasons, console context |
| Files | file input upload, drag/drop, controlled downloads |
| Visual | viewport, element and stitched full-page screenshots |
| State | cross-tab workspace, recipes, declarative tasks |
| Safety | policy view, highlight, allowlists, upload roots |

### The toolbox

```text
native_browser_tabs        list or create tabs
native_browser_navigate    open a URL
native_browser_observe     full snapshot or revision delta
native_browser_extract     fields / table / meta / JSON-LD
native_browser_act         batched actions + expect + extract
native_browser_click       click an element
native_browser_type        type / submit
native_browser_hover       hover menus
native_browser_console     console and page errors
native_browser_network     read-only request log
native_browser_screenshot  viewport / target / full page
native_browser_upload      file input upload
native_browser_drop        drag/drop upload
native_browser_downloads   controlled download history
native_browser_workspace   cross-tab scratch space
native_browser_highlight   visual audit outline
native_browser_task        declarative tasks
native_browser_recipe      saved repeatable flows
native_browser_policy      current safety policy
```

### Token economics

Every tool is designed to keep context small:

- `snapshot: "none"` on action batches
- `observe` returns only what changed
- `extract` returns fields, not the whole page
- diagnostics are generated only on failure
- console output is attached only when relevant

### Optional core patch

A small DSH Electron main/preload patch unlocks the full desktop experience:

- native focus/input for background clicks
- read-only network capture
- controlled downloads
- screenshots

Without it, navigation, DOM reads, extraction, actions, assertions, upload/drop,
console and workspaces still work. Tools that need the core return a clear error.

The core patch is **version-specific**. Never install an `app.asar.patched` from a
different DSH release; rebuild it after each DSH update.

### Safety defaults

- Uploads and drag/drop are restricted by `policy.json → uploadRoots`
- Empty `uploadRoots` rejects all local uploads until configured
- Network capture stores no headers, bodies or cookies
- URLs and console text redact token/JWT/Bearer-style parameters
- Downloads go to `Downloads/DSH Browser`, sanitized, never auto-opened

### User data

Runtime data lives outside the package:

```text
~/.dsh/ai-browser/policy.json
~/.dsh/ai-browser/recipes.json
~/.dsh/ai-browser/host.log
~/.dsh/ai-browser/screenshots/
```

Package updates will not overwrite your allowlists, recipes or screenshots.

### Development

```powershell
npm run check
npm pack --dry-run
```

There is no build step. `index.js`, `client.js` and `native-bridge.cjs` are the
shipped runtime. The `dsh` field in `package.json` wires the bundle and the
right-sidebar client.

### License

MIT. See [LICENSE](./LICENSE).

---

<a id="简体中文"></a>
## 简体中文

**一个真正长在 Agent 身边的浏览器。**

> 模型能读网页，现在也能真正“用”网页。

DSH Sidecar Browser 把真实的 Electron 浏览器放进 **DeepSeek Harness（DSH）**
右侧栏。它不是截图机器人，也不是只会抓 DOM 的爬虫。模型可以导航、读取、点击、输入、
上传文件、做断言，而你可以随时看到它在干什么、亲手接管，再交还控制权。

没有 Playwright，没有独立浏览器进程，没有云端中转。只有原生侧栏 webview、一条很窄的
本机 bridge，和一套很有主见的工具。

### 为什么再造一个浏览器工具

大多数 Agent 浏览器是这三种之一：

- **截图优先**：贵、慢，还很难断言
- **爬虫优先**：读 HTML 很强，一到真实点击就废
- **远程优先**：浏览会话离开你的电脑

DSH Sidecar Browser 反过来做：**动作优先、观察节食、全程可见、数据留在本地**。

### 不一样在哪

- **真浏览器，不是模拟。** 原生 Electron `<webview>`，真实导航、下载、文件选择、
  对话框和多标签。
- **天生省 token。** 快照预算从 `none` 到 `full`，支持 revision 增量；页面没变化时只回
  12 个字符的 `UNCHANGED`。
- **为动作而生，不只是读页面。** 批量 `act`、逐步 `expect` 断言、结构化 `extract`，
  失败时直接告诉你元素为什么点不了。
- **人可以随时接管。** 你接管浏览器，Agent 等待；你交还，它继续。
- **本地优先。** bridge 只监听 `127.0.0.1:32002`，页面数据不经过云端。
- **自带安全边界。** 上传目录白名单、token 脱敏、受控下载目录、不自动打开文件。

### 10 秒安装

DSH 里打开：

```text
Plugins → Add plugin
```

输入：

```text
https://github.com/ccharlesjin/dsh-sidecar-browser
```

或者直接用已发布的 npm 包：

```text
dsh-sidecar-browser
```

安装后启用 `dsh-sidecar-browser` bundle；如果右侧栏没出现浏览器，重启 DSH。

本地仓库安装：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

> 如果你还在用旧的 `@local/dsh-browser-live`，**不要两个同时装**。先运行
> `migrate-from-local.ps1`，它会备份配置并移除旧 profile 注册。

### 一个很小的例子

```js
// 打开页面，让模型自己决定下一步看哪里。
await native_browser_navigate({ url: "https://example.com" });

// 低成本结构快照，返回稳定的 dsh-* 引用。
await native_browser_observe({ mode: "minimal" });

// 动作 + 断言 + 提取，一次往返完成。
await native_browser_act({
  actions: [
    { action: "click", target: "dsh-…" },
    { action: "type", target: "dsh-…", text: "hello" }
  ],
  expect: { textIncludes: "已保存" },
  snapshot: "none"
});
```

### 能力一览

| 能力 | 说明 |
|---|---|
| 导航 | 标签页、历史、后退/刷新、弹窗策略、用户接管 |
| 观察 | 多档快照、增量 diff、范围读取、文本上限、revision |
| 动作 | 点击、输入、悬停、批量 act、断言、重试 |
| 提取 | CSS 字段、表格、meta、JSON-LD、debug |
| 诊断 | 找不到元素时候选列表、不可点击原因、console 上下文 |
| 文件 | file input 上传、拖拽上传、受控下载 |
| 视觉 | viewport、元素、拼接 full-page 截图 |
| 状态 | 跨标签 workspace、recipe、声明式 task |
| 安全 | policy 查看、高亮审计、域名白名单、上传目录限制 |

### 工具箱

```text
native_browser_tabs        列出或创建标签页
native_browser_navigate    打开 URL
native_browser_observe     完整快照或 revision 增量
native_browser_extract     字段 / 表格 / meta / JSON-LD
native_browser_act         批量动作 + expect + extract
native_browser_click       点击元素
native_browser_type        输入 / 提交
native_browser_hover       悬停菜单
native_browser_console     console 和页面错误
native_browser_network     只读请求记录
native_browser_screenshot  viewport / 目标 / full page
native_browser_upload      file input 上传
native_browser_drop        拖拽上传
native_browser_downloads   受控下载历史
native_browser_workspace   跨标签草稿空间
native_browser_highlight   可视化高亮
native_browser_task        声明式任务
native_browser_recipe      可复用流程
native_browser_policy      当前安全策略
```

### Token 省在哪

每个工具都在控制上下文体积：

- 动作批次默认 `snapshot: "none"`
- `observe` 只返回变化部分
- `extract` 只返回字段，不返回整页
- 只有失败时才生成诊断
- console 只在相关时附加

### 可选 core patch

一小块 DSH Electron main/preload 补丁可以解锁完整桌面能力：

- 后台点击的原生 focus/input
- 只读 network 捕获
- 受控下载
- 截图

没有补丁时，导航、DOM 读取、提取、动作、断言、上传/拖拽、console、workspace
仍然可用；需要 core 的工具会返回明确错误。

core patch 和 DSH 版本绑定，**不要**把其他版本的 `app.asar.patched` 直接装到当前
版本；每次 DSH 更新后都要重新构建。

### 安全默认值

- 上传和拖拽受 `policy.json → uploadRoots` 限制
- `uploadRoots` 为空时默认拒绝所有本地上传
- network 不保存 headers、body 或 cookie
- URL 和 console 文本会脱敏 token / JWT / Bearer 参数
- 下载只写到 `Downloads/DSH Browser`，清理文件名，不覆盖，不自动打开

### 用户数据

运行数据在包目录之外：

```text
~/.dsh/ai-browser/policy.json
~/.dsh/ai-browser/recipes.json
~/.dsh/ai-browser/host.log
~/.dsh/ai-browser/screenshots/
```

升级插件不会覆盖你的 allowlist、recipes 或截图。

### 开发

```powershell
npm run check
npm pack --dry-run
```

没有构建步骤，`index.js`、`client.js`、`native-bridge.cjs` 就是运行时。
`package.json` 的 `dsh` 字段负责 bundle 和右侧栏客户端注入。

### 许可证

MIT，见 [LICENSE](./LICENSE)。
