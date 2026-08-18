# Agent Note: 智谱 catalog 路由获得中文显示名

Status: implemented

[English](2026-08-18-zhipu-catalog-display-names.md) | 中文

## 问题

Models 页面的"添加提供方"列表按路由键展示休眠中的 pi-ai catalog 路由。智谱路由 `zai` 与 `zai-coding-cn` 就在其中，但这两个键名无法让中文配置界面找到对应厂商，用户在不了解键名的情况下无法定位智谱。

## 决策

`dsh-llm-pi-ai` 新增 `catalogDisplayName(provider)`：除 `zai` → `智谱 Z.AI（国际）`、`zai-coding-cn` → `智谱 GLM Coding Plan（国内）` 之外，一律返回路由键。两个产出默认显示名的位置都使用它——可配置提供方目录的休眠 catalog 条目，以及 `resolveProfiles` 的显示名默认值——因此该名称在路由激活后依然保留，除非 profile 显式声明了 `displayName`（显式声明在任何地方都优先）。

映射表只覆盖这两条智谱路由。为全部 catalog 路由改名是另一项产品决策；其余提供方仍以路由键为默认，保持 [web 配置平面](../architecture/2026-07-30-web-config-plane.md)目录随附的命名行为。该 note 保持活动并拥有目录机制；重叠仅限显示名默认值。

## 备选方案

- **让全部 catalog 路由展示 pi-ai 提供方名称**（`Z.AI`、`OpenAI` 等）而非路由键。这会整体改善选择器，但英文品牌对中文用户依然不读作"智谱"，而且为全部路由改名是比当前场景更大的产品决策。
- **保留路由键并文档化映射。** 用户既然在列表里找不到智谱，就不可能去查一份他们不知道存在的映射。
- **仅在客户端层本地化名称。** 这会把命名约定拆散到 host 与 client 两侧，并让无界面的使用方式继续显示路由键。

## 影响

- Models 页面的"添加提供方"列表以中文显示名展示这两条智谱路由；由于 `resolveProfiles` 默认取同一张表，激活后名称依然保留。
- 其余 catalog 路由保持路由键；除这两条路由外，目录的命名行为不变。
- 映射表位于 host 适配器内，所有配置界面共享同一份命名约定。
