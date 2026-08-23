# dots-api

[English](README.md) | 中文

一个跑在 [Dots API 开放平台](https://dots.ai/platform/docs)（`dots3-note-prev`）上的 headless agent。平台同时提供 OpenAI 兼容的 `/v1/chat/completions` 与 Anthropic 兼容的 `/v1/messages`，因此适配方式是 [`@deepseek-ai/dsh-llm-pi-ai`](../../packages/llm/llm-pi-ai/README.md) 的一条手工声明路由（hand-declared route），而不是一个新的适配器包：路由在配置里写全协议、端点与模型目录。

## 本示例固化的平台事实

- 端点：`https://note3-prev-api.askdiandian.com`（平台文档每一页使用的 base URL）。
- 认证：文档写明 `api-key` 请求头；平台同样接受 pi-ai 为 `openai-completions` 发送的 `Authorization: Bearer` 头及其 Anthropic 实现发送的 `x-api-key` 头，因此无需配置自定义请求头。
- 模型：`dots3-note-prev`，512K Token 上下文，支持文本与图片、视频、音频 URL 块、函数调用与 SSE 流式输出。本路由声明 `[text, image]`，因为这是 harness seam 建模的两种模态。
- 平台默认开启深度思考（`chat_template_kwargs.enable_thinking`；Anthropic 端点为 `thinking: adaptive`）。本路由不声明任何 reasoning effort，适配器因而不发送任何推理参数，思考保持平台默认，harness 也不提供 effort 选择器。
- 速率限制按单个 API Key 分别计算 RPM 与 TPM。

## 运行

`dots.cordis.patch.yml` 这个叠加层在随附的 headless profile 上禁用原生 DeepSeek 适配器、为休眠的 pi-ai 适配器填入 `dots` 路由，并重新钉住默认模型：

```sh
# repo root .env (gitignored) or exported env:
#   DOTS_API_KEY=<key from the platform's API Keys page>
pnpm dsh --profile headless --patch examples/dots-api/dots.cordis.patch.yml "用一句话介绍你自己"
```

在任何挂载 `dsh-base` 的部署上（包括 web profile），同样的路由写成 settings 段即可——这正是 web 模型页读取与写入的内容：

```yaml
# $DSH_HOME/settings.yaml
llm-pi-ai:
  providers:
    dots:
      displayName: Dots API
      apiKeyEnv: DOTS_API_KEY
      api: openai-completions
      baseURL: https://note3-prev-api.askdiandian.com/v1
      models:
        - id: dots3-note-prev
          name: Dots 3 Note (prev)
          contextWindow: 524288
          input: [text, image]
```

## 适配器不暴露的部分

- 视频与音频输入：平台侧的输入块不在 harness seam 建模范围内，仅声明文本与图片。
- 深度思考开关：平台的 `chat_template_kwargs` 线格式无法从 `llm-pi-ai` profile 触达，因此该路由无法按请求切换思考模式。
- Anthropic 协议同样可达：在单独的路由上声明 `api: anthropic-messages` 并把 `baseURL` 设为 `https://note3-prev-api.askdiandian.com`（pi-ai 会追加 `/v1/messages`）。

## 测试

无密钥冒烟测试通过真实 Loader 启动 `cordis.yml`，断言 `dots` 路由进入请求头且携带 `dots3-note-prev` 与 512K 上下文，并钉住该轮以 `MISSING_CREDENTIAL` 失败、报错点名 `DOTS_API_KEY`；带密钥测试发送一次真实提示并校验返回的非空助手文本。

```sh
pnpm exec vitest run --config vitest.e2e.config.ts examples/dots-api/tests/keyless-smoke.e2e.ts
# with DOTS_API_KEY set:
pnpm exec vitest run --config vitest.e2e.config.ts examples/dots-api/tests/real-model.e2e.ts
```
