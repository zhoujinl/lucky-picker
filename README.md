# lucky-picker · 幸运发生器

给今天，一点好运气。一个无需登录、无需后端的随机选号和随机选股网页。

## 功能

- 双色球、超级大乐透、排列三、排列五、福彩3D、7星彩、七乐彩；一键生成 1 组或 10 组。
- 双色球、大乐透与七乐彩区内去重并排序；排列三/五和福彩3D按位生成，保留前导零并允许重复数字。7星彩按前六位 0–9、末位 0–14 生成，保留位置与重复数字。七乐彩只生成 7 个投注号码，特别号由开奖摇出。一次 10 组避免完全相同的组合。
- 七个彩种均提供简明开奖规则、北京时间开奖日程，以及官方规则和日程来源链接；休市及调整以官方公告为准。
- 单组重新生成、复制单组或全部；剪贴板不可用时提供手动复制文本。
- 幸运选股：从东方财富接口抓取的 **5,199 只沪深股票**等概率抽取，展示代码、名称及所属市场。
- 热门股盲选：东方财富人气榜＋同花顺小时热榜前 100 名合并去重，成交额 ≥ 5 亿元、换手率 ≥ 1%，排除 ST、退市名称及无有效行情的股票。符合条件的股票等概率抽取，显示排名、成交指标和行情日期。
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

构建结果位于 `dist/`，不能直接通过双击 HTML 打开。热门股自动同步需要 Node HTTP 服务（见文末部署说明）。`base: './'` 使资源路径兼容 GitHub Pages 项目子目录。

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
- [上海福彩：福彩3D规则](https://www.swlc.net.cn/games/3d.html)
- [上海福彩：七乐彩规则](https://www.swlc.net.cn/games/qlc.html)
- [内蒙古体彩：7星彩规则](https://www.nmtc.com.cn/ggtz/21145.html)
- [中国体彩：2023年起调整开奖时间](https://m.lottery.gov.cn/xxgk/tzggz/20221220/10027143.html)
- [陕西体彩：各彩种开奖日程](https://m.sxtc.com.cn/cjdlt/list/page.html)
- [上海福彩：3D开奖时间](https://www.swlc.net.cn/lottery/3d.html?view=previous)
- [上海福彩：七乐彩开奖时间](https://www.swlc.net.cn/lottery/qlc.html?view=previous)
- [深圳民政：双色球开奖时间](https://mzj.sz.gov.cn/szmz/pc/bmxx/mzfwzy/flcp/bmxx/content/post_2929813.html)
- [东方财富：千股千评](https://data.eastmoney.com/stockcomment/)
- [实际使用的数据接口](https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DMSK_TS_STOCKNEW&columns=SECURITY_CODE,SECURITY_NAME_ABBR,TRADE_MARKET_CODE,TRADE_DATE,LISTING_STATE,SECURITY_TYPE_CODE&pageNumber=1&pageSize=500&sortColumns=SECURITY_CODE&sortTypes=1&source=WEB&client=WEB)

随机选号不提高中奖概率；随机选股仅供娱乐。

## GitHub 仓库

已推送至 [zhoujinl/lucky-picker](https://github.com/zhoujinl/lucky-picker)，默认分支 `main`。本地 `origin` 使用 SSH，可用 `git push` 推送已提交的后续修改。当前没有指定开源许可证。

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

## 热门股盲选与数据更新

入口：幸运选股 → 热门股盲选。两个榜各取排名 1–100，合并去重后与本项目沪深股票池匹配，使用东方财富行情的成交额（元）、换手率（百分数）筛选。北交所及本项目股票池未收录的股票不入选。两个榜重叠只作“双榜上榜”标记，所有入池股票的抽中概率相同。内置备用快照 129 个热榜候选，筛选后 92 只，行情日期 2026-10-20；热榜抓取于 2026-10-21 01:38（北京时间）。股票可能下跌或已涨停，成交额和换手率只是流动性的代理指标，不保证可买入或未来上涨。

```sh
npm run update:hot-stocks
npm test
npm run build
```

更新脚本直接请求两个官方站点的接口，再分批查询东方财富行情，安全写入 `src/data/hot-stock-pool.json`。必须两源均完整返回前 100 名；任意来源失败、榜单截断或筛后无股票都会保留上次完整池，并在 `hot-stock-status.json` 记录失败原因。页面自动同步失败时也会明确提示使用旧快照。网络请求有 20 秒超时。行情数字字段缺失、日期落后于本批最新日期的股票不入选，成交额和换手率使用接口当前累计值。开市前或休市时通常为最近交易日数据，盘中则为抓取时的累计值。

内置快照是自动同步失败时的备用数据。每次进入热门股盲选都会通过服务端同步上游数据，成功后立即采用新池。备用快照超过 24 小时会提示过期。手动运行更新命令可更新随构建分发的备用快照；无需后台定时抓取即可在每次进入时同步。

来源及接口（2026-10-21 验证可用，非承诺稳定的公开开发者 API）：

- [东方财富人气榜及算法说明](https://guba.eastmoney.com/rank/)；POST `https://emappdata.eastmoney.com/stockrank/getAllCurrentList`。
- [同花顺热榜](https://eq.10jqka.com.cn/webpage/ths-hot-list/index.html?showStatusBar=true)；GET `https://eq.10jqka.com.cn/open/api/hot_list/v1/hot_stock/a/hour/data.txt`，接口路径取自该官方页面的脚本。
- [东方财富行情中心](https://quote.eastmoney.com/center/gridlist.html#hs_a_board)；GET `https://push2.eastmoney.com/api/qt/ulist.np/get`，字段 `f6` 成交额、`f8` 换手率、`f3` 涨跌幅、`f124` 行情时间戳。

热榜反映平台关注度，不等于上涨概率。功能不提供胜率估计、收益预测或买入建议。

### 热门股自动同步服务

每次进入「热门股盲选」都会 POST `/api/hot-stocks/sync`，重新抓取东方财富前 100 名、同花顺小时前 100 名及行情。同步期间暂停盲选；成功后立即替换股票池并缓存于浏览器，失败保留上次完整数据并显示原因，可重试。重叠请求合并处理，后续进入仍重新同步。

本地 `npm run dev` 和 `npm run preview` 已包含此接口。生产部署请运行 `npm run build` 后运行 `npm start`（Node >=22.12），同时提供页面及同步接口。可用 `HOST=0.0.0.0 PORT=3000 npm start` 配置监听地址；需要公网访问时配置 HTTPS 反向代理。仅上传 dist 到静态托管不具备同步能力，需将 `/api/hot-stocks/sync` 转发到该 Node 服务。

运行时快照写入 `.lucky-data/`（已忽略），可通过 `LUCKY_DATA_DIR` 指定可写目录；不会修改源码或触发页面重载。数据完整性校验与原更新脚本相同，任一热榜不完整或请求失败均不覆盖上次股票池。

盘前行情日期已切换但成交指标重置时，自动同步会额外读取东方财富不复权日线，使用最近已完成交易日的成交额、换手率和涨跌幅筛选当前热榜。页面明确标注行情日期与采用口径；不会把盘前的 0 成交当作股票流动性不足。日线查询最多并行 2 个，连接异常最多尝试 3 次，按当天查询口径缓存完整历史日线，整次同步上限 75 秒，任一请求异常保留原池。开盘后仍按当日累计行情筛选。

东方财富日线连接持续失败时，可改用同花顺日线成交额并匹配东方财富数据中心同日换手率、涨跌幅。页面显示采用备用源的候选数量。个股日线滞后且重取后仍缺少目标交易日数据时，沿用缺失行情排除规则并显示数量；不会混用更早行情或补造数据。网络失败仍保留旧池。

## 我的观察

幸运选股的全市场随机与热门股盲选均支持「加入观察」。观察记录保存在当前浏览器，与抽取历史独立；进入「我的观察」时自动更新，也可手动刷新。以基准交易日的开盘价为起始价格，第3、第10个市场交易日为回看节点（基准日记第0日）。休市不计数，停牌不让节点顺延；节点没有有效行情时明确显示无行情。原始价格用于展示，涨跌幅使用同一快照中的前复权序列计算。行情来自腾讯日线，市场交易日来自上证指数日线序列；为确认上游数据，当日收盘及节点于下一自然日后核实。

幸运选号支持单组或全部号码加入观察，每条记录绑定一个明确期号，开奖后按该彩种与期次的有效规则核对命中情况及奖级。当前官方公开接口只核实到已开奖期次，未核实到下一期销售期号及截止时间，因此由用户按官方公告或票面手动指定期号，初始标为「期号待核实」，不自动推算下一期。官方完整结果发布后才按对应期次核对，未知期号不会判为未中奖。保存观察不代表已经购票，第一版不计算奖金，也不自动连续追期。

观察功能需要本项目的 Node 接口（开发、预览及 `npm start` 均提供）。不支持纯静态托管自动获取数据。上游未发布、不可访问或规则尚未核实时显示等待或错误，保留已有数据，不用虚构结果替代；页面标注实际来源及最后更新时间。关闭浏览器后不执行刷新或发送提醒，清理浏览器数据会移除本地观察记录。
