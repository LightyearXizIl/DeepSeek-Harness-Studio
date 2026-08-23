# Agent Note: 跨产品树的兼容依赖升级

Status: implemented

[English](2026-08-23-compatible-dependency-updates.md) | 中文

## 问题

根 pnpm 工作区、Desktop npm 项目、Python SDK 和 GitHub Actions 独立演进，但已交付产品需要同一 Node 引擎范围、同一 Harness rc.2 源码基线和可用的 Desktop 打包链路。

不受约束地采用最新版本可能违反声明的 peer 范围、拆分 Vite 与 VitePress 等工具链，或以无关的注册表预发布版本替换已发布的 Harness rc.2 包集。

## 决策

仓库在同一经评审的变更中将注册表依赖、锁文件和 Actions 升级到当前兼容的稳定版本。

根仓库与 Desktop 保持 TypeScript 6.0.3，因为 TypeScript 7 超出根 `<7` allowed peer 范围及 `tsconfck` 支持范围。

网站保持 Vite 5 的直接依赖，因为 VitePress 1.6.4 消费 Vite 5。

Cordis vendor 包跟随 Harness rc.2 源码基线，Desktop 消费配套的已发布 rc.2 包，而不是注册表中独立打标的版本。

GitHub Actions 使用不可变的完整提交 SHA，Desktop 每次 npm 安装后运行 `patch-package`。

本次升级将 js-yaml 自定义标签和 ESM 导入迁移到 v5 API，拒绝空的 `!!js` 表达式，映射 pi-ai 新公开的 completion 和 response 兼容字段，把不支持的终止响应状态转换为稳定的 `LlmError`，并显式标注 React 19 ref 类型。

## 考虑过的替代方案

- **采用所有最新主版本。** 不采用，因为 TypeScript 7 和 Vite 8 违反现有 peer 与工具链要求。
- **让 Desktop 独立采用注册表 latest。** 不采用，因为其已发布的 Harness 包必须与 rc.2 Desktop subtree 对齐。
- **让 Actions 继续使用可变 tag。** 不采用，因为可复现的 CI 来源需要不可变修订。

## 后果

`pnpm outdated -r` 和 Desktop `npm outdated` 可能报告更高的 TypeScript 或更旧的注册表 tag，但这不会使当前安装版本失效；约束和候选版本记录在交接文档中。

Desktop 测试使用配置的 pnpm 主版本，不再硬编码某一个 patch 版本；其 Python 发版说明测试会在需要时选择 Windows Python launcher。

根 typecheck、pi-ai 聚焦测试、隔离的 Python 测试，以及 Desktop 安装、typecheck、测试、构建和 Electron 启动共同固定此次兼容升级。

没有 `DEEPSEEK_API_KEY` 时无法验收官方 DeepSeek 视觉 API；本次依赖升级不能替代真实提供方验收。
