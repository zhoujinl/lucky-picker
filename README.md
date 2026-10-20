# lucky-picker · 幸运发生器

给今天，一点好运气。一个无需登录、无需后端的随机选号和随机选股网页。

## 功能

- 双色球、超级大乐透、排列三、排列五；一键生成 1 组或 10 组。
- 双色球与大乐透区内去重并排序；排列三/五按位生成，保留前导零并允许重复数字。一次 10 组避免完全相同的组合。
- 单组重新生成、复制单组或全部；剪贴板不可用时提供手动复制文本。
- 幸运选股：从东方财富接口抓取的 **5,199 只沪深股票**等概率抽取，展示代码、名称及所属市场。
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

股票池来自东方财富数据中心的 `RPT_DMSK_TS_STOCKNEW`（千股千评股票列表）接口。本次交付快照 **5,199 只**，数据日期 **2026-10-20**，抓取日期 **2026-10-21**（Asia/Shanghai），覆盖沪深 A 股及科创板 CDR，**不含北交所，不声称是全部 A 股或全部可交易证券**。保留接口收录的 ST、*ST 及上市状态未注明的记录，不按停牌等交易状态筛选，不提供实时行情、预测或买入建议。

### 更新股票池

```sh
npm run update:stocks
npm test
npm run build
```

更新脚本直接请求东方财富，逐页抓取（每页 500 条，当前 11 页），校验响应、数据日期、总数、重复代码及市场分类，再以原子替换的方式写入 `src/data/stock-pool.json`。超时、空数据、异常数量或不完整分页会使更新失败并保留上一份完整数据。抓取失败不会自动退回 16 只样本。

网页直接使用已抓取的快照，因此不需要访问者浏览器跨域访问东方财富。开发服务会自动刷新；生产网站需要重新构建并部署。构建时不会强制联网抓取，已有快照可以离线构建。提交更新后的 JSON 到 GitHub，现有 Pages 工作流即可部署新的股票池。

`scripts/stock-pool.mjs` 负责接口字段、分类、完整性校验；`scripts/update-stocks.mjs` 负责请求重试和安全写入。市场分类兼容主板、创业板、科创板、风险警示板及科创板 CDR；名称保留六位代码的前导零并规范化全角字符和空白。

数据与规则来源：

- [四川福彩：双色球规则](https://www.scflcp.com.cn/yxgz/823145252.jhtml)
- [甘肃体彩：大乐透规则](https://www.gstc.org.cn/newsDetail/030600/030601)
- [国家体育总局：排列三规则](https://www.sport.gov.cn/cpzx/n5649/c663326/content.html)
- [中国体彩：排列五规则](https://m.lottery.gov.cn/ksjz/plw/guize/)
- [东方财富：千股千评](https://data.eastmoney.com/stockcomment/)
- [实际使用的数据接口](https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DMSK_TS_STOCKNEW&columns=SECURITY_CODE,SECURITY_NAME_ABBR,TRADE_MARKET_CODE,TRADE_DATE,LISTING_STATE,SECURITY_TYPE_CODE&pageNumber=1&pageSize=500&sortColumns=SECURITY_CODE&sortTypes=1&source=WEB&client=WEB)

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
  data/         # 东方财富股票快照、数据日期与来源
  lib/          # 随机规则、历史存储、复制和测试
  App.vue       # 页面状态与交互
  style.css     # 响应式样式
scripts/        # 股票池抓取、校验及测试
public/         # 本地图标
.github/workflows/deploy.yml
```
