# DeepSeek Harness Studio Handover

English | [中文](HANDOVER.zh.md)

This document records the runnable state and maintenance limits. Read the root `AGENTS.md` and the [architecture](architecture.md) before changing `packages/`.

## Project status

DeepSeek Harness Studio consists of the official Harness core, the Desktop shell, the Aqua theme, and the Studio update page.

The official `deepseek-official / deepseek-v4-flash-vision-exp` is the only delivered image-input entry point. It uses upstream attachment normalization and the Files API flow.

The embedded vision bridge has been removed, and `desktop/patches/@deepseek-ai+dsh-llm-deepseek+0.1.0-rc.7.patch` is absent.

The standalone `@deepseek-ai/dsh-llm-vision-bridge` plugin is not implemented. Do not treat any third-party vision service as configured or accepted.

Windows x64 version `v0.0.4` is released. Its release page, installer, blockmap, and `latest.yml` are available from [GitHub Release v0.0.4](https://github.com/LightyearXizIl/DeepSeek-Harness-Studio/releases/tag/v0.0.4).

## Layout and ownership

| Path | Ownership and purpose |
| --- | --- |
| `packages/`, `apps/`, `vendor/` | Harness pnpm workspace; Cordis vendor sources follow only the Harness-pinned version. |
| `desktop/` | Standalone npm project consuming published Harness rc.2 packages. |
| `desktop/build/deepseek-harness-studio.patch.yml` | Desktop upstream composition layer. |
| `desktop/build/dsh-local.patch.yml` | Studio-local composition layer that registers Aqua and the Studio update page. |
| `packages/client/ui-aqua/`, `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/` | Aqua workspace and Desktop packaged copy; update both together. |
| `scripts/sync/UPDATE-SUMMARY.md` | Factual record for each upstream sync. |

## Upstream baselines

Harness is synchronized to `b150a551b8` from `upstream/master` (`dsh-v0.1.1-rc.2`).

Desktop is synchronized to `9957aff5bf` from `desktop-upstream/chore/harness-rc2`, and its dependencies are pinned to Harness rc.2.

Aqua is outside this upstream sync. Its candidate upstream changed to AGPL, so the local MIT copy remains unchanged until a license decision permits an update.

## Dependency policy

The root pnpm workspace, Desktop npm project, Python `uv.lock`, and GitHub Actions have compatible dependency upgrades.

The root repository and Desktop use TypeScript `6.0.3`: TypeScript 7 violates the repository's `<7` peer constraint and `tsconfck`'s TypeScript 5 peer range.

The website keeps Vite 5 because VitePress `1.6.4` consumes Vite 5. Upgrading to Vite 8 would produce two incompatible Vite type sets.

Desktop uses Electron `43.4.1`, React `19.2.8`, Node `26.7.0`, pnpm `11.22.0`, and Zustand `5.0.15`.

Every GitHub Action is pinned to a full commit SHA; future Action upgrades must keep that pinning method.

Desktop removes the obsolete vision-bridge patch replaced by rc.2. `patch-package` must apply every remaining rc.2 patch after installation.

## Studio-local conventions

The product name, user-data path, GitHub update source, Aqua, and `dsh-local.patch.yml` are Studio-local behavior. Desktop synchronization must not overwrite them with upstream defaults.

Sidebar assets use `deepseek-harness-studio-logo-*.png`; Desktop startup code, the asset installation script, and the rc.2 sidebar patch must use the same names.

Development builds use `studioChannel: 'development'` and the separate `deepseek-harness-studio-dev` user-data directory.

## Completed verification

- Root repository: `pnpm install --offline`, `pnpm peers check`, `pnpm run typecheck`, focused pi-ai tests, and `git diff --check` pass.
- Python: `uv sync --project python/sdk --group test` and `uv run --project python/sdk pytest` pass in an isolated temporary environment (52 passed, 10 skipped).
- Desktop: npm installation and every rc.2 patch application pass; the Electron `43.4.1` binary runs; `npm run typecheck`, `npm test` (247 passed), and `npm run build` pass.
- Release: tag `v0.0.4` and `master` both point to `31bd254538e0c985f7358e59d6b7ada03e83136e`. The Windows x64 NSIS installer was built, and silent installation and removal created and cleared the application, uninstaller, and matching uninstall registry entry.
- Remote assets: installer `deepseek-harness-studio-0.0.4-windows-x64-setup.exe` is `159277487` bytes with SHA-256 `4ed5dfc04d031ef37c05f9cd670ae4ba1b3fd7b1bec28357cfaf7ae4d0708e2d`. The GitHub Release installer, blockmap, and `latest.yml` are all `uploaded`, with matching local sizes and SHA-256 values.

The official new vision model has no real API acceptance without `DEEPSEEK_API_KEY`; keyless coverage does not substitute for it.

The installer has no code-signing certificate, so Windows can show an unknown-publisher prompt.

`test:coverage`, `test:snapshot`, `doc-sync`, and `duplication` have no all-green evidence. Coverage stalled in a CLI isolated test; snapshot tests lack Windows `bash` and executable CLI tools; documentation sync reports Aqua JSDoc, README limitation, and existing bilingual-pair issues; duplication reports four existing Aqua clone groups.

## Follow-up work

Before another dependency upgrade, run `pnpm outdated -r --format json` and `npm outdated --json`, then record candidates limited by engine, peer, or upstream rc.2 version pins.

After an upstream sync, update `scripts/sync/UPDATE-SUMMARY.md` first, then run root, Desktop, and Python checks that match the changed area.

Before implementing the standalone vision bridge, add its durable session event, image-description reuse, candidate-route fallback, and keyless snapshots. Do not restore the embedded bridge in the official adapter.

After a release, manually accept the Windows installer model selection, image upload, Aqua settings, and Studio update entry. Before accepting the official vision model, configure `DEEPSEEK_API_KEY` and record API results and error handling in the corresponding tests or Agent Note.
