# DSH Sidecar Browser

[English](./README.md) | **简体中文**

一个面向 **DeepSeek Harness（DSH）** 右侧栏的模型驱动伴随浏览器。它让模型直接操作真实
Electron webview，提供低 token 快照、结构化提取、断言、诊断、上传、下载、截图，以及
console / network 观察能力。

本仓库是可复用的插件包，和任何个人 DSH 安装目录、私有 core patch 都分开维护。

## 功能

- DSH 右侧栏中的真实 Electron `<webview>`，不依赖 Playwright
- 快照预算：`none` / `minimal` / `standard` / `full`
- `observe` 支持增量 diff 和 `UNCHANGED`（约 12 字符）
- `act` 批量动作，支持逐步 `expect` 断言和失败诊断
- 结构化 `extract`：CSS 字段、表格、meta、JSON-LD、debug
- `NOT_FOUND` 诊断：revision、页面计数、可见候选
- console / JS 错误捕获，可附加到普通工具结果
- 只读 network 观察，URL 自动脱敏
- 上传（`<input type=file>`）、拖拽上传、受控下载
- 截图：viewport、目标元素、拼接 full page
- Tabs、workspace、recipe、task、dialog、highlight、hover

## 环境要求

- 带右侧栏浏览器 slot 的 DeepSeek Harness 桌面版
- Node.js 20+（仅开发需要）
- 主要测试平台是 Windows（PowerShell 安装脚本）
- 可选：DSH core patch，用于 network/download/screenshot/focus

## 安装

在 DSH 中打开 **Plugins → Add plugin**，输入：

| 来源 | 值 |
|---|---|
| GitHub | `https://github.com/ccharlesjin/dsh-sidecar-browser` |
| npm（发布后） | `dsh-sidecar-browser` |
| 本地目录 | 本仓库的绝对路径 |

安装后如果右侧栏没有出现浏览器，打开插件管理，启用
`dsh-sidecar-browser` bundle，然后重启 DSH。

### 本地安装

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会在 desktop profile 中创建 junction，并把包加入 bundle 列表。之后重启 DSH。

### 从旧本地插件迁移

如果旧的 `@local/dsh-browser-live` 还在 profile 里，**不要两个插件同时安装**：它们会注册
同名工具，并同时尝试使用 bridge 端口。关闭 DSH 后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\migrate-from-local.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\migrate-from-local.ps1
```

迁移脚本会：

- 备份旧 `policy.json` / `recipes.json`
- 删除旧 profile 依赖、bundle 和 junction
- 保留旧插件目录作为回退
- 打印下一步安装说明

## 用户数据位置

运行时数据写入 `~/.dsh/ai-browser/`，不会写进 npm 包目录：

```text
~/.dsh/ai-browser/policy.json
~/.dsh/ai-browser/recipes.json
~/.dsh/ai-browser/host.log
~/.dsh/ai-browser/screenshots/
```

`policy.json` 首次加载时从包内默认模板复制，因此 npm 更新不会覆盖你的 allowlist、
uploadRoots、recipes 和截图。

## Core patch 是可选的

以下能力需要 DSH Electron main/preload 的 core patch：

- 后台点击的真实 focus/input
- 只读 network 捕获
- 受控下载
- 截图

这些代码运行在主进程，不能作为普通 npm 插件安装。没有 core patch 时，浏览器仍可做：

- 导航
- DOM 读取、结构化提取
- click / type / hover
- upload / drop
- console
- workspace / recipe / task / highlight

需要 core 的工具会返回明确错误。

**不要**把其他 DSH 版本的 `app.asar` 补丁直接装到当前版本。core patch 和 DSH 版本绑定，
每次 DSH 更新后都要重新构建。

## 安全默认值

- 上传和拖拽受 `policy.json → uploadRoots` 限制
- `uploadRoots` 为空时默认拒绝所有本地上传
- network 不保存 headers、body 或 cookie
- URL 和 console 文本会脱敏 token / JWT / Bearer 类参数
- 下载只写到 `Downloads/DSH Browser`，文件名清理，不覆盖，不自动打开

修改 `~/.dsh/ai-browser/policy.json` 可以调整域名 allowlist、确认关键词和上传目录。
包内的 `policy.json` 只是首次启动模板。

## 主要工具

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

## 开发

```powershell
npm run check
npm pack --dry-run
```

没有构建步骤，`index.js`、`client.js`、`native-bridge.cjs` 直接作为运行时发布。

插件通过 `package.json` 的 `dsh` 字段声明：

- `dsh.bundle.patch` 插入 `sidecar-browser` bundle
- `dsh.client` 注入右侧栏 webview 客户端

## 许可证

MIT，见 [LICENSE](./LICENSE)。
