# Agent Note: Dots API Platform Integration Ships as an Examples-Level llm-pi-ai Route

Status: implemented

English | [中文](2026-08-19-dots-api-platform-llm-pi-ai-example.zh.md)

## Problem

The Dots API open platform (dots.ai/platform/docs) exposes `dots3-note-prev` over an OpenAI-compatible `/v1/chat/completions` and an Anthropic-compatible `/v1/messages`. Adapting the harness to that platform requires deciding where the adaptation lives — a new adapter package, an upstream pi-ai catalog entry, or configuration — and whether the route works unchanged at all: the platform documents an `api-key` request header, which the harness's pi-ai adapter does not send.

## Decision

The adaptation is configuration. `examples/dots-api/` mounts `dsh-llm-pi-ai` with a hand-declared `dots` route over `openai-completions` — base URL `https://note3-prev-api.askdiandian.com/v1`, model `dots3-note-prev` with a 524288 context window and `[text, image]` input. The platform accepts the `Authorization: Bearer` header pi-ai's OpenAI implementation sends and the `x-api-key` header its Anthropic implementation sends (verified by probing the endpoints against an invalid key, which both headers reach), so no authentication code changes. The keyless smoke boots the composition through the real Loader and pins the route reaching a request header plus the loud `MISSING_CREDENTIAL` failure naming `DOTS_API_KEY`; the with-key e2e sends one live prompt and self-skips without the key. A `dots.cordis.patch.yml` overlay swaps the route into the shipped headless profile, and the example README records the settings-section variant every `dsh-base` deployment (web included) can use.

Route facts the example pins: deep thinking stays at the platform default because the route declares no reasoning efforts, so the adapter sends no reasoning parameter; only text and image are claimed because those are the two modalities the harness seam models; the platform's video/audio blocks and its `chat_template_kwargs` thinking toggle are documented as not reachable from a profile.

## Alternatives considered

**A new `@deepseek-ai/dsh-llm-dots` adapter package.** Rejected: the platform is an OpenAI/Anthropic-compatible gateway, and the hand-declared route mechanism exists exactly to serve gateways as configuration (see the [declared provider catalog note](2026-08-03-pi-ai-declared-provider-catalog.md)); a dedicated package would duplicate request, stream, replay, and credential machinery for no capability the generic adapter lacks.

**Contributing `dots` to the pi-ai provider catalog.** Rejected: that catalog is upstream's; waiting for a release would keep the platform unavailable until then, and a profile already lets any deployment declare the route outright.

**Sending the documented `api-key` header through `profile.headers`.** Rejected: profile headers are static configuration while the secret resolves per request through the credential seam, so a static header cannot carry it; the endpoint probe confirmed Bearer acceptance, which makes the workaround unnecessary.

## Consequences

The adaptation is zero runtime code: configuration, one example leaf, its tests, and its README. The declared-provider-catalog decision now has a worked, tested reference for a real gateway. What it costs: platform-specific facts live in the example README rather than any shared registry, the thinking toggle and video/audio input stay unexposed until the harness seam or the profile schema models them, and the with-key test runs against the live platform, so it self-skips without `DOTS_API_KEY`.

## Testing

`examples/dots-api/tests/keyless-smoke.e2e.ts` pins route registration and the loud credential failure through the real Loader; `examples/dots-api/tests/real-model.e2e.ts` pins one live prompt when a key is present; `verify-cordis-config` scans the leaf's `cordis.yml` against the examples workspace manifest.
