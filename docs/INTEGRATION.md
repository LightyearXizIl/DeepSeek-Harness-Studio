# 三合一整合计划书

**deepseek-harness（官方源码）+ dsh-desktop（客户端）+ Aqua 主题 → 单一仓库，双上游无缝增量更新**

> 本文档基于 2026-02 前对三份源码的只读调查编写，未修改任何源码。
> 配套调查证据见第 10 章附录。

---

## 0. 结论摘要（TL;DR）

1. **整合形态**：在 `E:\Vibe coding\DeepSeek Harness Studio` 新建**唯一根仓库**（从 deepseek-harness `git clone` 而来，完整保留官方历史与 remote），桌面端源码以 **git subtree** 挂载到 `desktop/` 子目录，主题**内置**进桌面端应用资源并由组合补丁默认启用。整个仓库推到你自己的私有 GitHub 远程备份。
2. **官方更新无缝流入**：
   - 官方 Harness 更新 → `git fetch upstream && git merge upstream/master`，本地功能以**独立提交**存在，官方更新自动合并。
   - 官方 Desktop（dataelement/dsh-desktop）更新 → `git subtree pull --squash --prefix=desktop desktop-upstream master`。
   - **以上可全自动化**（见 4.4）：脚本检测 + 无冲突自动合并 + Windows 任务计划定时执行，冲突时自动停下出报告。
3. **冲突透明化 + 本地功能保护**：更新脚本遇冲突即**中止并生成 CONFLICT-REPORT.md**，逐文件分类、给建议，交给你拍板后再继续；**同步永不修改你的本地功能**（视觉桥接、内置主题、更新源等，见 6.4 受保护清单）；若官方更新实现了与本地功能**相同/类似的功能**，额外生成**功能对比报告**（两个功能的区别、优劣对比、是否改用官方的建议），由你决定去留。
4. **主题内置**：主题源码 + 构建产物放进 `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/`，随桌面应用打包；首次启动自动复制到 DSH_HOME 插件目录并在组合补丁中注册 `ui-aqua`，开箱即用。
5. **好消息**：桌面端目前与官方上游 v0.1.1 **内容一致**（仅 1 处真实本地改动 + 换行/编码噪声），更新将非常顺滑；唯一的高冲突风险区是 Harness 源码中的**视觉桥接**（3 个文件）。
6. **你的发布链路**：应用内"检查更新"指向**你自己的公开仓库**（不是官方服务器，否则官方发版会覆盖你的本地功能）；源码更新（官方 → 你的仓库）与应用更新（你的 Release → 使用者）是两条独立链路。你的仓库为 **public 开源**，Release 匿名可下载，使用者免认证自动更新（见 7.2，D7 已定方案 A）。

---

## 1. 现状盘点（只读调查结论）

### 1.1 官方源码 `E:\Vibe coding\deepseek-harness`

| 项目 | 结论 |
| --- | --- |
| Git | ✅ 完整 git 仓库，`origin = https://github.com/deepseek-ai/deepseek-harness` |
| 分支 | `master`，与官方 origin/master **同步**（无 ahead/behind） |
| 本地改动 | **3 个未提交文件，全部属于"视觉桥接"功能**（见下） |
| 工程形态 | pnpm monorepo（`pnpm-workspace.yaml`：`packages/*/*`、`apps/*`、`vendor/*`、`website` 等） |

**视觉桥接（本地未提交改动，必须保留）**：

| 文件 | 改动内容 |
| --- | --- |
| `packages/host/apiproxy/src/api-proxy.ts` | 去掉两处"模型不支持图片"的拦截（模型切换、图片准入），让含图会话正常流转 |
| `packages/llm/llm-deepseek/src/adapter.ts` | 新增 `bridgeMessages` 钩子：请求发送前可改写消息 |
| `packages/llm/llm-deepseek/src/index.ts` | 用智谱 GLM `glm-4.6v-flash` 把图片转成中文描述（按 attachmentId 缓存，同一图只分析一次），DeepSeek 只看到文本 |

**风险预告**：这 3 个文件都是官方活跃改动区，是未来与官方更新发生冲突的**最高概率文件**。

### 1.2 客户端 `E:\Vibe coding\dsh-desktop-main`

| 项目 | 结论 |
| --- | --- |
| Git | ❌ **不是 git 仓库**（无 .git，无任何历史） |
| 来源 | 官方 `dataelement/dsh-desktop` 的 **v0.1.1 快照**（逐文件比对确认，见附录 A2） |
| 真实本地改动 | **仅 1 处**：`test/release.test.ts` 把发布源断言从 `generic dshdesktop.com` 改成了 `github dataelement/dsh-desktop`。⚠️ 但 `package.json` 的 `build.publish` **仍是 generic 官方更新源**——两者不一致，这个改动**不完整**（本地跑测试会失败），需要你决策（见 D1） |
| 其余差异 | README/LICENSE/patches 等仅换行符（CRLF/LF）与编码差异（Windows 拷贝痕迹），**内容一致** |
| 集成 Harness 的方式 | **不消费源码**，消费 npm 包 `@deepseek-ai/dsh@0.1.0-rc.6`（electron-builder 打包 node_modules） |
| 本地化机制（全部是上游官方机制） | ① 7 个 `patch-package` 补丁（`patches/`，直接改 node_modules 编译产物：预设导入导出、DSH 桌面 Logo、模型选择器、目录选择器、侧边栏布局等）；② 组合补丁 `build/dsh-desktop.patch.yml`（`--patch` 传入 Harness，插入目录选择器原生行）；③ 品牌资源（Logo、图标、splash） |
| 运行方式 | spawn `node harness-node-entry.mjs <dsh入口> web --patch dsh-desktop.patch.yml --host 127.0.0.1 --port <随机>` |

**关键含义**：你目前在桌面端看到的"自增功能"（.dshpreset 预设导入导出、桌面 Logo、原生目录选择器、品牌图标等）**全部是官方 dsh-desktop 的上游功能**，不是本地加的。也就是说桌面端没有需要"抢救"的本地功能，更新会非常干净。

### 1.3 主题 `E:\Vibe coding\DeepSeek Harness 主题`

| 项目 | 结论 |
| --- | --- |
| Git | ❌ 不是 git 仓库（纯文件拷贝） |
| 身份 | `@deepseek-ai/dsh-client-ui-aqua` v1.1.1（Aqua 玻璃拟态主题插件），源码在 `repo/src/client/`，预构建产物在 `repo/lib/` |
| 设计取向 | devDependencies 全部是 `workspace:^` —— **按"放进 harness monorepo 当 workspace 包"设计的** |
| 当前安装方式（`install.ps1`） | ① 下载主题 → ② junction 到 `%USERPROFILE%\.dsh\profiles\node_modules\@deepseek-ai\dsh-client-ui-aqua` → ③ 在 `profiles\web\cordis.patch.yml` 注册 `ui-aqua` 行 |
| npm 发布 | 未发布到 npm（安装脚本特意绕开 npm） |

---

## 2. 决定方案的 4 个架构事实

1. **桌面端与 Harness 的连接是"npm 包 + 补丁"，不是源码**。
   → Harness 源码更新**不会自动流入**桌面端；桌面端拿到新功能要等官方 npm 发版 + 官方补丁升级。这是官方架构，**保持它**才能做到"无缝增量更新"。
2. **视觉桥接目前只存在于源码**，桌面端（npm 包）没有它。
   → 需要决定它在最终产品中的位置（源码 / 桌面补丁 / 双位置），见 D2。
3. **主题的天然内置位置**：桌面端 `vendor` 资源 + 组合补丁注册（沿用 install.ps1 的 junction/copy 模式，但改为随应用分发，不再联网下载）。
4. **避免冲突的黄金法则**：所有本地新增内容一律放在**上游不存在的路径**（`desktop/build/dsh-local.patch.yml`、`desktop/vendor/…`、`scripts/sync/…`、`packages/client/ui-aqua`），本地**不修改上游文件**；实在要改上游文件的（视觉桥接），以**独立、清晰、可重放的提交**存在，让冲突可预测、可报告。

---

## 3. 目标单仓库布局

```
DeepSeek Harness Studio/                ← 唯一仓库（git clone 自 deepseek-harness，保留历史）
├── .git
│   └── remotes/
│       ├── origin            → 你自己的私有 GitHub 仓库（备份/发布源码）
│       ├── upstream          → github.com/deepseek-ai/deepseek-harness   （通道 A）
│       └── desktop-upstream  → github.com/dataelement/dsh-desktop        （通道 B）
├── packages/… apps/… vendor/…           ← 官方核心，不动
├── desktop/                             ← 【git subtree】官方 dsh-desktop 源码
│   ├── src/ … patches/ … build/…        ← 官方文件，不动
│   ├── build/dsh-local.patch.yml        ← 【本地】组合补丁：注册 ui-aqua 主题（新增文件）
│   ├── vendor/@deepseek-ai/dsh-client-ui-aqua/   ← 【本地】内置主题（源码+构建产物）
│   └── patches/@deepseek-ai+dsh-llm-deepseek+0.1.0-rc.6.patch   ← 【本地】视觉桥接桌面端补丁
├── packages/client/ui-aqua/             ← 主题 workspace 包（web 开发用，已确认）
├── scripts/sync/
│   ├── sync-upstream.ps1                ← 【本地】通道 A+B 更新与冲突报告脚本
│   └── CONFLICT-REPORT.md               ← 【本地】冲突报告输出（生成物）
└── docs/INTEGRATION.md                  ← 【本地】本计划书 + 更新 SOP 落库版
```

设计要点：

- **根仓库 = 官方 Harness**，`master` 分支 = 官方主线 + 本地功能提交（视觉桥接、主题、脚本、文档）。
- **desktop/ 是 subtree**（`--squash` 压缩历史），官方更新走 `git subtree pull`，与根仓库互不干扰。
- 根仓库的 `pnpm-workspace.yaml` 只匹配 `packages/*/*`、`apps/*` 等，**不会把 desktop/ 当作 pnpm workspace 成员**（npm/pnpm 两套依赖互不污染）。
- 桌面端继续用 npm（`package-lock.json`），Harness 继续用 pnpm（`pnpm-lock.yaml`），各自独立安装。

---

## 4. 增量更新机制（三条通道）

### 通道 A：官方 Harness 更新（核心诉求）

```bash
git fetch upstream                        # 拉取官方最新
git merge upstream/master                 # 合并（用 merge 不用 rebase，保留本地提交历史）
```

- **本地提交**（合并时被自动保留）：① 视觉桥接提交；② 主题/脚本/文档新增文件提交。
- **无冲突**：官方没有改动本地也改过的文件 → 直接成功，输出更新摘要（改了哪些文件、版本号）。
- **有冲突**：脚本中止，生成 `CONFLICT-REPORT.md`（见第 6 章），**交给你逐项决策**后继续。

### 通道 B：官方 Desktop 更新（客户端跟随上游）

```bash
git subtree pull --squash --prefix=desktop desktop-upstream master
```

- 官方 dsh-desktop 每次发版（npm 包版本、patches、src 更新）都会流入 `desktop/`。
- **冲突预期极低**：本地只新增了 `desktop/build/dsh-local.patch.yml` 和 `desktop/vendor/…`，官方不会动这两个路径；唯一隐患是"官方改了本地也改过的文件"（见第 6 章已知风险清单）。
- 官方升 npm 版本时（如 `@deepseek-ai/dsh@0.1.0-rc.7`），桌面端补丁 `patches/*` 由**上游官方**同步升级，我们只需跟随。

### 通道 C：主题更新（低频，按需）

主题仓库（`github.com/WYH66666666/DSH-Transparent-UI-Plugin`，Aqua 主题作者仓库）发新版本时：

1. 跟我说"更新主题"（或运行实施时提供的主题更新脚本）；
2. 从作者仓库拉取最新（**git subtree 挂载**作者仓库 → `git subtree pull --squash`；作者仓库自带预构建 `lib/`，通常无需联网构建）；
3. 同步**两处内置副本**：`packages/client/ui-aqua`（workspace 开发用）与 `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua`（桌面打包用）——两处内容保持一致；
4. 若源码有变：重新构建 lib（`pnpm --filter @deepseek-ai/dsh-client-ui-aqua bundle`）；
5. 兼容性回归：主题 peer 依赖与官方 client 包版本是否仍匹配；
6. 提交为**独立提交**（不混入通道 A/B 的同步合并）。

> 实施细节：主题两处副本的同步方式（subtree 挂载点选哪一处、另一处构建时复制）在阶段 2 定稿，目标是"更新主题 = 一条命令"。

### 4.4 自动化更新方案（你问的重点）

**你的诉求**：官方 DeepSeek 源码更新后，客户端自动同步。

**先回答"该怎么同步"**：
- 整合后**不需要再手动下载 GitHub zip**——仓库里已配好 `upstream` remote，`git fetch upstream` 就是"从官方下载最新源码"，自带差异对比，比下载 zip 更无缝。
- 日常 = 一条命令 / 一个脚本：**检测 → 无冲突自动合并 → 出摘要**；**有冲突自动停下出报告交给你**。

**自动化分级（推荐先做 1 + 1+，需要时再加 2）**：

| 级别 | 内容 | 适用 |
| --- | --- | --- |
| 1. 本地一键脚本 | `scripts/sync/sync-upstream.ps1`：检测两通道更新、无冲突自动合并、生成 `UPDATE-SUMMARY.md`；有冲突生成 `CONFLICT-REPORT.md` 并中止 | 默认（推荐） |
| 1+. 定时自动跑 | Windows 任务计划程序每日自动执行脚本：无更新静默、有更新出摘要、有冲突弹通知 | 推荐 |
| 2. GitHub Actions | 云端定时 fetch 两上游 → 合并干净则自动推回你的 GitHub；有冲突则自动开 PR 等你在 GitHub 上处理 | 可选加强（不依赖本机开机） |

**`sync-upstream.ps1` 流程**：

```
1. 前置检查：工作区必须干净（本设计保证本地改动都是"已提交"的，通常满足；
   不干净则提示，绝不自动 stash/丢弃）
2. 通道 A（官方 Harness）：
   git fetch upstream
   无新提交 → 跳过
   有新提交 → git merge upstream/master
       合并干净 → 继续
       有冲突 → 生成 CONFLICT-REPORT.md，中止（等人工）
3. 通道 B（官方 Desktop）：
   git fetch desktop-upstream
   无新提交 → 跳过
   有新提交 → git subtree pull --squash --prefix=desktop
       同上：冲突即中止出报告
4. 功能保护检查（6.4 规则）：
   - 本次合并是否触及受保护清单中的文件/路径 → 是则并入冲突报告，绝不自动解决；
   - 本次官方更新是否疑似实现与本地功能同领域的能力（关键词扫描）→ 标记"疑似功能重叠"，由 AI 出功能对比报告；
   - 若动了视觉桥接相关文件，额外输出 "⚠️ 需手动同步桌面端视觉桥接补丁" 提示（D2 双维护的必然成本，无法全自动）
5. 生成 UPDATE-SUMMARY.md（官方更新了什么、涉及哪些文件、npm 版本是否变化、是否命中功能保护清单）
6. 可选：Windows Toast 通知 / 写入日志
```

**自动化能做什么、不能做什么（诚实边界）**：

| 能自动 ✅ | 不能自动 ❌（脚本会明确提示你） |
| --- | --- |
| 检测官方更新 | 冲突解决（你的硬性要求：有冲突必须你拍板） |
| 无冲突自动合并 | 视觉桥接桌面补丁的代码级同步 |
| 更新摘要 / 差异报告 | npm 版本升级决策（等官方发版后人工确认） |
| 定时运行 / 通知 | — |

**自动化的依赖前提**（本设计已全部满足）：
1. 本地改动全部**已提交**（视觉桥接、主题、脚本）→ 工作区干净，merge 才能自动；
2. `upstream`（官方 Harness）与 `desktop-upstream`（官方 Desktop）两个 remote 配好；
3. 本地 git 凭据可用（推送到你的 GitHub 时）。

**你未来的日常**（自动化就位后）：
1. 什么都不用做——任务计划每天自动检查；有更新 → 自动合并进你的仓库 → 出摘要；
2. 有冲突 → 脚本停下并通知你 → 看 `CONFLICT-REPORT.md` → 拍板（或交给我处理）；
3. 确认后 → 重新打包发布到你的 GitHub Release → 用户应用内收到更新。

### 4.5 更新官方源码：日常操作 SOP（你问的"我该怎么做"）

**方式一：直接跟我说（推荐日常使用）**

你只需要打字：
- **"更新官方源码"** → 通道 A（官方 Harness）
- **"更新上游客户端"** → 通道 B（官方 dsh-desktop）
- **"更新主题"** → 通道 C（主题作者仓库）
- **"更新所有上游"** → A + B + C 一次跑完

然后我执行对应流程：

```
1. 检查工作区干净（不干净先提示，绝不自动丢弃你的改动）
2. git fetch upstream（官方 Harness）+ git fetch desktop-upstream（官方 Desktop）
3. 报告官方更新内容（新提交、涉及文件、npm 版本变化）
4. 通道 A：merge upstream/master；通道 B：subtree pull desktop
   （无冲突 → 自动完成；有冲突 → 生成 CONFLICT-REPORT.md，停下等你拍板）
5. 功能保护检查（6.4）：受保护文件是否被官方触及、是否疑似功能重叠
   （命中 → 出功能对比报告，等你决策）
6. 若官方动了视觉桥接相关文件 → 同步桌面端视觉桥接补丁（D2 双维护）
7. 构建验证：pnpm 测试抽样 + 桌面构建
8. 输出 UPDATE-SUMMARY.md 并向你汇报结果
```

全程只有**需要你决策**的点才停下问你（冲突 / 功能重叠 / 补丁同步），其余自动完成。

**方式二：自己跑脚本（整合完成后）**

运行 `scripts/sync/sync-upstream.ps1` → 输出同样的摘要/报告，适合你自己动手时用。

**方式三：全自动（整合完成后）**

Windows 任务计划每日自动运行脚本 → 无更新静默、有更新自动合并、有冲突才通知你。

**现在（整合前）的临时做法**：

当前 `deepseek-harness` 目录本身就是官方 git 仓库（origin 即官方），但工作区有 3 个**未提交**的视觉桥接文件——直接更新前必须先把它们提交（这正好是整合阶段 1 的第一步）。所以现在想更新官方源码 = 先做整合第一步（提交视觉桥接）→ fetch → merge → 报告。如果你想现在就先试一次"只读检查"（fetch 官方、看看有没有新提交，不合并、不动工作区），随时说。

---

## 5. 主题内置方案

### 5.1 推荐方案（桌面端内置，开箱即用）

1. 主题源码（`repo/src/`）+ 构建产物（`repo/lib/`）放入 `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/`（保留 package.json 的 `dsh.client.inject` 声明）。
2. `electron-builder` 的 `extraResources` 增加该目录，随安装包分发。
3. 桌面端启动时（沿用现有运行时逻辑）：把主题包**复制**（或 junction）到 `DSH_HOME\profiles\node_modules\@deepseek-ai\dsh-client-ui-aqua`——注意复制而非 junction，避免应用更新后 junction 失效；可带版本判断，只有版本变化才复制。
4. 新建 `desktop/build/dsh-local.patch.yml`，内容为注册行：

   ```yaml
   - insert:
       - id: ui-aqua
         name: '@deepseek-ai/dsh-client-ui-aqua'
   ```

5. 构建脚本把官方 `dsh-desktop.patch.yml` 与 `dsh-local.patch.yml` **合并为一个补丁**传给 `--patch`（桌面端已支持 `--patch` 机制；若 Harness 支持多个 `--patch` 参数则直接传两个，实施时验证）。
6. 用户首次启动桌面应用 → 主题自动生效，Settings → Plugins → Aqua 可开关。

> **为什么不动官方 `dsh-desktop.patch.yml`**：它是上游文件，改它会在通道 B 更新时产生冲突；新增 `dsh-local.patch.yml` 则永不冲突。

### 5.2 备选方案

- 把主题直接加为 desktop 的 npm 依赖：❌ 主题未发布 npm，且 peer 依赖要跟官方 npm 包版本走，脆弱。
- 主题进 Harness workspace（`packages/client/ui-aqua`）并写进官方 web 组合：适合 **web 开发环境**（pnpm dev 时直接可用），但改官方组合文件会增加冲突面，所以作为**可选附加**（D4），不作为桌面内置手段。

---

## 6. 冲突报告机制（"有冲突要和我讲"）

### 6.1 脚本流程（`scripts/sync/sync-upstream.ps1`）

```
1. git fetch（通道 A 或 B）
2. 尝试 merge / subtree pull
3. 无冲突 → 输出更新摘要（改动文件清单 + 新版本号），完成
4. 有冲突 → 生成 CONFLICT-REPORT.md：
      - 每个冲突文件的「官方改动 vs 本地改动」摘要
      - 分类（下表）+ 建议处理方式
   → 中止，不自动解决，交给你逐项拍板
5. 你确认后，按你的决定解决 → 重新 merge → 构建验证
```

### 6.2 冲突分类与处理规则

| 类别 | 情形 | 处理 |
| --- | --- | --- |
| 1 | 官方改了、本地没动 | 自动采纳官方（无冲突，merge 自动完成） |
| 2 | 本地改了、官方没动 | 自动保留本地（无冲突） |
| 3 | **双方都改** | **生成报告，你决策**：逐个给出「取官方 / 保留本地 / 手动合并」建议与影响 |
| 4 | 官方删除了本地改过的文件 | **生成报告，你决策**：确认本地功能是否还需要，决定是否以新增文件形式重放 |

### 6.3 已知高风险文件清单（提前预告，更新时重点盯）

| 文件 | 原因 | 冲突概率 |
| --- | --- | --- |
| `packages/llm/llm-deepseek/src/index.ts` | 视觉桥接 | 🔴 高（官方活跃区） |
| `packages/llm/llm-deepseek/src/adapter.ts` | 视觉桥接 | 🟡 中 |
| `packages/host/apiproxy/src/api-proxy.ts` | 视觉桥接 | 🔴 高（官方活跃区） |
| `desktop/test/release.test.ts` | 本地保留改动（更新源指向你的 GitHub） | 🟡 中（官方改此文件时必冲突，走报告流程） |
| `desktop/patches/*` | 官方每次升 npm 版本会重写 | 🟢 低（官方独改） |
| `pnpm-workspace.yaml`（若主题进 workspace） | 本地加了一行 | 🟢 低 |

### 6.4 本地功能保护 + 功能对比报告（你的硬性要求）

**原则：同步更新永不修改你的本地功能。** 三条保护规则：

| 情形 | 自动处理 |
| --- | --- |
| 官方更新没有碰到本地功能 | 正常自动合并，本地功能原样保留（merge 只动官方文件） |
| 官方更新与本地功能**文件冲突** | 中止 + `CONFLICT-REPORT.md`，**绝不自动解决**，等人工 |
| 官方更新实现了**类似功能**（文件不冲突，但功能重叠） | 正常合并，但额外生成**功能对比报告**，由你决定是否改用官方实现 |

**本地功能注册表（受保护清单）**——脚本检测与报告的依据：

| 功能 | 涉及文件/路径 | 保护策略 |
| --- | --- | --- |
| 视觉桥接（DeepSeek 图片理解） | `packages/llm/llm-deepseek/src/*`、`packages/host/apiproxy/src/api-proxy.ts` | 冲突必报；功能重叠必报 |
| 内置 Aqua 主题 | `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/`、`packages/client/ui-aqua` | 上游不存在的路径，永不冲突；上游若出现同名/同类官方主题，必报 |
| 更新源（你的 GitHub Releases） | `desktop/package.json`（publish 段）、`desktop/test/release.test.ts` | 冲突必报 |
| 品牌重命名（DeepSeek Harness Studio） | `desktop/` 内 package.json、src/main/*、src/preload/*、README*、patches/*、test/*、.github/workflows、build/splash.html 等 17+ 文件 | 冲突必报（官方更新这些文件时，品牌改动可能被覆盖或冲突） |
| 同步脚本与文档 | `scripts/sync/`、`docs/INTEGRATION.md` | 永不冲突 |

**功能重叠检测**（官方更新触发了与本地功能同领域的变更，但文件不冲突）：
1. 脚本关键词扫描：官方更新的 commit 信息与变更文件中出现 `image` / `vision` / 图片 / 视觉 / `theme` / `aqua` / `publish` / 更新源 等与本地功能领域相关的词 → 标记"疑似功能重叠"；
2. **我（AI）做代码级对比分析**，输出**功能对比报告**（FEATURE-COMPARE.md），包含：
   - 官方新功能是什么、本地功能是什么；
   - **两者的区别**（实现方式、能力边界、依赖、稳定性）；
   - **对比结论**：哪个更好、各适用什么场景；
   - **建议**：保留本地 / 切换官方 / 两者共存（可开关）；
3. 你拍板后，按你的决定处理（如需切换，另行提交，绝不混在同步合并里）。

**功能对比报告模板**（新增 `docs/FEATURE-COMPARE-<功能名>.md`）：

```
## 功能对比：<功能名>
- 官方实现：…（版本 / 提交 / 文件）
- 本地实现：…（提交 / 文件）
- 区别：
  1. …
- 优劣对比（官方 vs 本地）：能力 / 稳定性 / 维护成本 / 兼容性
- 建议：保留本地 / 改用官方 / 双实现共存（可开关）
- 待你决策：⬜
```

---

## 7. 决策记录（已确认，2026-02）

| 编号 | 决策 | 结论 |
| --- | --- | --- |
| **D1** | `test/release.test.ts` 的 GitHub 更新源改动 | ✅ **保留 GitHub 更新源，指向你自己的仓库**：`owner: LightyearXizIl`，`repo: DeepSeek-Harness-Studio`（原指向的 `dataelement/dsh-desktop` 要改成你的；`desktop/package.json` 的 publish 同步改） |
| **D2** | 视觉桥接的存放位置 | ✅ **源码 + 桌面补丁双维护**（web 与桌面端都有此功能；官方动相关文件时走冲突报告同步两边） |
| **D3** | 唯一仓库的位置 | ✅ **`E:\Vibe coding\DeepSeek Harness Studio`**（新建，从 deepseek-harness 克隆获得历史与 remote） |
| **D4** | 主题是否进入 Harness workspace | ✅ **是**（`packages/client/ui-aqua`，web 开发开箱即用） |
| **D5** | 远程仓库 | ✅ **推 `https://github.com/LightyearXizIl/DeepSeek-Harness-Studio`**（已验证：空仓库，**public 开源**，可作首推目标与发布渠道） |
| **D6** | 同步时的本地功能保护 | ✅ **同步永不修改本地功能**；官方实现类似功能时，生成功能对比报告（区别/优劣/建议）由你拍板（2026-02 追加要求，机制见 6.4） |
| **D7** | 发布渠道（使用者自动更新） | ✅ **方案 A：仓库公开**（你的仓库是 public 开源），publish 指向 `LightyearXizIl/DeepSeek-Harness-Studio`，使用者免认证自动更新（详见 7.2） |
| **D8** | 品牌重命名 | ✅ **已执行（2026-02）**：`DSH Desktop` → `DeepSeek Harness Studio`；内部标识 → `deepseek-harness-studio`；appId → `io.deepseekharness.studio`；publish → github `LightyearXizIl/DeepSeek-Harness-Studio`（D1/D7 同步落地）；源码/补丁/工作流/文档/测试全部同步（17+ 文件）；**待办：旧 logo/图标图片资源需重新设计** |

### 7.1 关于 D1 的说明（你的发布流程）

你的疑问："换成官方更新源会不会影响我自己的发布？"

**会。** `build.publish` 决定应用内"检查更新"从哪下载新版本：

| 更新源 | 后果 |
| --- | --- |
| 官方 `generic`（dshdesktop.com） | 你的定制版去**官方服务器**检查版本——官方一发新版，你的应用就被"官方纯净版"覆盖更新，**本地功能（视觉桥接、内置主题、你的品牌）全部丢失** |
| **你的 GitHub Releases**（推荐） | 你打包自己的版本 → 传到你的 GitHub Release → 用户应用内更新拿到的是**带本地功能的你的版本**，完全掌控发布节奏 |

**结论**：你现在的本地改动（github provider）方向正确，但有两个问题要修：
1. 指向的是 `dataelement/dsh-desktop`（官方仓库），要改成**你自己的仓库**：`owner: LightyearXizIl`，`repo: DeepSeek-Harness-Studio`；
2. `package.json` 的 `build.publish` 还是官方 generic，要同步改成你的 GitHub Releases。

**两条链路互不干扰**：
- 源码更新：官方 Harness/Desktop 发版 → merge 进你的仓库（通道 A/B）→ 你重新打包发布；
- 应用更新：你的发布渠道发版 → 使用者应用内提示更新。
- 官方更新源只影响"源码从哪来"，你的发布源只影响"使用者从哪更新"，各自独立。

### 7.2 发布渠道：使用者必须能自动更新（你的硬性要求）

**你的要求**：客户端发给别人用后，更新必须从**你的仓库**走，不能从官方更新。这样他们的版本始终跟随你（因为你的仓库与官方同步更新）。

**先确认一个事实**：使用者拿到的**安装包自带全部功能**（Harness 内核、视觉桥接补丁、内置主题都在安装包里），到手即可用；唯一的"用不了"风险是**自动更新把定制版覆盖成官方纯净版**——所以更新源指向你的渠道（与 D1 结论一致），这个方向完全正确。

**但有一个技术约束必须解决**：GitHub **私有仓库的 Release 资产需要登录认证才能下载**，陌生使用者的客户端无法匿名下载更新。如果把 token 嵌进客户端，等于把私有仓库的钥匙发给所有人（token 可被提取，你的源码就泄露了）——不可行。

**✅ 你的仓库是 public 开源**，此约束不成立：Release 资产匿名可下载，方案 A 直接成立（D7 已定）。以下是完整方案对照（若未来想源码私有，可切换 B/C）：

| 方案 | 做法 | 源码可见性 | 适用 |
| --- | --- | --- | --- |
| **A. 仓库直接公开 ✅ 已选** | 你的 `DeepSeek-Harness-Studio` 为 public，publish 指向它 | 公开 | 最简单；你不介意源码公开时 |
| B. 源码私有 + 公开发布仓库 | 代码留在私有仓库；另建一个 public 空仓库（如 `dsh-desktop-dist`）只放构建产物；publish 指向它 | 私有 | 未来想保密源码时 |
| C. 源码私有 + 公开静态托管 | 构建产物 + `latest.yml` 放 GitHub Pages / 对象存储 / 自建服务器；publish = generic URL | 私有 | 有现成托管/域名时 |

**两个环节的认证要分清**：
- **发布时**（你的构建机）：推 Release 需要 `GH_TOKEN`（只存在你机器/CI 里）；
- **下载时**（使用者的客户端）：从公开渠道下载**不需要任何认证**。
- 所以"私有"永远只发生在你自己这边，使用者那边永远免认证——这正是方案 B/C 能做到的。

**使用者视角的完整更新流**：你同步官方源码 → 构建 → 打 tag → 发布到公开渠道 → 使用者应用内收到更新（版本号高于当前即提示）→ 下载的是**带全部本地功能的你的版本**。你重新发布一次，所有使用者自动跟上，无需任何手动操作。

### 7.3 本地版本 vs 发布版本：检查更新没有区别

| 你手上的版本 | 检查更新行为 | 更新源 |
| --- | --- | --- |
| 开发模式（`npm run dev`，不打包） | **不检查更新**（更新器只在打包安装版里启用） | — |
| 你本地打包并安装的版本 | 启动时 + 每 6 小时自动检查；菜单 "Check for Updates" 手动检查 | 你的 GitHub（publish 配置，与发布版**完全相同**） |
| 发布给使用者的版本 | 同上，完全相同 | 你的 GitHub（同上） |

要点：
1. **不存在"本地版有官方更新、发布版没有"**——官方更新源（dshdesktop.com）整体禁用（D1），任何版本都不使用它；所有构建产物统一指向你的 GitHub Releases。
2. **"跟随 DeepSeek 官方源码更新"不是应用内功能**，是**开发者**在你电脑上做的源码同步（通道 A/B）；使用者的客户端里没有、也不该有这个功能（否则会被自动变成官方纯净版）。
3. 更新检查不在 Harness Web 设置里，而是桌面壳层功能（应用菜单 + 启动时/每 6 小时自动检查）；Web 界面只显示版本号，无"跟随官方"开关。
4. **唯一实际区别是版本号高低**：本地构建的版本号若 ≤ 线上已发布版本，检查提示"已是最新"；验证更新流程时把版本号调高或临时指向测试渠道。

---

## 8. 分阶段实施步骤

### 阶段 0：基线（不动代码）
- 把本计划书落库为 `docs/INTEGRATION.md`（含更新 SOP）。
- 备份三份源码到备份目录（如 `E:\Vibe coding\_backup\2026-02\`）。
- 决策已确认（见第 7 章）；D1/D5 信息已提供：`LightyearXizIl/DeepSeek-Harness-Studio`（已验证为空仓库）。

### 阶段 1：建立单仓库（目标目录 `E:\Vibe coding\DeepSeek Harness Studio`）
1. 在 deepseek-harness 中把视觉桥接**提交为独立提交**（commit message 注明 `[local] vision bridge`，便于未来识别/回退）。
2. `git clone` deepseek-harness → `DeepSeek Harness Studio`（保留完整历史与官方 remote），并另设 `upstream` remote 指向官方（通道 A 用，命名清晰）。
3. `git subtree add --squash --prefix=desktop https://github.com/dataelement/dsh-desktop master`（以官方 clone 为准，**不拷贝本地 dsh-desktop-main**，从根上消除换行/编码噪声）。
4. 按 D1：保留 GitHub 更新源方案，把 `desktop/test/release.test.ts` 与 `desktop/package.json` 的 publish 统一改为 **`owner: LightyearXizIl` / `repo: DeepSeek-Harness-Studio`**（不是 dataelement）。**注：本步已在品牌重命名（D8）时一并完成**——`dsh-desktop-main` 现已是"官方内容 + 品牌重命名 + GitHub 更新源"的完整本地版本，整合时以"官方子树 + 改名提交"为基线（改名 diff 保留为本地提交，不引入换行/编码噪声）。
5. 新增 `desktop/build/dsh-local.patch.yml`、`scripts/sync/`、`docs/INTEGRATION.md`；按 D4 加入 `packages/client/ui-aqua`（workspace 成员）。
6. 按 D5 配置远程 `origin → https://github.com/LightyearXizIl/DeepSeek-Harness-Studio`（public）并首次推送（GitHub 凭据需你确认可用，推送失败时改用 PAT 或先本地完成全部验证）。
7. 验收：`pnpm install`（根）与 `npm install`（desktop）各自成功；根目录 git status 干净；`desktop/` 不被 pnpm workspace 捕获；`git push` 私有远程成功。

### 阶段 2：主题内置
1. 主题源码 + lib 放入 `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua/`（按 D4 决定是否同时加入 `packages/client/ui-aqua`）。
2. electron-builder `extraResources` 增加主题目录；启动逻辑增加"复制到 DSH_HOME 插件目录 + 版本判断"。
3. 构建时合并 `dsh-desktop.patch.yml` + `dsh-local.patch.yml` 传给 `--patch`（验证多 patch 参数支持）。
4. 验收：打包后的桌面应用**首次启动即带 Aqua 主题**，可开关；卸载/升级不残留。

### 阶段 3：首次同步演练（干跑，验证"无缝更新 + 冲突报告"）
1. 通道 A 干跑：`git fetch upstream` + merge（即使无新提交，验证流程与摘要输出）。
2. 通道 B 干跑：`git subtree pull --squash`（验证 desktop 更新流程）。
3. 故意制造一次人为冲突，验证 `CONFLICT-REPORT.md` 生成、中止、你拍板后继续的完整闭环。
3.5. 模拟"官方实现了类似功能"（功能重叠但不冲突）场景：演示脚本标记 → AI 出**功能对比报告**（区别/优劣/建议）→ 你拍板去留的完整闭环。
4. 编写 `scripts/sync/sync-upstream.ps1` 并自测（含 UPDATE-SUMMARY.md / CONFLICT-REPORT.md / 功能保护检查输出）。
5. 注册 Windows 任务计划程序（每日自动运行；无更新静默、有冲突弹通知）。
6. 验收：流程文档化；脚本三种结局（无更新 / 干净合并 / 冲突中止）各演示一次给你看。

### 阶段 3.5：GitHub Actions 自动化（可选，按需启用）
1. 仓库推送到你的 GitHub 后，添加 `.github/workflows/upstream-sync.yml`：每日 fetch 两上游 → 干净则自动合并并推回；冲突则自动开 PR（标题 `upstream sync: 冲突待处理`）并附 CONFLICT 摘要。
2. 验收：模拟一次官方更新，观察 Actions 自动合并或自动开 PR。

### 阶段 4：打包与回归验证
- 桌面端 `npm run package:win` 构建成功；Harness `pnpm test` 抽样通过。
- 视觉桥接按 D2 在 web / 桌面双端（或单端）验证：含图会话 → DeepSeek 能"看懂"图片。
- 按 D7（方案 A）配置发布渠道：`desktop/package.json` 的 publish = `{provider: github, owner: LightyearXizIl, repo: DeepSeek-Harness-Studio}`；构建机配置 `GH_TOKEN`（仅发布时认证，使用者下载免认证）。
- **发布演练（完整闭环）**：打包 → 打 tag → 发布 Release → 模拟"使用者"从干净环境安装你的安装包 → 验证自动更新能拿到你的最新版且功能完整（视觉桥接 + 主题都在）。

### 阶段 5：长期维护约定（写进 INTEGRATION.md）
- 每次官方更新的固定动作：跑 `sync-upstream.ps1` → 读摘要/报告 → 决策 → 构建验证。
- 更新后检查清单：npm 版本映射、主题兼容性、视觉桥接回归。

---

## 9. 风险与对策

| 风险 | 对策 |
| --- | --- |
| R1 视觉桥接与官方频繁冲突（llm-deepseek / apiproxy 是活跃区） | 桥接代码尽量"加新函数、少改原函数体"；冲突时按第 6 章 SOP 处理；若长期痛苦，可整体改为桌面补丁模式（D2c） |
| R2 版本断层：源码更新了、桌面 npm 包没发版 | 官方架构使然，桌面功能以 npm 发版为准；在 INTEGRATION.md 记录 repo tag ↔ npm 版本映射表 |
| R3 主题 peer 依赖未来与新版 npm 包不兼容 | 内置时锁定 peer 范围；每次官方 npm 升版时检查主题兼容性 |
| R4 subtree pull 与本地提交纠缠 | 铁律：本地对 `desktop/` 只新增文件，不修改上游文件 |
| R5 Windows 工具改坏换行/编码 | 铁律：仓库内一切文件以 git 为准，禁止用资源管理器拷贝方式写入仓库 |
| R6 打包体积 | 主题 lib 仅几十 KB，无实质影响 |

---

## 10. 附录：调查证据（2026-02，只读）

### A1. deepseek-harness
- `origin → github.com/deepseek-ai/deepseek-harness`；`master` 与 origin/master 同步；仅 3 个未提交改动（视觉桥接，diff 共 +97/-28）。
- pnpm-workspace 成员：`vendor/*`、`packages/*/*`、`apps/*`、`website`、`examples`、`python/sdk-runtime` 等；`desktop/` 不会被捕获。
- 官方已有 `packages/client/ui-theme`（主题基础设施），但**无** aqua 包。

### A2. dsh-desktop-main vs 官方 upstream（`git ls-remote` 确认 dataelement/dsh-desktop 存在，HEAD 03494c6，v0.1.1）
- 本地**不是 git 仓库**；与官方 master 逐文件比对（SHA1，归一化换行）：
  - 语义差异仅 1 处：`test/release.test.ts`（generic → github 发布源断言），且与本地 package.json 的 generic 配置矛盾；
  - 其余（README/LICENSE/patches 等）为 CRLF/LF 与编码噪声，`git diff --no-index` 确认无内容差异（.gitattributes 首 40 字节两库相同）。
- 集成机制证据：`buildHarnessArguments` = `web --patch <patch.yml> --host 127.0.0.1 --port <随机>`；7 个 patch-package 补丁改 node_modules 编译产物；`dsh-desktop.patch.yml` 插入目录选择器原生行。

### A3. 主题
- `@deepseek-ai/dsh-client-ui-aqua` v1.1.1；`dsh.client.inject` 依赖官方 client 包；devDeps 全 `workspace:^`；
- `install.ps1` 机制：下载 → `%USERPROFILE%\.dsh\plugins\` → junction 到 `profiles\node_modules\@deepseek-ai\dsh-client-ui-aqua` → `profiles\web\cordis.patch.yml` 注册 `ui-aqua`；
- npm registry 查询不可用（沙箱网络限制），但安装脚本设计（"no npm"）表明主题**未发布到 npm**。

### A4. 决策记录
D1 保留 GitHub 更新源并指向你自己的仓库（否则官方发版会覆盖本地功能）；D2 源码 + 桌面补丁双维护；D3 仓库路径 `E:\Vibe coding\DeepSeek Harness Studio`；D4 主题进 workspace；D5 推私有远程。详见第 7 章。

---

## 11. 实施进展（2026-02 更新）

### 已完成
- **阶段 1（单仓库）**：`E:\Vibe coding\DeepSeek Harness Studio` 建立完成——官方 Harness 历史 + 视觉桥接提交（`[local] vision bridge`）+ `desktop/` subtree（官方 dsh-desktop main）+ rebrand 提交 + INTEGRATION.md；三个 remote（upstream / desktop-upstream / origin=你的 GitHub）就位；**首次推送成功**（master = 6f3ee09bd）。
- **阶段 2（主题内置）**：Aqua 主题 → `desktop/vendor/@deepseek-ai/dsh-client-ui-aqua`（打包资源）+ `packages/client/ui-aqua`（workspace 包）；`desktop/build/dsh-local.patch.yml` 注册；`desktop/src/main/studio-local.ts` 实现首启版本化安装到 `DSH_HOME\profiles\node_modules` + 官方/本地补丁合并；electron-builder extraResources 已配；测试通过。
- **阶段 3（同步自动化）**：`scripts/sync/sync-upstream.ps1` 完成（通道 A merge / 通道 B subtree pull / 冲突报告 / 功能保护 / 重叠扫描）；**首次真实同步演练通过**（通道 B 58 提交干净合并，0 冲突，rebrand 完好保留）。Windows 任务计划注册待做（可选）。
- **阶段 4（构建验证）**：**视觉桥接编译修复完成**（api-proxy 结构恢复 + llm-deepseek 类型修复——本地功能此前从未通过编译）；harness 全仓 `build:lib:host` + `typecheck:contracts-ready` 通过；桌面端 typecheck 通过、**63/63 测试通过**；Windows 打包构建进行中。
- **D8 品牌重命名**已落地（详见第 7 章）。

### 实施中发现的问题与处理（记录）
1. 本地路径 clone（硬链接）导致对象库隐疾 → push 报 `did not receive expected object` → 从官方 GitHub 重新 clone 重建仓库解决。
2. 视觉桥接原始改动含**编译错误**（api-proxy.ts 结构破坏 + llm-deepseek 类型错误）→ 已修复，首次成功构建。
3. 官方 dsh-desktop 默认分支是 `main`（非 master）→ 脚本通道 B 已用 main。
4. PowerShell 5.1 兼容：stderr 合并、`Set-Content -Encoding`、变量大小写冲突均已在脚本中规避。
5. desktop 测试被 harness 根 vitest 配置干扰 → 新增 `desktop/vitest.config.ts` 隔离。
6. rebrand 后 README 下载断言与 GitHub 发布渠道矛盾 → 断言已按 D7 修正。
