# lucky-picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建可在手机和电脑使用的幸运选号与幸运选股网页。

**Architecture:** Vue 组件负责页面，独立 TypeScript 模块管理随机算法、彩种规则和本地记录。股票池作为静态数据随项目交付，无后端依赖。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest。

**Spec:** [已确认的实现规格](./lucky-picker-design.md)

## Global Constraints

- 项目位置 `/Users/yanqiu/Code/lucky-picker`；如已有同名目录，先检查，禁止覆盖。
- 四种彩票，支持生成 1 组或 10 组、复制、重生成及最近 50 次操作记录。
- 使用浏览器加密随机源与拒绝采样；双色球及大乐透区内去重、升序排列。
- 股票池明确覆盖范围、数据来源和日期，不声称有限样本覆盖全部 A 股。
- 本次只完成本地项目，不创建远程仓库、不发布网站。
- 提供 GitHub Pages 工作流、README、.gitignore 和依赖锁文件。

## Review Focus

- 浏览器存储损坏或不可用：恢复为空或继续当次操作并提示。
- 剪贴板权限被拒绝：提供可手动选择复制的文本。
- 随机源落在取模偏差区间：拒绝并重新抽样。
- 单组重新生成：保持当前列表其他组不变，并避免与其重复。
- 手机窄屏及减少动画设置：布局无横向溢出，功能不依赖动画。

## Task 1: 随机算法和数据

**Files:** `package.json`、`tsconfig.json`、`vite.config.ts`、`src/lib/picker.ts`、`src/data/stocks.ts`、`src/lib/picker.test.ts`。

**Interfaces:** `LotteryId = 'ssq' | 'dlt' | 'pl3' | 'pl5'`；`Ticket = { primary: number[]; secondary: number[] }`；`generateTickets(id: LotteryId, count: 1 | 10): Ticket[]`；`randomInt(maxExclusive: number): number`；`pickStock(): Stock`；`Stock = { code: string; name: string; market: string }`。

- [ ] 检查目标目录与上级 AGENTS.md，初始化最小工程和测试配置。
- [ ] 先写测试：双色球 6+1、范围 33/16；大乐透 5+2、范围 35/12；主区与副区分别去重排序；排列三/五长度 3/5、数字范围 0–9 且可重复；10 组唯一；股票结果属于池。
- [ ] 增加拒绝采样边界测试，运行 `npm test` 确认缺失实现导致失败。
- [ ] 实现接口与明确标注范围的股票池；核验彩种规则和股票资料来源，记录日期。
- [ ] 运行 `npm test`，全部通过后提交该部分。

## Task 2: 页面与记录

**Files:** `src/App.vue`、`src/components/TicketList.vue`、`src/components/HistoryList.vue`、`src/style.css`、`src/lib/history.ts`、`src/lib/history.test.ts`、`src/lib/clipboard.ts`、`src/lib/clipboard.test.ts`、`index.html`、`src/main.ts`。

**Interfaces:** 使用 Task 1 接口；`HistoryEntry = { id: string; createdAt: string; label: string; lines: string[] }`；`readHistory(): HistoryEntry[]`；`saveHistory(entries: HistoryEntry[]): boolean`；`copyText(text: string): Promise<boolean>`。

- [ ] 写测试并运行确认失败：历史记录最多 50 次、损坏 JSON 与错误结构恢复为空、存储写入异常返回 false、剪贴板拒绝返回 false。
- [ ] 实现历史和复制模块，通过测试。
- [ ] 实现米白底色、红蓝圆球、彩种切换、1组/10组、单组与全部复制、单组重生成、选股和历史清空。
- [ ] 浏览器检查单组重生成保留其他行、复制失败展示手动复制文本、刷新历史仍在、清空后不恢复。
- [ ] 检查 375px 手机宽度、键盘焦点、减少动画设置；测试通过后提交该部分。

## Task 3: 构建与交付

**Files:** `README.md`、`.gitignore`、`.github/workflows/deploy.yml`、`vite.config.ts`。

**Interfaces:** `npm run dev` 启动本地预览；`npm test` 测试；`npm run build` 执行 TypeScript 检查及生产构建。

- [ ] 配置 GitHub Pages 构建上传和部署工作流，Vite base 兼容项目子路径。
- [ ] README 记录启动、验证、股票池范围及更新时间、后续上传 GitHub 与 Pages 启用方法。
- [ ] 运行 `npm test` 和 `npm run build`，确认均成功。
- [ ] 启动本地预览，在浏览器检查四种彩票、两种数量、选股与窄屏布局；记录无法验证的项目。
- [ ] 检查最终改动，完成本地提交，打开预览并交付运行地址。
