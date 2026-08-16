<h1 align="center">
  DeepSeek Harness Studio
</h1>

<p align="center">
  A local-first, cross-platform desktop client for
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> —
  always in sync with the official upstream, with local extras built in.
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

## What is DeepSeek Harness Studio?

DeepSeek Harness Studio is the DeepSeek Harness agent runtime and Web UI packaged as a
desktop application, with three local additions you will not find upstream:

1. **Vision bridge — image understanding for DeepSeek.** DeepSeek models do not accept
   images, so the bridge automatically describes your images with your **own** vision-model
   API keys before they reach DeepSeek. The bridge auto-selects the first vision provider
   you configured (Zhipu GLM, OpenAI, Gemini, Qwen, Kimi, OpenRouter), and falls through to
   the next one when a request fails.
2. **Built-in Aqua theme.** A glassmorphism UI theme ships inside the installer — no
   separate plugin install needed.
3. **Automatic upstream sync.** The Harness engine and the desktop shell follow the official
   [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and
   [DSH Desktop](https://github.com/dataelement/dsh-desktop) releases. Local features are
   preserved on every update; merge conflicts are **reported, never auto-resolved**.

On first launch the Studio inherits your existing data (API keys, sessions, profiles,
plugins) from the official DSH Desktop — nothing is lost when you switch.

Updates are served from this repository's own GitHub Releases, so the app never gets
overwritten by upstream builds.

## Download

Download the latest installer for macOS and Windows from
**[Releases](https://github.com/LightyearXizIl/DeepSeek-Harness-Studio/releases)**.

Installed builds check for updates automatically on startup and every six hours; you can
also use **Check for Updates…** from the application menu.

## First run

1. Install and launch DeepSeek Harness Studio.
2. Add your model providers and enter your own API keys in **Settings → Models /
   Credentials**. Keys are stored only on your machine and are never uploaded anywhere.
3. *(Optional)* For image understanding, configure at least one vision-provider key —
   any of `ZHIPU_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DASHSCOPE_API_KEY`,
   `MOONSHOT_API_KEY` or `OPENROUTER_API_KEY`.

> The vision bridge never ships, embeds or logs any API key. Keys are read on demand from
> the local credential store and are used only for the vision-model request. Without a
> configured key the bridge shows a clear setup hint instead of failing silently.

## Features

- Opens directly into Harness with no landing page; starts without an initial directory
  prompt
- Listens only on a random `127.0.0.1` port per launch; graceful shutdown of the Harness
  child process
- Vision bridge with multi-provider fallback and per-image caching
- Built-in Aqua glassmorphism theme (toggle in Settings → Plugins → Aqua)
- One-time migration of legacy DSH Desktop user data
- Preset import/export as portable `.dshpreset` packages with conflict checks
- Windows x64 installer (NSIS) and macOS (Apple Silicon / Intel) builds
- Model providers: DeepSeek, OpenAI, Anthropic, Google Gemini, xAI, Moonshot/Kimi,
  MiniMax, Zhipu GLM, Mistral AI, OpenRouter, Groq, Together AI

## Updates

- **App updates** come from this repository's GitHub Releases (automatic check, or
  *Check for Updates…* in the menu).
- **Source-level sync** with the official upstreams happens in this repository
  (`scripts/sync/sync-upstream.ps1` handles both upstream channels, conflict reports and
  local-feature protection). See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the full
  update workflow and maintenance guide.

## Build from source

```bash
# repository layout: harness monorepo at the root, desktop app under desktop/
pnpm install          # harness workspace
cd desktop && npm install
npm run package:win   # or package:mac / package:mac:arm64
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the repository architecture, the
upstream sync workflow and the local-feature protection rules.

## Changelog

See [desktop/CHANGELOG.md](desktop/CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE). The bundled Aqua theme is MIT licensed as well.
