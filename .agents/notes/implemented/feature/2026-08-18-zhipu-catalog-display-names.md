# Agent Note: Zhipu catalog routes get Chinese-language display names

Status: implemented

English | [中文](2026-08-18-zhipu-catalog-display-names.zh.md)

## Problem

The Models page's "add provider" list shows dormant pi-ai catalog routes by route key. The Zhipu routes `zai` and `zai-coding-cn` are offered there, but their keys do not let a Chinese-language configuration surface find the vendor, so a user looking for 智谱 cannot locate it without knowing the key.

## Decision

`dsh-llm-pi-ai` gains `catalogDisplayName(provider)`: the route key for every route, except `zai` → `智谱 Z.AI（国际）` and `zai-coding-cn` → `智谱 GLM Coding Plan（国内）`. Both places a default display name is produced use it — the configurable-provider directory's dormant catalog entries and `resolveProfiles`' display-name default — so the name also survives activation unless a profile names its own `displayName`, which still wins everywhere.

The table covers exactly the two Zhipu routes. Renaming every catalog route is a separate product decision; route keys remain the default for all other providers, preserving the naming behavior the [web configuration plane](../architecture/2026-07-30-web-config-plane.md) directory shipped with. That note stays active and owns the directory mechanism; the overlap is the display-name default only.

## Alternatives considered

- **Show every catalog route's pi-ai provider name** (`Z.AI`, `OpenAI`, …) instead of route keys. That improves the picker product-wide, but the English brand still does not read as 智谱 to a Chinese-language user, and renaming every route is a larger product decision than the case at hand.
- **Keep route keys and document the mapping.** A user who cannot find 智谱 in the list cannot look up a mapping they do not know exists.
- **Localize names in the client layer only.** That would split the naming contract between host and client and leave headless surfaces showing keys.

## Consequences

- The Models page's add-provider list shows the two Zhipu routes with Chinese display names, and the names survive activation because `resolveProfiles` defaults to the same table.
- Every other catalog route keeps its route key; the directory's naming behavior is unchanged outside the two routes.
- The table lives in the host adapter, so all configuration surfaces share one naming contract.
