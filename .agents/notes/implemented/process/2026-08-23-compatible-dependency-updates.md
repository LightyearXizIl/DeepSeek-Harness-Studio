# Agent Note: Compatible dependency updates across the product tree

Status: implemented

English | [中文](2026-08-23-compatible-dependency-updates.zh.md)

## Problem

The root pnpm workspace, Desktop npm project, Python SDK, and GitHub Actions evolve independently, while the shipped product requires one Node engine range, one Harness rc.2 source baseline, and working Desktop packaging.

An unconstrained latest-version update can violate a declared peer range, split a toolchain such as Vite and VitePress, or replace the published Harness rc.2 package set with an unrelated registry pre-release.

## Decision

The repository upgrades registry dependencies, lockfiles, and Actions to their current compatible stable releases in one reviewed change.

The root and Desktop retain TypeScript 6.0.3 because TypeScript 7 is outside the root `<7` allowed peer range and `tsconfck` support range.

The website retains a direct Vite 5 dependency because VitePress 1.6.4 consumes Vite 5.

Cordis vendor packages follow the Harness rc.2 source baseline, and Desktop consumes the matching published rc.2 packages rather than the registry's independently tagged versions.

GitHub Actions use immutable full commit SHAs, and Desktop runs `patch-package` after every npm install.

The upgrade ports js-yaml custom tags and ESM imports to the v5 API, rejects blank `!!js` expressions, maps newly exposed pi-ai completion and response compatibility fields, treats unsupported terminal response states as stable `LlmError` values, and keeps React 19 ref types explicit.

## Alternatives considered

- **Adopt every latest major release.** Rejected because TypeScript 7 and Vite 8 violate existing peer and toolchain requirements.
- **Update Desktop to registry latest independently.** Rejected because its published Harness packages must remain aligned with the rc.2 Desktop subtree.
- **Leave Actions on mutable tags.** Rejected because an immutable revision is required for reproducible CI provenance.

## Consequences

`pnpm outdated -r` and Desktop `npm outdated` can report a newer TypeScript or older registry tags without making the installed version invalid; the constraint and candidate version are recorded in the handover.

The Desktop test suite uses its configured pnpm major rather than a hard-coded patch version, and its Python release-note test selects the Windows Python launcher when required.

Root typecheck, pi-ai focused tests, isolated Python tests, and Desktop install, typecheck, tests, build, and Electron startup pin the compatible update.

The official DeepSeek visual API remains unverified without `DEEPSEEK_API_KEY`; this dependency update does not replace a real provider acceptance test.
