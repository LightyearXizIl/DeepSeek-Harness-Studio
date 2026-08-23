# dots-api

English | [中文](README.zh.md)

A headless agent that runs on the [Dots API open platform](https://dots.ai/platform/docs) (`dots3-note-prev`). The platform exposes an OpenAI-compatible `/v1/chat/completions` and an Anthropic-compatible `/v1/messages`, so the adaptation is a hand-declared [`@deepseek-ai/dsh-llm-pi-ai`](../../packages/llm/llm-pi-ai/README.md) route rather than a new adapter package: the route spells out protocol, endpoint, and catalog in configuration.

## Platform facts this example encodes

- Endpoint: `https://note3-prev-api.askdiandian.com` (the base URL every page of the platform docs uses).
- Authentication: the docs name an `api-key` header; the platform also accepts the `Authorization: Bearer` header pi-ai sends for `openai-completions` and the `x-api-key` header its Anthropic implementation sends, so no custom header is configured.
- Model: `dots3-note-prev`, a 512K-token context window, text plus image, video, and audio URL blocks, function calling, and SSE streaming. The route claims `[text, image]` because those are the two modalities the harness seam models.
- Deep thinking is enabled by default on the platform (`chat_template_kwargs.enable_thinking`; `thinking: adaptive` on the Anthropic endpoint). The route declares no reasoning efforts, so the adapter sends no reasoning parameter, thinking stays at the platform default, and the harness offers no effort selector for it.
- Rate limits are RPM and TPM per API key.

## Run it

The overlay `dots.cordis.patch.yml` disables the native DeepSeek adapter on the shipped headless profile, fills the dormant pi-ai adapter with the `dots` route, and re-pins the default model:

```sh
# repo root .env (gitignored) or exported env:
#   DOTS_API_KEY=<key from the platform's API Keys page>
pnpm dsh --profile headless --patch examples/dots-api/dots.cordis.patch.yml "用一句话介绍你自己"
```

On any deployment that mounts `dsh-base` (the web profile included), the same route is a settings section instead — this is what the web Models page reads and writes:

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

## What the adapter does not expose

- Video and audio input: platform-side blocks the harness seam does not model; only text and image are claimed.
- The thinking toggle: the platform's `chat_template_kwargs` wire format is not reachable from an `llm-pi-ai` profile, so thinking cannot be switched per request through this route.
- The Anthropic protocol is equally reachable: declare `api: anthropic-messages` with `baseURL: https://note3-prev-api.askdiandian.com` (pi-ai appends `/v1/messages`) on a separate route.

## Tests

The keyless smoke boots `cordis.yml` through the real Loader, asserts the `dots` route reaches a request header with `dots3-note-prev` and its 512K context, and pins that the turn fails loud with `MISSING_CREDENTIAL` naming `DOTS_API_KEY`; the with-key test sends one live prompt and verifies non-empty assistant text.

```sh
pnpm exec vitest run --config vitest.e2e.config.ts examples/dots-api/tests/keyless-smoke.e2e.ts
# with DOTS_API_KEY set:
pnpm exec vitest run --config vitest.e2e.config.ts examples/dots-api/tests/real-model.e2e.ts
```
