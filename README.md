# lucky-picker · 幸运发生器

给今天，一点好运气。一个无需登录、无需后端的随机选号和随机选股网页。

## 功能

- 双色球、超级大乐透、排列三、排列五；一键生成 1 组或 10 组。
- 双色球与大乐透区内去重并排序；排列三/五按位生成，保留前导零并允许重复数字。一次 10 组避免完全相同的组合。
- 单组重新生成、复制单组或全部；剪贴板不可用时提供手动复制文本。
- 幸运选股：从内置 **16 只 A 股样本**等概率抽取，展示代码、名称及所属市场。
- 当前浏览器保存最近 50 次操作；可展开、复制或清空，支持存储不可用时继续使用。
- 手机和电脑布局、键盘焦点、减少动画偏好；无远程字体或第三方运行时请求。

## 本地运行

需要 Node.js 22.12 或更高版本。

```sh
npm ci
npm run dev
```

打开终端打印的本地地址（默认 http://127.0.0.1:5173）。

```sh
npm test          # Vitest 自动化测试
npm run build    # TypeScript 检查 + 生产构建
npm run preview  # 预览 dist/ 生产产物
```

构建结果位于 `dist/`，不能直接通过双击 HTML 打开，需要静态 HTTP 服务。`base: './'` 使资源路径兼容 GitHub Pages 项目子目录。

## 随机与范围

浏览器 `crypto.getRandomValues` 提供随机源；拒绝采样避免整数映射时的取模偏差。前后区分别独立抽样，单区使用部分 Fisher–Yates 洗牌。生成器遇到随机源异常时返回错误，不降级成伪造结果。

股票池是人工维护的有限样本，**不是全量 A 股列表，不提供行情、预测或买入建议**。整理日期：2026-10-21。整理日期不代表当日实时核验；来源包括历史披露资料，上市、停牌和名称状态可能变化。维护时编辑 `src/data/stocks.ts` 的列表、日期和来源，并运行测试。样本不包含北交所。

数据与规则来源：

- [四川福彩：双色球规则](https://www.scflcp.com.cn/yxgz/823145252.jhtml)
- [甘肃体彩：大乐透规则](https://www.gstc.org.cn/newsDetail/030600/030601)
- [国家体育总局：排列三规则](https://www.sport.gov.cn/cpzx/n5649/c663326/content.html)
- [中国体彩：排列五规则](https://m.lottery.gov.cn/ksjz/plw/guize/)
- [上交所披露的基金报告（持仓截至 2021-06-30）](https://www.sse.com.cn/disclosure/fund/announcement/c/new/2021-08-31/515130_20210831_1_S2URykz9.pdf)
- [深交所统计月报（2026-06）](https://docs.static.szse.cn/www/market/periodical/month/W020260706503108158062.html)

随机选号不提高中奖概率；随机选股仅供娱乐。

## 后续上传 GitHub

本地已初始化 Git，开发工作保存在 `feat/initial-app` 分支，尚未创建或推送远程仓库。创建空的 GitHub 仓库后，可使用同一个项目：

```sh
git branch -m main
git remote add origin https://github.com/YOUR_NAME/lucky-picker.git
git push -u origin main
```

将 `YOUR_NAME` 替换为自己的 GitHub 用户名。也可用 GitHub CLI 创建仓库后推送。项目当前没有指定开源许可证；公开仓库前可按需要选择许可证。

## GitHub Pages

仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。工作流 `.github/workflows/deploy.yml` 会在推送 `main` 或手动运行时执行依赖安装、测试、构建与部署。首次启用 Pages 后可手动运行工作流。

部署地址由 GitHub Actions 输出，通常为 `https://YOUR_NAME.github.io/lucky-picker/`。本地 `localStorage` 的记录不会迁移到部署后的新域名。

## 项目结构

```text
src/
  components/   # 号码列表、历史列表与图标
  data/         # 股票池、整理日期与来源
  lib/          # 随机规则、历史存储、复制和测试
  App.vue       # 页面状态与交互
  style.css     # 响应式样式
public/         # 本地图标
.github/workflows/deploy.yml
```
