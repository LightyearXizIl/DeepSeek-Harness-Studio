# Agent Note: Dots API 平台接入以示例级 llm-pi-ai 路由落地

Status: implemented

[English](2026-08-19-dots-api-platform-llm-pi-ai-example.md) | 中文

## Problem

Dots API 开放平台（dots.ai/platform/docs）通过 OpenAI 兼容的 `/v1/chat/completions` 与 Anthropic 兼容的 `/v1/messages` 提供 `dots3-note-prev`。把 harness 适配到该平台需要决定适配落在哪里——新适配器包、上游 pi-ai catalog 条目，还是纯配置——以及该路由能否原样工作：平台文档写明使用 `api-key` 请求头，而 harness 的 pi-ai 适配器并不发送这个头。

## Decision

适配就是配置。`examples/dots-api/` 挂载 `dsh-llm-pi-ai`，用一条手工声明的 `dots` 路由走 `openai-completions`——base URL `https://note3-prev-api.askdiandian.com/v1`，模型 `dots3-note-prev`，524288 上下文窗口，`[text, image]` 输入。平台接受 pi-ai 的 OpenAI 实现发送的 `Authorization: Bearer` 头与其 Anthropic 实现发送的 `x-api-key` 头（用无效 Key 探测端点验证：两种头都到达同一 Key 校验路径），因此没有任何认证代码改动。无密钥冒烟测试通过真实 Loader 启动该组合，钉住路由进入请求头、以及缺少 `DOTS_API_KEY` 时以 `MISSING_CREDENTIAL` 响亮失败并点名该变量；带密钥 e2e 发送一次真实提示，无 Key 时自行跳过。`dots.cordis.patch.yml` 叠加层把该路由换入随附的 headless profile，示例 README 记录每个 `dsh-base` 部署（含 web）都可用的 settings 段变体。

示例钉住的路由事实：深度思考保持平台默认——路由不声明任何 reasoning effort，适配器因此不发送推理参数；只声明文本与图片，因为这是 harness seam 建模的两种模态；平台的视频/音频块与 `chat_template_kwargs` 思考开关被记录为无法从 profile 触达。

## Alternatives considered

**新建 `@deepseek-ai/dsh-llm-dots` 适配器包。** 否决：平台是 OpenAI/Anthropic 兼容网关，而手工声明路由机制的存在正是为了让网关以配置接入（见[声明式 provider catalog 笔记](2026-08-03-pi-ai-declared-provider-catalog.md)）；专用包会复制请求、流、回放与凭据机制，却不带来通用适配器缺失的任何能力。

**向 pi-ai provider catalog 贡献 `dots`。** 否决：该 catalog 属于上游；等上游发布会让平台在此之前不可用，而 profile 已经能让任何部署直接声明该路由。

**通过 `profile.headers` 发送文档要求的 `api-key` 头。** 否决：profile 请求头是静态配置，而密钥按请求经凭据 seam 解析，静态头无法携带它；端点探测已确认 Bearer 被接受，这一变通没有必要。

## Consequences

适配不涉及任何运行时代码：配置、一个示例叶、其测试与 README。声明式 provider catalog 决策如今有了一个针对真实网关的、经过测试的完整参照。代价：平台特定事实放在示例 README 而非任何共享注册表；思考开关与视频/音频输入在 harness seam 或 profile schema 建模之前保持不可达；带 Key 测试跑在真实平台上，因此没有 `DOTS_API_KEY` 时自行跳过。

## Testing

`examples/dots-api/tests/keyless-smoke.e2e.ts` 通过真实 Loader 钉住路由注册与响亮的凭据失败；`examples/dots-api/tests/real-model.e2e.ts` 在有 Key 时钉住一次真实提示；`verify-cordis-config` 对照 examples workspace manifest 扫描该叶的 `cordis.yml`。
