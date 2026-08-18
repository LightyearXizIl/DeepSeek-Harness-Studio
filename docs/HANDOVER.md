# DeepSeek Harness Studio — 交接文档（HANDOVER）

> 本文件是项目的**总交接手册**：任何人（或 AI）接手这个项目，先读这一份。
> 配套：`docs/INTEGRATION.md`（整合架构与上游同步的完整设计与决策记录）、
> `desktop/CHANGELOG.md`（版本历史）、`desktop/README.md`（产品介绍）。

---

## 1. 项目是什么

**DeepSeek Harness Studio** = 官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（Agent 运行时 + Web UI）
+ 桌面壳层（源自官方 [DSH Desktop](https://github.com/dataelement/dsh-desktop)）+ 三个本地独家功能：

1. **视觉桥接**：DeepSeek 不收图片，桥接层用你本地的视觉模型密钥把图片转成文字描述（多提供商自动选择 + 失败回退）
2. **内置 Aqua 玻璃拟态主题**（开箱即用）
3. **设置 → 更新**：应用内检查/下载/安装更新（更新源 = 本仓库 GitHub Releases）

核心设计承诺：**官方上游可无缝增量更新**，本地功能永不丢失（冲突必报告、绝不自动解决）。

---

## 2. 仓库与目录结构

**唯一仓库**：`E:\Vibe coding\DeepSeek Harness Studio`（远程：`git@github.com:LightyearXizIl/DeepSeek-Harness-Studio.git`）

```
DeepSeek Harness Studio/
├── packages/… apps/… vendor/…    ← 官方 Harness monorepo（pnpm workspace，只跟随官方）
├── desktop/                       ← 桌面客户端（官方 dsh-desktop 的 git subtree + 本地功能）
│   ├── src/main/                 ← Electron 主进程（含 studio-local.ts 本地模块）
│   ├── src/preload/              ← 预加载（含 window.studioUpdate 更新桥）
│   ├── vendor/@deepseek-ai/      ← 内置插件（aqua 主题、studio-update 更新页）
│   ├── build/dsh-local.patch.yml ← 本地组合补丁（注册内置插件；上游不会碰）
│   ├── patches/                  ← patch-package 补丁（改 npm 包：含视觉桥接桌面版）
│   ├── dist/                     ← 构建产物（安装包在这里）
│   └── .github/workflows/release.yml ← CI 发布（mac 签名/notarize + 资产汇总）
├── packages/client/ui-aqua/              ← Aqua 主题 workspace 包（web 开发用）
├── packages/client/ui-studio-update/     ← 设置→更新 插件 workspace 包
├── scripts/
│   ├── sync/sync-upstream.ps1    ← 一键同步官方上游（通道 A/B + 冲突报告）
│   └── release/release.ps1       ← 一键发版（bump→测试→构建→tag→GitHub Release）
└── docs/INTEGRATION.md           ← 整合架构/决策记录/更新 SOP
```

**三个 Git remote**：

| remote | 指向 | 用途 |
| --- | --- | --- |
| `origin` | LightyearXizIl/DeepSeek-Harness-Studio（SSH） | 你的仓库（备份/发布） |
| `upstream` | deepseek-ai/deepseek-harness | 官方 Harness 源码 |
| `desktop-upstream` | dataelement/dsh-desktop | 官方桌面壳层 |

---

## 3. 日常操作 SOP

### 3.1 同步官方上游（重要更新时）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync\sync-upstream.ps1
```

- 通道 A：官方 Harness → merge；通道 B：官方 dsh-desktop → subtree pull
- 无冲突 → 自动合并 + `scripts/sync/UPDATE-SUMMARY.md` 摘要
- 有冲突 → **中止**，生成 `scripts/sync/CONFLICT-REPORT.md`（逐文件决策清单），绝不自动解决
- 自动检查本地功能保护清单（视觉桥接文件、品牌文件、内置插件路径）
- 也可以直接对 AI 说"更新官方源码 / 更新上游客户端 / 更新所有上游"
- 可选自动化：Windows 任务计划每天跑 `sync-upstream.ps1 -CheckOnly`（或完整模式）

### 3.2 发布新版本（一键）

**前置**：`desktop/CHANGELOG.md` 写好新版本章节并**先提交**；工作区干净。

```powershell
powershell -ExecutionPolicy Bypass -File scripts\release\release.ps1 -Version 0.0.2
```

自动完成：检查 → bump 版本号 → 测试 → 构建 Windows 安装包 → 提交 + 打 tag vX.Y.Z + 推送 → 创建 GitHub Release（正文取自 CHANGELOG）→ 上传 latest.yml / setup.exe / blockmap。
预演：加 `-DryRun`。macOS 资产由 GitHub Actions 在 tag 上自动构建（需 Apple 签名 secrets，未配置时手动补传或忽略）。

### 3.3 本地开发与构建

```powershell
pnpm install                                    # 根：harness workspace
cd desktop; npm install                          # 桌面依赖
npm run dev                                      # 桌面开发模式（electron-vite）
npm run typecheck; npm test                      # 桌面校验（63+ 测试）
npm run package:win                              # 打包 Windows 安装包
pnpm run build:lib:host                          # 根：harness 全仓构建（push 钩子自动跑）
```

### 3.4 使用者视角（应用内更新）

安装后：设置 → 更新 → 检查更新 → 自动下载 → 重启并安装。更新源 = 本仓库 GitHub Releases（`latest.yml`），官方发版不会覆盖本地功能。

---

## 4. 本地功能清单与维护要点（双维护提醒）

| 功能 | 位置 | 维护注意 |
| --- | --- | --- |
| **视觉桥接（源码版）** | `packages/llm/llm-deepseek/src/index.ts`、`adapter.ts`；`packages/host/apiproxy/src/api-proxy.ts` | ⚠️ 与官方高频冲突区；官方动这些文件时**必须同步桌面补丁**（见下） |
| **视觉桥接（桌面版）** | `desktop/patches/@deepseek-ai+dsh-llm-deepseek+0.1.0-rc.7.patch`、`…dsh-host-apiproxy…patch` | 补丁针对 npm 包编译产物；上游 npm 升版后需重新生成（改 node_modules 对应代码 → `npm exec patch-package @deepseek-ai/dsh-llm-deepseek`） |
| **Aqua 主题** | `packages/client/ui-aqua/`（源码）+ `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/`（内置）+ 注册于 `dsh-local.patch.yml` | 两处副本需保持一致；主题作者仓库更新时同步 |
| **设置 → 更新页** | `packages/client/ui-studio-update/` + `desktop/vendor/…/dsh-client-ui-studio-update/` | 同上；桌面侧配套：`updates:check` IPC（update-manager.ts）+ preload 桥（window.studioUpdate） |
| **旧数据自动迁移** | `desktop/src/main/studio-local.ts`（migrateLegacyUserData） | 首启把 `%APPDATA%\dsh-desktop` 复制到 `%APPDATA%\deepseek-harness-studio`（仅一次） |
| **品牌** | 全仓（见 6.4 保护清单） | 上游更新触及即报告；Logo 位图待重设计 |

**双维护铁律**：视觉桥接的源码改动与桌面 npm 补丁是**两份独立实现**（TS 源码 vs 编译 JS 补丁）。改任何一边，另一边必须同步，否则 web 端与桌面端行为不一致。

## 5. 密钥与安全红线

- 视觉桥接**零硬编码密钥**：`ZHIPU_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `DASHSCOPE_API_KEY` / `MOONSHOT_API_KEY` / `OPENROUTER_API_KEY` 都只从本地凭据库（设置 → 凭据）按需读取，仅用于请求头，不记录不上传
- 未配置密钥时给出明确指引（`MISSING_CREDENTIAL`），绝不静默失败
- GitHub 凭据：本地通过 Git Credential Manager（发版脚本自动读取）；SSH key 已配置用于推送
- **不要在代码/文档/示例中写入任何真实密钥**；发现泄露立即在 GitHub 撤销

## 6. 冲突处理 SOP（同步更新遇冲突时）

1. 同步脚本中止，生成 `scripts/sync/CONFLICT-REPORT.md`
2. 逐文件分类：官方独改（自动采纳）/ 本地独改（保留）/ 双方都改（**人工决策**）/ 官方删除本地文件（重放或放弃）
3. 涉及本地功能（视觉桥接文件、品牌文件、dsh-local.patch.yml、vendor/）→ 交给 AI 出**功能对比报告**（官方实现 vs 本地实现，优劣与建议）→ 你拍板
4. 解决后 `git add` + `git commit` + 重新构建验证（`pnpm run build:lib:host` + `npm test`）

## 7. 已知限制与待办

- [ ] Logo / 图标位图仍是旧版图形（文字替换无法作用于图片），需重新设计（SVG → 各尺寸 PNG/ICO/ICNS）
- [ ] 视觉桥接暂不支持 Anthropic 原生消息格式（可用 OpenRouter 等 OpenAI 兼容端点）
- [ ] macOS 构建已配置但未验证（需 Apple 开发者账号 secrets：CSC_LINK 等）
- [ ] Windows 任务计划自动化（每日同步）未注册
- [ ] GitHub Actions 上游同步（可选加强）未启用
- [ ] README 中的 Aqua 主题许可证/来源说明可补充

## 8. 常用命令速查

| 场景 | 命令 |
| --- | --- |
| 同步官方 | `scripts\sync\sync-upstream.ps1`（或 `-CheckOnly` 只检查） |
| 发新版 | `scripts\release\release.ps1 -Version x.y.z`（`-DryRun` 预演） |
| 桌面测试 | `cd desktop; npm test` |
| 桌面类型检查 | `cd desktop; npm run typecheck` |
| 打包 | `cd desktop; npm run package:win` |
| 全仓构建 | 根目录 `pnpm run build:lib:host` |
| 插件重新构建 | `pnpm --filter @deepseek-ai/dsh-client-ui-studio-update exec tsc -b` + `pnpm --filter @deepseek-ai/dsh-client-ui-studio-update bundle` |
| 重新生成 npm 补丁 | `cd desktop; npm exec patch-package @deepseek-ai/dsh-llm-deepseek` |

## 9. 环境要求

- Node.js ≥ 22（本机 hermes node v22.23.1）、pnpm ≥ 10（本机 11.x，用 `pnpm.cmd` 调用避免执行策略问题）
- Git（含 Git Credential Manager，github.com 凭据已缓存）
- GitHub CLI 可选（发版脚本不依赖它，直接用凭据调 REST API）
- Windows：PowerShell 5.1 与 7 均兼容（脚本已规避两者的坑）

## 10. 决策记录索引（详见 INTEGRATION.md 第 7 章）

D1 更新源=你的 GitHub 仓库 ｜ D2 视觉桥接源码+补丁双维护 ｜ D3 仓库位置 ｜ D4 主题进 workspace ｜ D5 远程 ｜ D6 同步不碰本地功能+功能对比报告 ｜ D7 发布渠道=公开仓库 ｜ D8 品牌重命名 DeepSeek Harness Studio ｜ 后续：版本号 0.0.1、安装包带版本、设置内更新页、一键发版脚本
