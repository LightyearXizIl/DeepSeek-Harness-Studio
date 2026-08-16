<h1 align="center">
  DeepSeek Harness Studio
</h1>

<p align="center">
  基于 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 的本地优先桌面客户端 ——
  始终跟随官方上游同步更新，并内置独家本地功能。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
</p>

---

## DeepSeek Harness Studio 是什么？

DeepSeek Harness Studio 把 DeepSeek Harness 的 Agent 运行时与 Web 界面打包成桌面应用，
并内置三项上游没有的本地功能：

1. **视觉桥接 —— DeepSeek 图片理解。** DeepSeek 模型本身不接受图片，桥接层会在请求到达
   DeepSeek 之前，用**你自己**的视觉模型密钥自动把图片转换成文字描述。桥接按顺序自动选择
   你已配置的第一个视觉提供商（智谱 GLM、OpenAI、Gemini、通义千问、Kimi、OpenRouter），
   请求失败自动回退到下一个。
2. **内置 Aqua 主题。** 玻璃拟态 UI 主题随安装包内置，开箱即用，无需单独安装插件。
3. **自动跟随上游同步。** Harness 内核与桌面壳层持续跟随官方
   [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 与
   [DSH Desktop](https://github.com/dataelement/dsh-desktop) 更新；本地功能在每次更新中
   完整保留，遇到合并冲突会**生成报告交给你决策，绝不自动解决**。

首次启动时，Studio 会自动继承官方 DSH Desktop 的本地数据（API 密钥、会话、配置、插件），
切换无痛、什么都不丢。

应用内更新走本仓库自己的 GitHub Releases，永远不会被上游构建覆盖。

## 下载

从 **[Releases](https://github.com/LightyearXizIl/DeepSeek-Harness-Studio/releases)** 下载
Windows / macOS 最新安装包。

已安装版本会在启动时与每 6 小时自动检查更新，也可以在应用菜单中手动"检查更新…"。

## 首次使用

1. 安装并启动 DeepSeek Harness Studio。
2. 在 **设置 → 模型 / 凭据** 中添加你的模型提供商，并输入**你自己的** API 密钥。
   密钥只保存在本机，不会上传到任何地方。
3. （可选）如需图片理解，配置至少一个视觉提供商密钥：`ZHIPU_API_KEY`、`OPENAI_API_KEY`、
   `GEMINI_API_KEY`、`DASHSCOPE_API_KEY`、`MOONSHOT_API_KEY` 或 `OPENROUTER_API_KEY`
   中的任意一个。

> 安全承诺：视觉桥接**绝不内置、不记录、不上传任何密钥**。密钥只在请求时从本地凭据库按需
> 读取，仅用于视觉模型请求；未配置密钥时会给出明确的配置指引，而不是静默失败。

## 功能特性

- 启动直达 Harness 界面，无需手动启动命令行或管理端口
- 每次启动只监听随机的 `127.0.0.1` 端口；退出时优雅关闭 Harness 子进程
- 视觉桥接：多提供商自动回退 + 按图片缓存（同一图片只分析一次）
- 内置 Aqua 玻璃拟态主题（设置 → 插件 → Aqua 可开关）
- 首次启动自动继承旧版 DSH Desktop 数据（密钥/会话/配置/插件）
- 便携式 `.dshpreset` 预设包导入/导出，带冲突检查与信任提示
- Windows x64 安装包（NSIS）与 macOS（Apple Silicon / Intel）构建
- 模型提供商：DeepSeek、OpenAI、Anthropic、Google Gemini、xAI、Moonshot/Kimi、
  MiniMax、智谱 GLM、Mistral AI、OpenRouter、Groq、Together AI

## 更新机制

- **应用更新**：来自本仓库的 GitHub Releases（自动检查，或菜单"检查更新…"）。
- **源码同步**：本仓库内置自动同步脚本（`scripts/sync/sync-upstream.ps1`，覆盖两个官方
  上游通道、冲突报告、本地功能保护）。完整的更新流程与维护指南见
  [docs/INTEGRATION.md](docs/INTEGRATION.md)。

## 从源码构建

```bash
# 仓库结构：根目录是 harness monorepo，桌面应用在 desktop/ 下
pnpm install          # harness workspace 依赖
cd desktop && npm install
npm run package:win   # 或 package:mac / package:mac:arm64
```

仓库架构、上游同步流程与本地功能保护规则详见
[docs/INTEGRATION.md](docs/INTEGRATION.md)。

## 更新日志

见 [desktop/CHANGELOG.md](desktop/CHANGELOG.md)。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。内置的 Aqua 主题同样为 MIT 许可。
