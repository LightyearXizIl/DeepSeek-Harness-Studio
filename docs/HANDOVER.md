# DeepSeek Harness Studio 交接文档

本文件记录当前可运行状态和维护边界；改动 `packages/` 前先阅读根目录 `AGENTS.md` 与 [架构说明](architecture.md)。

## 项目状态

DeepSeek Harness Studio 由官方 Harness 核心、Desktop 壳层、Aqua 主题和 Studio 更新页组成。

官方 `deepseek-official / deepseek-v4-flash-vision-exp` 是图片输入的唯一已交付入口，使用上游附件规范化与 Files API 链路。

旧的内嵌视觉桥接已移除，`desktop/patches/@deepseek-ai+dsh-llm-deepseek+0.1.0-rc.7.patch` 不再存在。

独立的 `@deepseek-ai/dsh-llm-vision-bridge` 插件尚未实现，因此不得把任意第三方视觉服务视为已配置或已验收的功能。

## 目录与所有权

| 路径 | 所有权与用途 |
| --- | --- |
| `packages/`、`apps/`、`vendor/` | Harness pnpm 工作区；Cordis vendor 仅按 Harness 固定版本同步。 |
| `desktop/` | 独立 npm 项目；消费已发布的 Harness rc.2 包。 |
| `desktop/build/deepseek-harness-studio.patch.yml` | Desktop 的上游组合层。 |
| `desktop/build/dsh-local.patch.yml` | Studio 本地组合层，注册 Aqua 与 Studio 更新页。 |
| `packages/client/ui-aqua/`、`desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/` | Aqua 的工作区和 Desktop 打包副本，改动时必须同步。 |
| `scripts/sync/UPDATE-SUMMARY.md` | 每次上游同步的事实记录。 |

## 上游基线

Harness 已同步到 `upstream/master` 的 `b150a551b8`（`dsh-v0.1.1-rc.2`）。

Desktop 已同步到 `desktop-upstream/chore/harness-rc2` 的 `9957aff5bf`，其依赖固定为 Harness rc.2。

Aqua 不属于本次上游同步；候选上游改为 AGPL 后，本地 MIT 副本保持不变，等待许可证选择再更新。

## 依赖策略

根 pnpm、Desktop npm、Python `uv.lock` 和 GitHub Actions 已完成兼容升级。

根仓库与 Desktop 使用 TypeScript `6.0.3`：TypeScript 7 不满足仓库的 `<7` peer 约束及 `tsconfck` 的 TypeScript 5 peer 范围。

网站直接依赖保持 Vite 5，因为 VitePress `1.6.4` 消费 Vite 5；升级到 Vite 8 会产生两套不兼容的 Vite 类型。

Desktop 使用 Electron `43.4.1`、React `19.2.8`、Node `26.7.0`、pnpm `11.22.0` 和 Zustand `5.0.15`。

所有 GitHub Actions 均固定到完整提交 SHA；Actions 升级必须继续保持此固定方式。

Desktop 中由 rc.2 替代的旧视觉桥接补丁已删除，其余 rc.2 补丁须在安装后由 `patch-package` 成功应用。

## Studio 本地约定

产品名、用户数据目录、GitHub 更新源、Aqua 和 `dsh-local.patch.yml` 属于 Studio 本地行为，Desktop 同步时不得以官方默认值覆盖。

侧栏静态资源使用 `deepseek-harness-studio-logo-*.png`；Desktop 启动代码、静态资源安装脚本和 rc.2 侧栏补丁必须使用同一名称。

开发构建使用 `studioChannel: 'development'` 及独立的 `deepseek-harness-studio-dev` 用户数据目录。

## 已完成验证

- 根仓库：`pnpm install --offline`、`pnpm peers check`、`pnpm run typecheck`、pi-ai 聚焦测试和 `git diff --check` 通过。
- Python：独立临时环境中的 `uv sync --project python/sdk --group test` 与 `uv run --project python/sdk pytest` 通过（52 passed、10 skipped）。
- Desktop：npm 安装和全部 rc.2 补丁应用通过，Electron `43.4.1` 二进制可运行，`npm run typecheck`、`npm test`（247 passed）和 `npm run build` 通过。

官方新视觉模型尚无 `DEEPSEEK_API_KEY` 的真实 API 验收；无密钥覆盖不能替代该项验证。

尚未进行安装包构建、发布、打标签或推送。

## 后续操作

继续依赖升级前先运行 `pnpm outdated -r --format json` 与 `npm outdated --json`，并记录任何受引擎、peer 或上游 rc.2 固定版本限制的候选版本。

同步上游后先更新 `scripts/sync/UPDATE-SUMMARY.md`，再运行与改动范围匹配的根仓库、Desktop 和 Python 检查。

实现独立视觉桥接前，先完成插件的持久会话事件、图片描述复用、候选路由降级和无密钥快照；不要恢复旧的官方适配器内嵌桥接。
