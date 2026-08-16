# Changelog

本文件记录 DeepSeek Harness Studio 每个版本的变更。格式基于
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

## [0.0.2] - 2026-08-16

### 修复

- **修复启动崩溃（重要）**：从官方 DSH Desktop 迁移数据后，旧版数据中的
  `cordis.patch.yml` 已注册过 `ui-aqua`，与新版内置注册冲突，导致
  `duplicate loader entry id: ui-aqua`，Harness 无法启动（exit code 1）。
  现在启动时合并补丁会**自动去重**：用户数据中已注册的内置插件（ui-aqua /
  ui-studio-update）不再重复插入，已迁移用户升级后直接可用，无需清理数据。

## [0.0.1] - 2026-08-16

### 新增

- **品牌重塑**：`DSH Desktop` → `DeepSeek Harness Studio`（产品名、窗口标题、菜单、
  更新提示、安装包名、文档与补丁全面更换，全树零残留）
- **视觉桥接（图片理解）**：DeepSeek 不接受图片输入，桥接层在请求前自动调用视觉模型
  把图片转成中文描述，让 DeepSeek 能"看懂"图片
  - 多提供商自动选择：按序使用本地凭据库中已配置的第一个密钥 —— 智谱 GLM
    （`ZHIPU_API_KEY`）、OpenAI（`OPENAI_API_KEY`）、Gemini（`GEMINI_API_KEY`）、
    通义千问（`DASHSCOPE_API_KEY`）、Kimi（`MOONSHOT_API_KEY`）、OpenRouter
    （`OPENROUTER_API_KEY`）
  - 请求失败自动回退到下一个提供商；同一图片按附件 ID 缓存，只分析一次
  - **零硬编码密钥**：密钥只从本地凭据库按需读取，仅用于请求头，不记录不上传
- **内置 Aqua 玻璃拟态主题**：随安装包分发，首启自动安装并默认启用
  （设置 → 插件 → Aqua 可开关），无需任何外部下载
- **旧版数据自动继承**：首次启动自动把官方 DSH Desktop 的本地数据（密钥、会话、
  配置、插件）一次性复制到新目录；旧版目录保持不动，可继续使用
- **自有更新通道**：应用内更新指向本仓库 GitHub Releases，官方发版不会覆盖本地功能
- **上游自动同步工具链**：`scripts/sync/sync-upstream.ps1` 一键同步官方 Harness 与
  官方 DSH Desktop 两个上游；无冲突自动合并，有冲突生成 `CONFLICT-REPORT.md`
  交人工决策；本地功能受保护清单自动检测
- 单仓库整合：Harness 官方源码（根）+ 桌面客户端（`desktop/` 子树）+ Aqua 主题
  （内置），三个官方上游持续增量更新

### 修复

- 修复视觉桥接本地改动的编译错误（api-proxy 结构损坏 + llm-deepseek 类型错误），
  首次通过完整构建与类型检查
- 修复桌面测试在 monorepo 环境下被根 vitest 配置干扰的问题
- 修复同步脚本在 Windows PowerShell 5.1 下的兼容问题（stderr、编码、变量名冲突）

### 安全

- 视觉桥接无任何硬编码密钥；未配置视觉密钥时给出明确的配置指引
  （`MISSING_CREDENTIAL`），绝不静默失败

### 已知限制

- Logo / 图标图片资源仍为旧版图形（文字替换无法作用于位图），重新设计计划中
- 视觉桥接暂不支持 Anthropic 原生消息格式（可用 OpenRouter 等 OpenAI 兼容端点替代）
- 首次发布为 Windows x64；macOS 构建已配置，待发布验证

[0.0.1]: https://github.com/LightyearXizIl/DeepSeek-Harness-Studio/releases/tag/v0.0.1
